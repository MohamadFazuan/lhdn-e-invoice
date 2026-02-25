import type { Context } from 'hono';
import type { Env } from '../../env.js';
import type { AnalyticsService } from './analytics.service.js';
import { analyticsQueryDto } from './analytics.dto.js';

type AppContext = Context<{ Bindings: Env }>;

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  async summary(c: AppContext) {
    const businessId = c.get('businessId') as string;
    const data = await this.service.getSummary(businessId);
    return c.json({ success: true, data });
  }

  async revenue(c: AppContext) {
    const businessId = c.get('businessId') as string;
    const parsed = analyticsQueryDto.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.flatten() }, 400);
    }
    const data = await this.service.getRevenueTrend(businessId, parsed.data);
    return c.json({ success: true, data });
  }

  async rejectionRate(c: AppContext) {
    const businessId = c.get('businessId') as string;
    const { searchParams } = new URL(c.req.url);
    const data = await this.service.getRejectionRate(businessId, {
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    });
    return c.json({ success: true, data });
  }

  async topBuyers(c: AppContext) {
    const businessId = c.get('businessId') as string;
    const limit = Math.min(Number(c.req.query('limit') ?? 10), 50);
    const data = await this.service.getTopBuyers(businessId, limit);
    return c.json({ success: true, data });
  }

  async invoiceVolume(c: AppContext) {
    const businessId = c.get('businessId') as string;
    const data = await this.service.getInvoiceVolume(businessId);
    return c.json({ success: true, data });
  }
}
