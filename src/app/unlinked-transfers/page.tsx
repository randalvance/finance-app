'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TransactionTable from '@/components/TransactionTable';
import EditTransactionModal from '@/components/EditTransactionModal';

interface UnlinkedTransfer {
  id: number;
  transactionType: 'Debit' | 'Credit' | 'Transfer';
  sourceAccountId: number | null;
  targetAccountId: number | null;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
  sourceAccount?: {
    id: number;
    name: string;
    color: string;
  };
  targetAccount?: {
    id: number;
    name: string;
    color: string;
  };
  link?: {
    id: number;
    linkedTransactionId: number;
  };
}

interface Account {
  id: number;
  name: string;
  description: string | null;
  color: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
  defaultTransactionType?: 'Debit' | 'Credit' | 'Transfer';
}

export default function UnlinkedTransfersPage() {
  const [transfers, setTransfers] = useState<UnlinkedTransfer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<UnlinkedTransfer | null>(null);

  useEffect(() => {
    fetchUnlinkedTransfers();
    fetchAccounts();
    fetchCategories();
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

  const handleDataChanged = () => {
    fetchUnlinkedTransfers();
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 shadow-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 mb-2 inline-block">
                ← Back to Home
              </Link>
              <h1 className="text-2xl font-bold text-gray-100">Unlinked Transfers</h1>
              <p className="text-sm text-gray-400 mt-1">
                These transfers don&apos;t have a corresponding link. Link them to track bidirectional transactions.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400">Loading unlinked transfers...</div>
          </div>
        ) : transfers.length === 0 ? (
          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-12 text-center">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h3 className="text-lg font-medium text-gray-200 mb-2">All Transfers Linked!</h3>
            <p className="text-gray-400">There are no unlinked transfers.</p>
          </div>
        ) : (
          <div>
            <div className="mb-4 px-6 py-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <p className="text-yellow-200 text-sm">
                ⚠️ {transfers.length} transfer{transfers.length !== 1 ? 's' : ''} without links
              </p>
            </div>
            <TransactionTable
              transactions={transfers}
              showLinkColumn={false}
              showAccountsColumn={true}
              emptyStateMessage="No unlinked transfers found"
              editable={true}
              onEditRequested={setEditingTransaction}
              onDataChanged={handleDataChanged}
            />
          </div>
        )}
      </main>

      <EditTransactionModal
        transaction={editingTransaction}
        accounts={accounts}
        categories={categories}
        onClose={() => setEditingTransaction(null)}
        onSaved={handleDataChanged}
        showLinkSelection={false}
      />
    </div>
  );
}
