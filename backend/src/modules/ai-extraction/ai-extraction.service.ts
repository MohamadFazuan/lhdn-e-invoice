import { extractedInvoiceSchema, type ExtractedInvoice } from './ai-extraction.dto.js';
import { SYSTEM_PROMPT, buildExtractionPrompt, INVOICE_JSON_SCHEMA } from './ai-extraction.prompt.js';
import { OcrProcessingError } from '../../errors/ocr-errors.js';

export async function extractInvoiceData(rawText: string, ai: Ai): Promise<ExtractedInvoice> {
  if (!rawText || rawText.trim().length < 10) {
    throw new OcrProcessingError('Extracted text is too short to process');
  }

  const result = await (ai as any).run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildExtractionPrompt(rawText) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'InvoiceExtraction', schema: INVOICE_JSON_SCHEMA },
    },
    max_tokens: 2048,
  });

  const rawJson = (result as any).response as string;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new OcrProcessingError('AI returned invalid JSON');
  }

  const validated = extractedInvoiceSchema.safeParse(parsed);
  if (!validated.success) {
    throw new OcrProcessingError(`AI extraction schema validation failed: ${validated.error.message}`);
  }

  return validated.data;
}
