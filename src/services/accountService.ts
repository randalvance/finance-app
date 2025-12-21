import { db } from '@/lib/db';
import { accounts, expenses } from '@/db/schema';
import { Account, CreateAccountData, UpdateAccountData } from '@/types/expense';
import { eq, sql, and } from 'drizzle-orm';

export class AccountService {
  static async getAllAccounts(userId: number): Promise<Account[]> {
    const result = await db.select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(sql`${accounts.createdAt} DESC`);
    return result as Account[];
  }

  static async getAccountById(id: number, userId: number): Promise<Account | null> {
    const result = await db.select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
    return (result[0] as Account) || null;
  }

  static async createAccount(data: CreateAccountData): Promise<Account> {
    const result = await db.insert(accounts).values({
      userId: data.userId,
      name: data.name,
      description: data.description || null,
      color: data.color || '#6366f1',
    }).returning();
    return result[0] as Account;
  }

  static async updateAccount(data: UpdateAccountData, userId: number): Promise<Account | null> {
    const updateData: Partial<typeof accounts.$inferInsert> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color !== undefined) updateData.color = data.color;

    const result = await db.update(accounts)
      .set(updateData)
      .where(and(eq(accounts.id, data.id), eq(accounts.userId, userId)))
      .returning();
    return (result[0] as Account) || null;
  }

  static async deleteAccount(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return result.length > 0;
  }

  static async getAccountExpenseCount(accountId: number, userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(expenses)
      .where(and(eq(expenses.accountId, accountId), eq(expenses.userId, userId)));
    return Number(result[0]?.count || 0);
  }

  static async getAccountTotalAmount(accountId: number, userId: number): Promise<number> {
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(eq(expenses.accountId, accountId), eq(expenses.userId, userId)));
    return parseFloat(result[0]?.total || '0');
  }
}
