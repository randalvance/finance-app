import { db } from '@/lib/db';
import { categories } from '@/db/schema';
import { Category, CreateCategoryData, UpdateCategoryData } from '@/types/transaction';
import { eq, asc, and } from 'drizzle-orm';

export class CategoryService {
  static async getAllCategories(userId: number): Promise<Category[]> {
    const result = await db.select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(asc(categories.name));
    return result;
  }

  static async getCategoryById(id: number, userId: number): Promise<Category | null> {
    const result = await db.select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));
    return result[0] || null;
  }

  static async createCategory(data: CreateCategoryData): Promise<Category> {
    const result = await db.insert(categories).values({
      userId: data.userId,
      name: data.name,
      color: data.color || '#6366f1',
      defaultTransactionType: data.defaultTransactionType || 'Debit',
    }).returning();
    return result[0];
  }

  static async updateCategory(data: UpdateCategoryData, userId: number): Promise<Category | null> {
    const updateData: Partial<typeof categories.$inferInsert> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.defaultTransactionType !== undefined) updateData.defaultTransactionType = data.defaultTransactionType;

    const result = await db.update(categories)
      .set(updateData)
      .where(and(eq(categories.id, data.id), eq(categories.userId, userId)))
      .returning();
    return result[0] || null;
  }

  static async deleteCategory(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    return result.length > 0;
  }
}
