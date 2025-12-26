"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLayout } from "@/components/ClientLayout";
import TransactionTable from "@/components/TransactionTable";
import EditTransactionModal from "@/components/EditTransactionModal";
import { formatCurrency } from "@/lib/currency";
import type { Currency } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Account, TransactionWithAccounts, TransactionWithLink, Category, Transaction } from "@/types/transaction";

interface AccountWithStats extends Account {
  transactionCount: number;
  totalAmount: number;
}

export default function Home () {
  const { setNewTransactionHandler } = useLayout();
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithAccounts | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<number | null>(null);
  const [homeSearchQuery, setHomeSearchQuery] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [customDateRange, setCustomDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({ startDate: null, endDate: null });
  const [unlinkedTransferCount, setUnlinkedTransferCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 20;

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
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

  const fetchTransactions = useCallback(async (
    accountId?: number | null,
    datePreset?: string | null,
    customRange?: { startDate: string | null; endDate: string | null },
    loadMore: boolean = false
  ) => {
    try {
      const params = new URLSearchParams();
      if (accountId) params.append("accountId", accountId.toString());
      if (datePreset) {
        params.append("datePreset", datePreset);
        if (datePreset === "CUSTOM" && customRange?.startDate && customRange?.endDate) {
          params.append("startDate", customRange.startDate);
          params.append("endDate", customRange.endDate);
        }
      }
      params.append("limit", ITEMS_PER_PAGE.toString());
      params.append("offset", (loadMore ? offset : 0).toString());

      const url = `/api/transactions${params.toString() ? "?" + params.toString() : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const totalCountHeader = response.headers.get("X-Total-Count");
        const totalCountValue = totalCountHeader ? parseInt(totalCountHeader) : 0;

        if (loadMore) {
          setTransactions(prev => [...prev, ...data]);
          setOffset(prev => prev + ITEMS_PER_PAGE);
          setHasMore((offset + ITEMS_PER_PAGE) < totalCountValue);
        } else {
          setTransactions(data);
          setOffset(ITEMS_PER_PAGE);
          setHasMore(ITEMS_PER_PAGE < totalCountValue);
        }

        setTotalCount(totalCountValue);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }, [ITEMS_PER_PAGE, offset]);

  const fetchUnlinkedTransferCount = async () => {
    try {
      const response = await fetch("/api/transactions/unlinked-transfers");
      if (response.ok) {
        const data = await response.json();
        setUnlinkedTransferCount(data.length);
      }
    } catch (error) {
      console.error("Error fetching unlinked transfer count:", error);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
    fetchTransactions();
    fetchUnlinkedTransferCount();
  }, [fetchTransactions]);

  const openTransactionModal = useCallback(() => {
    setEditingTransaction(null);
    setShowTransactionModal(true);
  }, []);

  useEffect(() => {
    // Register the new transaction handler with the layout
    setNewTransactionHandler(openTransactionModal);
    return () => setNewTransactionHandler(null);
  }, [setNewTransactionHandler, openTransactionModal]);

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleDataChanged = () => {
    setOffset(ITEMS_PER_PAGE);
    fetchTransactions(selectedAccountFilter, selectedDateFilter, customDateRange, false);
    fetchAccounts();
    fetchUnlinkedTransferCount();
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await fetchTransactions(selectedAccountFilter, selectedDateFilter, customDateRange, true);
    setIsLoadingMore(false);
  };

  const handleDateFilterChange = (preset: string | null) => {
    setSelectedDateFilter(preset);
    setOffset(ITEMS_PER_PAGE);
    if (preset !== "CUSTOM") {
      setCustomDateRange({ startDate: null, endDate: null });
      fetchTransactions(selectedAccountFilter, preset, undefined, false);
    }
  };

  const handleCustomDateChange = (range: { startDate: string | null; endDate: string | null }) => {
    setCustomDateRange(range);
    setOffset(ITEMS_PER_PAGE);
    // Only fetch if both dates are filled
    if (range.startDate && range.endDate) {
      // Validate that start date is before or equal to end date
      if (range.startDate > range.endDate) {
        alert("Start date must be before or equal to end date");
        return;
      }
      fetchTransactions(selectedAccountFilter, "CUSTOM", range, false);
    }
  };

  const handleClearFilters = () => {
    setSelectedAccountFilter(null);
    setHomeSearchQuery("");
    setSelectedDateFilter(null);
    setCustomDateRange({ startDate: null, endDate: null });
    setOffset(ITEMS_PER_PAGE);
    fetchTransactions();
  };

  const nonZeroAccounts = accounts.filter(a => a.totalAmount !== 0);

  const totalNetBalance = (() => {
    const currencies = [...new Set(nonZeroAccounts.map(a => a.currency))];
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
                      {nonZeroAccounts.length} ACCOUNTS / {[...new Set(nonZeroAccounts.map(a => a.currency))].length} CURRENCIES
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
                        {formatCurrency(account.totalAmount, account.currency as Currency)}
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
            LIVE_DATA // {transactions.length} of {totalCount} RECORDS
          </div>
        </div>

        {loading
          ? (
            <div className='terminal-border bg-card/30 rounded p-12 text-center'>
              <div className='mono text-sm text-muted-foreground animate-pulse'>
                LOADING TRANSACTION DATA...
              </div>
            </div>
          )
          : (
            <TransactionTable
              transactions={transactions}
              accounts={accounts}
              showAccountFilter
              selectedAccountFilter={selectedAccountFilter}
              onAccountFilterChange={(accountId) => {
                setSelectedAccountFilter(accountId);
                setOffset(ITEMS_PER_PAGE);
                fetchTransactions(accountId, selectedDateFilter, customDateRange, false);
              }}
              showSearchFilter
              searchQuery={homeSearchQuery}
              onSearchChange={setHomeSearchQuery}
              showDateFilter
              selectedDateFilter={selectedDateFilter}
              customDateRange={customDateRange}
              onDateFilterChange={handleDateFilterChange}
              onCustomDateChange={handleCustomDateChange}
              onClearFilters={handleClearFilters}
              showLinkColumn
              showAccountsColumn
              showLoadMore
              onLoadMore={handleLoadMore}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              emptyStateMessage={transactions.length === 0 ? "NO TRANSACTIONS // USE [+] NEW_TXN TO BEGIN" : "NO MATCHES FOUND // ADJUST FILTERS"}
              editable
              onEditRequested={openEditModal}
              onDataChanged={handleDataChanged}
            />
          )}
      </div>

      {/* Transaction Modal */}
      <EditTransactionModal
        transaction={editingTransaction}
        accounts={accounts}
        categories={categories}
        allTransactions={transactions}
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
