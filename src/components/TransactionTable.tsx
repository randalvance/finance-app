"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/currency";
import type { Currency } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Transaction, TransactionWithLink } from "@/types/transaction";

type ActionType = "select" | "view" | "edit" | "none";

interface TransactionTableProps {
  transactions: TransactionWithLink[];
  accounts?: Array<{ id: number; name: string }>;

  // Filtering
  showAccountFilter?: boolean;
  selectedAccountFilter?: number | null;
  onAccountFilterChange?: (accountId: number | null) => void;

  showSearchFilter?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;

  showDateFilter?: boolean;
  selectedDateFilter?: string | null;
  customDateRange?: { startDate: string | null; endDate: string | null };
  onDateFilterChange?: (preset: string | null) => void;
  onCustomDateChange?: (range: {
    startDate: string | null;
    endDate: string | null;
  }) => void;
  onClearFilters?: () => void;

  // Display options
  showLinkColumn?: boolean;
  showAccountsColumn?: boolean;
  showCategoryColumn?: boolean;
  maxRows?: number;
  emptyStateMessage?: string;

  // Actions
  actionType?: ActionType;
  onSelectTransaction?: (transactionId: number) => void;
  editable?: boolean;
  onEditRequested?: (transaction: Transaction) => void;
  onDataChanged?: () => void;

  // Additional filters
  filterUnlinkedOnly?: boolean;
  customFilter?: (transaction: Transaction) => boolean;
}

const getTransactionTypeBadge = (
  type: "Debit" | "TransferOut" | "Credit" | "TransferIn"
) => {
  // Format the type name for display
  const displayName =
    type === "TransferOut"
      ? "Transfer Out"
      : type === "TransferIn"
        ? "Transfer In"
        : type;

  // Determine color based on transaction type
  // Debit = red, Credit = green, TransferOut = orange-red, TransferIn = teal-green
  const variant: "debit" | "credit" | "transferOut" | "transferIn" =
    type === "Debit"
      ? "debit"
      : type === "Credit"
        ? "credit"
        : type === "TransferOut"
          ? "transferOut"
          : "transferIn";

  return <Badge variant={variant}>{displayName}</Badge>;
};

export default function TransactionTable ({
  transactions,
  accounts = [],
  showAccountFilter = false,
  selectedAccountFilter = null,
  onAccountFilterChange,
  showSearchFilter = false,
  searchQuery = "",
  onSearchChange,
  showDateFilter = false,
  selectedDateFilter = null,
  customDateRange = { startDate: null, endDate: null },
  onDateFilterChange,
  onCustomDateChange,
  onClearFilters,
  showLinkColumn = false,
  showAccountsColumn = true,
  showCategoryColumn = true,
  maxRows,
  emptyStateMessage = "No transactions found",
  actionType = "none",
  onSelectTransaction,
  editable = false,
  onEditRequested,
  onDataChanged,
  filterUnlinkedOnly = false,
  customFilter,
}: TransactionTableProps) {
  const handleDelete = async (transaction: TransactionWithLink) => {
    // Check if transaction is linked
    if (transaction.link) {
      if (
        !confirm(
          "This transaction is linked. Deleting will unlink it. Continue?"
        )
      ) {
        return;
      }

      // Unlink first
      try {
        const unlinkResponse = await fetch(
          `/api/transactions/links/${transaction.link.id}`,
          {
            method: "DELETE",
          }
        );

        if (!unlinkResponse.ok) {
          alert("Failed to unlink transaction");
          return;
        }
      } catch (error) {
        console.error("Error unlinking transaction:", error);
        alert("Failed to unlink transaction");
        return;
      }
    } else {
      // Regular confirmation for non-linked transactions
      if (!confirm("Are you sure you want to delete this transaction?")) {
        return;
      }
    }

    // Delete the transaction
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onDataChanged?.();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction");
    }
  };
  // Apply filters
  let filteredTransactions = transactions;

  if (filterUnlinkedOnly) {
    filteredTransactions = filteredTransactions.filter((t) => !t.link);
  }

  if (searchQuery) {
    filteredTransactions = filteredTransactions.filter((t) =>
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (customFilter) {
    filteredTransactions = filteredTransactions.filter(customFilter);
  }

  const [displayLimit, setDisplayLimit] = useState(maxRows || 20);
  const [isEnd, setIsEnd] = useState(false);

  // Reset display limit when filters change or maxRows changes
  useEffect(() => {
    setDisplayLimit(maxRows || 20);
    setIsEnd(false);
  }, [maxRows, searchQuery, selectedAccountFilter, selectedDateFilter, filterUnlinkedOnly, transactions]);

  const displayedTransactions = filteredTransactions.slice(0, displayLimit);

  const handleLoadMore = () => {
    const prevCount = displayedTransactions.length;
    const nextLimit = displayLimit + (maxRows || 20);
    const nextCount = filteredTransactions.slice(0, nextLimit).length;

    setDisplayLimit(nextLimit);

    if (nextCount === prevCount) {
      setIsEnd(true);
    }
  };

  return (
    <div className='space-y-4'>
      {/* Filters - Always visible when enabled */}
      {(showAccountFilter || showSearchFilter || showDateFilter) && (
        <div className='flex flex-col sm:flex-row gap-4'>
          {/* Account Filter */}
          {showAccountFilter && onAccountFilterChange && (
            <div className='flex-1'>
              <label
                htmlFor='account-filter'
                className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'
              >
                FILTER_ACCOUNT
              </label>
              <select
                id='account-filter'
                value={selectedAccountFilter ?? ""}
                onChange={(e) =>
                  onAccountFilterChange(
                    e.target.value ? parseInt(e.target.value) : null
                  )}
                className='mono w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
              >
                <option value=''>ALL_ACCOUNTS</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Filter */}
          {showSearchFilter && onSearchChange && (
            <div className='flex-1'>
              <label
                htmlFor='search-filter'
                className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'
              >
                SEARCH_QUERY
              </label>
              <input
                id='search-filter'
                type='text'
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder='SEARCH...'
                className='mono w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground/50'
              />
            </div>
          )}

          {/* Date Filter */}
          {showDateFilter && onDateFilterChange && (
            <div className='flex-1'>
              <label
                htmlFor='date-filter'
                className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'
              >
                FILTER_DATE
              </label>
              <select
                id='date-filter'
                value={selectedDateFilter ?? ""}
                onChange={(e) => onDateFilterChange(e.target.value || null)}
                className='mono w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
              >
                <option value=''>ALL_TIME</option>
                <option value='THIS_MONTH'>THIS_MONTH</option>
                <option value='LAST_MONTH'>LAST_MONTH</option>
                <option value='THIS_QUARTER'>THIS_QUARTER</option>
                <option value='LAST_QUARTER'>LAST_QUARTER</option>
                <option value='THIS_YEAR'>THIS_YEAR</option>
                <option value='LAST_YEAR'>LAST_YEAR</option>
                <option value='LAST_30_DAYS'>LAST_30_DAYS</option>
                <option value='LAST_90_DAYS'>LAST_90_DAYS</option>
                <option value='CUSTOM'>CUSTOM_RANGE</option>
              </select>

              {/* Custom Date Range Inputs */}
              {selectedDateFilter === "CUSTOM" && onCustomDateChange && (
                <div className='grid grid-cols-2 gap-2 mt-2'>
                  <input
                    type='date'
                    value={customDateRange.startDate ?? ""}
                    onChange={(e) =>
                      onCustomDateChange({
                        ...customDateRange,
                        startDate: e.target.value || null,
                      })}
                    placeholder='START'
                    className='mono px-2 py-1 bg-input border border-border rounded text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                  />
                  <input
                    type='date'
                    value={customDateRange.endDate ?? ""}
                    onChange={(e) =>
                      onCustomDateChange({
                        ...customDateRange,
                        endDate: e.target.value || null,
                      })}
                    placeholder='END'
                    className='mono px-2 py-1 bg-input border border-border rounded text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                  />
                </div>
              )}
            </div>
          )}

          {/* Clear Filters Button */}
          {(selectedAccountFilter || searchQuery || selectedDateFilter) &&
            onClearFilters && (
            <div className='flex items-end'>
              <button
                onClick={onClearFilters}
                className='mono text-xs px-3 py-2 bg-destructive/20 text-destructive border border-destructive/50 rounded hover:bg-destructive/30 transition-all tracking-wider'
              >
                [CLEAR]
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table or Empty State */}
      {filteredTransactions.length === 0 ? (
        <div className='glass-card rounded-lg shadow-lg border border-border p-12 text-center'>
          {transactions.length === 0 &&
          !searchQuery &&
          !selectedAccountFilter ? (
          // Completely empty - no transactions at all
              <>
                <div className='text-6xl mb-4 filter grayscale opacity-30'>
                  💰
                </div>
                <h3 className='mono text-sm font-bold text-foreground mb-2 tracking-wider'>
                  SYSTEM_EMPTY
                </h3>
                <p className='mono text-xs text-muted-foreground tracking-wide'>
                  {emptyStateMessage}
                </p>
              </>
            ) : (
          // Filtered results are empty
              <p className='mono text-xs text-muted-foreground tracking-wide'>
                {emptyStateMessage}
              </p>
            )}
        </div>
      ) : (
        <div className='glass-card rounded-lg shadow-lg border border-border overflow-hidden'>
          <table className='min-w-full divide-y divide-border/50'>
            <thead className='glass bg-muted/30 border-b border-primary/20'>
              <tr>
                <th className='mono px-6 py-3 text-left text-[10px] font-bold text-primary uppercase tracking-widest'>
                  DATE
                </th>
                <th className='mono px-6 py-3 text-left text-[10px] font-bold text-primary uppercase tracking-widest'>
                  TYPE
                </th>
                <th className='mono px-6 py-3 text-left text-[10px] font-bold text-primary uppercase tracking-widest'>
                  DESCRIPTION
                </th>
                {showAccountsColumn && (
                  <th className='mono px-6 py-3 text-left text-[10px] font-bold text-primary uppercase tracking-widest'>
                    ACCOUNTS
                  </th>
                )}
                {showCategoryColumn && (
                  <th className='mono px-6 py-3 text-left text-[10px] font-bold text-primary uppercase tracking-widest'>
                    CATEGORY
                  </th>
                )}
                {showLinkColumn && (
                  <th className='mono px-6 py-3 text-center text-[10px] font-bold text-primary uppercase tracking-widest'>
                    LINK
                  </th>
                )}
                <th className='mono px-6 py-3 text-right text-[10px] font-bold text-primary uppercase tracking-widest'>
                  AMOUNT
                </th>
                {(actionType !== "none" || editable) && (
                  <th className='mono px-6 py-3 text-center text-[10px] font-bold text-primary uppercase tracking-widest'>
                    ACTION
                  </th>
                )}
              </tr>
            </thead>
            <tbody className='divide-y divide-border/30'>
              {displayedTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className='hover:bg-primary/5 transition-all duration-200 group'
                >
                  <td className='px-6 py-4 whitespace-nowrap mono text-xs text-muted-foreground'>
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    {getTransactionTypeBadge(
                      transaction.transactionType as
                        | "Debit"
                        | "TransferOut"
                        | "Credit"
                        | "TransferIn"
                    )}
                  </td>
                  <td className='px-6 py-4'>
                    <div className='text-sm text-foreground group-hover:text-primary transition-colors'>
                      {transaction.description}
                    </div>
                  </td>
                  {showAccountsColumn && (
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {transaction.transactionType === "Debit" &&
                        transaction.sourceAccount && (
                        <div className='flex items-center space-x-2'>
                          <div
                            className='w-3 h-3 rounded-full'
                            style={{
                              backgroundColor:
                                  transaction.sourceAccount.color || "gray",
                            }}
                          />
                          <span className='text-sm text-muted-foreground'>
                            {transaction.sourceAccount.name}
                          </span>
                        </div>
                      )}
                      {transaction.transactionType === "Credit" &&
                        transaction.targetAccount && (
                        <div className='flex items-center space-x-2'>
                          <div
                            className='w-3 h-3 rounded-full'
                            style={{
                              backgroundColor:
                                  transaction.targetAccount.color || "gray",
                            }}
                          />
                          <span className='text-sm text-muted-foreground'>
                            {transaction.targetAccount.name}
                          </span>
                        </div>
                      )}
                      {(transaction.transactionType === "TransferOut" ||
                        transaction.transactionType === "TransferIn") &&
                        transaction.sourceAccount &&
                        transaction.targetAccount && (
                        <div className='flex items-center space-x-1 text-sm'>
                          <div className='flex items-center space-x-1'>
                            <div
                              className='w-3 h-3 rounded-full'
                              style={{
                                backgroundColor:
                                    transaction.sourceAccount.color || "gray",
                              }}
                            />
                            <span className='text-muted-foreground'>
                              {transaction.sourceAccount.name}
                            </span>
                          </div>
                          <span className='text-muted-foreground'>→</span>
                          <div className='flex items-center space-x-1'>
                            <div
                              className='w-3 h-3 rounded-full'
                              style={{
                                backgroundColor:
                                    transaction.targetAccount.color || "gray",
                              }}
                            />
                            <span className='text-muted-foreground'>
                              {transaction.targetAccount.name}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>
                  )}
                  {showCategoryColumn && (
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className='text-sm text-muted-foreground'>
                        {transaction.category?.name || "Uncategorized"}
                      </span>
                    </td>
                  )}
                  {showLinkColumn && (
                    <td className='px-6 py-4 whitespace-nowrap text-center'>
                      {transaction.link && (
                        <span
                          className='text-primary cursor-help'
                          title='Linked transaction'
                        >
                          🔗
                        </span>
                      )}
                    </td>
                  )}
                  <td className='px-6 py-4 whitespace-nowrap text-right'>
                    <span
                      className={`mono text-sm font-bold ${
                        transaction.transactionType === "Credit" ||
                        transaction.transactionType === "TransferIn"
                          ? "text-transaction-credit-text"
                          : "text-transaction-debit-text"
                      }`}
                    >
                      {formatCurrency(
                        transaction.amount,
                        (transaction.transactionType === "Credit" ||
                        transaction.transactionType === "TransferIn"
                          ? transaction.targetAccount?.currency
                          : transaction.sourceAccount?.currency ||
                            "USD") as Currency
                      )}
                    </span>
                  </td>
                  {actionType === "select" && onSelectTransaction && (
                    <td className='px-6 py-4 text-center'>
                      <button
                        onClick={() => onSelectTransaction(transaction.id)}
                        className='mono text-xs px-3 py-1 bg-primary text-primary-foreground rounded border border-primary hover:bg-primary/90 transition-all font-bold tracking-wider'
                      >
                        SELECT
                      </button>
                    </td>
                  )}
                  {editable && (
                    <td className='px-6 py-4 text-center text-sm'>
                      <button
                        onClick={() => onEditRequested?.(transaction)}
                        className='mono text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded border border-primary/30 hover:border-primary transition-all mr-2'
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDelete(transaction)}
                        className='mono text-xs px-2 py-1 text-destructive hover:bg-destructive/10 rounded border border-destructive/30 hover:border-destructive transition-all'
                      >
                        DELETE
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Load More Pagination */}
      <div className='flex justify-center pt-4'>
        {isEnd ? (
          <div className='mono text-xs text-muted-foreground py-3 tracking-widest'>
            THAT'S ALL
          </div>
        ) : (
          <button
            onClick={handleLoadMore}
            className='mono text-xs px-6 py-3 bg-background border border-primary/30 text-primary hover:bg-primary/10 hover:border-primary transition-all rounded font-bold tracking-widest shadow-lg'
          >
            [LOAD_MORE_TRANSACTIONS]
          </button>
        )}
      </div>
    </div>
  );
}
