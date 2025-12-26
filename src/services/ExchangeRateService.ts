import { db } from "@/lib/db";
import { exchangeRates } from "@/db/schema";
import { ExchangeRate, CreateExchangeRateData, ExchangeRateApiResponse } from "@/types/transaction";
import { eq, and } from "drizzle-orm";

export class ExchangeRateService {
  private static readonly API_BASE_URL = "https://v6.exchangerate-api.com/v6";

  /**
   * Get exchange rate for a specific currency pair and date from cache.
   * If not found in cache, fetches from API.
   */
  static async getRate (
    fromCurrency: string,
    toCurrency: string,
    date: string
  ): Promise<number> {
    // Check cache first
    const cached = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, fromCurrency),
          eq(exchangeRates.toCurrency, toCurrency),
          eq(exchangeRates.date, date)
        )
      );

    if (cached.length > 0) {
      return cached[0].rate;
    }

    // If not in cache and it's a historical date, try to fetch from API
    // For now, throw error for missing historical rates
    throw new Error(
      `Exchange rate not found for ${fromCurrency}/${toCurrency} on ${date}. Please fetch rates first.`
    );
  }

  /**
   * Get the latest exchange rate for a currency pair (today's date).
   * Falls back to most recent cached rate if today's is not available.
   */
  static async getCurrentRate (
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    const today = new Date().toISOString().split("T")[0];

    // Check for today's rate
    const todayRate = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, fromCurrency),
          eq(exchangeRates.toCurrency, toCurrency),
          eq(exchangeRates.date, today)
        )
      );

    if (todayRate.length > 0) {
      return todayRate[0].rate;
    }

    // Fall back to most recent rate
    const recentRate = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, fromCurrency),
          eq(exchangeRates.toCurrency, toCurrency)
        )
      )
      .orderBy((t) => t.date)
      .limit(1);

    if (recentRate.length > 0) {
      return recentRate[0].rate;
    }

    throw new Error(`No exchange rate found for ${fromCurrency}/${toCurrency}`);
  }

  /**
   * Fetch exchange rates from API and cache them in the database.
   * Fetches all rates for a base currency and stores them.
   */
  static async fetchAndCacheRates (baseCurrency: string = "USD"): Promise<void> {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      throw new Error("EXCHANGE_RATE_API_KEY is not configured");
    }

    const url = `${this.API_BASE_URL}/${apiKey}/latest/${baseCurrency}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Exchange rate API error: ${errorData["error-type"] || "unknown error"}`);
    }

    const data = (await response.json()) as ExchangeRateApiResponse;

    if (data.result !== "success") {
      throw new Error(`Exchange rate API returned non-success result: ${data.result}`);
    }

    // Prepare rates for insertion
    const today = new Date().toISOString().split("T")[0];
    const rates = Object.entries(data.conversion_rates).map(([toCurrency, rate]) => ({
      fromCurrency: baseCurrency,
      toCurrency,
      rate: typeof rate === "number" ? rate : parseFloat(rate as string),
      date: today,
      source: "exchangerate-api",
    }));

    // Insert or replace rates using upsert pattern
    for (const rate of rates) {
      // Delete existing rate for this pair/date to avoid conflicts
      await db
        .delete(exchangeRates)
        .where(
          and(
            eq(exchangeRates.fromCurrency, rate.fromCurrency),
            eq(exchangeRates.toCurrency, rate.toCurrency),
            eq(exchangeRates.date, rate.date)
          )
        );

      // Insert new rate
      await db.insert(exchangeRates).values(rate);
    }
  }

  /**
   * Save a single exchange rate to the database.
   */
  static async saveRate (data: CreateExchangeRateData): Promise<ExchangeRate> {
    // Delete existing rate for this pair/date to avoid conflicts
    await db
      .delete(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, data.fromCurrency),
          eq(exchangeRates.toCurrency, data.toCurrency),
          eq(exchangeRates.date, data.date)
        )
      );

    const result = await db.insert(exchangeRates).values({
      fromCurrency: data.fromCurrency,
      toCurrency: data.toCurrency,
      rate: data.rate,
      date: data.date,
      source: data.source || "exchangerate-api",
    }).returning();

    return result[0] as ExchangeRate;
  }

  /**
   * Convert an amount from one currency to another using cached rates.
   */
  static async convertAmount (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const targetDate = date || new Date().toISOString().split("T")[0];
    const rate = await this.getRate(fromCurrency, toCurrency, targetDate);
    return amount * rate;
  }

  /**
   * Get all cached rates for a specific date.
   */
  static async getRatesForDate (date: string): Promise<ExchangeRate[]> {
    const result = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.date, date));
    return result as ExchangeRate[];
  }
}
