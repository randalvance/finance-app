'use client';

import { useEffect, useState } from 'react';
import TransactionTable from '@/components/TransactionTable';
import EditTransactionModal from '@/components/EditTransactionModal';
import type { TransactionWithLink, Account, Category } from '@/types/transaction';

export default function UnlinkedTransfersPage() {
  const [transfers, setTransfers] = useState<TransactionWithLink[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithLink | null>(null);
  const [allTransactions, setAllTransactions] = useState<TransactionWithLink[]>([]);

  useEffect(() => {
    fetchUnlinkedTransfers();
    fetchAccounts();
    fetchCategories();
    fetchAllTransactions();
  }, []);

  const fetchUnlinkedTransfers = async () => {
    try {
      const response = await fetch('/api/transactions/unlinked-transfers');
      if (response.ok) {
        const data = await response.json();
        setTransfers(data);
      }
    } catch (error) {
      console.error('Error fetching unlinked transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAllTransactions = async () => {
    try {
      const response = await fetch('/api/transactions');
      if (response.ok) {
        const data = await response.json();
        setAllTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching all transactions:', error);
    }
  };

  const handleDataChanged = () => {
    fetchUnlinkedTransfers();
    fetchAllTransactions();
  };

  return (
    <main className="max-w-[1600px] mx-auto px-6 py-8">
        {loading ? (
          <div className="glass-card rounded-lg p-12 text-center animate-slide-up-fade">
            <div className="mono text-sm text-muted-foreground animate-pulse">LOADING_TRANSFERS...</div>
          </div>
        ) : transfers.length === 0 ? (
          <div className="glass-card rounded-lg shadow-lg border border-border p-12 text-center animate-slide-up-fade">
            <div className="text-6xl mb-4 filter drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">✓</div>
            <h3 className="mono text-sm font-bold text-foreground mb-2 tracking-wider">ALL_TRANSFERS_LINKED</h3>
            <p className="mono text-xs text-muted-foreground tracking-wide">No unlinked transfers found</p>
          </div>
        ) : (
          <div className="animate-slide-up-fade">
            <div className="mb-6 glass-card p-4 border border-warning/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">⚠</div>
                <div>
                  <p className="mono text-xs font-bold text-warning tracking-wider">
                    UNLINKED_TRANSFERS_DETECTED
                  </p>
                  <p className="mono text-[10px] text-muted-foreground mt-0.5">
                    {transfers.length} transaction{transfers.length !== 1 ? 's' : ''} require linking
                  </p>
                </div>
              </div>
            </div>

            <TransactionTable
              transactions={transfers}
              accounts={accounts}
              showLinkColumn={false}
              showAccountsColumn={true}
              emptyStateMessage="NO UNLINKED TRANSFERS // ALL LINKED"
              editable={true}
              onEditRequested={setEditingTransaction}
              onDataChanged={handleDataChanged}
            />
          </div>
        )}

        <EditTransactionModal
          transaction={editingTransaction}
          accounts={accounts}
          categories={categories}
          allTransactions={allTransactions}
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSaved={handleDataChanged}
          showLinkSelection={true}
        />
    </main>
  );
}
