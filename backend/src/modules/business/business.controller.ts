import type { Context } from 'hono';
import type { Env } from '../../env.js';
import type { CreateBusinessDto, UpdateBusinessDto, UpdateCredentialsDto } from './business.dto.js';
import type { BusinessService } from './business.service.js';
import { successResponse } from '../../types/api-response.js';

export class BusinessController {
  constructor(private readonly service: BusinessService) {}

  async getMe(c: Context<{ Bindings: Env; Variables: { userId: string } }>) {
    const userId = c.get('userId');
    const business = await this.service.getMyBusiness(userId);
    return c.json(successResponse(business));
  }

  async create(c: Context<{ Bindings: Env; Variables: { userId: string } }>) {
    const userId = c.get('userId');
    const dto = c.req.valid('json' as never) as CreateBusinessDto;
    const business = await this.service.createBusiness(userId, dto);
    return c.json(successResponse(business), 201);
  }

  async update(c: Context<{ Bindings: Env; Variables: { userId: string } }>) {
    const userId = c.get('userId');
    const dto = c.req.valid('json' as never) as UpdateBusinessDto;
    const business = await this.service.updateBusiness(userId, dto);
    return c.json(successResponse(business));
  }

  async updateCredentials(c: Context<{ Bindings: Env; Variables: { userId: string } }>) {
    const userId = c.get('userId');
    const dto = c.req.valid('json' as never) as UpdateCredentialsDto;
    await this.service.updateCredentials(userId, dto);
    return c.json(successResponse({ message: 'LHDN credentials updated successfully' }));
  }
}
