import { db } from "@/lib/db";
import { transactionLinks, transactions } from "@/db/schema";
import {
  TransactionLink,
  CreateTransactionLinkData,
  TransactionLinkInfo
} from "@/types/transaction";
import { eq, and, or } from "drizzle-orm";

export class TransactionLinkService {
  /**
   * Create a bidirectional link between two transactions
   * Validates ownership and prevents duplicate/invalid links
   */
  static async createLink (data: CreateTransactionLinkData): Promise<TransactionLink> {
    const { userId, transaction1Id, transaction2Id } = data;

    // Validate: transactions can't be the same
    if (transaction1Id === transaction2Id) {
      throw new Error("Cannot link a transaction to itself");
    }

    // Validate: both transactions exist and belong to user
    const [t1, t2] = await Promise.all([
      db.select().from(transactions)
        .where(and(eq(transactions.id, transaction1Id), eq(transactions.userId, userId)))
        .limit(1),
      db.select().from(transactions)
        .where(and(eq(transactions.id, transaction2Id), eq(transactions.userId, userId)))
        .limit(1)
    ]);

    if (!t1[0] || !t2[0]) {
      throw new Error("One or both transactions not found or unauthorized");
    }

    // Check if either transaction is already linked
    const existingLinks = await db.select()
      .from(transactionLinks)
      .where(
        or(
          eq(transactionLinks.transaction1Id, transaction1Id),
          eq(transactionLinks.transaction2Id, transaction1Id),
          eq(transactionLinks.transaction1Id, transaction2Id),
          eq(transactionLinks.transaction2Id, transaction2Id)
        )
      );

    if (existingLinks.length > 0) {
      throw new Error("One or both transactions are already linked");
    }

    // Enforce canonical ordering: smaller ID first
    const [smallerId, largerId] = transaction1Id < transaction2Id
      ? [transaction1Id, transaction2Id]
      : [transaction2Id, transaction1Id];

    // Create link
    const result = await db.insert(transactionLinks).values({
      userId,
      transaction1Id: smallerId,
      transaction2Id: largerId
    }).returning();

    return result[0];
  }

  /**
   * Delete a link by link ID
   */
  static async deleteLink (linkId: number, userId: number): Promise<boolean> {
    const result = await db.delete(transactionLinks)
      .where(and(
        eq(transactionLinks.id, linkId),
        eq(transactionLinks.userId, userId)
      ))
      .returning();

    return result.length > 0;
  }

  /**
   * Get link information for a specific transaction
   * Returns the link and the linked transaction ID
   */
  static async getLinkForTransaction (
    transactionId: number,
    userId: number
  ): Promise<TransactionLinkInfo | null> {
    const result = await db.select()
      .from(transactionLinks)
      .where(
        and(
          eq(transactionLinks.userId, userId),
          or(
            eq(transactionLinks.transaction1Id, transactionId),
            eq(transactionLinks.transaction2Id, transactionId)
          )
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Validate if a link is allowed between two transactions
   * Useful for UI validation before attempting to create
   */
  static async validateLink (
    transaction1Id: number,
    transaction2Id: number,
    userId: number
  ): Promise<{ valid: boolean; reason?: string }> {
    if (transaction1Id === transaction2Id) {
      return { valid: false, reason: "Cannot link a transaction to itself" };
    }

    // Check ownership
    const [t1, t2] = await Promise.all([
      db.select().from(transactions)
        .where(and(eq(transactions.id, transaction1Id), eq(transactions.userId, userId)))
        .limit(1),
      db.select().from(transactions)
        .where(and(eq(transactions.id, transaction2Id), eq(transactions.userId, userId)))
        .limit(1)
    ]);

    if (!t1[0] || !t2[0]) {
      return { valid: false, reason: "One or both transactions not found" };
    }

    // Check if already linked
    const existingLinks = await db.select()
      .from(transactionLinks)
      .where(
        or(
          eq(transactionLinks.transaction1Id, transaction1Id),
          eq(transactionLinks.transaction2Id, transaction1Id),
          eq(transactionLinks.transaction1Id, transaction2Id),
          eq(transactionLinks.transaction2Id, transaction2Id)
        )
      );

    if (existingLinks.length > 0) {
      return { valid: false, reason: "One or both transactions are already linked" };
    }

    return { valid: true };
  }
}
