import { z } from 'zod';

export const analyticsQueryDto = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
  granularity: z.enum(['day', 'week', 'month']).default('month'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type AnalyticsQueryDto = z.infer<typeof analyticsQueryDto>;
