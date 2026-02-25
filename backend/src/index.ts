import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env.js';
import { secureHeadersMiddleware } from './middleware/secure-headers.middleware.js';
import { globalErrorHandler } from './middleware/error-handler.middleware.js';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { businessRoutes } from './modules/business/business.routes.js';
import { fileStorageRoutes } from './modules/file-storage/file-storage.routes.js';
import { invoiceRoutes } from './modules/invoice/invoice.routes.js';
import { lhdnRoutes } from './modules/lhdn/lhdn.routes.js';
import { pdfRoutes } from './modules/pdf/pdf.routes.js';
import { teamRoutes } from './modules/team/team.routes.js';
import { notificationRoutes } from './modules/notification/notification.routes.js';
import { buyerPortalRoutes } from './modules/buyer-portal/buyer-portal.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { bulkImportRoutes } from './modules/bulk-import/bulk-import.routes.js';

const app = new Hono<{ Bindings: Env }>();

// ─── Global middleware ────────────────────────────────────────────────────────
app.use('*', secureHeadersMiddleware());
app.onError(globalErrorHandler);
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow any origin in dev; lock down in production via environment check
      return origin ?? '*';
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
);
app.use('/api/*', rateLimitMiddleware());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

// ─── API routes ───────────────────────────────────────────────────────────────
app.route('/api/auth', authRoutes());
app.route('/api/users', userRoutes());
app.route('/api/businesses', businessRoutes());
app.route('/api/files', fileStorageRoutes());
app.route('/api/invoices', invoiceRoutes());
app.route('/api/lhdn', lhdnRoutes());
app.route('/api/pdf', pdfRoutes());
app.route('/api/team', teamRoutes());
app.route('/api/notifications', notificationRoutes());
app.route('/api/portal', buyerPortalRoutes());       // public — no auth middleware at router level
app.route('/api/analytics', analyticsRoutes());
app.route('/api/bulk-import', bulkImportRoutes());

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.notFound((c) =>
  c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }, 404),
);

export default app;
