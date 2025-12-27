"use client";

import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { Currency, currencyEnum } from "@/db/schema";

export default function CurrencySelector () {
  const { displayCurrency, setDisplayCurrency, isLoading } = useDisplayCurrency();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value as Currency;
    await setDisplayCurrency(newCurrency);
  };

  return (
    <div className='flex items-center space-x-2'>
      <label htmlFor='currency-select' className='mono text-xs text-muted-foreground'>
        BASE:
      </label>
      <select
        id='currency-select'
        value={displayCurrency}
        onChange={handleChange}
        disabled={isLoading}
        className='mono text-xs px-2 py-1 rounded border border-border bg-background hover:border-primary transition-colors disabled:opacity-50 cursor-pointer'
      >
        {currencyEnum.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
    </div>
  );
}
