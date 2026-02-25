export interface Env {
  // Cloudflare bindings
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  FILE_BUCKET: R2Bucket;        // stores uploaded documents + generated PDFs
  AI: Ai;                       // Workers AI (OCR vision + extraction LLM)
  OCR_QUEUE: Queue;             // async OCR processing queue

  // Feature 2: Notification queue + Email Worker binding
  NOTIFICATION_QUEUE: Queue;    // async notification delivery queue
  EMAIL_SENDER: SendEmail;      // Cloudflare Email Workers sending binding

  // Feature 5: Bulk import queue
  BULK_IMPORT_QUEUE: Queue;     // async CSV bulk import processing queue

  // Secrets (set via wrangler secret put)
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ENCRYPTION_KEY: string;       // 64 hex chars = 32 bytes for AES-GCM-256
  R2_ACCESS_KEY_ID: string;     // R2 API token access key (for aws4fetch presigned URLs)
  R2_SECRET_ACCESS_KEY: string; // R2 API token secret key
  R2_ACCOUNT_ID: string;        // Cloudflare account ID

  // Vars (set in wrangler.toml [vars])
  NODE_ENV: string;
  LHDN_ENV: 'sandbox' | 'production';
  BCRYPT_SALT_ROUNDS: string;
  MAX_FILE_SIZE_MB: string;     // default "10"
  R2_FILE_BUCKET_NAME: string;  // bucket name for presigned URL path construction
  APP_URL: string;              // e.g. "https://app.yourdomain.com" — used in email links
  FROM_EMAIL: string;           // e.g. "noreply@yourdomain.com"
}
