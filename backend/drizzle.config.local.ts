import type { Config } from 'drizzle-kit';

// Points directly at the local Wrangler D1 SQLite file.
// Used by: npm run db:studio
export default {
  dialect: 'sqlite',
  schema: './src/db/schema/index.ts',
  dbCredentials: {
    url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/bee71248915aaa54fb491932b5f79b0e5e467176e4d2113937d811c60982562f.sqlite',
  },
} satisfies Config;
