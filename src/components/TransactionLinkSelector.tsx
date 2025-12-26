"use client";

import { useState } from "react";
import TransactionTable from "@/components/TransactionTable";
import { Button } from "@/components/ui/button";
import type { LinkedTransaction } from "@/types/transaction";

export function useTransactionLinkState () {
  const [searchQuery, setSearchQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<number | null>(null);
  const [filterByDate, setFilterByDate] = useState(true);

  return {
    searchQuery,
    setSearchQuery,
    accountFilter,
    setAccountFilter,
    filterByDate,
    setFilterByDate,
  };
}

interface TransactionLinkSelectorProps {
  // Selection state
  selectedTransactionId: number | null;
  onSelectionChange: (transaction: LinkedTransaction | null) => void;
  selectedTransaction?: LinkedTransaction | null;

  // Optional filtering
  excludeTransactionId?: number; // Don't show this transaction in the list
  currentTransactionDate?: string; // For default date filtering

  // Optional customization
  label?: string; // Default: "LINK_TO_TRANSACTION"
  className?: string;

  // If provided, the component will call this instead of opening its own modal
  // This allows it to work with the sliding panel in EditTransactionModal
  onOpenSelector?: () => void;
}

export default function TransactionLinkSelector ({
  selectedTransactionId,
  onSelectionChange,
  selectedTransaction: initialSelectedTransaction,
  excludeTransactionId,
  currentTransactionDate,
  label = "LINK_TO_TRANSACTION",
  className = "",
  onOpenSelector,
}: TransactionLinkSelectorProps) {
  const [showLinkSelectionModal, setShowLinkSelectionModal] = useState(false);
  const [filterByDate, setFilterByDate] = useState(true);

  // If we don't have the full transaction object but have the ID, we might need to fetch it
  // However, in most cases the parent will provide it or it's not needed for display yet
  const selectedTransaction = initialSelectedTransaction;

  const handleCloseModal = () => {
    setShowLinkSelectionModal(false);
    setFilterByDate(true);
  };

  const handleSelectTransaction = (transaction: LinkedTransaction) => {
    onSelectionChange(transaction);
    handleCloseModal();
  };

  const handleRemoveSelection = () => {
    onSelectionChange(null);
  };

  const handleOpenSelector = () => {
    if (onOpenSelector) {
      onOpenSelector();
    } else {
      setShowLinkSelectionModal(true);
    }
  };

  return (
    <>
      <div className={className}>
        <label className='mono text-xs text-muted-foreground tracking-wider block mb-2'>
          {label}
        </label>
        {selectedTransactionId
          ? selectedTransaction
            ? (
              <div className='space-y-2'>
                <div className='flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded'>
                  <div className='flex-1 min-w-0'>
                    <div className='text-sm text-primary-foreground truncate'>
                      {selectedTransaction.description}
                    </div>
                    <div className='mono text-xs text-muted-foreground mt-1'>
                      {new Date(selectedTransaction.date).toLocaleDateString()} -
                      ${Math.abs(selectedTransaction.amount).toFixed(2)}
                    </div>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={handleRemoveSelection}
                    className='mono text-[10px] text-destructive'
                  >
                    ✕
                  </Button>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleOpenSelector}
                  className='mono w-full justify-between text-xs'
                >
                  <span>[CHANGE] LINKED TRANSACTION</span>
                  <span>→</span>
                </Button>
              </div>
            )
            : (
              <div className='space-y-2'>
                <div className='flex items-center justify-between p-3 bg-muted/10 border border-border/30 rounded animate-pulse'>
                  <div className='mono text-[10px] text-muted-foreground'>
                    LOADING_LINKED_TRANSACTION...
                  </div>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleOpenSelector}
                  className='mono w-full justify-between text-xs'
                >
                  <span>[CHANGE] LINKED TRANSACTION</span>
                  <span>→</span>
                </Button>
              </div>
            )
          : (
            <Button
              type='button'
              variant='outline'
              onClick={handleOpenSelector}
              className='mono w-full justify-between text-xs'
            >
              <span>[SELECT] TRANSACTION</span>
              <span>→</span>
            </Button>
          )}
      </div>

      {/* Link Selection Modal - only used if onOpenSelector is NOT provided */}
      {showLinkSelectionModal && !onOpenSelector && (
        <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]'>
          <div className='frosted-glass rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col animate-slide-up-fade shadow-2xl'>
            <div className='px-6 py-4 border-b-2 border-primary/30 bg-primary/5 flex items-center justify-between'>
              <h3 className='mono text-sm font-bold tracking-wider'>
                [SELECT] TRANSACTION_TO_LINK
              </h3>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleCloseModal}
                className='mono text-xs'
              >
                [X]
              </Button>
            </div>

            <div className='flex-1 overflow-hidden'>
              <TransactionLinkSelectorPanel
                excludeTransactionId={excludeTransactionId}
                currentTransactionDate={currentTransactionDate}
                onSelect={handleSelectTransaction}
                filterByDate={filterByDate}
                onFilterByDateChange={setFilterByDate}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function TransactionLinkSelectorPanel ({
  excludeTransactionId,
  currentTransactionDate,
  onSelect,
  filterByDate,
  onFilterByDateChange,
}: {
  excludeTransactionId?: number;
  currentTransactionDate?: string;
  onSelect: (transaction: LinkedTransaction) => void;
  filterByDate: boolean;
  onFilterByDateChange: (filter: boolean) => void;
}) {
  const constraints = {
    hasLinks: false,
    ...(filterByDate && currentTransactionDate
      ? { dateEquals: currentTransactionDate }
      : {}),
  };

  return (
    <div className='h-full overflow-hidden flex flex-col'>
      <div className='px-6 pt-6 pb-2 flex-shrink-0'>
        {currentTransactionDate && (
          <div className='flex items-center space-x-2'>
            <input
              type='checkbox'
              id='filterByDate'
              checked={filterByDate}
              onChange={(e) => onFilterByDateChange(e.target.checked)}
              className='w-4 h-4'
            />
            <label
              htmlFor='filterByDate'
              className='mono text-xs text-muted-foreground cursor-pointer'
            >
              Only show transactions from{" "}
              {new Date(currentTransactionDate).toLocaleDateString()}
            </label>
          </div>
        )}
      </div>

      <div className='flex-1 overflow-y-auto px-6 pb-6'>
        <div className='overflow-x-auto'>
          <TransactionTable
            constraints={constraints}
            showAccountFilter
            showSearchFilter
            showLinkColumn={false}
            showAccountsColumn={false}
            showCategoryColumn={false}
            maxRows={100}
            actionType='select'
            onSelectTransaction={onSelect}
            emptyStateMessage='NO UNLINKED TRANSACTIONS FOUND'
            customFilter={(t) => t.id !== excludeTransactionId}
          />
        </div>
      </div>
    </div>
  );
}
