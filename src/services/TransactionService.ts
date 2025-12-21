import { db } from '@/lib/db';
import { transactions, accounts } from '@/db/schema';
import {
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionWithAccounts,
  TransactionType
} from '@/types/transaction';
import { eq, desc, and, inArray } from 'drizzle-orm';

export class TransactionService {
  /**
   * Validates transaction data based on type
   * Throws error if validation fails
   */
  private static validateTransactionData(data: CreateTransactionData): void {
    switch (data.transactionType) {
      case 'Debit':
        if (!data.sourceAccountId) {
          throw new Error('Debit transactions require a source account');
        }
        break;
      case 'Credit':
        if (!data.targetAccountId) {
          throw new Error('Credit transactions require a target account');
        }
        break;
      case 'Transfer':
        if (!data.sourceAccountId || !data.targetAccountId) {
          throw new Error('Transfer transactions require both source and target accounts');
        }
        if (data.sourceAccountId === data.targetAccountId) {
          throw new Error('Source and target accounts must be different for transfers');
        }
        break;
    }
  }

  /**
   * Get all transactions with account information
   */
  static async getAllTransactions(userId: number): Promise<TransactionWithAccounts[]> {
    const result = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        sourceAccountId: transactions.sourceAccountId,
        targetAccountId: transactions.targetAccountId,
        transactionType: transactions.transactionType,
        description: transactions.description,
        amount: transactions.amount,
        category: transactions.category,
        date: transactions.date,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date), desc(transactions.createdAt));

    // Collect all unique account IDs
    const accountIds = new Set<number>();
    result.forEach(t => {
      if (t.sourceAccountId) accountIds.add(t.sourceAccountId);
      if (t.targetAccountId) accountIds.add(t.targetAccountId);
    });

    // Fetch all accounts in one query if there are any
    let accountMap = new Map<number, { id: number; name: string; color: string | null }>();
    if (accountIds.size > 0) {
      const accountsData = await db
        .select({
          id: accounts.id,
          name: accounts.name,
          color: accounts.color,
        })
        .from(accounts)
        .where(
          inArray(accounts.id, Array.from(accountIds))
        );

      accountMap = new Map(accountsData.map(a => [a.id, a]));
    }

    // Map transactions with account details
    return result.map(t => ({
      ...t,
      sourceAccount: t.sourceAccountId && accountMap.has(t.sourceAccountId) ? {
        id: t.sourceAccountId,
        name: accountMap.get(t.sourceAccountId)!.name,
        color: accountMap.get(t.sourceAccountId)!.color,
      } : undefined,
      targetAccount: t.targetAccountId && accountMap.has(t.targetAccountId) ? {
        id: t.targetAccountId,
        name: accountMap.get(t.targetAccountId)!.name,
        color: accountMap.get(t.targetAccountId)!.color,
      } : undefined,
    }));
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(id: number, userId: number): Promise<Transaction | null> {
    const result = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return result[0] || null;
  }

  /**
   * Create a new transaction
   */
  static async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    // Validate before insertion
    this.validateTransactionData(data);

    const result = await db.insert(transactions).values({
      userId: data.userId,
      sourceAccountId: data.sourceAccountId || null,
      targetAccountId: data.targetAccountId || null,
      transactionType: data.transactionType,
      description: data.description,
      amount: data.amount,
      category: data.category,
      date: data.date,
    }).returning();

    return result[0];
  }

  /**
   * Update a transaction
   */
  static async updateTransaction(data: UpdateTransactionData, userId: number): Promise<Transaction | null> {
    // If updating transaction type or accounts, fetch current record to validate
    if (data.transactionType || data.sourceAccountId !== undefined || data.targetAccountId !== undefined) {
      const current = await this.getTransactionById(data.id, userId);
      if (!current) {
        return null;
      }

      // Build validation data with current values as defaults
      const validationData: CreateTransactionData = {
        userId,
        transactionType: data.transactionType || (current.transactionType as TransactionType),
        sourceAccountId: data.sourceAccountId !== undefined ? data.sourceAccountId : current.sourceAccountId,
        targetAccountId: data.targetAccountId !== undefined ? data.targetAccountId : current.targetAccountId,
        description: data.description || current.description,
        amount: data.amount || current.amount,
        category: data.category || current.category,
        date: data.date || current.date,
      } as CreateTransactionData;

      // Validate the updated state
      this.validateTransactionData(validationData);
    }

    // Build update data
    const updateData: Partial<typeof transactions.$inferInsert> = {};

    if (data.sourceAccountId !== undefined) updateData.sourceAccountId = data.sourceAccountId;
    if (data.targetAccountId !== undefined) updateData.targetAccountId = data.targetAccountId;
    if (data.transactionType !== undefined) updateData.transactionType = data.transactionType;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.date !== undefined) updateData.date = data.date;

    const result = await db.update(transactions)
      .set(updateData)
      .where(and(eq(transactions.id, data.id), eq(transactions.userId, userId)))
      .returning();

    return result[0] || null;
  }

  /**
   * Delete transaction
   */
  static async deleteTransaction(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return result.length > 0;
  }

  /**
   * Get transactions by type
   */
  static async getTransactionsByType(type: TransactionType, userId: number): Promise<Transaction[]> {
    const result = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.transactionType, type), eq(transactions.userId, userId)))
      .orderBy(desc(transactions.date));
    return result;
  }
}
