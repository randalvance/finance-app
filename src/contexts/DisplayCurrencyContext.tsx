"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Currency } from "@/db/schema";

interface DisplayCurrencyContextType {
  displayCurrency: Currency;
  setDisplayCurrency: (currency: Currency) => Promise<void>;
  isLoading: boolean;
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextType | undefined>(undefined);

export function DisplayCurrencyProvider ({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<Currency>("USD");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial display currency from backend
  useEffect(() => {
    const fetchDisplayCurrency = async () => {
      try {
        const response = await fetch("/api/users/display-currency");
        if (response.ok) {
          const data = await response.json();
          setDisplayCurrencyState(data.displayCurrency);
        }
      } catch (error) {
        console.error("Failed to fetch display currency:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDisplayCurrency();
  }, []);

  const setDisplayCurrency = async (currency: Currency) => {
    try {
      const response = await fetch("/api/users/display-currency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayCurrency: currency }),
      });

      if (response.ok) {
        setDisplayCurrencyState(currency);
        window.location.reload();
      } else {
        console.error("Failed to update display currency");
      }
    } catch (error) {
      console.error("Error updating display currency:", error);
    }
  };

  return (
    <DisplayCurrencyContext.Provider
      value={{ displayCurrency, setDisplayCurrency, isLoading }}
    >
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency () {
  const context = useContext(DisplayCurrencyContext);
  if (!context) {
    throw new Error("useDisplayCurrency must be used within DisplayCurrencyProvider");
  }
  return context;
}
