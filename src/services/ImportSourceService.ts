import { db } from '@/lib/db';
import { importSources } from '@/db/schema';
import { ImportSource, CreateImportSourceData, UpdateImportSourceData } from '@/types/transaction';
import { eq, and, asc } from 'drizzle-orm';

export class ImportSourceService {
  static async getAllImportSources(userId: number): Promise<ImportSource[]> {
    const result = await db.select()
      .from(importSources)
      .where(eq(importSources.userId, userId))
      .orderBy(asc(importSources.name));
    return result;
  }

  static async getImportSourceById(id: number, userId: number): Promise<ImportSource | null> {
    const result = await db.select()
      .from(importSources)
      .where(and(eq(importSources.id, id), eq(importSources.userId, userId)));
    return result[0] || null;
  }

  static async createImportSource(data: CreateImportSourceData): Promise<ImportSource> {
    const result = await db.insert(importSources).values({
      userId: data.userId,
      name: data.name,
      description: data.description || null,
      config: data.config,
    }).returning();
    return result[0];
  }

  static async updateImportSource(data: UpdateImportSourceData, userId: number): Promise<ImportSource | null> {
    const updateData: Partial<typeof importSources.$inferInsert> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.config !== undefined) updateData.config = data.config;
    updateData.updatedAt = new Date();

    const result = await db.update(importSources)
      .set(updateData)
      .where(and(eq(importSources.id, data.id), eq(importSources.userId, userId)))
      .returning();
    return result[0] || null;
  }

  static async deleteImportSource(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(importSources)
      .where(and(eq(importSources.id, id), eq(importSources.userId, userId)))
      .returning();
    return result.length > 0;
  }
}
