import type { Context } from 'hono';
import type { Env } from '../../env.js';
import type { PdfService } from './pdf.service.js';
import { successResponse } from '../../types/api-response.js';

export class PdfController {
  constructor(private readonly service: PdfService) {}

  async generate(c: Context<{ Bindings: Env; Variables: { businessId: string } }>) {
    const businessId = c.get('businessId');
    const { id } = c.req.param();
    const result = await this.service.generate(id, businessId);
    return c.json(successResponse(result), 201);
  }

  async download(c: Context<{ Bindings: Env; Variables: { businessId: string } }>) {
    const businessId = c.get('businessId');
    const { id } = c.req.param();
    const stream = await this.service.getDownloadStream(id, businessId);
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  }
}
