import type { DrizzleDB } from '../../db/client.js';
import { auditLogs } from '../../db/schema/index.js';
import type { NewAuditLog } from '../../db/schema/index.js';

export class AuditLogRepository {
  constructor(private readonly db: DrizzleDB) {}

  // Insert-only — audit logs are never updated or deleted
  async insert(data: NewAuditLog): Promise<void> {
    await this.db.insert(auditLogs).values(data);
  }
}
