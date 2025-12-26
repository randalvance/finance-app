"use client";

import { useEffect, useState, useCallback } from "react";
import { useSWRConfig } from "swr";
import TransactionTable from "@/components/TransactionTable";
import EditTransactionModal from "@/components/EditTransactionModal";
import type { TransactionWithLink, Account, Category } from "@/types/transaction";

export default function UnlinkedTransfersPage () {
  const { mutate } = useSWRConfig();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithLink | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
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

  const handleDataChanged = useCallback(() => {
    // Refresh all transaction-related SWR keys
    mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/transactions"));
  }, [mutate]);

  const openEditModal = useCallback((transaction: TransactionWithLink) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  }, []);

  const transferFilter = useCallback((t: TransactionWithLink) =>
    t.transactionType === "TransferOut" ||
    t.transactionType === "TransferIn", []);

  return (
    <main className='max-w-[1600px] mx-auto px-6 py-8'>
      <div className='animate-slide-up-fade'>
        <div className='mb-6 glass-card p-4 border border-warning/30 rounded-lg'>
          <div className='flex items-center space-x-3'>
            <div className='text-2xl'>⚠</div>
            <div>
              <p className='mono text-xs font-bold text-warning tracking-wider'>
                UNLINKED_TRANSFERS_DETECTED
              </p>
              <p className='mono text-[10px] text-muted-foreground mt-1'>
                The following transactions are marked as transfers but are not
                linked to a corresponding transaction in another account.
              </p>
            </div>
          </div>
        </div>

        <div className='flex items-center justify-between mb-4'>
          <h2 className='mono text-sm font-bold tracking-wider'>
            <span className='text-warning'>{">"}</span> UNLINKED_TRANSACTIONS
          </h2>
        </div>

        <TransactionTable
          constraints={{ hasLinks: false, excludeInvestments: true }}
          showAccountFilter
          showSearchFilter
          showDateFilter
          showLinkColumn
          showAccountsColumn
          editable
          onEditRequested={openEditModal}
          onDataChanged={handleDataChanged}
          customFilter={transferFilter}
          emptyStateMessage='ALL_TRANSFERS_LINKED'
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
        showLinkSelection
      />
    </main>
  );
}
