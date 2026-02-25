import type { R2Bucket } from '@cloudflare/workers-types';
import { PDF_STORAGE_PREFIX } from '../../config/constants.js';

export function getPdfStorageKey(invoiceId: string): string {
  return `${PDF_STORAGE_PREFIX}/${invoiceId}.pdf`;
}

export async function putPdf(bucket: R2Bucket, key: string, pdfBytes: Uint8Array): Promise<void> {
  await bucket.put(key, pdfBytes, {
    httpMetadata: { contentType: 'application/pdf' },
  });
}

export async function getPdf(bucket: R2Bucket, key: string): Promise<ReadableStream | null> {
  const object = await bucket.get(key);
  if (!object) return null;
  return object.body;
}
