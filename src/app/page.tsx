"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { useLayout } from "@/components/ClientLayout";
import TransactionTable from "@/components/TransactionTable";
import EditTransactionModal from "@/components/EditTransactionModal";
import { formatCurrency } from "@/lib/currency";
import type { Currency } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Account, TransactionWithAccounts, Category, Transaction } from "@/types/transaction";

interface AccountWithStats extends Account {
  transactionCount: number;
  totalAmount: number;
  originalCurrency: Currency;
  displayCurrency: Currency;
}

export default function Home () {
  const { mutate } = useSWRConfig();
  const { setNewTransactionHandler } = useLayout();
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithAccounts | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [unlinkedTransferCount, setUnlinkedTransferCount] = useState(0);

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
    fetchUnlinkedTransferCount();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchUnlinkedTransferCount = async () => {
    try {
      const response = await fetch("/api/transactions/unlinked-count");
      if (response.ok) {
        const data = await response.json();
        setUnlinkedTransferCount(data.count);
      }
    } catch (error) {
      console.error("Error fetching unlinked transfer count:", error);
    }
  };

  const openTransactionModal = useCallback(() => {
    setEditingTransaction(null);
    setShowTransactionModal(true);
  }, []);

  useEffect(() => {
    // Register the new transaction handler with the layout
    setNewTransactionHandler(openTransactionModal);
    return () => setNewTransactionHandler(null);
  }, [setNewTransactionHandler, openTransactionModal]);

  const openEditModal = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  }, []);

  const handleDataChanged = useCallback(() => {
    fetchAccounts();
    fetchUnlinkedTransferCount();
    // Only revalidate string keys for /api/transactions; non-string SWR keys are ignored.
    mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/transactions"));
  }, [mutate]);

  const nonZeroAccounts = accounts.filter(a => a.totalAmount !== 0);

  const totalNetBalance = (() => {
    const currencies = [...new Set(nonZeroAccounts.map(a => a.displayCurrency))];
    if (currencies.length === 1) {
      const total = nonZeroAccounts.reduce((sum, a) => sum + a.totalAmount, 0);
      return { value: formatCurrency(total, currencies[0] as Currency), multi: false };
    } else if (currencies.length > 1) {
      return { value: "MULTI-CURRENCY", multi: true };
    }
    return { value: "$0.00", multi: false };
  })();

  return (
    <main className='max-w-[1600px] mx-auto px-6 py-8'>
      {/* Dashboard Stats - Neo-brutalist Cards */}
      <div className='grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8'>
        {/* Primary Stat - Takes 2 columns */}
        <div className='lg:col-span-2 animate-slide-up-fade' style={{ animationDelay: "0ms" }}>
          <Card className='glass-card glass-hover terminal-border h-full border-primary/40 relative overflow-hidden group'>
            <div className='absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500' />
            <div className='absolute bottom-0 left-0 w-40 h-40 bg-secondary/10 rounded-full blur-3xl' />
            <CardHeader className='pb-3'>
              <div className='flex items-start justify-between'>
                <div>
                  <div className='mono text-[10px] text-primary tracking-widest mb-1'>TOTAL_NET_BALANCE</div>
                  <CardTitle className='mono text-4xl font-bold tracking-tight'>
                    {totalNetBalance.value}
                  </CardTitle>
                  {totalNetBalance.multi && (
                    <div className='mono text-xs text-muted-foreground mt-1'>
                      {nonZeroAccounts.length} ACCOUNTS / {[...new Set(nonZeroAccounts.map(a => a.originalCurrency))].length} CURRENCIES
                    </div>
                  )}
                </div>
                <div className='w-12 h-12 bg-primary/20 rounded border border-primary flex items-center justify-center'>
                  <div className='mono text-2xl text-primary'>$</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 gap-4 mt-2'>
                <div>
                  <div className='mono text-[10px] text-muted-foreground tracking-wider'>ACCOUNTS</div>
                  <div className='mono text-2xl font-bold text-foreground'>{nonZeroAccounts.length}</div>
                </div>
                <div>
                  <div className='mono text-[10px] text-muted-foreground tracking-wider'>TRANSACTIONS</div>
                  <div className='mono text-2xl font-bold text-foreground'>
                    {nonZeroAccounts.reduce((sum, a) => sum + a.transactionCount, 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Breakdown */}
        <div className='lg:col-span-2 animate-slide-up-fade' style={{ animationDelay: "100ms" }}>
          <Card className='glass-card glass-hover terminal-border h-full border-border'>
            <CardHeader className='pb-2'>
              <div className='mono text-[10px] text-muted-foreground tracking-widest'>ACCOUNT_STATUS</div>
            </CardHeader>
            <CardContent>
              <div className='space-y-2 max-h-[140px] overflow-y-auto'>
                {nonZeroAccounts.slice(0, 4).map((account, idx) => (
                  <div
                    key={account.id}
                    className='flex items-center justify-between p-2 bg-background/50 rounded border border-border/50 hover:border-primary/50 transition-all group'
                    style={{ animationDelay: `${150 + idx * 50}ms` }}
                  >
                    <div className='flex items-center space-x-2 flex-1 min-w-0'>
                      <div
                        className='w-2 h-2 rounded-sm flex-shrink-0'
                        style={{ backgroundColor: account.color ?? "gray" }}
                      />
                      <span className='mono text-xs text-foreground truncate'>{account.name}</span>
                    </div>
                    <div className='mono text-xs font-bold text-right ml-2'>
                      <span className={account.totalAmount >= 0 ? "text-transaction-credit-text" : "text-transaction-debit-text"}>
                        {formatCurrency(account.totalAmount, account.displayCurrency)}
                      </span>
                    </div>
                  </div>
                ))}
                {nonZeroAccounts.length > 4 && (
                  <Link href='/admin' className='block text-center mono text-[10px] text-primary hover:text-primary/80 pt-1'>
                    +{nonZeroAccounts.length - 4} MORE
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Unlinked Transfers Alert */}
      {unlinkedTransferCount > 0 && (
        <div className='mb-6 animate-slide-up-fade' style={{ animationDelay: "300ms" }}>
          <Link
            href='/unlinked-transfers'
            className='block p-4 bg-warning/10 border-2 border-warning rounded terminal-border hover:bg-warning/20 transition-all group'
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <div className='mono text-2xl'>⚠</div>
                <div>
                  <div className='mono text-sm font-bold text-warning-foreground'>
                    UNLINKED TRANSFERS DETECTED
                  </div>
                  <div className='mono text-xs text-muted-foreground'>
                    {unlinkedTransferCount} transaction{unlinkedTransferCount !== 1 ? "s" : ""} require linking
                  </div>
                </div>
              </div>
              <div className='mono text-xs text-warning group-hover:translate-x-1 transition-transform'>
                [VIEW] →
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Transaction Data Stream */}
      <div className='animate-slide-up-fade' style={{ animationDelay: "400ms" }}>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='mono text-sm font-bold tracking-wider'>
            <span className='text-primary'>{">"}</span> TRANSACTION_STREAM
          </h2>
          <div className='mono text-[10px] text-muted-foreground'>
            LIVE_DATA
          </div>
        </div>

        <TransactionTable
          showAccountFilter
          showSearchFilter
          showDateFilter
          showLinkColumn
          showAccountsColumn
          maxRows={20}
          emptyStateMessage='NO TRANSACTIONS // USE [+] NEW_TXN TO BEGIN'
          editable
          onEditRequested={openEditModal}
          onDataChanged={handleDataChanged}
        />
      </div>

      {/* Transaction Modal */}
      <EditTransactionModal
        transaction={editingTransaction}
        accounts={accounts}
        categories={categories}
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
        }}
        onSaved={handleDataChanged}
        defaultSourceAccountId={accounts.length === 1 ? accounts[0].id : undefined}
        showLinkSelection
      />
    </main>
  );
}
