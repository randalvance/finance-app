import { db } from '@/lib/db';
import { accounts, expenses } from '@/db/schema';
import { Account, CreateAccountData, UpdateAccountData } from '@/types/expense';
import { eq, sql } from 'drizzle-orm';

export class AccountService {
  static async getAllAccounts(): Promise<Account[]> {
    const result = await db.select().from(accounts).orderBy(sql`${accounts.createdAt} DESC`);
    return result as Account[];
  }

  static async getAccountById(id: number): Promise<Account | null> {
    const result = await db.select().from(accounts).where(eq(accounts.id, id));
    return (result[0] as Account) || null;
  }

  static async createAccount(data: CreateAccountData): Promise<Account> {
    const result = await db.insert(accounts).values({
      name: data.name,
      description: data.description || null,
      color: data.color || '#6366f1',
    }).returning();
    return result[0] as Account;
  }

  static async updateAccount(data: UpdateAccountData): Promise<Account> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color !== undefined) updateData.color = data.color;

    const result = await db.update(accounts)
      .set(updateData)
      .where(eq(accounts.id, data.id))
      .returning();
    return result[0] as Account;
  }

  static async deleteAccount(id: number): Promise<boolean> {
    const result = await db.delete(accounts).where(eq(accounts.id, id)).returning();
    return result.length > 0;
  }

  static async getAccountExpenseCount(accountId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(expenses)
      .where(eq(expenses.accountId, accountId));
    return Number(result[0]?.count || 0);
  }

  static async getAccountTotalAmount(accountId: number): Promise<number> {
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(eq(expenses.accountId, accountId));
    return parseFloat(result[0]?.total || '0');
  }
}
