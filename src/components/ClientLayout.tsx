"use client";

import { useState, createContext, useContext, ReactNode } from "react";
import AppHeader from "./AppHeader";
import { DisplayCurrencyProvider } from "@/contexts/DisplayCurrencyContext";

interface LayoutContextType {
  openNewTransaction: () => void;
  setNewTransactionHandler: (handler: (() => void) | null) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function useLayout () {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within ClientLayout");
  }
  return context;
}

export default function ClientLayout ({ children }: { children: ReactNode }) {
  const [newTransactionHandler, setNewTransactionHandler] = useState<(() => void) | null>(null);

  const openNewTransaction = () => {
    if (newTransactionHandler) {
      newTransactionHandler();
    }
  };

  const contextValue: LayoutContextType = {
    openNewTransaction,
    setNewTransactionHandler: (handler) => setNewTransactionHandler(() => handler),
  };

  return (
    <DisplayCurrencyProvider>
      <LayoutContext.Provider value={contextValue}>
        <AppHeader onNewTransaction={newTransactionHandler ? openNewTransaction : undefined} />
        {children}
      </LayoutContext.Provider>
    </DisplayCurrencyProvider>
  );
}
