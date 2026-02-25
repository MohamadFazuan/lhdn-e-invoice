import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '../../db/client.js';
import { ocrDocuments } from '../../db/schema/index.js';
import type { OcrDocument, NewOcrDocument } from '../../db/schema/index.js';
import type { IOcrRepository } from './ocr.repository.interface.js';

export class OcrRepository implements IOcrRepository {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<OcrDocument | null> {
    const result = await this.db
      .select()
      .from(ocrDocuments)
      .where(eq(ocrDocuments.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findByUserId(userId: string): Promise<OcrDocument[]> {
    return this.db
      .select()
      .from(ocrDocuments)
      .where(eq(ocrDocuments.userId, userId));
  }

  async create(data: NewOcrDocument): Promise<OcrDocument> {
    await this.db.insert(ocrDocuments).values(data);
    return (await this.findById(data.id))!;
  }

  async update(
    id: string,
    data: Partial<Omit<OcrDocument, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await this.db.update(ocrDocuments).set(data).where(eq(ocrDocuments.id, id));
  }
}
