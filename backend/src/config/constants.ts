export const JWT_ACCESS_EXPIRY = '15m' as const;
export const JWT_REFRESH_EXPIRY = '7d' as const;
export const JWT_REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export const REFRESH_COOKIE_NAME = 'refresh_token' as const;
export const REFRESH_COOKIE_PATH = '/api/auth' as const;

export const RATE_LIMIT_MAX_REQUESTS = 100;
export const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
export const RATE_LIMIT_KV_TTL_SECONDS = 120; // auto-cleanup after 2 minutes

// Stricter limit for presigned URL endpoint (5 per minute per user)
export const UPLOAD_RATE_LIMIT_MAX_REQUESTS = 5;

export const LHDN_TOKEN_BUFFER_SECONDS = 60; // refresh token 60s before expiry
export const LHDN_TOKEN_EXPIRY_SECONDS = 3600; // LHDN tokens are valid for 60 minutes

export const INVOICE_TOTAL_TOLERANCE = 0.01; // 1 sen tolerance for float comparison

export const PDF_STORAGE_PREFIX = 'invoices' as const;
export const FILE_UPLOAD_PREFIX = 'uploads' as const;
export const BULK_IMPORT_STORAGE_PREFIX = 'bulk-imports' as const;

// Buyer portal token expiry (90 days for validated e-receipts)
export const BUYER_PORTAL_TOKEN_EXPIRY_DAYS = 90;

// Bulk import limits
export const BULK_IMPORT_MAX_ROWS = 500;
export const BULK_IMPORT_MAX_FILE_MB = 5;

export const ALLOWED_FILE_TYPES = ['pdf', 'jpg', 'jpeg', 'png'] as const;
export const PRESIGNED_URL_EXPIRY_SECONDS = 900; // 15 minutes

// AI confidence thresholds for OCR extraction
export const AI_CONFIDENCE_OVERALL_MIN = 0.75; // below this → REVIEW_REQUIRED
export const AI_CONFIDENCE_OVERALL_AUTO_APPROVE = 0.80; // at or above → READY_FOR_SUBMISSION
export const AI_CONFIDENCE_CRITICAL_FIELD_MIN = 0.60; // any critical field below → REVIEW_REQUIRED
