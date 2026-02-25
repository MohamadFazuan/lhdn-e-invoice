# OCR / AI Extraction Pipeline

## Overview

Users upload invoice documents (PDF, JPG, JPEG, PNG). The system extracts structured invoice data using OCR and AI, then presents it for human review before LHDN submission.

```
Client                Worker (API)              R2 Storage       Cloudflare Queue    Worker (Queue)
  │                       │                         │                    │                │
  │ POST /files/upload-url│                         │                    │                │
  │──────────────────────►│                         │                    │                │
  │◄──────────────────────│ {uploadUrl, r2Key}       │                    │                │
  │                       │                         │                    │                │
  │ PUT uploadUrl + file  │                         │                    │                │
  │────────────────────────────────────────────────►│                    │                │
  │◄────────────────────────────────────────────────│ 200 OK             │                │
  │                       │                         │                    │                │
  │ POST /files/confirm   │                         │                    │                │
  │──────────────────────►│ HEAD r2Key              │                    │                │
  │                       │────────────────────────►│                    │                │
  │                       │◄────────────────────────│ {size, ...}        │                │
  │                       │ INSERT ocr_document      │                    │                │
  │                       │ INSERT invoice (OCR_PROCESSING)               │                │
  │                       │ Queue.send(job)          │                   ►│                │
  │◄──────────────────────│ 202 {invoiceId}          │                    │                │
  │                       │                         │                    │  batch.messages │
  │                       │                         │                    │ ────────────────►
  │                       │                         │  R2.get(r2Key)     │                │
  │                       │                         │◄───────────────────────────────────│
  │                       │                         │ fileBytes ─────────────────────────►
  │                       │                         │                    │  extractText() │
  │                       │                         │                    │  extractData() │
  │                       │                         │                    │  UPDATE invoice │
  │                       │                         │                    │  msg.ack()      │
```

---

## Step 1: Presigned Upload URL

**Endpoint:** `POST /api/files/upload-url`

**Request:**
```json
{
  "fileName": "invoice_2024.pdf",
  "fileType": "pdf",
  "fileSize": 524288
}
```

**Validation:**
- `fileType` must be one of: `pdf`, `jpg`, `jpeg`, `png`
- `fileSize` must not exceed `MAX_FILE_SIZE_MB` (default 10 MB)
- Returns 422 if either check fails — before any storage operation

**R2 key format:** `uploads/{userId}/{uuid}.{ext}`
- UUID prevents path traversal and filename collision
- Scoped to userId prevents cross-user access

**Presigned URL generation (aws4fetch):**
```typescript
const aws = new AwsClient({ accessKeyId, secretAccessKey, region: 'auto', service: 's3' });
const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${r2Key}`);
url.searchParams.set('X-Amz-Expires', '900'); // 15 minutes
const signed = await aws.sign(new Request(url, { method: 'PUT' }), { aws: { signQuery: true } });
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://...",
    "r2Key": "uploads/user-id/uuid.pdf",
    "expiresIn": 900
  }
}
```

---

## Step 2: Direct R2 Upload (Client)

The client performs a PUT directly to the presigned URL. The Worker is NOT involved in this step.

```javascript
await fetch(uploadUrl, {
  method: 'PUT',
  body: fileBlob,
  headers: { 'Content-Type': 'application/pdf' }
});
```

---

## Step 3: Confirm Upload

**Endpoint:** `POST /api/files/confirm`

**Request:**
```json
{ "r2Key": "uploads/user-id/uuid.pdf" }
```

**Operations:**
1. `FILE_BUCKET.head(r2Key)` — verifies file exists; re-checks size ≤ 10 MB
2. Detects file type from r2Key extension (second validation layer)
3. Creates `ocr_documents` record (`status = PENDING`)
4. Creates `invoices` record (`status = OCR_PROCESSING`, `ocr_document_id` set)
5. Enqueues OCR job via `OCR_QUEUE.send(job)`

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "invoiceId": "uuid",
    "ocrDocumentId": "uuid",
    "status": "OCR_PROCESSING"
  }
}
```

---

## Step 4: Queue Consumer (src/worker-queue.ts)

### OcrJob Interface
```typescript
interface OcrJob {
  ocrDocumentId: string;
  r2Key: string;
  fileType: string; // 'pdf' | 'jpg' | 'jpeg' | 'png'
  invoiceId: string;
  userId: string;
  businessId: string;
}
```

### Processing Flow

```
1. UPDATE ocr_documents SET status = 'PROCESSING'
2. FILE_BUCKET.get(r2Key) → Uint8Array
3. if PDF → extractPDFText(bytes)  [pdfjs-serverless]
   else    → extractImageText(bytes, env.AI)  [llama-3.2-11b-vision]
4. extractInvoiceData(rawText, env.AI)  [llama-3.3-70b JSON Mode]
5. validateExtractedFields(extracted)  → needsReview, reasons
6. UPDATE ocr_documents: raw_text, extracted_json, confidence_score, status='COMPLETED'
7. INSERT invoice_items (server computes all totals from extracted data)
8. UPDATE invoices: all extracted fields, status = needsReview ? 'REVIEW_REQUIRED' : 'READY_FOR_SUBMISSION'
9. msg.ack()

On error:
  UPDATE ocr_documents SET status = 'FAILED', processing_error = err.message
  UPDATE invoices SET status = 'REVIEW_REQUIRED'
  msg.retry()  → up to 3 retries, then → DLQ (lhdn-ocr-dlq)
```

---

## Step 4a: PDF Text Extraction (pdfjs-serverless)

**Module:** `src/modules/ocr/ocr.pdf-parser.ts`

```typescript
import { getDocument } from 'pdfjs-serverless';
const pdf = await getDocument({ data: pdfBytes }).promise;
let text = '';
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  text += content.items.map((item: any) => item.str).join(' ') + '\n';
}
```

**Notes:**
- `pdfjs-serverless` is an edge-compatible redistribution of Mozilla PDF.js
- No Node.js native modules (no canvas, no fs)
- Text-based PDFs only — scanned PDFs require the vision model path
- Dynamic import (`import('pdfjs-serverless')`) prevents bundling in main chunk

---

## Step 4b: Image OCR (Cloudflare Workers AI — Vision)

**Module:** `src/modules/ocr/ocr.image-extractor.ts`

**Model:** `@cf/meta/llama-3.2-11b-vision-instruct`

```typescript
const result = await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Extract all text exactly as it appears in this invoice...' },
      { type: 'image', image: Array.from(imageBytes) }
    ]
  }],
  max_tokens: 4096
});
return result.response as string;
```

**Notes:**
- Converts `Uint8Array` to `number[]` array (CF AI requirement)
- Output is raw extracted text; not structured yet
- Works for JPG and PNG; does not handle multi-page images

---

## Step 5: AI Structured Extraction (Cloudflare Workers AI — JSON Mode)

**Module:** `src/modules/ai-extraction/ai-extraction.service.ts`

**Model:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

Uses `response_format.type = 'json_schema'` to enforce structured output:

```typescript
const result = await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildExtractionPrompt(rawText) }
  ],
  response_format: {
    type: 'json_schema',
    json_schema: { name: 'InvoiceExtraction', schema: INVOICE_JSON_SCHEMA }
  },
  max_tokens: 2048
});
```

Output is validated against the `extractedInvoiceSchema` Zod schema before use.

### Extracted Invoice Schema (Zod)

```typescript
{
  supplier: { name, tin, registration_number, address, confidence: { name, tin, registration_number, address } }
  buyer: { name, tin, registration_number, email, phone, address, confidence: { name, tin } }
  invoice: { number, date, currency, confidence: { number, date } }
  line_items: [{ description, quantity, unit_price, tax_type, tax_rate, tax_amount, subtotal, total, confidence }]
  totals: { subtotal, tax_total, grand_total, confidence: { subtotal, tax_total, grand_total } }
  overall_confidence: number  // 0.0–1.0
}
```

---

## Step 6: Confidence-Based Status Decision

**Module:** `src/modules/ai-extraction/ai-extraction.validator.ts`

### Thresholds (from `src/config/constants.ts`)

| Constant | Value | Purpose |
|---|---|---|
| `AI_CONFIDENCE_OVERALL_AUTO_APPROVE` | 0.80 | Minimum overall confidence for READY_FOR_SUBMISSION |
| `AI_CONFIDENCE_OVERALL_MIN` | 0.75 | Below this → always REVIEW_REQUIRED |
| `AI_CONFIDENCE_CRITICAL_FIELD_MIN` | 0.60 | Any critical field below → REVIEW_REQUIRED |

### Critical Fields

- `supplier.name` — the business issuing the invoice
- `supplier.tin` — required for LHDN submission
- `invoice.number` — document identifier
- `invoice.date` — issue date (YYYY-MM-DD format)
- `totals.grand_total` — total payable amount

### Decision Logic

```
ANY critical field is null → REVIEW_REQUIRED
ANY critical field confidence < 0.60 → REVIEW_REQUIRED
overall_confidence < 0.75 → REVIEW_REQUIRED
line_items.length === 0 → REVIEW_REQUIRED
─────────────────────────────────────────────
All critical fields present + confidence ≥ 0.60 + overall ≥ 0.80 → READY_FOR_SUBMISSION
```

---

## Invoice Status Lifecycle

```
DRAFT                     — manually created (no file upload)
  │
  ▼
OCR_PROCESSING            — file uploaded, queue job running
  │
  ├──(low confidence/missing)──►  REVIEW_REQUIRED  ──(user corrects)──►  READY_FOR_SUBMISSION
  │                                                                                │
  └──(high confidence)─────────────────────────────────────────────────────────────┘
                                                                                   │
                                                                          SUBMITTED (→ LHDN async)
                                                                                   │
                                                              ┌────────────────────┘
                                                              │
                                                    VALIDATED / REJECTED
                                                              │
                                                         CANCELLED (VALIDATED only)
```

### Allowed Edits per Status

| Status | Edit | Delete | Finalize | Submit |
|---|---|---|---|---|
| DRAFT | ✓ | ✓ | ✓ | ✗ |
| OCR_PROCESSING | ✗ | ✗ | ✗ | ✗ |
| REVIEW_REQUIRED | ✓ | ✓ | ✓ | ✗ |
| READY_FOR_SUBMISSION | ✗ | ✗ | ✗ | ✓ |
| SUBMITTED | ✗ | ✗ | ✗ | ✗ |
| VALIDATED | ✗ | ✗ | ✗ | ✗ (cancel only) |
| REJECTED | ✗ | ✗ | ✗ | ✗ |
| CANCELLED | ✗ | ✗ | ✗ | ✗ |

---

## Monitoring & Debugging

### OCR Document Status Check

```
GET /api/files/{ocrDocumentId}
```

Returns `ocrStatus`, `confidenceScore`, `processingError`.

### Database Queries

```sql
-- All failed OCR documents
SELECT * FROM ocr_documents WHERE ocr_status = 'FAILED' ORDER BY created_at DESC;

-- Low-confidence extractions
SELECT * FROM ocr_documents WHERE CAST(confidence_score AS REAL) < 0.75;

-- Stuck in OCR_PROCESSING (queue may have dropped)
SELECT i.id, i.status, o.ocr_status, i.created_at
FROM invoices i
JOIN ocr_documents o ON o.id = i.ocr_document_id
WHERE i.status = 'OCR_PROCESSING'
  AND i.created_at < datetime('now', '-10 minutes');
```

### Dead Letter Queue

Failed jobs after 3 retries land in `lhdn-ocr-dlq`. Monitor via:
```bash
wrangler queues list
# View DLQ messages in Cloudflare Dashboard → Queues → lhdn-ocr-dlq
```

---

## Security Considerations

- **File type validation:** Checked twice — on upload-url request (extension) and on confirm (R2 HEAD + re-check extension)
- **File size validation:** Checked on upload-url request AND re-validated on confirm via R2 HEAD (prevents upload-URL abuse)
- **R2 key scoping:** Keys include `{userId}` segment — presigned URL can only write to that path
- **Queue poisoning:** Each job validates its own inputs; `msg.retry()` is bounded by `max_retries = 3`
- **Raw text storage:** `ocr_documents.raw_text` stores intermediate extraction; not exposed via API
- **Extracted JSON storage:** `ocr_documents.extracted_json` is stored for audit; not directly exposed
- **No AI hallucination bypass:** All extracted data passes Zod validation before write; confidence scores drive status — user always reviews before LHDN submission
