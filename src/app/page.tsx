'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import TransactionTable from '@/components/TransactionTable';
import { formatCurrency, getCurrencySymbol } from '@/lib/currency';
import type { Currency } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AccountWithStats {
  id: number;
  name: string;
  description: string | null;
  color: string;
  currency: string;
  transactionCount: number;
  totalAmount: number;
}

interface Category {
  id: number;
  name: string;
  color: string;
  defaultTransactionType?: 'Debit' | 'Credit' | 'Transfer';
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
  sourceAccount?: {
    id: number;
    name: string;
    color: string;
    currency?: Currency;
  };
  targetAccount?: {
    id: number;
    name: string;
    color: string;
    currency?: Currency;
  };
  link?: {
    id: number;
    linkedTransactionId: number;
    linkedTransaction?: {
      id: number;
      description: string;
      amount: number;
      date: string;
      transactionType: string;
    };
  };
}

export default function Home() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionFormData, setTransactionFormData] = useState({
    transaction_type: 'Debit' as 'Debit' | 'Credit' | 'Transfer',
    source_account_id: '',
    target_account_id: '',
    description: '',
    amount: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<number | null>(null);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [unlinkedTransferCount, setUnlinkedTransferCount] = useState(0);
  const [selectedLinkTransactionId, setSelectedLinkTransactionId] = useState<number | null>(null);
  const [showLinkSelectionModal, setShowLinkSelectionModal] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkModalAccountFilter, setLinkModalAccountFilter] = useState<number | null>(null);

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
    fetchTransactions();
    fetchUnlinkedTransferCount();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
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

  const fetchTransactions = async (accountId?: number | null) => {
    try {
      const url = accountId
        ? `/api/transactions?accountId=${accountId}`
        : '/api/transactions';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchUnlinkedTransferCount = async () => {
    try {
      const response = await fetch('/api/transactions/unlinked-transfers');
      if (response.ok) {
        const data = await response.json();
        setUnlinkedTransferCount(data.length);
      }
    } catch (error) {
      console.error('Error fetching unlinked transfer count:', error);
    }
  };

  const openTransactionModal = () => {
    // Auto-select account if there's only one
    if (accounts.length === 1) {
      setTransactionFormData({
        ...transactionFormData,
        source_account_id: accounts[0].id.toString()
      });
    }
    setShowTransactionModal(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionFormData({
      transaction_type: transaction.transactionType,
      source_account_id: transaction.sourceAccountId?.toString() || '',
      target_account_id: transaction.targetAccountId?.toString() || '',
      description: transaction.description,
      amount: transaction.amount.toString(),
      category_id: transaction.categoryId.toString(),
      date: transaction.date
    });
    setSelectedLinkTransactionId(transaction.link?.linkedTransactionId || null);
    setShowTransactionModal(true);
  };

  const handleDataChanged = () => {
    fetchTransactions(selectedAccountFilter);
    fetchAccounts();
    fetchUnlinkedTransferCount();
  };

  const handleCategoryChange = (categoryId: string) => {
    const selectedCategory = categories.find(c => c.id.toString() === categoryId);
    if (selectedCategory && selectedCategory.defaultTransactionType) {
      setTransactionFormData({
        ...transactionFormData,
        category_id: categoryId,
        transaction_type: selectedCategory.defaultTransactionType
      });
    } else {
      setTransactionFormData({
        ...transactionFormData,
        category_id: categoryId
      });
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate based on transaction type
      if (transactionFormData.transaction_type === 'Debit' && !transactionFormData.source_account_id) {
        alert('Debit transactions require a source account');
        setSubmitting(false);
        return;
      }
      if (transactionFormData.transaction_type === 'Credit' && !transactionFormData.target_account_id) {
        alert('Credit transactions require a target account');
        setSubmitting(false);
        return;
      }
      if (transactionFormData.transaction_type === 'Transfer') {
        if (!transactionFormData.source_account_id || !transactionFormData.target_account_id) {
          alert('Transfer transactions require both source and target accounts');
          setSubmitting(false);
          return;
        }
        if (transactionFormData.source_account_id === transactionFormData.target_account_id) {
          alert('Source and target accounts must be different for transfers');
          setSubmitting(false);
          return;
        }
      }

      // Determine if we're editing or creating
      const isEditing = editingTransaction !== null;
      const url = isEditing ? `/api/transactions/${editingTransaction.id}` : '/api/transactions';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_type: transactionFormData.transaction_type,
          source_account_id: transactionFormData.source_account_id ? parseInt(transactionFormData.source_account_id) : null,
          target_account_id: transactionFormData.target_account_id ? parseInt(transactionFormData.target_account_id) : null,
          description: transactionFormData.description,
          amount: parseFloat(transactionFormData.amount),
          category_id: parseInt(transactionFormData.category_id),
          date: transactionFormData.date,
        }),
      });

      if (response.ok) {
        const savedTransaction = await response.json();

        // Handle linking (only for create or if link changed during edit)
        const originalLinkId = editingTransaction?.link?.linkedTransactionId;
        const linkChanged = originalLinkId !== selectedLinkTransactionId;

        if (!isEditing || linkChanged) {
          // Delete old link if editing and link was removed or changed
          if (isEditing && editingTransaction.link && linkChanged) {
            try {
              await fetch(`/api/transactions/links/${editingTransaction.link.id}`, {
                method: 'DELETE',
              });
            } catch (linkErr) {
              console.error('Error removing old link:', linkErr);
            }
          }

          // Create new link if one was selected
          if (selectedLinkTransactionId) {
            try {
              const linkResponse = await fetch('/api/transactions/links', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  transaction_1_id: savedTransaction.id,
                  transaction_2_id: selectedLinkTransactionId,
                }),
              });

              if (!linkResponse.ok) {
                const linkError = await linkResponse.json();
                alert(`Transaction ${isEditing ? 'updated' : 'created'} but linking failed: ${linkError.error}`);
              }
            } catch (linkErr) {
              console.error('Error creating link:', linkErr);
              alert(`Transaction ${isEditing ? 'updated' : 'created'} but linking failed`);
            }
          }
        }

        setShowTransactionModal(false);
        setEditingTransaction(null);
        setTransactionFormData({
          transaction_type: 'Debit',
          source_account_id: '',
          target_account_id: '',
          description: '',
          amount: '',
          category_id: '',
          date: new Date().toISOString().split('T')[0]
        });
        setSelectedLinkTransactionId(null);
        fetchAccounts(); // Refresh to update account totals
        fetchTransactions(selectedAccountFilter); // Refresh to show updated/new transaction
        fetchUnlinkedTransferCount(); // Refresh unlinked count
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${isEditing ? 'update' : 'create'} transaction`);
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert(`Failed to ${editingTransaction ? 'update' : 'create'} transaction`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Randal&apos;s Finance App</h1>
            <div className="flex items-center space-x-3">
              <Button
                onClick={openTransactionModal}
                className="shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all duration-300"
              >
                + Add Transaction
              </Button>
              <Link
                href="/import"
                className="text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-md border border-border hover:border-primary/50 hover:bg-accent/10 transition-all duration-300 text-sm"
              >
                📁 Import
              </Link>
              <Link
                href="/admin"
                className="text-muted-foreground hover:text-foreground px-4 py-2.5 rounded-md border border-border hover:border-primary/50 hover:bg-accent/10 transition-all duration-300 text-sm"
              >
                ⚙️ Admin
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10 ring-2 ring-border hover:ring-primary transition-all",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Cards */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-[oklch(0.2_0.1_260)] to-[oklch(0.15_0.1_290)] border-white/10 backdrop-blur-md shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">
                    Total Net Balance
                  </CardTitle>
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    <span className="text-white text-lg font-bold">$</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    {(() => {
                      const currencies = [...new Set(accounts.map(a => a.currency))];
                      if (currencies.length === 1) {
                        const total = accounts.reduce((sum, a) => sum + a.totalAmount, 0);
                        return formatCurrency(total, currencies[0] as Currency);
                      } else if (currencies.length > 1) {
                        return 'Multiple currencies';
                      }
                      return '$0.00';
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-[oklch(0.2_0.1_290)] to-[oklch(0.15_0.1_320)] border-white/10 backdrop-blur-md shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 delay-100" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">
                    Active Accounts
                  </CardTitle>
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                    <span className="text-white text-lg font-bold">#</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    {accounts.reduce((sum, a) => sum + a.transactionCount, 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Accounts
                  </CardTitle>
                  <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">📒</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{accounts.length}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Transactions Section */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Recent Transactions</h2>
            </div>

            {/* Unlinked Transfers Warning */}
            {unlinkedTransferCount > 0 && (
              <div className="mb-4 flex justify-end">
                <Link
                  href="/unlinked-transfers"
                  className="flex items-center space-x-2 px-4 py-2 bg-warning/20 text-warning-foreground border border-warning-border rounded-md hover:bg-warning/30 transition-colors"
                >
                  <span className="text-lg">⚠️</span>
                  <span className="text-sm font-medium">
                    {unlinkedTransferCount} Unlinked Transfer{unlinkedTransferCount !== 1 ? 's' : ''}
                  </span>
                </Link>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground">Loading transactions...</div>
              </div>
            ) : (
              <TransactionTable
                transactions={transactions}
                accounts={accounts}
                showAccountFilter={true}
                selectedAccountFilter={selectedAccountFilter}
                onAccountFilterChange={(accountId) => {
                  setSelectedAccountFilter(accountId);
                  fetchTransactions(accountId);
                }}
                showSearchFilter={true}
                searchQuery={homeSearchQuery}
                onSearchChange={setHomeSearchQuery}
                showLinkColumn={true}
                showAccountsColumn={true}
                maxRows={20}
                emptyStateMessage={transactions.length === 0 ? "Get started by adding your first transaction" : "No transactions found matching your filters"}
                editable={true}
                onEditRequested={openEditModal}
                onDataChanged={handleDataChanged}
              />
            )}
          </div>
        </div>
      </main>

      {/* Add Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg shadow-2xl border border-border max-w-md w-full">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
              </h3>
            </div>

            <form onSubmit={handleTransactionSubmit} className="p-6 space-y-4">
              {/* Transaction Type Selector */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Transaction Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={transactionFormData.transaction_type === 'Debit' ? 'default' : 'outline'}
                    onClick={() => setTransactionFormData({ ...transactionFormData, transaction_type: 'Debit' })}
                    className={transactionFormData.transaction_type === 'Debit' ? 'bg-transaction-debit text-transaction-debit-foreground hover:bg-transaction-debit-hover border-transaction-debit-border' : ''}
                  >
                    Debit
                  </Button>
                  <Button
                    type="button"
                    variant={transactionFormData.transaction_type === 'Credit' ? 'default' : 'outline'}
                    onClick={() => setTransactionFormData({ ...transactionFormData, transaction_type: 'Credit' })}
                    className={transactionFormData.transaction_type === 'Credit' ? 'bg-transaction-credit text-transaction-credit-foreground hover:bg-transaction-credit-hover border-transaction-credit-border' : ''}
                  >
                    Credit
                  </Button>
                  <Button
                    type="button"
                    variant={transactionFormData.transaction_type === 'Transfer' ? 'default' : 'outline'}
                    onClick={() => setTransactionFormData({ ...transactionFormData, transaction_type: 'Transfer' })}
                    className={transactionFormData.transaction_type === 'Transfer' ? 'bg-transaction-transfer text-transaction-transfer-foreground hover:bg-transaction-transfer-hover border-transaction-transfer-border' : ''}
                  >
                    Transfer
                  </Button>
                </div>
              </div>

              {/* Conditional Account Fields */}
              {transactionFormData.transaction_type === 'Transfer' ? (
                <>
                  {/* Source Account for Transfer */}
                  <div>
                    <label htmlFor="source-account" className="block text-sm font-medium text-muted-foreground mb-2">
                      Source Account *
                    </label>
                    <select
                      id="source-account"
                      required
                      value={transactionFormData.source_account_id}
                      onChange={(e) => setTransactionFormData({ ...transactionFormData, source_account_id: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select source account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Account for Transfer */}
                  <div>
                    <label htmlFor="target-account" className="block text-sm font-medium text-muted-foreground mb-2">
                      Target Account *
                    </label>
                    <select
                      id="target-account"
                      required
                      value={transactionFormData.target_account_id}
                      onChange={(e) => setTransactionFormData({ ...transactionFormData, target_account_id: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select target account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                /* Single Account field for Debit/Credit */
                <div>
                  <label htmlFor="account" className="block text-sm font-medium text-muted-foreground mb-2">
                    Account *
                  </label>
                  <select
                    id="account"
                    required
                    value={transactionFormData.transaction_type === 'Debit' ? transactionFormData.source_account_id : transactionFormData.target_account_id}
                    onChange={(e) => {
                      if (transactionFormData.transaction_type === 'Debit') {
                        setTransactionFormData({ ...transactionFormData, source_account_id: e.target.value });
                      } else {
                        setTransactionFormData({ ...transactionFormData, target_account_id: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select an account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="transaction-description" className="block text-sm font-medium text-muted-foreground mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  id="transaction-description"
                  required
                  value={transactionFormData.description}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., Grocery shopping"
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-muted-foreground mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground">
                    {(() => {
                      const accountId = transactionFormData.transaction_type === 'Credit'
                        ? transactionFormData.target_account_id
                        : transactionFormData.source_account_id;
                      const account = accounts.find(a => a.id.toString() === accountId);
                      return getCurrencySymbol((account?.currency || 'USD') as Currency);
                    })()}
                  </span>
                  <input
                    type="number"
                    id="amount"
                    required
                    step="0.01"
                    min="0"
                    value={transactionFormData.amount}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, amount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-muted-foreground mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  required
                  value={transactionFormData.category_id}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium text-muted-foreground mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  id="date"
                  required
                  value={transactionFormData.date}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Link to Another Transaction */}
              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Link to Transaction (Optional)
                </label>
                {selectedLinkTransactionId ? (
                  <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-md">
                    <div className="flex-1">
                      <div className="text-sm text-primary-foreground">
                        {transactions.find(t => t.id === selectedLinkTransactionId)?.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(transactions.find(t => t.id === selectedLinkTransactionId)?.date || '').toLocaleDateString()} -
                        ${transactions.find(t => t.id === selectedLinkTransactionId)?.amount.toFixed(2)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLinkTransactionId(null)}
                      className="ml-3 text-xs text-destructive border-destructive hover:bg-destructive/10"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLinkSelectionModal(true)}
                    className="w-full justify-start"
                  >
                    Select transaction to link...
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Link this transaction to another (useful for transfers or refunds)
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowTransactionModal(false);
                    setEditingTransaction(null);
                    setTransactionFormData({
                      transaction_type: 'Debit',
                      source_account_id: '',
                      target_account_id: '',
                      description: '',
                      amount: '',
                      category_id: '',
                      date: new Date().toISOString().split('T')[0]
                    });
                    setSelectedLinkTransactionId(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? (editingTransaction ? 'Updating...' : 'Adding...') : (editingTransaction ? 'Update Transaction' : 'Add Transaction')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Transaction Selection Modal */}
      {showLinkSelectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg shadow-2xl border border-border max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Select Transaction to Link</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLinkSelectionModal(false);
                  setLinkSearchQuery('');
                  setLinkModalAccountFilter(null);
                }}
              >
                ✕
              </Button>
            </div>

            {/* Transaction Table with integrated filters */}
            <div className="flex-1 overflow-auto">
              <div className="p-6">
                <TransactionTable
                  transactions={transactions}
                  accounts={accounts}
                  showAccountFilter={true}
                  selectedAccountFilter={linkModalAccountFilter}
                  onAccountFilterChange={setLinkModalAccountFilter}
                  showSearchFilter={true}
                  searchQuery={linkSearchQuery}
                  onSearchChange={setLinkSearchQuery}
                  showLinkColumn={false}
                  showAccountsColumn={true}
                  maxRows={100}
                  actionType="select"
                  onSelectTransaction={(transactionId) => {
                    setSelectedLinkTransactionId(transactionId);
                    setShowLinkSelectionModal(false);
                    setLinkSearchQuery('');
                    setLinkModalAccountFilter(null);
                  }}
                  filterUnlinkedOnly={true}
                  emptyStateMessage="No unlinked transactions found"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border bg-muted/30">
              <div className="text-sm text-muted-foreground">
                Showing {transactions.filter(t => !t.link).filter(t =>
                  linkSearchQuery === '' ||
                  t.description.toLowerCase().includes(linkSearchQuery.toLowerCase())
                ).slice(0, 100).length} unlinked transactions
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
