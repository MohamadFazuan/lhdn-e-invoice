import { zValidator } from '@hono/zod-validator';
import type { ZodSchema } from 'zod';
import type { ValidationTargets } from 'hono';

export function validateBody<T>(schema: ZodSchema<T>) {
  return zValidator('json', schema);
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return zValidator('param', schema);
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return zValidator('query', schema);
}

export type { ValidationTargets };
