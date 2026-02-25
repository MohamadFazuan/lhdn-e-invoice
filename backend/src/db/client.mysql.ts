// VPS migration target — Node.js + MySQL
// This file is NOT bundled into the Cloudflare Worker.
// Usage: swap the import in src/index.node.ts from client.ts to client.mysql.ts
//
// pnpm add mysql2
// Then: import { createMysqlDb } from './db/client.mysql.js';

import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema/index.js';

export function createMysqlDb(connection: { host: string; user: string; password: string; database: string }) {
  // Dynamic import to avoid bundling mysql2 into the Worker
  // In Node.js runtime, mysql2 is available as a regular dependency
  const mysql2 = require('mysql2/promise') as typeof import('mysql2/promise');
  const pool = mysql2.createPool(connection);
  return drizzle(pool, { schema, mode: 'default' });
}

export type DrizzleMySQLDB = ReturnType<typeof createMysqlDb>;
