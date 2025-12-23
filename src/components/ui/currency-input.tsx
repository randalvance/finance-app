import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type"> {
  currencySymbol?: string;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ currencySymbol = "$", className, ...props }, ref) => {
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          {currencySymbol}
        </span>
        <Input
          ref={ref}
          type="number"
          step="0.01"
          min="0"
          className={cn("pl-8", className)}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
