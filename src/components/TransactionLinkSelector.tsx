'use client';

import { useState } from 'react';
import TransactionTable from '@/components/TransactionTable';
import { Button } from '@/components/ui/button';

interface Account {
  id: number;
  name: string;
  color?: string;
}

interface Transaction {
  id: number;
  transactionType: 'Debit' | 'Credit' | 'Transfer';
  sourceAccountId: number | null;
  targetAccountId: number | null;
  description: string;
  amount: number;
  categoryId: number;
  category?: {
    id: number;
    name: string;
    color: string | null;
  };
  date: string;
  createdAt: string;
  link?: {
    id: number;
    linkedTransactionId: number;
  };
}

interface TransactionLinkSelectorProps {
  // Selection state
  selectedTransactionId: number | null;
  onSelectionChange: (transactionId: number | null) => void;

  // Data
  allTransactions: Transaction[];
  accounts: Account[];

  // Optional filtering
  excludeTransactionId?: number;  // Don't show this transaction in the list
  currentTransactionDate?: string;  // For default date filtering

  // Optional customization
  label?: string;  // Default: "LINK_TO_TRANSACTION"
  className?: string;
}

export default function TransactionLinkSelector({
  selectedTransactionId,
  onSelectionChange,
  allTransactions,
  accounts,
  excludeTransactionId,
  currentTransactionDate,
  label = "LINK_TO_TRANSACTION",
  className = ""
}: TransactionLinkSelectorProps) {
  const [showLinkSelectionModal, setShowLinkSelectionModal] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkModalAccountFilter, setLinkModalAccountFilter] = useState<number | null>(null);
  const [filterByDate, setFilterByDate] = useState(true);

  // Get filtered transactions for the modal
  const getFilteredTransactions = () => {
    return allTransactions.filter(t => {
      // Exclude current transaction if specified
      if (excludeTransactionId && t.id === excludeTransactionId) {
        return false;
      }

      // Filter by date if enabled and date is provided
      if (filterByDate && currentTransactionDate && t.date !== currentTransactionDate) {
        return false;
      }

      return true;
    });
  };

  const selectedTransaction = selectedTransactionId 
    ? allTransactions.find(t => t.id === selectedTransactionId)
    : null;

  const handleCloseModal = () => {
    setShowLinkSelectionModal(false);
    setLinkSearchQuery('');
    setLinkModalAccountFilter(null);
    // Reset date filter to true when closing
    setFilterByDate(true);
  };

  const handleSelectTransaction = (transactionId: number) => {
    onSelectionChange(transactionId);
    handleCloseModal();
  };

  const handleRemoveSelection = () => {
    onSelectionChange(null);
  };

  return (
    <>
      <div className={className}>
        <label className="mono text-xs text-muted-foreground tracking-wider block mb-2">
          {label}
        </label>
        {selectedTransaction ? (
          <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-primary-foreground truncate">
                {selectedTransaction.description}
              </div>
              <div className="mono text-xs text-muted-foreground mt-1">
                {new Date(selectedTransaction.date).toLocaleDateString()} -
                ${selectedTransaction.amount.toFixed(2)}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveSelection}
              className="ml-3 mono text-[10px] text-destructive border-destructive hover:bg-destructive/10"
            >
              REMOVE
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowLinkSelectionModal(true)}
            className="mono w-full justify-start text-xs"
          >
            [SELECT] TRANSACTION
          </Button>
        )}
      </div>

      {/* Link Selection Modal */}
      {showLinkSelectionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="frosted-glass rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col animate-slide-up-fade shadow-2xl">
            <div className="px-6 py-4 border-b-2 border-primary/30 bg-primary/5 flex items-center justify-between">
              <h3 className="mono text-sm font-bold tracking-wider">[SELECT] TRANSACTION_TO_LINK</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="mono text-xs"
              >
                [X]
              </Button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-6 pt-6 pb-2">
                {/* Date filter checkbox - only show if currentTransactionDate is provided */}
                {currentTransactionDate && (
                  <div className="mb-4 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="filterByDate"
                      checked={filterByDate}
                      onChange={(e) => setFilterByDate(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="filterByDate" className="mono text-xs text-muted-foreground cursor-pointer">
                      Only show transactions from {new Date(currentTransactionDate).toLocaleDateString()}
                    </label>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <div className="overflow-x-auto">
                  <TransactionTable
                    transactions={getFilteredTransactions()}
                    accounts={accounts}
                    showAccountFilter={true}
                    selectedAccountFilter={linkModalAccountFilter}
                    onAccountFilterChange={setLinkModalAccountFilter}
                    showSearchFilter={true}
                    searchQuery={linkSearchQuery}
                    onSearchChange={setLinkSearchQuery}
                    showLinkColumn={false}
                    showAccountsColumn={false}
                    showCategoryColumn={false}
                    maxRows={100}
                    actionType="select"
                    onSelectTransaction={handleSelectTransaction}
                    filterUnlinkedOnly={true}
                    emptyStateMessage="NO UNLINKED TRANSACTIONS FOUND"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-border bg-muted/30">
              <div className="mono text-[10px] text-muted-foreground">
                SHOWING {getFilteredTransactions().filter(t => !t.link).filter(t =>
                  linkSearchQuery === '' ||
                  t.description.toLowerCase().includes(linkSearchQuery.toLowerCase())
                ).slice(0, 100).length} UNLINKED RECORDS
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
