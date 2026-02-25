import { z } from 'zod';
import { ALLOWED_FILE_TYPES } from '../../config/constants.js';

export const uploadRequestDto = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.enum(ALLOWED_FILE_TYPES as unknown as [string, ...string[]]),
  fileSize: z
    .number()
    .int()
    .positive('File size must be a positive integer (bytes)'),
});

export const confirmUploadDto = z.object({
  r2Key: z
    .string()
    .min(1)
    .regex(/^uploads\/[^/]+\/[^/]+$/, 'Invalid R2 key format'),
  /** Optional: link this upload to an existing document bulk-import session. */
  bulkSessionId: z.string().optional(),
});

export type UploadRequestDto = z.infer<typeof uploadRequestDto>;
export type ConfirmUploadDto = z.infer<typeof confirmUploadDto>;

export interface UploadUrlResponse {
  uploadUrl: string;
  r2Key: string;
  expiresIn: number; // seconds
}

export interface ConfirmUploadResponse {
  invoiceId: string;
  ocrDocumentId: string;
  status: 'OCR_PROCESSING';
}
