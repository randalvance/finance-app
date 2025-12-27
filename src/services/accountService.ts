import { db } from "@/lib/db";
import { accounts, transactions, type Currency } from "@/db/schema";
import { Account, CreateAccountData, UpdateAccountData } from "@/types/transaction";
import { eq, sql, and, or, asc } from "drizzle-orm";
import { BalanceHistoryService } from "./BalanceHistoryService";
import { ExchangeRateService } from "./ExchangeRateService";

export class AccountService {
  static async getAllAccounts (userId: number): Promise<Account[]> {
    const result = await db.select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(asc(accounts.name));
    return result as Account[];
  }

  static async getAccountById (id: number, userId: number): Promise<Account | null> {
    const result = await db.select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
    return (result[0] as Account) || null;
  }

  static async createAccount (data: CreateAccountData): Promise<Account> {
    const result = await db.insert(accounts).values({
      userId: data.userId,
      name: data.name,
      description: data.description || null,
      color: data.color || "#6366f1",
      currency: data.currency || "USD",
      isInvestmentAccount: data.isInvestmentAccount ? "true" : "false",
    }).returning();
    return result[0] as Account;
  }

  static async updateAccount (data: UpdateAccountData, userId: number): Promise<Account | null> {
    const updateData: Partial<typeof accounts.$inferInsert> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.isInvestmentAccount !== undefined) updateData.isInvestmentAccount = data.isInvestmentAccount ? "true" : "false";

    const result = await db.update(accounts)
      .set(updateData)
      .where(and(eq(accounts.id, data.id), eq(accounts.userId, userId)))
      .returning();
    return (result[0] as Account) || null;
  }

  static async deleteAccount (id: number, userId: number): Promise<boolean> {
    const result = await db.delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning();
    return result.length > 0;
  }

  static async getAccountTransactionCount (accountId: number, userId: number): Promise<number> {
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

  static async getAccountTotalAmount (accountId: number, userId: number): Promise<number> {
    // Check if account is an investment account
    const account = await this.getAccountById(accountId, userId);
    if (!account) return 0;

    // If investment account, return latest balance entry
    if (account.isInvestmentAccount === "true") {
      const latestBalance = await BalanceHistoryService.getLatestBalance(accountId, userId);
      return latestBalance ? latestBalance.amount : 0;
    }

    // Otherwise, calculate from transactions
    // Credits (money in) - increases account balance
    const credits = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.targetAccountId, accountId),
          or(
            eq(transactions.transactionType, "Credit"),
            eq(transactions.transactionType, "TransferIn")
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
            eq(transactions.transactionType, "Debit"),
            eq(transactions.transactionType, "TransferOut")
          )
        )
      );

    const creditAmount = parseFloat(credits[0]?.total || "0");
    const debitAmount = parseFloat(debits[0]?.total || "0");

    // Net balance = credits - debits
    // Since debits are negative and credits are positive, this is actually:
    // credits (positive) + debits (negative) = net balance
    return creditAmount + debitAmount;
  }

  static async getAccountTotalAmountConverted (
    accountId: number,
    userId: number,
    displayCurrency: Currency
  ): Promise<{ amount: number; originalCurrency: Currency }> {
    const account = await this.getAccountById(accountId, userId);
    if (!account) {
      return { amount: 0, originalCurrency: displayCurrency };
    }

    const originalAmount = await this.getAccountTotalAmount(accountId, userId);

    // If already in display currency, return as-is
    if (account.currency === displayCurrency) {
      return { amount: originalAmount, originalCurrency: account.currency as Currency };
    }

    // Convert to display currency using today's rate
    try {
      const convertedAmount = await ExchangeRateService.convertAmount(
        originalAmount,
        account.currency,
        displayCurrency
      );
      return { amount: convertedAmount, originalCurrency: account.currency as Currency };
    } catch (error) {
      // If conversion fails, return original amount
      console.error("Failed to convert amount:", error);
      return { amount: originalAmount, originalCurrency: account.currency as Currency };
    }
  }
}
