import { Hono } from 'hono';
import type { Env } from '../../env.js';
import { createDb } from '../../db/client.js';
import { TeamRepository } from './team.repository.js';
import { TeamService } from './team.service.js';
import { TeamController } from './team.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireBusiness } from '../../middleware/require-business.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { inviteMemberDto, updateMemberRoleDto } from './team.dto.js';

export function teamRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  const getController = (c: { env: Env }) => {
    const db = createDb(c.env.DB);
    const repo = new TeamRepository(db);
    const service = new TeamService(repo);
    return new TeamController(service);
  };

  // All team management routes require auth + business membership
  router.use('*', authMiddleware());

  // List all members and get own membership: VIEWER and above
  router.get('/', requireBusiness('VIEWER'), async (c) => getController(c).list(c as any));
  router.get('/me', requireBusiness('VIEWER'), async (c) => getController(c).getMe(c as any));

  // Invite a new member: ADMIN and above
  router.post(
    '/invite',
    requireBusiness('ADMIN'),
    validateBody(inviteMemberDto),
    async (c) => getController(c).invite(c as any),
  );

  // Accept an invite (the invited user must be authenticated)
  router.post('/invite/:token/accept', async (c) => {
    // No requireBusiness here — the user isn't a member yet
    const db = createDb(c.env.DB);
    const repo = new TeamRepository(db);
    const service = new TeamService(repo);
    const controller = new TeamController(service);
    return controller.acceptInvite(c as any);
  });

  // Change a member's role: OWNER only
  router.patch(
    '/:memberId/role',
    requireBusiness('OWNER'),
    validateBody(updateMemberRoleDto),
    async (c) => getController(c).updateRole(c as any),
  );

  // Remove a member: OWNER or ADMIN
  router.delete(
    '/:memberId',
    requireBusiness('ADMIN'),
    async (c) => getController(c).remove(c as any),
  );

  return router;
}
