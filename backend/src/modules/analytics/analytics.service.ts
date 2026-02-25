import { eq, and, gte, lte, sql, count, desc } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import { invoices } from '../../db/schema/index.js';
import type { AnalyticsQueryDto } from './analytics.dto.js';

export class AnalyticsService {
  constructor(private readonly db: DrizzleDB) {}

  /** KPI summary: invoice counts by status + totals */
  async getSummary(businessId: string) {
    const rows = await this.db
      .select({
        status: invoices.status,
        count: count(),
        totalGrandTotal: sql<string>`CAST(COALESCE(SUM(CAST(${invoices.grandTotal} AS REAL)), 0) AS TEXT)`,
        totalTaxTotal: sql<string>`CAST(COALESCE(SUM(CAST(${invoices.taxTotal} AS REAL)), 0) AS TEXT)`,
      })
      .from(invoices)
      .where(eq(invoices.businessId, businessId))
      .groupBy(invoices.status);

    const totals = rows.reduce(
      (acc, r) => {
        acc.totalRevenue += parseFloat(r.totalGrandTotal);
        acc.totalTax += parseFloat(r.totalTaxTotal);
        acc.totalInvoices += r.count;
        return acc;
      },
      { totalRevenue: 0, totalTax: 0, totalInvoices: 0 },
    );

    return {
      byStatus: rows.map((r) => ({
        status: r.status,
        count: r.count,
        totalRevenue: r.totalGrandTotal,
        totalTax: r.totalTaxTotal,
      })),
      totals: {
        totalInvoices: totals.totalInvoices,
        totalRevenue: totals.totalRevenue.toFixed(2),
        totalTax: totals.totalTax.toFixed(2),
      },
    };
  }

  /** Revenue trend grouped by day / week / month */
  async getRevenueTrend(businessId: string, opts: AnalyticsQueryDto) {
    const conditions = [eq(invoices.businessId, businessId)];
    if (opts.from) conditions.push(gte(invoices.issueDate, opts.from));
    if (opts.to) conditions.push(lte(invoices.issueDate, opts.to));

    const groupExpr =
      opts.granularity === 'day'
        ? sql<string>`SUBSTR(${invoices.issueDate}, 1, 10)`
        : opts.granularity === 'week'
          ? sql<string>`STRFTIME('%Y-W%W', ${invoices.issueDate})`
          : sql<string>`SUBSTR(${invoices.issueDate}, 1, 7)`;

    const rows = await this.db
      .select({
        period: groupExpr.as('period'),
        count: count(),
        totalRevenue: sql<string>`CAST(COALESCE(SUM(CAST(${invoices.grandTotal} AS REAL)), 0) AS TEXT)`,
        totalTax: sql<string>`CAST(COALESCE(SUM(CAST(${invoices.taxTotal} AS REAL)), 0) AS TEXT)`,
      })
      .from(invoices)
      .where(and(...conditions))
      .groupBy(groupExpr)
      .orderBy(groupExpr);

    return rows;
  }

  /** % of invoices rejected in a date range */
  async getRejectionRate(businessId: string, opts: Pick<AnalyticsQueryDto, 'from' | 'to'>) {
    const conditions = [eq(invoices.businessId, businessId)];
    if (opts.from) conditions.push(gte(invoices.issueDate, opts.from));
    if (opts.to) conditions.push(lte(invoices.issueDate, opts.to));

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(invoices)
      .where(and(...conditions));

    const [rejectedRow] = await this.db
      .select({ total: count() })
      .from(invoices)
      .where(and(...conditions, eq(invoices.status, 'REJECTED')));

    const total = totalRow?.total ?? 0;
    const rejected = rejectedRow?.total ?? 0;
    const rate = total > 0 ? ((rejected / total) * 100).toFixed(2) : '0.00';

    return { total, rejected, rejectionRatePercent: rate };
  }

  /** Top N buyers by grand total */
  async getTopBuyers(businessId: string, limit = 10) {
    const rows = await this.db
      .select({
        buyerName: invoices.buyerName,
        buyerTin: invoices.buyerTin,
        invoiceCount: count(),
        totalRevenue: sql<string>`CAST(COALESCE(SUM(CAST(${invoices.grandTotal} AS REAL)), 0) AS TEXT)`,
      })
      .from(invoices)
      .where(eq(invoices.businessId, businessId))
      .groupBy(invoices.buyerName, invoices.buyerTin)
      .orderBy(desc(sql`SUM(CAST(${invoices.grandTotal} AS REAL))`))
      .limit(limit);

    return rows;
  }

  /** Invoice count by type (01, 02, 03, 04) */
  async getInvoiceVolume(businessId: string) {
    const rows = await this.db
      .select({
        invoiceType: invoices.invoiceType,
        count: count(),
        totalRevenue: sql<string>`CAST(COALESCE(SUM(CAST(${invoices.grandTotal} AS REAL)), 0) AS TEXT)`,
      })
      .from(invoices)
      .where(eq(invoices.businessId, businessId))
      .groupBy(invoices.invoiceType)
      .orderBy(invoices.invoiceType);

    return rows;
  }
}
