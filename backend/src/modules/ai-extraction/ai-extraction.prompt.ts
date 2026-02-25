export const SYSTEM_PROMPT = `You are an expert Malaysian invoice data extraction assistant.
Your job is to extract structured information from invoice text and return it as valid JSON.

Rules:
- Extract data exactly as it appears in the invoice text.
- For Malaysian invoices: TIN format is typically C/E/F/IG/NA/OA/P-XXXXXXXXXX (letters followed by digits).
- Dates must be in ISO 8601 format: YYYY-MM-DD.
- Amounts must be numbers (float), not strings.
- Use null for fields that cannot be found in the text.
- Confidence scores (0.0–1.0) reflect how certain you are about each extracted value:
  - 0.9–1.0: clearly present, unambiguous
  - 0.7–0.89: present but potentially ambiguous
  - 0.5–0.69: partially present or inferred
  - 0.0–0.49: guessed or uncertain
- Tax type codes: 01=SST, 02=Tourism Tax, E=Exempt, AE=Zero-rated, NA=Not applicable
- Return ONLY valid JSON matching the schema. No explanation text.`;

export function buildExtractionPrompt(rawText: string): string {
  return `Extract all invoice data from the following text and return a JSON object.

The JSON must follow this exact schema:
{
  "supplier": {
    "name": string|null,
    "tin": string|null,
    "registration_number": string|null,
    "address": string|null,
    "confidence": { "name": number, "tin": number, "registration_number": number, "address": number }
  },
  "buyer": {
    "name": string|null,
    "tin": string|null,
    "registration_number": string|null,
    "email": string|null,
    "phone": string|null,
    "address": string|null,
    "confidence": { "name": number, "tin": number }
  },
  "invoice": {
    "number": string|null,
    "date": string|null,
    "currency": string,
    "confidence": { "number": number, "date": number }
  },
  "line_items": [{
    "description": string,
    "quantity": number,
    "unit_price": number,
    "tax_type": "01"|"02"|"E"|"AE"|"NA",
    "tax_rate": number,
    "tax_amount": number,
    "subtotal": number,
    "total": number,
    "confidence": number
  }],
  "totals": {
    "subtotal": number|null,
    "tax_total": number|null,
    "grand_total": number|null,
    "confidence": { "subtotal": number, "tax_total": number, "grand_total": number }
  },
  "overall_confidence": number
}

Invoice text:
---
${rawText}
---`;
}

// JSON schema for CF Workers AI response_format enforcement
export const INVOICE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    supplier: {
      type: 'object',
      properties: {
        name: { type: ['string', 'null'] },
        tin: { type: ['string', 'null'] },
        registration_number: { type: ['string', 'null'] },
        address: { type: ['string', 'null'] },
        confidence: {
          type: 'object',
          properties: {
            name: { type: 'number' },
            tin: { type: 'number' },
            registration_number: { type: 'number' },
            address: { type: 'number' },
          },
          required: ['name', 'tin', 'registration_number', 'address'],
        },
      },
      required: ['name', 'tin', 'registration_number', 'address', 'confidence'],
    },
    buyer: {
      type: 'object',
      properties: {
        name: { type: ['string', 'null'] },
        tin: { type: ['string', 'null'] },
        registration_number: { type: ['string', 'null'] },
        email: { type: ['string', 'null'] },
        phone: { type: ['string', 'null'] },
        address: { type: ['string', 'null'] },
        confidence: {
          type: 'object',
          properties: {
            name: { type: 'number' },
            tin: { type: 'number' },
          },
          required: ['name', 'tin'],
        },
      },
      required: ['name', 'tin', 'registration_number', 'email', 'phone', 'address', 'confidence'],
    },
    invoice: {
      type: 'object',
      properties: {
        number: { type: ['string', 'null'] },
        date: { type: ['string', 'null'] },
        currency: { type: 'string' },
        confidence: {
          type: 'object',
          properties: { number: { type: 'number' }, date: { type: 'number' } },
          required: ['number', 'date'],
        },
      },
      required: ['number', 'date', 'currency', 'confidence'],
    },
    line_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          quantity: { type: 'number' },
          unit_price: { type: 'number' },
          tax_type: { type: 'string', enum: ['01', '02', 'E', 'AE', 'NA'] },
          tax_rate: { type: 'number' },
          tax_amount: { type: 'number' },
          subtotal: { type: 'number' },
          total: { type: 'number' },
          confidence: { type: 'number' },
        },
        required: ['description', 'quantity', 'unit_price', 'tax_type', 'tax_rate', 'tax_amount', 'subtotal', 'total', 'confidence'],
      },
    },
    totals: {
      type: 'object',
      properties: {
        subtotal: { type: ['number', 'null'] },
        tax_total: { type: ['number', 'null'] },
        grand_total: { type: ['number', 'null'] },
        confidence: {
          type: 'object',
          properties: {
            subtotal: { type: 'number' },
            tax_total: { type: 'number' },
            grand_total: { type: 'number' },
          },
          required: ['subtotal', 'tax_total', 'grand_total'],
        },
      },
      required: ['subtotal', 'tax_total', 'grand_total', 'confidence'],
    },
    overall_confidence: { type: 'number' },
  },
  required: ['supplier', 'buyer', 'invoice', 'line_items', 'totals', 'overall_confidence'],
};
