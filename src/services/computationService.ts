import { db } from "@/lib/db";
import { computations, computationTransactions, transactions, accounts, categories, type Currency } from "@/db/schema";
import {
  Computation,
  ComputationWithTransactions,
  ComputationAggregation,
  CreateComputationData,
  UpdateComputationData,
  TransactionWithAccounts
} from "@/types/transaction";
import { eq, and, inArray, sql, desc } from "drizzle-orm";

export class ComputationService {
  static async getAllComputations (userId: number): Promise<(Computation & { transactionCount: number })[]> {
    const result = await db
      .select({
        id: computations.id,
        userId: computations.userId,
        name: computations.name,
        description: computations.description,
        createdAt: computations.createdAt,
        updatedAt: computations.updatedAt,
        transactionCount: sql<number>`count(${computationTransactions.transactionId})`
      })
      .from(computations)
      .leftJoin(computationTransactions, eq(computations.id, computationTransactions.computationId))
      .where(eq(computations.userId, userId))
      .groupBy(computations.id)
      .orderBy(desc(computations.createdAt));

    return result.map(r => ({
      ...r,
      transactionCount: Number(r.transactionCount)
    }));
  }

  static async getComputationById (id: number, userId: number): Promise<ComputationWithTransactions | null> {
    const computationResult = await db
      .select()
      .from(computations)
      .where(and(eq(computations.id, id), eq(computations.userId, userId)));

    if (computationResult.length === 0) return null;
    const computation = computationResult[0];

    // Get transaction IDs and exclusion status for this computation
    const junctionResult = await db
      .select({
        transactionId: computationTransactions.transactionId,
        isExcluded: computationTransactions.isExcluded
      })
      .from(computationTransactions)
      .where(eq(computationTransactions.computationId, id));

    const transactionIds = junctionResult.map(r => r.transactionId);
    const excludedIds = junctionResult.filter(r => r.isExcluded === 1).map(r => r.transactionId);

    let transactionDetails: TransactionWithAccounts[] = [];
    if (transactionIds.length > 0) {
      // Fetch transactions with accounts and categories (similar to TransactionService.getAllTransactions)
      const transResult = await db
        .select()
        .from(transactions)
        .where(inArray(transactions.id, transactionIds))
        .orderBy(desc(transactions.date), desc(transactions.createdAt));

      // Collect all unique account IDs and category IDs
      const accountIds = new Set<number>();
      const categoryIds = new Set<number>();
      transResult.forEach(t => {
        if (t.sourceAccountId) accountIds.add(t.sourceAccountId);
        if (t.targetAccountId) accountIds.add(t.targetAccountId);
        if (t.categoryId) categoryIds.add(t.categoryId);
      });

      // Fetch accounts
      const accountMap = new Map<number, { id: number; name: string; color: string | null; currency: Currency }>();
      if (accountIds.size > 0) {
        const accountsResult = await db
          .select({ id: accounts.id, name: accounts.name, color: accounts.color, currency: accounts.currency })
          .from(accounts)
          .where(inArray(accounts.id, Array.from(accountIds)));
        accountsResult.forEach(a => accountMap.set(a.id, a as { id: number; name: string; color: string | null; currency: Currency }));
      }

      // Fetch categories
      const categoryMap = new Map<number, { id: number; name: string; color: string | null }>();
      if (categoryIds.size > 0) {
        const categoriesResult = await db
          .select({ id: categories.id, name: categories.name, color: categories.color })
          .from(categories)
          .where(inArray(categories.id, Array.from(categoryIds)));
        categoriesResult.forEach(c => categoryMap.set(c.id, c));
      }

      transactionDetails = transResult.map(t => ({
        ...t,
        sourceAccount: t.sourceAccountId ? accountMap.get(t.sourceAccountId) : undefined,
        targetAccount: t.targetAccountId ? accountMap.get(t.targetAccountId) : undefined,
        category: t.categoryId ? categoryMap.get(t.categoryId) : undefined,
      })) as TransactionWithAccounts[];
    }

    return {
      ...computation,
      transactions: transactionDetails,
      transactionCount: transactionDetails.length,
      excludedTransactionIds: excludedIds
    };
  }

  static async createComputation (data: CreateComputationData): Promise<Computation> {
    return await db.transaction(async (tx) => {
      const [computation] = await tx
        .insert(computations)
        .values({
          userId: data.userId,
          name: data.name,
          description: data.description || null,
        })
        .returning();

      if (data.transactionIds && data.transactionIds.length > 0) {
        await tx.insert(computationTransactions).values(
          data.transactionIds.map(tid => ({
            computationId: computation.id,
            transactionId: tid,
          }))
        );
      }

      return computation;
    });
  }

  static async updateComputation (data: UpdateComputationData, userId: number): Promise<Computation | null> {
    return await db.transaction(async (tx) => {
      const [computation] = await tx
        .update(computations)
        .set({
          name: data.name,
          description: data.description,
          updatedAt: new Date(),
        })
        .where(and(eq(computations.id, data.id), eq(computations.userId, userId)))
        .returning();

      if (!computation) return null;

      if (data.transactionIds !== undefined) {
        // Replace all transactions
        await tx.delete(computationTransactions).where(eq(computationTransactions.computationId, data.id));
        if (data.transactionIds.length > 0) {
          await tx.insert(computationTransactions).values(
            data.transactionIds.map(tid => ({
              computationId: computation.id,
              transactionId: tid,
            }))
          );
        }
      }

      return computation;
    });
  }

  static async deleteComputation (id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(computations)
      .where(and(eq(computations.id, id), eq(computations.userId, userId)))
      .returning();
    return result.length > 0;
  }

  static async getComputationAggregation (id: number, userId: number): Promise<ComputationAggregation | null> {
    // Verify ownership
    const computation = await db
      .select()
      .from(computations)
      .where(and(eq(computations.id, id), eq(computations.userId, userId)));

    if (computation.length === 0) return null;

    const result = await db
      .select({
        totalCredits: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.transactionType} IN ('Credit', 'TransferIn') THEN ${transactions.amount} ELSE 0 END), 0)`,
        totalDebits: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.transactionType} IN ('Debit', 'TransferOut') THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
        transactionCount: sql<number>`COUNT(*)`,
        creditCount: sql<number>`COUNT(CASE WHEN ${transactions.transactionType} IN ('Credit', 'TransferIn') THEN 1 END)`,
        debitCount: sql<number>`COUNT(CASE WHEN ${transactions.transactionType} IN ('Debit', 'TransferOut') THEN 1 END)`,
      })
      .from(transactions)
      .innerJoin(computationTransactions, eq(transactions.id, computationTransactions.transactionId))
      .where(and(
        eq(computationTransactions.computationId, id),
        eq(computationTransactions.isExcluded, 0) // Only include non-excluded transactions
      ));

    const aggregation = result[0];
    const totalCredits = Number(aggregation.totalCredits);
    const totalDebits = Number(aggregation.totalDebits);

    return {
      totalCredits,
      totalDebits,
      netBalance: totalCredits - totalDebits,
      transactionCount: Number(aggregation.transactionCount),
      creditCount: Number(aggregation.creditCount),
      debitCount: Number(aggregation.debitCount),
    };
  }

  static async addTransactions (computationId: number, transactionIds: number[], userId: number): Promise<void> {
    // Verify ownership
    const computation = await db
      .select()
      .from(computations)
      .where(and(eq(computations.id, computationId), eq(computations.userId, userId)));

    if (computation.length === 0) throw new Error("Computation not found");

    if (transactionIds.length === 0) return;

    await db.insert(computationTransactions)
      .values(transactionIds.map(tid => ({ computationId, transactionId: tid })))
      .onConflictDoNothing();
  }

  static async removeTransactions (computationId: number, transactionIds: number[], userId: number): Promise<void> {
    // Verify ownership
    const computation = await db
      .select()
      .from(computations)
      .where(and(eq(computations.id, computationId), eq(computations.userId, userId)));

    if (computation.length === 0) throw new Error("Computation not found");

    if (transactionIds.length === 0) return;

    await db.delete(computationTransactions)
      .where(
        and(
          eq(computationTransactions.computationId, computationId),
          inArray(computationTransactions.transactionId, transactionIds)
        )
      );
  }

  static async toggleTransactionExclusion (computationId: number, transactionId: number, isExcluded: boolean, userId: number): Promise<void> {
    // Verify ownership
    const computation = await db
      .select()
      .from(computations)
      .where(and(eq(computations.id, computationId), eq(computations.userId, userId)));

    if (computation.length === 0) throw new Error("Computation not found");

    await db
      .update(computationTransactions)
      .set({ isExcluded: isExcluded ? 1 : 0 })
      .where(
        and(
          eq(computationTransactions.computationId, computationId),
          eq(computationTransactions.transactionId, transactionId)
        )
      );
  }
}
