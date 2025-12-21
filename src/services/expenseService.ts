import { db } from '@/lib/db';
import { expenses, categories, accounts } from '@/db/schema';
import { Expense, CreateExpenseData, UpdateExpenseData, Category } from '@/types/expense';
import { eq, desc, between, and } from 'drizzle-orm';

type ExpenseWithAccount = Expense & {
  account_name: string;
  account_color: string | null;
};

export class ExpenseService {
  static async getAllExpenses(userId: number): Promise<ExpenseWithAccount[]> {
    const result = await db
      .select({
        id: expenses.id,
        userId: expenses.userId,
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
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.date), desc(expenses.createdAt));

    return result;
  }

  static async getExpenseById(id: number, userId: number): Promise<Expense | null> {
    const result = await db.select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
    return result[0] || null;
  }

  static async createExpense(data: CreateExpenseData): Promise<Expense> {
    const result = await db.insert(expenses).values({
      userId: data.userId,
      accountId: data.accountId,
      description: data.description,
      amount: data.amount,
      category: data.category,
      date: data.date,
    }).returning();
    return result[0];
  }

  static async updateExpense(data: UpdateExpenseData, userId: number): Promise<Expense | null> {
    const updateData: Partial<typeof expenses.$inferInsert> = {};
    if (data.accountId !== undefined) updateData.accountId = data.accountId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.date !== undefined) updateData.date = data.date;

    const result = await db.update(expenses)
      .set(updateData)
      .where(and(eq(expenses.id, data.id), eq(expenses.userId, userId)))
      .returning();
    return result[0] || null;
  }

  static async deleteExpense(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    return result.length > 0;
  }

  static async getCategories(userId: number): Promise<Category[]> {
    const result = await db.select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.name);
    return result;
  }

  static async getExpensesByDateRange(startDate: string, endDate: string, userId: number): Promise<Expense[]> {
    const result = await db
      .select()
      .from(expenses)
      .where(and(between(expenses.date, startDate, endDate), eq(expenses.userId, userId)))
      .orderBy(desc(expenses.date));
    return result;
  }

  static async getExpensesByCategory(category: string, userId: number): Promise<Expense[]> {
    const result = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.category, category), eq(expenses.userId, userId)))
      .orderBy(desc(expenses.date));
    return result;
  }
}