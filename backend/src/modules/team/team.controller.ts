import type { Context } from 'hono';
import type { Env } from '../../env.js';
import type { TeamService } from './team.service.js';

type AppContext = Context<{ Bindings: Env }>;

export class TeamController {
  constructor(private readonly service: TeamService) {}

  async list(c: AppContext) {
    const businessId = c.get('businessId') as string;
    const members = await this.service.listMembers(businessId);
    return c.json({ success: true, data: members });
  }

  async getMe(c: AppContext) {
    const userId = c.get('userId') as string;
    const businessId = c.get('businessId') as string;
    const member = await this.service.getMyMembership(userId, businessId);
    return c.json({ success: true, data: member });
  }

  async invite(c: AppContext) {
    const userId = c.get('userId') as string;
    const businessId = c.get('businessId') as string;
    const memberRole = c.get('memberRole') as string;
    const body = await c.req.json();
    const member = await this.service.invite(businessId, userId, memberRole as any, body);
    return c.json({ success: true, data: member }, 201);
  }

  async acceptInvite(c: AppContext) {
    const token = c.req.param('token');
    const userId = c.get('userId') as string;
    const member = await this.service.acceptInvite(token, userId);
    return c.json({ success: true, data: member });
  }

  async updateRole(c: AppContext) {
    const memberId = c.req.param('memberId');
    const businessId = c.get('businessId') as string;
    const actorRole = c.get('memberRole') as string;
    const body = await c.req.json();
    const member = await this.service.updateRole(memberId, businessId, actorRole as any, body);
    return c.json({ success: true, data: member });
  }

  async remove(c: AppContext) {
    const memberId = c.req.param('memberId');
    const businessId = c.get('businessId') as string;
    const actorUserId = c.get('userId') as string;
    const actorRole = c.get('memberRole') as string;
    await this.service.removeMember(memberId, businessId, actorUserId, actorRole as any);
    return c.json({ success: true, data: null }, 200);
  }
}
