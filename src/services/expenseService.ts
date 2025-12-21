import { db } from '@/lib/db';
import { expenses, categories, accounts } from '@/db/schema';
import { Expense, CreateExpenseData, UpdateExpenseData, Category } from '@/types/expense';
import { eq, desc, between } from 'drizzle-orm';

export class ExpenseService {
  static async getAllExpenses(): Promise<any[]> {
    const result = await db
      .select({
        id: expenses.id,
        accountId: expenses.accountId,
        description: expenses.description,
        amount: expenses.amount,
        category: expenses.category,
        date: expenses.date,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
        account_name: accounts.name,
        account_color: accounts.color,
      })
      .from(expenses)
      .innerJoin(accounts, eq(expenses.accountId, accounts.id))
      .orderBy(desc(expenses.date), desc(expenses.createdAt));

    return result;
  }

  static async getExpenseById(id: number): Promise<Expense | null> {
    const result = await db.select().from(expenses).where(eq(expenses.id, id));
    return result[0] || null;
  }

  static async createExpense(data: CreateExpenseData): Promise<Expense> {
    const result = await db.insert(expenses).values({
      accountId: data.accountId,
      description: data.description,
      amount: data.amount,
      category: data.category,
      date: data.date,
    }).returning();
    return result[0];
  }

  static async updateExpense(data: UpdateExpenseData): Promise<Expense> {
    const updateData: any = {};
    if (data.accountId !== undefined) updateData.accountId = data.accountId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.date !== undefined) updateData.date = data.date;

    const result = await db.update(expenses)
      .set(updateData)
      .where(eq(expenses.id, data.id))
      .returning();
    return result[0];
  }

  static async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }

  static async getCategories(): Promise<Category[]> {
    const result = await db.select().from(categories).orderBy(categories.name);
    return result;
  }

  static async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const result = await db
      .select()
      .from(expenses)
      .where(between(expenses.date, startDate, endDate))
      .orderBy(desc(expenses.date));
    return result;
  }

  static async getExpensesByCategory(category: string): Promise<Expense[]> {
    const result = await db
      .select()
      .from(expenses)
      .where(eq(expenses.category, category))
      .orderBy(desc(expenses.date));
    return result;
  }
}