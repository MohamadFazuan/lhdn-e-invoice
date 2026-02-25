import type { Context, ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import { isAppError } from '../errors/app-error.js';
import { errorResponse } from '../types/api-response.js';

function handleZodError(c: Context, err: ZodError): Response {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.join('.') || '_root';
    details[path] ??= [];
    details[path]!.push(issue.message);
  }
  return c.json(errorResponse('VALIDATION_ERROR', 'Input validation failed', details), 422);
}

export const globalErrorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ZodError) {
    return handleZodError(c, err);
  }

  if (isAppError(err)) {
    return c.json(errorResponse(err.code, err.message), err.statusCode as 400);
  }

  // Expose full message for debugging (sanitize before production deploy)
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  console.error('[INTERNAL ERROR]', err);
  return c.json(errorResponse('INTERNAL_ERROR', message), 500);
};
