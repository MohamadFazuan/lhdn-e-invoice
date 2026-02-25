# Architecture Overview

## Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers (Phase 1) / Node.js (Phase 2) |
| Framework | Hono v4 |
| Database | Cloudflare D1 (Phase 1) / MySQL (Phase 2) |
| ORM | Drizzle ORM |
| Object Storage | Cloudflare R2 |
| Rate Limit Cache | Cloudflare KV |
| Validation | Zod |
| JWT | jose (Web Crypto API) |
| Password Hash | bcryptjs |
| PDF | pdf-lib |
| Encryption | AES-GCM-256 (Web Crypto API) |

## Layer Separation

```
HTTP Request
    │
    ▼
[Middleware Layer]
  secure-headers → rate-limit → auth → validate
    │
    ▼
[Controller Layer]  ← parse validated DTO, call service, return response
    │                 NO business logic here
    ▼
[Service Layer]     ← all business rules, orchestration
    │                 NO direct DB queries
    ▼
[Repository Layer]  ← all DB queries, Drizzle ORM
    │                 NO business logic
    ▼
[Database]
  Cloudflare D1 (SQLite) or MySQL (VPS)
```

## Module Map

```
src/modules/
├── auth/        register, login, refresh token, logout
├── user/        profile management
├── business/    company profile + LHDN API credentials
├── invoice/     CRUD + line items + SST validation
├── lhdn/        OAuth, UBL builder, submission, status polling
└── pdf/         generation (pdf-lib) + storage (R2)
```

## Request Lifecycle

```
POST /api/invoices/:id/submit
  1. secure-headers middleware (sets HSTS, CSP, etc.)
  2. rate-limit middleware (check KV, increment counter)
  3. auth middleware (verify JWT, inject userId + role)
  4. validate middleware (Zod body/params schema)
  5. lhdn.controller → lhdn.service.submitInvoice()
       a. invoiceRepo.findById() → ownership check
       b. validateInvoiceTotals() [pure function]
       c. businessRepo.findByUserId() → get credentials
       d. lhdnTokenService.getValidToken() → decrypt/refresh LHDN token
       e. lhdnUblBuilder.buildUBLDocument() → LHDN JSON payload
       f. lhdnSigner.prepareDocumentForSubmission() → base64 + hash
       g. lhdnApiClient.submitDocuments() → LHDN sandbox/prod API
       h. invoiceRepo.update() → store submissionUID, status=SUBMITTED
  6. Return 200 { success: true, data: { submissionUID } }
```

## Portability Strategy (D1 → MySQL)

Only the repository layer and DB client change. Everything above it is identical.

```
D1 Path:    src/db/client.ts         (drizzle-orm/d1)
MySQL Path: src/db/client.mysql.ts   (drizzle-orm/mysql2)

Schema:     src/db/schema/*          (shared — same Drizzle table definitions)
Repos:      src/modules/*/**.repository.ts  (same queries, different driver)
```

Migration steps:
1. Export D1: `wrangler d1 export DB --output=backup.sql`
2. Apply MySQL schema: `drizzle-kit migrate --config drizzle.config.mysql.ts`
3. Import data: adapt backup.sql (ISO date strings are 1:1 compatible)
4. Swap `createDb()` import in entry point from D1 → MySQL client
5. Replace `RATE_LIMIT_KV` (CF KV) → Redis in rate-limit middleware

## Security Model

See [SECURITY.md](./SECURITY.md) for full details.

Key principles:
- JWT access tokens: 15-minute expiry, HS256
- Refresh tokens: single-use rotation, stored as SHA-256 hash only
- LHDN credentials: AES-GCM-256 encrypted at rest, never returned in API responses
- Ownership validation on every resource access (userId → businessId → resourceId)
- All input validated with Zod before reaching controllers
- No trust of client-supplied financial totals — server always recomputes
