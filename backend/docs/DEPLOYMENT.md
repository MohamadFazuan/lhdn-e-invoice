# Deployment Guide

## Phase 1: Cloudflare Workers

### Prerequisites
- Cloudflare account with Workers, D1, KV, R2 enabled
- Node.js 18+ and pnpm installed
- Wrangler CLI: `pnpm add -g wrangler` then `wrangler login`

### First-Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create Cloudflare resources
wrangler d1 create lhdn-einvoice-db
wrangler kv namespace create RATE_LIMIT_KV
wrangler r2 bucket create lhdn-einvoice-pdfs

# 3. Copy the IDs printed above into wrangler.toml
#    [[d1_databases]] database_id = "<id>"
#    [[kv_namespaces]] id = "<id>"
#    [[r2_buckets]] bucket_name already set

# 4. Set secrets (will prompt for value)
wrangler secret put JWT_ACCESS_SECRET
wrangler secret put JWT_REFRESH_SECRET
wrangler secret put ENCRYPTION_KEY

# 5. Apply database migrations
wrangler d1 migrations apply lhdn-einvoice-db

# 6. Deploy
wrangler deploy
```

### Staging Environment

Create separate resources for staging:
```bash
wrangler d1 create lhdn-einvoice-db-staging
wrangler kv namespace create RATE_LIMIT_KV --env staging
wrangler r2 bucket create lhdn-einvoice-pdfs-staging

# Apply migrations to staging
wrangler d1 migrations apply lhdn-einvoice-db-staging --env staging

# Deploy to staging
wrangler deploy --env staging
```

Staging uses `LHDN_ENV=sandbox` (set in `wrangler.toml` under `[env.staging]`).

### Local Development

```bash
# Create local .dev.vars (gitignored)
cat > .dev.vars <<EOF
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
NODE_ENV=development
LHDN_ENV=sandbox
BCRYPT_SALT_ROUNDS=10
EOF

# Apply migrations to local D1
wrangler d1 migrations apply lhdn-einvoice-db --local

# Start dev server
wrangler dev --local
```

### Adding a New Migration

```bash
# Create migration file
touch migrations/0003_your_migration_name.sql

# Edit the file with your SQL changes

# Apply locally
wrangler d1 migrations apply lhdn-einvoice-db --local

# Apply to production
wrangler d1 migrations apply lhdn-einvoice-db
```

### Monitoring

- Logs: `wrangler tail` (real-time log streaming)
- Analytics: Cloudflare dashboard → Workers → your worker
- D1: `wrangler d1 execute lhdn-einvoice-db --command "SELECT count(*) FROM invoices"`
- R2: Cloudflare dashboard → R2 → lhdn-einvoice-pdfs

---

## Phase 2: Node.js + MySQL on VPS

### What Changes

| Component | Cloudflare | VPS |
|---|---|---|
| Runtime | `src/index.ts` (Workers) | `src/index.node.ts` (Hono Node adapter) |
| DB client | `src/db/client.ts` (D1) | `src/db/client.mysql.ts` (MySQL2) |
| Rate limit | CF KV | Redis (ioredis) |
| Object storage | R2 | S3 / MinIO / local disk |
| Secrets | CF Worker secrets | `.env` file or secret manager |

**Zero changes required in:**
- All business logic (services)
- All repository interfaces
- All middleware (except rate-limit)
- All DTOs and validators
- All controllers and routes
- Database schema (Drizzle generates MySQL-compatible SQL)

### VPS Setup

```bash
# Install MySQL 8.0
sudo apt install mysql-server-8.0

# Install Redis
sudo apt install redis-server

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install nodejs

# Install dependencies (add mysql2 and ioredis)
pnpm add mysql2 ioredis @hono/node-server

# Set environment variables
cp .env.example .env
# Edit .env with production values

# Generate and apply MySQL schema
npx drizzle-kit generate --config drizzle.config.mysql.ts
npx drizzle-kit migrate --config drizzle.config.mysql.ts

# Start with PM2
pnpm add -g pm2
pm2 start dist/index.node.js --name lhdn-einvoice
pm2 save
pm2 startup
```

### Data Migration (D1 → MySQL)

```bash
# Export D1 data
wrangler d1 export lhdn-einvoice-db --output=d1-backup.sql

# The SQL is largely compatible. Review and import:
mysql -u root -p lhdn_einvoice < d1-backup.sql

# If date format issues arise, the ISO string format is identical in both DBs.
# Monetary values are VARCHAR strings — no conversion needed.
```

### VPS Entry Point (`src/index.node.ts`)

```typescript
import { serve } from '@hono/node-server';
import { createDb } from './db/client.mysql.js';  // ← only change vs workers
import { app } from './app.js';

serve({
  fetch: app.fetch,
  port: parseInt(process.env.PORT ?? '3000'),
});
```

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.my;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.my/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.my/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header CF-Connecting-IP $remote_addr;  # for rate limiting
    }
}
```
