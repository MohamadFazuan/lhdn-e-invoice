import type { Context } from 'hono';
import type { Env } from '../../env.js';
import type { UploadRequestDto, ConfirmUploadDto } from './file-storage.dto.js';
import type { FileStorageService } from './file-storage.service.js';
import { successResponse } from '../../types/api-response.js';
import { AppError } from '../../errors/app-error.js';

export class FileStorageController {
  constructor(private readonly service: FileStorageService) {}

  async getUploadUrl(c: Context<{ Bindings: Env; Variables: { userId: string } }>) {
    const userId = c.get('userId');
    const dto = c.req.valid('json' as never) as UploadRequestDto;

    // Business ID is required — fetched by middleware or from context
    const businessId = c.get('businessId' as never) as string | undefined;
    if (!businessId) {
      throw new AppError(400, 'BUSINESS_REQUIRED', 'A business profile is required to upload files');
    }

    const result = await this.service.getUploadUrl(userId, businessId, dto);
    return c.json(successResponse(result));
  }

  async confirmUpload(c: Context<{ Bindings: Env; Variables: { userId: string } }>) {
    const userId = c.get('userId');
    const dto = c.req.valid('json' as never) as ConfirmUploadDto;

    const businessId = c.get('businessId' as never) as string | undefined;
    if (!businessId) {
      throw new AppError(400, 'BUSINESS_REQUIRED', 'A business profile is required to upload files');
    }

    const result = await this.service.confirmUpload(userId, businessId, dto);
    return c.json(successResponse(result), 202);
  }
}
