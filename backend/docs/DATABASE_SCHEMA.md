# Database Schema Reference

## Design Decisions

### UUID Primary Keys (`VARCHAR(36)`)
All tables use UUID string PKs (`crypto.randomUUID()`). No `AUTO_INCREMENT`. This ensures:
- Distributed ID generation (no DB roundtrip to get an ID)
- Identical behavior in D1 and MySQL
- No sequential ID enumeration vulnerability

### Monetary Values as `VARCHAR(20)`
Stored as decimal strings (e.g., `"1060.00"`) to avoid IEEE 754 floating-point errors.
Service layer uses `Math.round(value * 100) / 100` before storage.
When comparing totals, a tolerance of `0.01` (1 sen) is allowed.

### Dates as `VARCHAR(30)` ISO 8601
SQLite (D1) has no native `DATETIME` type. ISO 8601 strings (`"2024-01-01T10:00:00.000Z"`) sort lexicographically and are timezone-unambiguous. They map 1:1 when migrating to MySQL `VARCHAR(30)` or can be converted to MySQL `DATETIME` columns.

### Booleans as `INTEGER` (0/1)
SQLite has no `BOOLEAN` type. `INTEGER` 0/1 is the standard SQLite convention and maps to MySQL `TINYINT(1)`.

### LHDN Response as `TEXT`
The full LHDN JSON response is stored as a serialized JSON string for full audit trail. In MySQL migration, this can be changed to a `JSON` column type.

## Tables

### `users`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| email | VARCHAR(255) UNIQUE | |
| password_hash | VARCHAR(255) | bcrypt, cost 10 |
| role | VARCHAR(10) | `USER` \| `ADMIN` |
| is_active | INTEGER | 0=deactivated, 1=active |
| created_at | VARCHAR(30) | ISO 8601 |
| updated_at | VARCHAR(30) | ISO 8601 |

### `businesses`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | UUID |
| user_id | VARCHAR(36) FK | → users.id, CASCADE DELETE |
| name | VARCHAR(255) | Company legal name |
| tin | VARCHAR(20) | LHDN Tax Identification Number |
| registration_number | VARCHAR(50) | SSM BRN |
| msic_code | VARCHAR(10) | 5-digit MSIC industry code |
| sst_registration_number | VARCHAR(50) | nullable |
| address_line0–2 | VARCHAR(255) | Street address lines |
| postal_zone | VARCHAR(10) | 5-digit postcode |
| city_name | VARCHAR(100) | |
| state_code | VARCHAR(5) | 2-char MY state code |
| country_code | VARCHAR(3) | Default: `MYS` |
| email | VARCHAR(255) | |
| phone | VARCHAR(20) | nullable |
| lhdn_client_id_encrypted | TEXT | AES-GCM-256 encrypted |
| lhdn_client_secret_encrypted | TEXT | AES-GCM-256 encrypted |
| is_active | INTEGER | |

### `invoices`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | |
| business_id | VARCHAR(36) FK | → businesses.id |
| invoice_number | VARCHAR(50) | Unique per business |
| invoice_type | VARCHAR(5) | `01`–`04` (LHDN type code) |
| status | VARCHAR(20) | `DRAFT`\|`SUBMITTED`\|`VALIDATED`\|`REJECTED`\|`CANCELLED` |
| buyer_* | various | Buyer info fields |
| currency_code | VARCHAR(3) | Default: `MYR` |
| subtotal | VARCHAR(20) | Server-computed |
| tax_total | VARCHAR(20) | Server-computed |
| grand_total | VARCHAR(20) | Server-computed |
| issue_date | VARCHAR(10) | `YYYY-MM-DD` |
| due_date | VARCHAR(10) | nullable |
| lhdn_uuid | VARCHAR(100) | LHDN document UUID (post-validation) |
| lhdn_submission_uid | VARCHAR(100) | From submission response |
| lhdn_validation_status | VARCHAR(20) | Raw LHDN status string |
| lhdn_response_payload | TEXT | Full JSON response (audit) |
| pdf_storage_key | VARCHAR(255) | R2 object key |

### `invoice_items`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | |
| invoice_id | VARCHAR(36) FK | → invoices.id, CASCADE DELETE |
| description | VARCHAR(500) | |
| classification_code | VARCHAR(10) | LHDN item classification |
| quantity | VARCHAR(20) | Decimal string |
| unit_code | VARCHAR(10) | UOM code (e.g., `KGM`, `UNT`) |
| unit_price | VARCHAR(20) | Decimal string |
| subtotal | VARCHAR(20) | `quantity * unit_price` |
| tax_type | VARCHAR(5) | `01`, `02`, `E`, `AE`, `NA` |
| tax_rate | VARCHAR(10) | Percentage as decimal string |
| tax_amount | VARCHAR(20) | `subtotal * tax_rate / 100` |
| total | VARCHAR(20) | `subtotal + tax_amount` |
| sort_order | INTEGER | Display ordering |

### `lhdn_tokens`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | |
| business_id | VARCHAR(36) FK UNIQUE | One token per business |
| access_token_encrypted | TEXT | AES-GCM-256 encrypted |
| expires_at | VARCHAR(30) | ISO 8601, with 60s buffer applied |

### `refresh_tokens`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) PK | |
| user_id | VARCHAR(36) FK | → users.id |
| token_hash | VARCHAR(64) UNIQUE | SHA-256 hex of raw token |
| expires_at | VARCHAR(30) | ISO 8601, 7-day window |
| revoked_at | VARCHAR(30) | NULL = active; set on use or logout |

## Indexes

```sql
-- Unique constraints (data integrity)
UNIQUE idx_users_email ON users(email)
UNIQUE idx_invoices_number_business ON invoices(business_id, invoice_number)
UNIQUE idx_lhdn_tokens_business ON lhdn_tokens(business_id)
UNIQUE idx_refresh_tokens_hash ON refresh_tokens(token_hash)

-- Performance indexes
idx_businesses_user_id ON businesses(user_id)
idx_invoices_business_id ON invoices(business_id)
idx_invoices_status ON invoices(status)
idx_invoice_items_invoice_id ON invoice_items(invoice_id)
idx_refresh_tokens_user_id ON refresh_tokens(user_id)
```

## D1 → MySQL Migration

1. `wrangler d1 export DB --output=backup.sql`
2. Run: `drizzle-kit migrate --config drizzle.config.mysql.ts`
3. Data: ISO date strings are identical in both; monetary VARCHAR strings are identical
4. MySQL-specific improvements (optional after migration):
   - Change `lhdn_response_payload TEXT` → `lhdn_response_payload JSON`
   - Change `is_active INTEGER` → `is_active TINYINT(1)`
   - Change date `VARCHAR(30)` → `DATETIME` columns (requires ETL script)
