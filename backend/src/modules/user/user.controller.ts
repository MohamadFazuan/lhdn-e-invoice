import type { Context } from 'hono';
import type { Env } from '../../env.js';
import type { UpdateUserDto } from './user.dto.js';
import type { UserService } from './user.service.js';
import { successResponse } from '../../types/api-response.js';

export class UserController {
  constructor(private readonly service: UserService) {}

  async getMe(c: Context<{ Bindings: Env; Variables: { userId: string } }>) {
    const userId = c.get('userId');
    const user = await this.service.getMe(userId);
    return c.json(successResponse(user));
  }

  async updateMe(c: Context<{ Bindings: Env; Variables: { userId: string } }>) {
    const userId = c.get('userId');
    const dto = c.req.valid('json' as never) as UpdateUserDto;
    const user = await this.service.updateMe(userId, dto);
    return c.json(successResponse(user));
  }
}
