import { currencyEnum, type Currency } from '@/db/schema';

interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  decimals: number;
  position: 'before' | 'after';
}

const currencyConfigs: Record<Currency, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, position: 'before' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, position: 'before' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, position: 'before' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, position: 'before' },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', decimals: 2, position: 'before' },
};

/**
 * Format an amount with the appropriate currency symbol
 */
export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  const config = currencyConfigs[currency];
  const formattedAmount = amount.toFixed(config.decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  if (config.position === 'before') {
    return `${config.symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount}${config.symbol}`;
  }
}

/**
 * Get the symbol for a currency
 */
export function getCurrencySymbol(currency: Currency = 'USD'): string {
  return currencyConfigs[currency].symbol;
}

/**
 * Get all available currencies with their metadata
 */
export function getAvailableCurrencies(): CurrencyConfig[] {
  return currencyEnum.map(code => currencyConfigs[code]);
}
