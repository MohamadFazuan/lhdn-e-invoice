import { AppError } from './app-error.js';

export class OcrProcessingError extends AppError {
  constructor(message = 'OCR processing failed') {
    super(500, 'OCR_PROCESSING_ERROR', message);
  }
}

export class UnsupportedFileTypeError extends AppError {
  constructor(fileType: string) {
    super(422, 'UNSUPPORTED_FILE_TYPE', `File type '${fileType}' is not supported. Allowed: pdf, jpg, jpeg, png`);
  }
}

export class FileTooLargeError extends AppError {
  constructor(maxMb: number) {
    super(422, 'FILE_TOO_LARGE', `File exceeds the maximum allowed size of ${maxMb} MB`);
  }
}

export class OcrDocumentNotFoundError extends AppError {
  constructor() {
    super(404, 'OCR_DOCUMENT_NOT_FOUND', 'OCR document not found');
  }
}
