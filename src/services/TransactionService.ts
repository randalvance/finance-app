import { db } from "@/lib/db";
import { transactions, accounts, transactionLinks, categories, type Currency } from "@/db/schema";
import {
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionWithAccounts,
  TransactionWithLink,
  TransactionType
} from "@/types/transaction";
import { eq, desc, and, inArray, or, gte, lte, exists, notExists, sql, notInArray, isNull } from "drizzle-orm";
import { calculateDateRange, type DatePreset } from "@/lib/dateUtils";

export class TransactionService {
  /**
   * Validates transaction data based on type
   * Throws error if validation fails
   */
  private static validateTransactionData (data: CreateTransactionData): void {
    switch (data.transactionType) {
      case "Debit":
        if (!data.sourceAccountId) {
          throw new Error("Debit transactions require a source account");
        }
        break;
      case "TransferOut":
        if (!data.sourceAccountId || !data.targetAccountId) {
          throw new Error("Transfer Out transactions require both source and target accounts");
        }
        if (data.sourceAccountId === data.targetAccountId) {
          throw new Error("Source and target accounts must be different for transfers");
        }
        break;
      case "Credit":
        if (!data.targetAccountId) {
          throw new Error("Credit transactions require a target account");
        }
        break;
      case "TransferIn":
        if (!data.sourceAccountId || !data.targetAccountId) {
          throw new Error("Transfer In transactions require both source and target accounts");
        }
        if (data.sourceAccountId === data.targetAccountId) {
          throw new Error("Source and target accounts must be different for transfers");
        }
        break;
    }
  }

  /**
   * Auto-apply sign to amount based on transaction type
   * Debit/TransferOut → negative, Credit/TransferIn → positive
   */
  private static applyAmountSign (transactionType: TransactionType, amount: number): number {
    switch (transactionType) {
      case "Debit":
      case "TransferOut":
        return -Math.abs(amount); // Force negative
      case "Credit":
      case "TransferIn":
        return Math.abs(amount); // Force positive
      default:
        return amount;
    }
  }

  /**
   * Get all transactions with account information
   */
  static async getAllTransactions (userId: number): Promise<TransactionWithAccounts[]> {
    const result = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        sourceAccountId: transactions.sourceAccountId,
        targetAccountId: transactions.targetAccountId,
        transactionType: transactions.transactionType,
        description: transactions.description,
        amount: transactions.amount,
        categoryId: transactions.categoryId,
        date: transactions.date,
        importId: transactions.importId,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date), desc(transactions.createdAt));

    // Collect all unique account IDs and category IDs
    const accountIds = new Set<number>();
    const categoryIds = new Set<number>();
    result.forEach(t => {
      if (t.sourceAccountId) accountIds.add(t.sourceAccountId);
      if (t.targetAccountId) accountIds.add(t.targetAccountId);
      if (t.categoryId) categoryIds.add(t.categoryId);
    });

    // Fetch all accounts in one query if there are any
    let accountMap = new Map<number, { id: number; name: string; color: string | null; currency: Currency }>();
    if (accountIds.size > 0) {
      const accountsData = await db
        .select({
          id: accounts.id,
          name: accounts.name,
          color: accounts.color,
          currency: accounts.currency,
        })
        .from(accounts)
        .where(
          inArray(accounts.id, Array.from(accountIds))
        );

      accountMap = new Map(accountsData.map(a => [a.id, { ...a, currency: a.currency as Currency }]));
    }

    // Fetch all categories in one query if there are any
    let categoryMap = new Map<number, { id: number; name: string; color: string | null }>();
    if (categoryIds.size > 0) {
      const categoriesData = await db
        .select({
          id: categories.id,
          name: categories.name,
          color: categories.color,
        })
        .from(categories)
        .where(
          inArray(categories.id, Array.from(categoryIds))
        );

      categoryMap = new Map(categoriesData.map(c => [c.id, c]));
    }

    // Map transactions with account and category details
    return result.map(t => ({
      ...t,
      sourceAccount: t.sourceAccountId && accountMap.has(t.sourceAccountId)
        ? {
          id: t.sourceAccountId,
          name: accountMap.get(t.sourceAccountId)!.name,
          color: accountMap.get(t.sourceAccountId)!.color,
          currency: accountMap.get(t.sourceAccountId)!.currency,
        }
        : undefined,
      targetAccount: t.targetAccountId && accountMap.has(t.targetAccountId)
        ? {
          id: t.targetAccountId,
          name: accountMap.get(t.targetAccountId)!.name,
          color: accountMap.get(t.targetAccountId)!.color,
          currency: accountMap.get(t.targetAccountId)!.currency,
        }
        : undefined,
      category: t.categoryId && categoryMap.has(t.categoryId)
        ? {
          id: t.categoryId,
          name: categoryMap.get(t.categoryId)!.name,
          color: categoryMap.get(t.categoryId)!.color,
        }
        : undefined,
    }));
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById (id: number, userId: number): Promise<Transaction | null> {
    const result = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return result[0] || null;
  }

  /**
   * Create a new transaction
   */
  static async createTransaction (data: CreateTransactionData): Promise<Transaction> {
    // Validate before insertion
    this.validateTransactionData(data);

    // Auto-apply sign based on transaction type
    const signedAmount = this.applyAmountSign(data.transactionType, data.amount);

    const result = await db.insert(transactions).values({
      userId: data.userId,
      sourceAccountId: data.sourceAccountId || null,
      targetAccountId: data.targetAccountId || null,
      transactionType: data.transactionType,
      description: data.description,
      amount: signedAmount,
      categoryId: data.categoryId,
      date: data.date,
    }).returning();

    return result[0];
  }

  /**
   * Update a transaction
   */
  static async updateTransaction (data: UpdateTransactionData, userId: number): Promise<Transaction | null> {
    // Fetch current record for validation and sign application
    const current = await this.getTransactionById(data.id, userId);
    if (!current) {
      return null;
    }

    // If updating transaction type or accounts, validate
    if (data.transactionType || data.sourceAccountId !== undefined || data.targetAccountId !== undefined) {
      // Build validation data with current values as defaults
      const validationData: CreateTransactionData = {
        userId,
        transactionType: data.transactionType || (current.transactionType as TransactionType),
        sourceAccountId: data.sourceAccountId !== undefined ? data.sourceAccountId : current.sourceAccountId,
        targetAccountId: data.targetAccountId !== undefined ? data.targetAccountId : current.targetAccountId,
        description: data.description || current.description,
        amount: data.amount || current.amount,
        categoryId: data.categoryId || current.categoryId,
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
    if (data.amount !== undefined) {
      // Auto-apply sign based on transaction type
      const transactionType = data.transactionType || (current.transactionType as TransactionType);
      updateData.amount = this.applyAmountSign(transactionType, data.amount);
    }
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
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
  static async deleteTransaction (id: number, userId: number): Promise<boolean> {
    const result = await db.delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return result.length > 0;
  }

  /**
   * Get transactions by type
   */
  static async getTransactionsByType (type: TransactionType, userId: number): Promise<Transaction[]> {
    const result = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.transactionType, type), eq(transactions.userId, userId)))
      .orderBy(desc(transactions.date));
    return result;
  }

  /**
   * Get all transactions with account AND link information
   * Optionally filter by account ID and date range
   */
  static async getAllTransactionsWithLinks (
    userId: number,
    accountId?: number,
    datePreset?: string,
    customStartDate?: string,
    customEndDate?: string,
    hasLinks?: boolean,
    excludeInvestments?: boolean
  ): Promise<TransactionWithLink[]> {
    // Build base query
    let query = db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        sourceAccountId: transactions.sourceAccountId,
        targetAccountId: transactions.targetAccountId,
        transactionType: transactions.transactionType,
        description: transactions.description,
        amount: transactions.amount,
        categoryId: transactions.categoryId,
        date: transactions.date,
        importId: transactions.importId,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
      })
      .from(transactions);

    // Build where conditions
    const conditions = [eq(transactions.userId, userId)];

    // Apply account filter if provided
    if (accountId !== undefined) {
      conditions.push(
        or(
          eq(transactions.sourceAccountId, accountId),
          eq(transactions.targetAccountId, accountId)
        )!
      );
    }

    // Apply date filter if provided
    if (datePreset) {
      let dateRange;
      if (datePreset === "CUSTOM" && customStartDate && customEndDate) {
        dateRange = { startDate: customStartDate, endDate: customEndDate };
      } else if (datePreset !== "CUSTOM") {
        dateRange = calculateDateRange(datePreset as DatePreset);
      }

      if (dateRange) {
        conditions.push(
          and(
            gte(transactions.date, dateRange.startDate),
            lte(transactions.date, dateRange.endDate)
          )!
        );
      }
    }

    // Apply hasLinks filter if provided
    if (hasLinks !== undefined) {
      const linkSubquery = db.select()
        .from(transactionLinks)
        .where(
          and(
            eq(transactionLinks.userId, userId),
            or(
              eq(transactionLinks.transaction1Id, transactions.id),
              eq(transactionLinks.transaction2Id, transactions.id)
            )
          )
        );

      if (hasLinks) {
        conditions.push(exists(linkSubquery));
      } else {
        conditions.push(notExists(linkSubquery));
      }
    }

    // Exclude investment account transactions if requested
    if (excludeInvestments) {
      const investmentAccountIds = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, userId),
            eq(accounts.isInvestmentAccount, "true")
          )
        );

      const investmentIds = investmentAccountIds.map(a => a.id);
      if (investmentIds.length > 0) {
        conditions.push(
          and(
            or(
              isNull(transactions.sourceAccountId),
              notInArray(transactions.sourceAccountId, investmentIds)
            ),
            or(
              isNull(transactions.targetAccountId),
              notInArray(transactions.targetAccountId, investmentIds)
            )
          )!
        );
      }
    }

    // Apply where conditions
    query = query.where(and(...conditions)) as typeof query;

    const result = await query.orderBy(desc(transactions.date), desc(transactions.createdAt));

    // Fetch accounts
    const accountIds = new Set<number>();
    const categoryIds = new Set<number>();
    result.forEach(t => {
      if (t.sourceAccountId) accountIds.add(t.sourceAccountId);
      if (t.targetAccountId) accountIds.add(t.targetAccountId);
      if (t.categoryId) categoryIds.add(t.categoryId);
    });

    let accountMap = new Map<number, { id: number; name: string; color: string | null; currency: Currency }>();
    if (accountIds.size > 0) {
      const accountsData = await db
        .select({
          id: accounts.id,
          name: accounts.name,
          color: accounts.color,
          currency: accounts.currency,
        })
        .from(accounts)
        .where(inArray(accounts.id, Array.from(accountIds)));

      accountMap = new Map(accountsData.map(a => [a.id, { ...a, currency: a.currency as Currency }]));
    }

    // Fetch categories
    let categoryMap = new Map<number, { id: number; name: string; color: string | null }>();
    if (categoryIds.size > 0) {
      const categoriesData = await db
        .select({
          id: categories.id,
          name: categories.name,
          color: categories.color,
        })
        .from(categories)
        .where(inArray(categories.id, Array.from(categoryIds)));

      categoryMap = new Map(categoriesData.map(c => [c.id, c]));
    }

    // Fetch links for all transactions
    const transactionIds = result.map(t => t.id);
    const linkMap = new Map<number, { id: number; linkedTransactionId: number; linkedTransaction?: { id: number; description: string; amount: number; date: string; transactionType: TransactionType } }>();

    if (transactionIds.length > 0) {
      const links = await db
        .select()
        .from(transactionLinks)
        .where(
          and(
            eq(transactionLinks.userId, userId),
            or(
              inArray(transactionLinks.transaction1Id, transactionIds),
              inArray(transactionLinks.transaction2Id, transactionIds)
            )
          )
        );

      // For each link, store it mapped to both transaction IDs
      for (const link of links) {
        linkMap.set(link.transaction1Id, {
          id: link.id,
          linkedTransactionId: link.transaction2Id
        });
        linkMap.set(link.transaction2Id, {
          id: link.id,
          linkedTransactionId: link.transaction1Id
        });
      }

      // Fetch linked transaction details
      const linkedTransactionIds = Array.from(new Set(
        links.flatMap(l => [l.transaction1Id, l.transaction2Id])
      ));

      if (linkedTransactionIds.length > 0) {
        const linkedTransactions = await db
          .select({
            id: transactions.id,
            description: transactions.description,
            amount: transactions.amount,
            date: transactions.date,
            transactionType: transactions.transactionType
          })
          .from(transactions)
          .where(inArray(transactions.id, linkedTransactionIds));

        const linkedTxMap = new Map(linkedTransactions.map(t => [t.id, t]));

        // Enhance linkMap with transaction details
        linkMap.forEach((linkInfo) => {
          const linkedTx = linkedTxMap.get(linkInfo.linkedTransactionId);
          if (linkedTx) {
            linkInfo.linkedTransaction = {
              id: linkedTx.id,
              description: linkedTx.description,
              amount: linkedTx.amount,
              date: linkedTx.date,
              transactionType: linkedTx.transactionType as TransactionType
            };
          }
        });
      }
    }

    // Map results with accounts, categories, and links
    return result.map(t => ({
      ...t,
      sourceAccount: t.sourceAccountId && accountMap.has(t.sourceAccountId)
        ? {
          id: t.sourceAccountId,
          name: accountMap.get(t.sourceAccountId)!.name,
          color: accountMap.get(t.sourceAccountId)!.color,
          currency: accountMap.get(t.sourceAccountId)!.currency,
        }
        : undefined,
      targetAccount: t.targetAccountId && accountMap.has(t.targetAccountId)
        ? {
          id: t.targetAccountId,
          name: accountMap.get(t.targetAccountId)!.name,
          color: accountMap.get(t.targetAccountId)!.color,
          currency: accountMap.get(t.targetAccountId)!.currency,
        }
        : undefined,
      category: t.categoryId && categoryMap.has(t.categoryId)
        ? {
          id: t.categoryId,
          name: categoryMap.get(t.categoryId)!.name,
          color: categoryMap.get(t.categoryId)!.color,
        }
        : undefined,
      link: linkMap.get(t.id)
    }));
  }

  /**
   * Get count of unlinked transfers for a user
   */
  static async getUnlinkedTransferCount (userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.transactionType, ["TransferOut", "TransferIn"]),
          notExists(
            db.select()
              .from(transactionLinks)
              .where(
                and(
                  eq(transactionLinks.userId, userId),
                  or(
                    eq(transactionLinks.transaction1Id, transactions.id),
                    eq(transactionLinks.transaction2Id, transactions.id)
                  )
                )
              )
          )
        )
      );
    return Number(result[0]?.count || 0);
  }
}
