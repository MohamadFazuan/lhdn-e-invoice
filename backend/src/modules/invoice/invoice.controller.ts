import type { Context } from 'hono';
import type { Env } from '../../env.js';
import type { CreateInvoiceDto, UpdateInvoiceDto, ListInvoicesQueryDto } from './invoice.dto.js';
import type { InvoiceService } from './invoice.service.js';
import { successResponse } from '../../types/api-response.js';

export class InvoiceController {
  constructor(private readonly service: InvoiceService) {}

  async list(c: Context<{ Bindings: Env; Variables: { businessId: string } }>) {
    const businessId = c.get('businessId');
    const query = c.req.valid('query' as never) as ListInvoicesQueryDto;
    const result = await this.service.list(businessId, query);
    return c.json(successResponse(result));
  }

  async getById(c: Context<{ Bindings: Env; Variables: { businessId: string } }>) {
    const businessId = c.get('businessId');
    const { id } = c.req.param();
    const result = await this.service.getById(id, businessId);
    return c.json(successResponse(result));
  }

  async create(c: Context<{ Bindings: Env; Variables: { businessId: string } }>) {
    const businessId = c.get('businessId');
    const dto = c.req.valid('json' as never) as CreateInvoiceDto;
    const result = await this.service.create(businessId, dto);
    return c.json(successResponse(result), 201);
  }

  async update(c: Context<{ Bindings: Env; Variables: { businessId: string } }>) {
    const businessId = c.get('businessId');
    const { id } = c.req.param();
    const dto = c.req.valid('json' as never) as UpdateInvoiceDto;
    const result = await this.service.update(id, businessId, dto);
    return c.json(successResponse(result));
  }

  async finalize(c: Context<{ Bindings: Env; Variables: { businessId: string } }>) {
    const businessId = c.get('businessId');
    const { id } = c.req.param();
    const result = await this.service.finalize(id, businessId);
    return c.json(successResponse(result));
  }

  async delete(c: Context<{ Bindings: Env; Variables: { businessId: string } }>) {
    const businessId = c.get('businessId');
    const { id } = c.req.param();
    await this.service.delete(id, businessId);
    return c.json(successResponse(null), 204);
  }
}
