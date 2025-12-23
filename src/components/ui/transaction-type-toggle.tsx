import * as React from "react";
import { cn } from "@/lib/utils";

type TransactionType = "Debit" | "Credit" | "Transfer";

export interface TransactionTypeToggleProps {
  value: TransactionType;
  onValueChange: (value: TransactionType) => void;
  disabled?: boolean;
  className?: string;
}

export function TransactionTypeToggle({
  value,
  onValueChange,
  disabled = false,
  className,
}: TransactionTypeToggleProps) {
  const types: TransactionType[] = ["Debit", "Credit", "Transfer"];

  const getButtonClasses = (type: TransactionType) => {
    const isSelected = value === type;
    
    const baseClasses = "px-4 py-2 rounded-md border transition-colors font-medium text-sm";
    
    if (disabled) {
      return cn(baseClasses, "opacity-50 cursor-not-allowed bg-muted text-muted-foreground border-border");
    }

    if (isSelected) {
      switch (type) {
        case "Debit":
          return cn(baseClasses, "bg-transaction-debit border-transaction-debit-border text-transaction-debit-foreground");
        case "Credit":
          return cn(baseClasses, "bg-transaction-credit border-transaction-credit-border text-transaction-credit-foreground");
        case "Transfer":
          return cn(baseClasses, "bg-transaction-transfer border-transaction-transfer-border text-transaction-transfer-foreground");
      }
    }

    return cn(baseClasses, "bg-muted/50 border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground");
  };

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {types.map((type) => (
        <button
          key={type}
          type="button"
          disabled={disabled}
          onClick={() => onValueChange(type)}
          className={getButtonClasses(type)}
        >
          {type}
        </button>
      ))}
    </div>
  );
}
