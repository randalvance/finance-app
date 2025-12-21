import { db } from '@/lib/db';
import { categories } from '@/db/schema';
import { Category } from '@/types/expense';
import { eq, asc } from 'drizzle-orm';

interface CreateCategoryData {
  name: string;
  color?: string;
}

interface UpdateCategoryData {
  id: number;
  name?: string;
  color?: string;
}

export class CategoryService {
  static async getAllCategories(): Promise<Category[]> {
    const result = await db.select().from(categories).orderBy(asc(categories.name));
    return result;
  }

  static async getCategoryById(id: number): Promise<Category | null> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0] || null;
  }

  static async createCategory(data: CreateCategoryData): Promise<Category> {
    const result = await db.insert(categories).values({
      name: data.name,
      color: data.color || '#6366f1',
    }).returning();
    return result[0];
  }

  static async updateCategory(data: UpdateCategoryData): Promise<Category> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;

    const result = await db.update(categories)
      .set(updateData)
      .where(eq(categories.id, data.id))
      .returning();
    return result[0];
  }

  static async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }
}
