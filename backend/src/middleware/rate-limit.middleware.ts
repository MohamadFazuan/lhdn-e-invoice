import type { MiddlewareHandler } from 'hono';
import type { Env } from '../env.js';
import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_KV_TTL_SECONDS } from '../config/constants.js';
import { errorResponse } from '../types/api-response.js';

export function rateLimitMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const ip =
      c.req.header('CF-Connecting-IP') ??
      c.req.header('X-Forwarded-For') ??
      'unknown';

    const windowKey = Math.floor(Date.now() / 60_000); // 1-minute bucket
    const kvKey = `rl:${ip}:${windowKey}`;

    const kv = c.env.RATE_LIMIT_KV;
    const current = await kv.get(kvKey);
    const count = current !== null ? parseInt(current, 10) : 0;

    if (count >= RATE_LIMIT_MAX_REQUESTS) {
      return c.json(
        errorResponse('RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.'),
        429,
        { 'Retry-After': '60' },
      );
    }

    // Increment counter (fire-and-forget — don't block request)
    c.executionCtx.waitUntil(
      kv.put(kvKey, String(count + 1), { expirationTtl: RATE_LIMIT_KV_TTL_SECONDS }),
    );

    await next();
  };
}
