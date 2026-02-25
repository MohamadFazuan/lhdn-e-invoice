import { eq, and, isNotNull } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../env.js';
import { createDb } from '../db/client.js';
import { businessMembers, MEMBER_ROLE_HIERARCHY } from '../db/schema/business-members.js';
import { businesses } from '../db/schema/index.js';
import { AppError } from '../errors/app-error.js';
import type { MemberRole } from '../db/schema/business-members.js';

/**
 * Resolves the authenticated user's business membership and injects
 * `businessId` and `memberRole` into the Hono context.
 *
 * Falls back to the legacy `businesses.userId` ownership check for the OWNER
 * so that existing business records created before the `business_members` table
 * existed continue to work without a data migration.
 */
export function requireBusiness(
  minRole: MemberRole = 'VIEWER',
): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const db = createDb(c.env.DB);
    const userId = c.get('userId') as string;

    // 1. Try to find an accepted membership row
    const memberRows = await db
      .select({
        businessId: businessMembers.businessId,
        role: businessMembers.role,
      })
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.userId, userId),
          isNotNull(businessMembers.acceptedAt),
        ),
      )
      .limit(1);

    let businessId: string;
    let memberRole: MemberRole;

    if (memberRows.length > 0) {
      businessId = memberRows[0].businessId;
      memberRole = memberRows[0].role as MemberRole;
    } else {
      // 2. Legacy fallback: check businesses.userId (original owner before team feature)
      const bizRows = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.userId, userId))
        .limit(1);

      if (bizRows.length === 0) {
        throw new AppError(404, 'BUSINESS_NOT_FOUND', 'A business profile is required');
      }
      businessId = bizRows[0].id;
      memberRole = 'OWNER';
    }

    // 3. Role gate
    if (MEMBER_ROLE_HIERARCHY[memberRole] < MEMBER_ROLE_HIERARCHY[minRole]) {
      throw new AppError(
        403,
        'INSUFFICIENT_ROLE',
        `This action requires at least the '${minRole}' role`,
      );
    }

    c.set('businessId', businessId);
    c.set('memberRole', memberRole);
    await next();
  };
}
