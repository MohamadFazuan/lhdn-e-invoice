import type { OcrDocument, NewOcrDocument } from '../../db/schema/index.js';

export interface IOcrRepository {
  findById(id: string): Promise<OcrDocument | null>;
  findByUserId(userId: string): Promise<OcrDocument[]>;
  create(data: NewOcrDocument): Promise<OcrDocument>;
  update(
    id: string,
    data: Partial<Omit<OcrDocument, 'id' | 'createdAt'>>,
  ): Promise<void>;
}
