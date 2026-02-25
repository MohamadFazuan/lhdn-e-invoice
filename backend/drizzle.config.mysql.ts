import type { Config } from 'drizzle-kit';

export default {
  dialect: 'mysql',
  schema: './src/db/schema/index.ts',
  out: './migrations/mysql',
  dbCredentials: {
    host: process.env['MYSQL_HOST'] ?? 'localhost',
    port: parseInt(process.env['MYSQL_PORT'] ?? '3306'),
    user: process.env['MYSQL_USER'] ?? 'root',
    password: process.env['MYSQL_PASSWORD'] ?? '',
    database: process.env['MYSQL_DATABASE'] ?? 'lhdn_einvoice',
  },
} satisfies Config;
