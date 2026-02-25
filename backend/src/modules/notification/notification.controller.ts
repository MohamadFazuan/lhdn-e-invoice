import type { Context } from 'hono';
import type { Env } from '../../env.js';
import type { NotificationService } from './notification.service.js';

type AppContext = Context<{ Bindings: Env }>;

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  async getPreferences(c: AppContext) {
    const userId = c.get('userId') as string;
    const prefs = await this.service.getPreferences(userId);
    return c.json({ success: true, data: prefs });
  }

  async updatePreferences(c: AppContext) {
    const userId = c.get('userId') as string;
    const body = await c.req.json();
    const prefs = await this.service.updatePreferences(userId, body);
    return c.json({ success: true, data: prefs });
  }

  async getLogs(c: AppContext) {
    const userId = c.get('userId') as string;
    const limit = Number(c.req.query('limit') ?? 50);
    const offset = Number(c.req.query('offset') ?? 0);
    const logs = await this.service.getLogs(userId, limit, offset);
    return c.json({ success: true, data: logs });
  }
}
