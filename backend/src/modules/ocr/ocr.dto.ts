export interface OcrDocumentResponse {
  id: string;
  invoiceId: string | null;
  userId: string;
  businessId: string;
  r2Key: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  ocrStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  confidenceScore: string | null;
  processingError: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
