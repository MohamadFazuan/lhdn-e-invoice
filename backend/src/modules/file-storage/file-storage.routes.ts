import { Hono } from 'hono';
import type { Env } from '../../env.js';
import { createDb } from '../../db/client.js';
import { FileStorageService } from './file-storage.service.js';
import { FileStorageController } from './file-storage.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { uploadRequestDto, confirmUploadDto } from './file-storage.dto.js';
import { requireBusiness } from '../../middleware/require-business.middleware.js';

export function fileStorageRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.use('*', authMiddleware());
  router.use('*', requireBusiness('ACCOUNTANT'));

  const getController = (c: { env: Env }) => {
    const db = createDb(c.env.DB);
    const service = new FileStorageService(db, c.env);
    return new FileStorageController(service);
  };

  router.post('/upload-url', validateBody(uploadRequestDto), async (c) =>
    getController(c).getUploadUrl(c as any),
  );

  router.post('/confirm', validateBody(confirmUploadDto), async (c) =>
    getController(c).confirmUpload(c as any),
  );

  return router;
}
