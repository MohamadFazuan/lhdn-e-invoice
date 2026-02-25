# Security Model

## Authentication

### Access Token (JWT)
- Algorithm: HS256
- Expiry: 15 minutes
- Payload: `{ sub: userId, role: "USER"|"ADMIN", iat, exp, jti }`
- Transport: `Authorization: Bearer <token>` header
- Verified on every protected route via `auth.middleware.ts`
- Never stored in DB

### Refresh Token
- Generation: `crypto.randomUUID()` (128-bit entropy)
- Storage: **SHA-256 hash only** stored in `refresh_tokens.token_hash`
- Transport: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800` cookie
- Expiry: 7 days
- Rotation: **Single-use** — revoked immediately on use, new token issued
- Revocation: `revoked_at` timestamp set; query filters `WHERE revoked_at IS NULL`

**Compromise scenario:** If DB is breached, only SHA-256 hashes are exposed — not usable tokens.
If a refresh token cookie is stolen, the legitimate user's next refresh will fail
(stored hash deleted), alerting to the compromise through `401 UNAUTHORIZED`.

### Logout All Devices
`revokeAllUserTokens(userId)` sets `revoked_at` on all active refresh tokens for a user.
Useful for security incident response.

## Password Policy (Zod validation)
- Minimum 8 characters, maximum 72 (bcrypt limit)
- Must contain: 1 uppercase letter, 1 digit, 1 special character
- Hashing: bcrypt, cost factor 10 (~100ms per hash — prevents brute force)

## Encryption at Rest

### LHDN Credentials (client_id, client_secret, access_token)
- Algorithm: AES-GCM-256
- Key: 32-byte (64 hex chars) `ENCRYPTION_KEY` stored as CF Worker secret
- IV: Random 12 bytes generated per encryption operation
- Storage format: `base64(iv + ciphertext)` — IV is prepended, not separate
- Same plaintext always produces different ciphertext (IV randomness)

**Key rotation:** To rotate the encryption key:
1. Decrypt all encrypted fields with old key
2. Re-encrypt with new key
3. Update `ENCRYPTION_KEY` Worker secret
4. Never expose plaintext credentials in logs or API responses

## Authorization

### Role-Based Access Control (RBAC)
| Role | Access |
|---|---|
| `USER` | Own business + own invoices only |
| `ADMIN` | All resources (support/ops access) |

Role is embedded in JWT payload. `requireRole()` middleware enforces it.

### Ownership Validation Chain
Every resource access validates the full ownership chain:
```
userId (from JWT) → business.user_id → invoice.business_id
```

Example in `invoice.service.ts`:
```typescript
const business = await businessRepo.findByUserId(userId);
if (!business) throw new NotFoundError('Business');

const invoice = await invoiceRepo.findById(invoiceId);
if (!invoice) throw new NotFoundError('Invoice');
if (invoice.businessId !== business.id) throw new OwnershipError();
```

The `OwnershipError` returns HTTP 403 (not 404) — existence of the resource is not revealed.

## Rate Limiting

- Limit: 100 requests per minute per IP
- Implementation: Cloudflare KV sliding-window (1-minute time buckets)
- Key format: `rl:${ip}:${Math.floor(Date.now() / 60000)}`
- KV TTL: 120 seconds (auto-cleanup of old buckets)
- Response: HTTP 429 with `Retry-After: 60` header
- Applied to all `/api/*` routes (including auth endpoints)
- IP extracted from `CF-Connecting-IP` header (Cloudflare-injected, cannot be spoofed)

**Note:** CF KV has eventual consistency — rate limiting is "best effort" protection.
For precision rate limiting in production, use Cloudflare's native Rate Limiting API.

## Input Validation

- All request bodies: Zod schema validation via `validateBody()` middleware
- All URL params: Zod validation via `validateParams()` middleware
- All query strings: Zod validation via `validateQuery()` middleware
- Validation errors return HTTP 422 with field-level error details
- String fields have `max()` length limits to prevent oversized payloads

## Financial Data Integrity

Client-supplied totals are **always ignored**. The server recomputes:
```
lineItem.subtotal = round(quantity × unitPrice, 2)
lineItem.taxAmount = round(subtotal × taxRate/100, 2)
invoice.subtotal = Σ lineItem.subtotal
invoice.taxTotal = Σ lineItem.taxAmount
invoice.grandTotal = subtotal + taxTotal
```

`validateInvoiceTotals()` in `src/modules/invoice/invoice-totals.validator.ts` is a pure function
called before any LHDN submission. Inconsistent data is rejected with HTTP 422.

## HTTP Security Headers

Set by `secure-headers.middleware.ts` on every response:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Error Response Policy

- Production: Never expose stack traces, internal paths, DB queries, or detailed error messages
- All 500 errors log full detail server-side but return only:
  ```json
  { "success": false, "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred" } }
  ```
- Validation errors (422): field-level details are safe to expose
- Authentication errors (401/403): generic messages only

## PDF Security

- PDFs stored in R2 — not publicly accessible
- Access requires valid JWT + ownership validation
- `Content-Disposition: attachment` prevents inline browser display
- `Cache-Control: private, no-cache` prevents proxy caching

## Secrets Management

| Secret | Storage | How to set |
|---|---|---|
| `JWT_ACCESS_SECRET` | CF Worker Secret | `wrangler secret put JWT_ACCESS_SECRET` |
| `JWT_REFRESH_SECRET` | CF Worker Secret | `wrangler secret put JWT_REFRESH_SECRET` |
| `ENCRYPTION_KEY` | CF Worker Secret | `wrangler secret put ENCRYPTION_KEY` |

Generate values:
```bash
openssl rand -hex 32   # for JWT secrets and ENCRYPTION_KEY
```

**Never** store secrets in:
- `wrangler.toml` (committed to git)
- `.env` files (committed to git)
- Code comments or logs

For local development, use `.dev.vars` (gitignored):
```
JWT_ACCESS_SECRET=<value>
JWT_REFRESH_SECRET=<value>
ENCRYPTION_KEY=<value>
```
