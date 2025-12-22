import { db } from '@/lib/db';
import { importSources } from '@/db/schema';
import { ImportSource, CreateImportSourceData, UpdateImportSourceData, ImportSourceWithAccounts } from '@/types/transaction';
import { eq, and, asc } from 'drizzle-orm';
import { ImportSourceAccountService } from './ImportSourceAccountService';

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

  static async getImportSourceWithAccounts(
    id: number,
    userId: number
  ): Promise<ImportSourceWithAccounts | null> {
    const source = await this.getImportSourceById(id, userId);
    if (!source) return null;

    const associatedAccounts = await ImportSourceAccountService.getAssociatedAccounts(id, userId);

    return {
      ...source,
      associatedAccounts,
    };
  }

  static async getAllImportSourcesWithAccounts(userId: number): Promise<ImportSourceWithAccounts[]> {
    const sources = await this.getAllImportSources(userId);

    // Fetch associations for all sources in parallel
    const sourcesWithAccounts = await Promise.all(
      sources.map(async (source) => {
        const associatedAccounts = await ImportSourceAccountService.getAssociatedAccounts(
          source.id,
          userId
        );
        return {
          ...source,
          associatedAccounts,
        };
      })
    );

    return sourcesWithAccounts;
  }

  static async createImportSource(data: CreateImportSourceData): Promise<ImportSource> {
    const result = await db.insert(importSources).values({
      userId: data.userId,
      name: data.name,
      description: data.description || null,
      config: data.config,
    }).returning();

    const source = result[0];

    // Set account associations if provided
    if (data.accountIds && data.accountIds.length > 0) {
      await ImportSourceAccountService.setAccountAssociations(
        source.id,
        data.accountIds,
        data.userId
      );
    }

    return source;
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

    const source = result[0] || null;

    // Update account associations if provided
    if (source && data.accountIds !== undefined) {
      await ImportSourceAccountService.setAccountAssociations(
        data.id,
        data.accountIds,
        userId
      );
    }

    return source;
  }

  static async deleteImportSource(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(importSources)
      .where(and(eq(importSources.id, id), eq(importSources.userId, userId)))
      .returning();
    return result.length > 0;
  }
}
