import { db } from "@/lib/db";
import { exchangeRates, currencyEnum, type Currency } from "@/db/schema";
import { ExchangeRate, CreateExchangeRateData, ExchangeRateApiResponse } from "@/types/transaction";
import { eq, and, desc } from "drizzle-orm";

export class ExchangeRateService {
  private static readonly API_BASE_URL = "https://v6.exchangerate-api.com/v6";

  /**
   * Get exchange rate for a specific currency pair and date.
   * All rates are stored as USD-based (USD→XXX) and cross-rates are computed on-the-fly.
   */
  static async getRate (
    fromCurrency: string,
    toCurrency: string,
    date: string
  ): Promise<number> {
    // Same currency - no conversion needed
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const today = new Date().toISOString().split("T")[0];

    // If today's rate is requested and not cached, fetch USD rates first
    if (date === today) {
      await this.ensureUsdRatesAvailable(date);
    }

    // Case 1: Converting from USD (USD→XXX)
    if (fromCurrency === "USD") {
      const rate = await db
        .select()
        .from(exchangeRates)
        .where(
          and(
            eq(exchangeRates.currency, toCurrency),
            eq(exchangeRates.date, date)
          )
        );

      if (rate.length > 0) {
        return rate[0].rate;
      }
    }

    // Case 2: Converting to USD (XXX→USD)
    if (toCurrency === "USD") {
      const rate = await db
        .select()
        .from(exchangeRates)
        .where(
          and(
            eq(exchangeRates.currency, fromCurrency),
            eq(exchangeRates.date, date)
          )
        );

      if (rate.length > 0 && rate[0].rate !== 0) {
        return 1 / rate[0].rate;
      }
    }

    // Case 3: Cross-rate (XXX→YYY) - compute using USD as intermediate
    const [usdToTarget, usdToSource] = await Promise.all([
      db
        .select()
        .from(exchangeRates)
        .where(
          and(
            eq(exchangeRates.currency, toCurrency),
            eq(exchangeRates.date, date)
          )
        ),
      db
        .select()
        .from(exchangeRates)
        .where(
          and(
            eq(exchangeRates.currency, fromCurrency),
            eq(exchangeRates.date, date)
          )
        ),
    ]);

    if (usdToTarget.length > 0 && usdToSource.length > 0 && usdToSource[0].rate !== 0) {
      // Cross-rate formula: (USD→Target) / (USD→Source)
      return usdToTarget[0].rate / usdToSource[0].rate;
    }

    throw new Error(
      `Exchange rate not found for ${fromCurrency}/${toCurrency} on ${date}. Please fetch rates first.`
    );
  }

  /**
   * Get the latest exchange rate for a currency pair (today's date).
   * Falls back to most recent cached USD rates if today's is not available.
   */
  static async getCurrentRate (
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    const today = new Date().toISOString().split("T")[0];

    // Attempt to get today's rate (this will auto-fetch if missing)
    try {
      return await this.getRate(fromCurrency, toCurrency, today);
    } catch (err) {
      // Fallback: get most recent USD-based rates and compute
      const recentRates = await db
        .select()
        .from(exchangeRates)
        .orderBy(desc(exchangeRates.date))
        .limit(1);

      if (recentRates.length === 0) {
        throw new Error(`No exchange rates found in cache`);
      }

      const mostRecentDate = recentRates[0].date;
      return await this.getRate(fromCurrency, toCurrency, mostRecentDate);
    }
  }

  /**
   * Fetch USD-based exchange rates from API and cache them in the database.
   * Always uses USD as the base currency to minimize storage.
   */
  static async fetchAndCacheRates (): Promise<void> {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      throw new Error("EXCHANGE_RATE_API_KEY is not configured");
    }

    const url = `${this.API_BASE_URL}/${apiKey}/latest/USD`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Exchange rate API error: ${errorData["error-type"] || "unknown error"}`);
    }

    const data = (await response.json()) as ExchangeRateApiResponse;

    if (data.result !== "success") {
      throw new Error(`Exchange rate API returned non-success result: ${data.result}`);
    }

    // Prepare rates for insertion - only cache supported currencies
    const today = new Date().toISOString().split("T")[0];
    const supportedCurrencies = new Set(currencyEnum);
    const rates = Object.entries(data.conversion_rates)
      .filter(([currency]) => supportedCurrencies.has(currency as Currency))
      .map(([currency, rate]) => ({
        currency,
        rate: typeof rate === "number" ? rate : parseFloat(rate as string),
        date: today,
        source: "exchangerate-api",
      }));

    // Insert or replace rates using upsert pattern
    for (const rate of rates) {
      await db.insert(exchangeRates).values(rate).onConflictDoUpdate({
        target: [exchangeRates.currency, exchangeRates.date],
        set: {
          rate: rate.rate,
          source: rate.source,
        }
      });
    }
  }

  /**
   * Save a single USD-based exchange rate to the database.
   */
  static async saveRate (data: CreateExchangeRateData): Promise<ExchangeRate> {
    const result = await db.insert(exchangeRates).values({
      currency: data.currency,
      rate: data.rate,
      date: data.date,
      source: data.source || "exchangerate-api",
    }).onConflictDoUpdate({
      target: [exchangeRates.currency, exchangeRates.date],
      set: {
        rate: data.rate,
        source: data.source || "exchangerate-api",
      }
    }).returning();

    return result[0] as ExchangeRate;
  }

  /**
   * Ensure USD-based rates are available for the given date.
   * Fetches from API if not cached.
   */
  private static async ensureUsdRatesAvailable (date: string): Promise<void> {
    // Check if we already have USD rates for this date
    const existingRates = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.date, date))
      .limit(1);

    // If we don't have USD rates for this date, fetch them
    if (existingRates.length === 0) {
      try {
        await this.fetchAndCacheRates();
      } catch (err) {
        console.warn("Failed to fetch USD rates", err);
      }
    }
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
   * Convert an amount with full metadata about the conversion.
   * Always uses today's exchange rate for simplicity (no historical rates).
   * Falls back gracefully if rate is not available.
   */
  static async convertAmountWithMetadata (
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency
  ): Promise<import("@/types/transaction").CurrencyConversionInfo> {
    const today = new Date().toISOString().split("T")[0];

    // Same currency - no conversion needed
    if (fromCurrency === toCurrency) {
      return {
        amount,
        originalAmount: amount,
        originalCurrency: fromCurrency,
        displayCurrency: toCurrency,
        conversionApplied: false,
        conversionDate: today,
      };
    }

    // Try to convert using today's rate
    try {
      const convertedAmount = await this.convertAmount(
        amount,
        fromCurrency,
        toCurrency,
        today
      );

      return {
        amount: convertedAmount,
        originalAmount: amount,
        originalCurrency: fromCurrency,
        displayCurrency: toCurrency,
        conversionApplied: true,
        conversionDate: today,
      };
    } catch (error) {
      // Conversion failed
      console.warn(
        `Currency conversion failed for ${fromCurrency} to ${toCurrency}:`,
        error
      );

      return {
        amount,
        originalAmount: amount,
        originalCurrency: fromCurrency,
        displayCurrency: toCurrency,
        conversionApplied: false,
        conversionDate: today,
        conversionFailed: true,
      };
    }
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
