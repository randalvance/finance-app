import { db } from '@/lib/db';
import { accounts, transactions } from '@/db/schema';
import { Account, CreateAccountData, UpdateAccountData } from '@/types/transaction';
import { eq, sql, and, or } from 'drizzle-orm';

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
      currency: data.currency || 'USD',
    }).returning();
    return result[0] as Account;
  }

  static async updateAccount(data: UpdateAccountData, userId: number): Promise<Account | null> {
    const updateData: Partial<typeof accounts.$inferInsert> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.currency !== undefined) updateData.currency = data.currency;

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

  static async getAccountTransactionCount(accountId: number, userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          or(
            eq(transactions.sourceAccountId, accountId),
            eq(transactions.targetAccountId, accountId)
          )
        )
      );
    return Number(result[0]?.count || 0);
  }

  static async getAccountTotalAmount(accountId: number, userId: number): Promise<number> {
    // Credits (money in) - increases account balance
    const credits = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.targetAccountId, accountId),
          or(
            eq(transactions.transactionType, 'Credit'),
            eq(transactions.transactionType, 'TransferIn')
          )
        )
      );

    // Debits (money out) - decreases account balance
    const debits = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.sourceAccountId, accountId),
          or(
            eq(transactions.transactionType, 'Debit'),
            eq(transactions.transactionType, 'TransferOut')
          )
        )
      );

    const creditAmount = parseFloat(credits[0]?.total || '0');
    const debitAmount = parseFloat(debits[0]?.total || '0');

    // Net balance = credits - debits
    // Since debits are negative and credits are positive, this is actually:
    // credits (positive) + debits (negative) = net balance
    return creditAmount + debitAmount;
  }
}
