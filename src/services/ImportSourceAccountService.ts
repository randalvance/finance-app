import { db } from "@/lib/db";
import { importSourceAccounts, accounts } from "@/db/schema";
import { Account } from "@/types/transaction";
import { eq, and, inArray, sql } from "drizzle-orm";

export class ImportSourceAccountService {
  /**
   * Get all accounts associated with an import source
   */
  static async getAssociatedAccounts (
    importSourceId: number,
    userId: number
  ): Promise<Account[]> {
    const result = await db
      .select({
        id: accounts.id,
        userId: accounts.userId,
        name: accounts.name,
        description: accounts.description,
        color: accounts.color,
        currency: accounts.currency,
        createdAt: accounts.createdAt,
        updatedAt: accounts.updatedAt,
      })
      .from(importSourceAccounts)
      .innerJoin(accounts, eq(importSourceAccounts.accountId, accounts.id))
      .where(
        and(
          eq(importSourceAccounts.importSourceId, importSourceId),
          eq(accounts.userId, userId) // Security: ensure user owns accounts
        )
      );

    return result;
  }

  /**
   * Set account associations for an import source
   * Replaces all existing associations with the new set
   */
  static async setAccountAssociations (
    importSourceId: number,
    accountIds: number[],
    userId: number
  ): Promise<void> {
    // Transaction: delete old associations and insert new ones
    await db.transaction(async (tx) => {
      // Delete existing associations
      await tx
        .delete(importSourceAccounts)
        .where(eq(importSourceAccounts.importSourceId, importSourceId));

      // Insert new associations if any provided
      if (accountIds.length > 0) {
        // Verify all accounts belong to the user (security check)
        const userAccounts = await tx
          .select({ id: accounts.id })
          .from(accounts)
          .where(
            and(
              eq(accounts.userId, userId),
              inArray(accounts.id, accountIds)
            )
          );

        const validAccountIds = userAccounts.map(a => a.id);

        // Only insert associations for accounts that belong to the user
        if (validAccountIds.length > 0) {
          await tx.insert(importSourceAccounts).values(
            validAccountIds.map(accountId => ({
              importSourceId,
              accountId,
            }))
          );
        }
      }
    });
  }

  /**
   * Delete all associations for an import source
   */
  static async deleteAssociations (importSourceId: number): Promise<void> {
    await db
      .delete(importSourceAccounts)
      .where(eq(importSourceAccounts.importSourceId, importSourceId));
  }

  /**
   * Check if an import source has any account associations
   */
  static async hasAssociations (importSourceId: number): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(importSourceAccounts)
      .where(eq(importSourceAccounts.importSourceId, importSourceId));

    return Number(result[0]?.count || 0) > 0;
  }
}
