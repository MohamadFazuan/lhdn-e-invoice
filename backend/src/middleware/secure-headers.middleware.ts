import type { MiddlewareHandler } from 'hono';

export function secureHeadersMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    c.res.headers.set('X-Content-Type-Options', 'nosniff');
    c.res.headers.set('X-Frame-Options', 'DENY');
    c.res.headers.set('X-XSS-Protection', '1; mode=block');
    c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.res.headers.set(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'",
    );
    c.res.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
  };
}
