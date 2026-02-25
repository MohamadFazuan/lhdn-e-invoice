import type { Context } from 'hono';
import type { Env } from '../../env.js';
import type { BulkImportService } from './bulk-import.service.js';
import { AppError } from '../../errors/app-error.js';
import { successResponse } from '../../types/api-response.js';

type AppContext = Context<{ Bindings: Env }>;

export class BulkImportController {
  constructor(private readonly service: BulkImportService) {}

  // ── CSV upload ──────────────────────────────────────────────────────────

  async upload(c: AppContext) {
    const businessId = c.get('businessId') as string;
    const userId = c.get('userId') as string;

    const formData = await c.req.formData().catch(() => null);
    if (!formData) throw new AppError(400, 'INVALID_REQUEST', 'Expected multipart/form-data');

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      throw new AppError(400, 'MISSING_FILE', 'A CSV file must be provided under the "file" field');
    }

    const record = await this.service.initiateUpload(businessId, userId, file);
    return c.json(successResponse(record), 202);
  }

  // ── Document session ────────────────────────────────────────────────────

  async createSession(c: AppContext) {
    const businessId = c.get('businessId') as string;
    const userId = c.get('userId') as string;
    const session = await this.service.createDocumentSession(businessId, userId);
    return c.json(successResponse(session), 201);
  }

  async getSessionInvoices(c: AppContext) {
    const id = c.req.param('id');
    const businessId = c.get('businessId') as string;
    const result = await this.service.getSessionWithInvoices(id, businessId);
    return c.json(successResponse(result));
  }

  // ── Shared ──────────────────────────────────────────────────────────────

  async getStatus(c: AppContext) {
    const id = c.req.param('id');
    const businessId = c.get('businessId') as string;
    const record = await this.service.getStatus(id, businessId);
    return c.json(successResponse(record));
  }

  async list(c: AppContext) {
    const businessId = c.get('businessId') as string;
    const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);
    const offset = Number(c.req.query('offset') ?? 0);
    const records = await this.service.list(businessId, limit, offset);
    return c.json(successResponse(records));
  }
}
