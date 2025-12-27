import { db } from "@/lib/db";
import { accountBalances, type Currency } from "@/db/schema";
import { AccountBalance, CreateAccountBalanceData, UpdateAccountBalanceData, AccountBalanceWithConvertedAmount } from "@/types/transaction";
import { eq, and, desc } from "drizzle-orm";
import { ExchangeRateService } from "./ExchangeRateService";

export class BalanceHistoryService {
  static async getAllBalances (accountId: number, userId: number): Promise<AccountBalance[]> {
    const result = await db.select()
      .from(accountBalances)
      .where(and(eq(accountBalances.accountId, accountId), eq(accountBalances.userId, userId)))
      .orderBy(desc(accountBalances.date), desc(accountBalances.createdAt));
    return result as AccountBalance[];
  }

  static async getBalanceById (id: number, userId: number): Promise<AccountBalance | null> {
    const result = await db.select()
      .from(accountBalances)
      .where(and(eq(accountBalances.id, id), eq(accountBalances.userId, userId)));
    return (result[0] as AccountBalance) || null;
  }

  static async getLatestBalance (accountId: number, userId: number): Promise<AccountBalance | null> {
    const result = await db.select()
      .from(accountBalances)
      .where(and(eq(accountBalances.accountId, accountId), eq(accountBalances.userId, userId)))
      .orderBy(desc(accountBalances.date), desc(accountBalances.createdAt))
      .limit(1);
    return (result[0] as AccountBalance) || null;
  }

  static async createBalance (data: CreateAccountBalanceData): Promise<AccountBalance> {
    // Check if balance entry exists for same date
    const existing = await db.select()
      .from(accountBalances)
      .where(and(
        eq(accountBalances.accountId, data.accountId),
        eq(accountBalances.userId, data.userId),
        eq(accountBalances.date, data.date)
      ));

    // If exists, update it; otherwise create new
    if (existing.length > 0) {
      const result = await db.update(accountBalances)
        .set({
          currency: data.currency,
          amount: data.amount,
        })
        .where(and(
          eq(accountBalances.id, existing[0].id),
          eq(accountBalances.userId, data.userId)
        ))
        .returning();
      return result[0] as AccountBalance;
    }

    const result = await db.insert(accountBalances).values({
      userId: data.userId,
      accountId: data.accountId,
      date: data.date,
      currency: data.currency,
      amount: data.amount,
    }).returning();
    return result[0] as AccountBalance;
  }

  static async updateBalance (data: UpdateAccountBalanceData, userId: number): Promise<AccountBalance | null> {
    const updateData: Partial<typeof accountBalances.$inferInsert> = {};
    if (data.date !== undefined) updateData.date = data.date;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.amount !== undefined) updateData.amount = data.amount;

    const result = await db.update(accountBalances)
      .set(updateData)
      .where(and(eq(accountBalances.id, data.id), eq(accountBalances.userId, userId)))
      .returning();
    return (result[0] as AccountBalance) || null;
  }

  static async deleteBalance (id: number, userId: number): Promise<boolean> {
    const result = await db.delete(accountBalances)
      .where(and(eq(accountBalances.id, id), eq(accountBalances.userId, userId)))
      .returning();
    return result.length > 0;
  }

  /**
   * Get all balance entries for an account with amounts converted to display currency.
   * Uses historical exchange rates based on balance entry date.
   */
  static async getAllBalancesConverted (
    accountId: number,
    userId: number,
    displayCurrency: Currency
  ): Promise<AccountBalanceWithConvertedAmount[]> {
    // Get base balance entries
    const balances = await this.getAllBalances(accountId, userId);

    // Convert each balance entry using today's exchange rate
    const balancesWithConversion = await Promise.all(
      balances.map(async (balance) => {
        const convertedAmount = await ExchangeRateService.convertAmountWithMetadata(
          balance.amount,
          balance.currency as Currency,
          displayCurrency
        );

        return {
          ...balance,
          convertedAmount,
        };
      })
    );

    return balancesWithConversion;
  }
}
