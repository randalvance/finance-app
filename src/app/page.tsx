'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLayout } from '@/components/ClientLayout';
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
  const { setNewTransactionHandler } = useLayout();
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
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [customDateRange, setCustomDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({ startDate: null, endDate: null });
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

  const fetchTransactions = async (
    accountId?: number | null,
    datePreset?: string | null,
    customRange?: { startDate: string | null; endDate: string | null }
  ) => {
    try {
      const params = new URLSearchParams();
      if (accountId) params.append('accountId', accountId.toString());
      if (datePreset) {
        params.append('datePreset', datePreset);
        if (datePreset === 'CUSTOM' && customRange?.startDate && customRange?.endDate) {
          params.append('startDate', customRange.startDate);
          params.append('endDate', customRange.endDate);
        }
      }

      const url = `/api/transactions${params.toString() ? '?' + params.toString() : ''}`;
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

  const openTransactionModal = useCallback(() => {
    if (accounts.length === 1) {
      setTransactionFormData({
        ...transactionFormData,
        source_account_id: accounts[0].id.toString()
      });
    }
    setShowTransactionModal(true);
  }, [accounts, transactionFormData]);

  useEffect(() => {
    // Register the new transaction handler with the layout
    setNewTransactionHandler(openTransactionModal);
    return () => setNewTransactionHandler(null);
  }, [setNewTransactionHandler, openTransactionModal]);

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
    fetchTransactions(selectedAccountFilter, selectedDateFilter, customDateRange);
    fetchAccounts();
    fetchUnlinkedTransferCount();
  };

  const handleDateFilterChange = (preset: string | null) => {
    setSelectedDateFilter(preset);
    if (preset !== 'CUSTOM') {
      setCustomDateRange({ startDate: null, endDate: null });
      fetchTransactions(selectedAccountFilter, preset, undefined);
    }
  };

  const handleCustomDateChange = (range: { startDate: string | null; endDate: string | null }) => {
    setCustomDateRange(range);
    // Only fetch if both dates are filled
    if (range.startDate && range.endDate) {
      // Validate that start date is before or equal to end date
      if (range.startDate > range.endDate) {
        alert('Start date must be before or equal to end date');
        return;
      }
      fetchTransactions(selectedAccountFilter, 'CUSTOM', range);
    }
  };

  const handleClearFilters = () => {
    setSelectedAccountFilter(null);
    setHomeSearchQuery('');
    setSelectedDateFilter(null);
    setCustomDateRange({ startDate: null, endDate: null });
    fetchTransactions();
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

        const originalLinkId = editingTransaction?.link?.linkedTransactionId;
        const linkChanged = originalLinkId !== selectedLinkTransactionId;

        if (!isEditing || linkChanged) {
          if (isEditing && editingTransaction.link && linkChanged) {
            try {
              await fetch(`/api/transactions/links/${editingTransaction.link.id}`, {
                method: 'DELETE',
              });
            } catch (linkErr) {
              console.error('Error removing old link:', linkErr);
            }
          }

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
        fetchAccounts();
        fetchTransactions(selectedAccountFilter);
        fetchUnlinkedTransferCount();
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

  const totalNetBalance = (() => {
    const currencies = [...new Set(accounts.map(a => a.currency))];
    if (currencies.length === 1) {
      const total = accounts.reduce((sum, a) => sum + a.totalAmount, 0);
      return { value: formatCurrency(total, currencies[0] as Currency), multi: false };
    } else if (currencies.length > 1) {
      return { value: 'MULTI-CURRENCY', multi: true };
    }
    return { value: '$0.00', multi: false };
  })();

  return (
    <main className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Dashboard Stats - Neo-brutalist Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          {/* Primary Stat - Takes 2 columns */}
          <div className="lg:col-span-2 animate-slide-up-fade" style={{ animationDelay: '0ms' }}>
            <Card className="glass-card glass-hover terminal-border h-full border-primary/40 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-secondary/10 rounded-full blur-3xl"></div>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mono text-[10px] text-primary tracking-widest mb-1">TOTAL_NET_BALANCE</div>
                    <CardTitle className="mono text-4xl font-bold tracking-tight">
                      {totalNetBalance.value}
                    </CardTitle>
                    {totalNetBalance.multi && (
                      <div className="mono text-xs text-muted-foreground mt-1">
                        {accounts.length} ACCOUNTS / {[...new Set(accounts.map(a => a.currency))].length} CURRENCIES
                      </div>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-primary/20 rounded border border-primary flex items-center justify-center">
                    <div className="mono text-2xl text-primary">$</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <div className="mono text-[10px] text-muted-foreground tracking-wider">ACCOUNTS</div>
                    <div className="mono text-2xl font-bold text-foreground">{accounts.length}</div>
                  </div>
                  <div>
                    <div className="mono text-[10px] text-muted-foreground tracking-wider">TRANSACTIONS</div>
                    <div className="mono text-2xl font-bold text-foreground">
                      {accounts.reduce((sum, a) => sum + a.transactionCount, 0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Breakdown */}
          <div className="lg:col-span-2 animate-slide-up-fade" style={{ animationDelay: '100ms' }}>
            <Card className="glass-card glass-hover terminal-border h-full border-border">
              <CardHeader className="pb-2">
                <div className="mono text-[10px] text-muted-foreground tracking-widest">ACCOUNT_STATUS</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[140px] overflow-y-auto">
                  {accounts.slice(0, 4).map((account, idx) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/50 hover:border-primary/50 transition-all group"
                      style={{ animationDelay: `${150 + idx * 50}ms` }}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div
                          className="w-2 h-2 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: account.color }}
                        />
                        <span className="mono text-xs text-foreground truncate">{account.name}</span>
                      </div>
                      <div className="mono text-xs font-bold text-right ml-2">
                        <span className={account.totalAmount >= 0 ? 'text-transaction-credit-text' : 'text-transaction-debit-text'}>
                          {formatCurrency(account.totalAmount, account.currency as Currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {accounts.length > 4 && (
                    <Link href="/admin" className="block text-center mono text-[10px] text-primary hover:text-primary/80 pt-1">
                      +{accounts.length - 4} MORE
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Unlinked Transfers Alert */}
        {unlinkedTransferCount > 0 && (
          <div className="mb-6 animate-slide-up-fade" style={{ animationDelay: '300ms' }}>
            <Link
              href="/unlinked-transfers"
              className="block p-4 bg-warning/10 border-2 border-warning rounded terminal-border hover:bg-warning/20 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="mono text-2xl">⚠</div>
                  <div>
                    <div className="mono text-sm font-bold text-warning-foreground">
                      UNLINKED TRANSFERS DETECTED
                    </div>
                    <div className="mono text-xs text-muted-foreground">
                      {unlinkedTransferCount} transaction{unlinkedTransferCount !== 1 ? 's' : ''} require linking
                    </div>
                  </div>
                </div>
                <div className="mono text-xs text-warning group-hover:translate-x-1 transition-transform">
                  [VIEW] →
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Transaction Data Stream */}
        <div className="animate-slide-up-fade" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="mono text-sm font-bold tracking-wider">
              <span className="text-primary">&gt;&gt;</span> TRANSACTION_STREAM
            </h2>
            <div className="mono text-[10px] text-muted-foreground">
              LIVE_DATA // {transactions.length} RECORDS
            </div>
          </div>

          {loading ? (
            <div className="terminal-border bg-card/30 rounded p-12 text-center">
              <div className="mono text-sm text-muted-foreground animate-pulse">
                LOADING TRANSACTION DATA...
              </div>
            </div>
          ) : (
            <TransactionTable
              transactions={transactions}
              accounts={accounts}
              showAccountFilter={true}
              selectedAccountFilter={selectedAccountFilter}
              onAccountFilterChange={(accountId) => {
                setSelectedAccountFilter(accountId);
                fetchTransactions(accountId, selectedDateFilter, customDateRange);
              }}
              showSearchFilter={true}
              searchQuery={homeSearchQuery}
              onSearchChange={setHomeSearchQuery}
              showDateFilter={true}
              selectedDateFilter={selectedDateFilter}
              customDateRange={customDateRange}
              onDateFilterChange={handleDateFilterChange}
              onCustomDateChange={handleCustomDateChange}
              onClearFilters={handleClearFilters}
              showLinkColumn={true}
              showAccountsColumn={true}
              maxRows={20}
              emptyStateMessage={transactions.length === 0 ? "NO TRANSACTIONS // USE [+] NEW_TXN TO BEGIN" : "NO MATCHES FOUND // ADJUST FILTERS"}
              editable={true}
              onEditRequested={openEditModal}
              onDataChanged={handleDataChanged}
            />
          )}
        </div>

        {/* Transaction Modal - Same as before but with updated styling */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="frosted-glass rounded-lg max-w-md w-full animate-slide-up-fade shadow-2xl">
            <div className="px-6 py-4 border-b-2 border-primary/30 bg-primary/5">
              <h3 className="mono text-sm font-bold tracking-wider">
                {editingTransaction ? '[EDIT] TRANSACTION' : '[NEW] TRANSACTION'}
              </h3>
            </div>

            <form onSubmit={handleTransactionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block mono text-[10px] text-muted-foreground mb-2 tracking-wider">
                  TYPE *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={transactionFormData.transaction_type === 'Debit' ? 'default' : 'outline'}
                    onClick={() => setTransactionFormData({ ...transactionFormData, transaction_type: 'Debit' })}
                    className={`mono text-xs ${transactionFormData.transaction_type === 'Debit' ? 'bg-transaction-debit text-transaction-debit-foreground border-transaction-debit-border' : ''}`}
                  >
                    DEBIT
                  </Button>
                  <Button
                    type="button"
                    variant={transactionFormData.transaction_type === 'Credit' ? 'default' : 'outline'}
                    onClick={() => setTransactionFormData({ ...transactionFormData, transaction_type: 'Credit' })}
                    className={`mono text-xs ${transactionFormData.transaction_type === 'Credit' ? 'bg-transaction-credit text-transaction-credit-foreground border-transaction-credit-border' : ''}`}
                  >
                    CREDIT
                  </Button>
                  <Button
                    type="button"
                    variant={transactionFormData.transaction_type === 'Transfer' ? 'default' : 'outline'}
                    onClick={() => setTransactionFormData({ ...transactionFormData, transaction_type: 'Transfer' })}
                    className={`mono text-xs ${transactionFormData.transaction_type === 'Transfer' ? 'bg-transaction-transfer text-transaction-transfer-foreground border-transaction-transfer-border' : ''}`}
                  >
                    TRANSFER
                  </Button>
                </div>
              </div>

              {transactionFormData.transaction_type === 'Transfer' ? (
                <>
                  <div>
                    <label htmlFor="source-account" className="block mono text-[10px] text-muted-foreground mb-2 tracking-wider">
                      SOURCE_ACCOUNT *
                    </label>
                    <select
                      id="source-account"
                      required
                      value={transactionFormData.source_account_id}
                      onChange={(e) => setTransactionFormData({ ...transactionFormData, source_account_id: e.target.value })}
                      className="mono w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">SELECT</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="target-account" className="block mono text-[10px] text-muted-foreground mb-2 tracking-wider">
                      TARGET_ACCOUNT *
                    </label>
                    <select
                      id="target-account"
                      required
                      value={transactionFormData.target_account_id}
                      onChange={(e) => setTransactionFormData({ ...transactionFormData, target_account_id: e.target.value })}
                      className="mono w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">SELECT</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label htmlFor="account" className="block mono text-[10px] text-muted-foreground mb-2 tracking-wider">
                    ACCOUNT *
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
                    className="mono w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">SELECT</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="transaction-description" className="block mono text-[10px] text-muted-foreground mb-2 tracking-wider">
                  DESCRIPTION *
                </label>
                <input
                  type="text"
                  id="transaction-description"
                  required
                  value={transactionFormData.description}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Transaction description"
                />
              </div>

              <div>
                <label htmlFor="amount" className="block mono text-[10px] text-muted-foreground mb-2 tracking-wider">
                  AMOUNT *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground mono text-sm">
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
                    className="mono w-full pl-8 pr-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="category" className="block mono text-[10px] text-muted-foreground mb-2 tracking-wider">
                  CATEGORY *
                </label>
                <select
                  id="category"
                  required
                  value={transactionFormData.category_id}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="mono w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">SELECT</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="date" className="block mono text-[10px] text-muted-foreground mb-2 tracking-wider">
                  DATE *
                </label>
                <input
                  type="date"
                  id="date"
                  required
                  value={transactionFormData.date}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, date: e.target.value })}
                  className="mono w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="border-t border-border pt-4">
                <label className="block mono text-[10px] text-muted-foreground mb-2 tracking-wider">
                  LINK_TO_TRANSACTION
                </label>
                {selectedLinkTransactionId ? (
                  <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-primary-foreground truncate">
                        {transactions.find(t => t.id === selectedLinkTransactionId)?.description}
                      </div>
                      <div className="mono text-xs text-muted-foreground mt-1">
                        {new Date(transactions.find(t => t.id === selectedLinkTransactionId)?.date || '').toLocaleDateString()} -
                        ${transactions.find(t => t.id === selectedLinkTransactionId)?.amount.toFixed(2)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLinkTransactionId(null)}
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
                  className="mono text-xs"
                >
                  CANCEL
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="mono text-xs bg-primary hover:bg-primary/90"
                >
                  {submitting ? 'PROCESSING...' : (editingTransaction ? 'UPDATE' : 'CREATE')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Selection Modal */}
      {showLinkSelectionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="frosted-glass rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col animate-slide-up-fade shadow-2xl">
            <div className="px-6 py-4 border-b-2 border-primary/30 bg-primary/5 flex items-center justify-between">
              <h3 className="mono text-sm font-bold tracking-wider">[SELECT] TRANSACTION_TO_LINK</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLinkSelectionModal(false);
                  setLinkSearchQuery('');
                  setLinkModalAccountFilter(null);
                }}
                className="mono text-xs"
              >
                [X]
              </Button>
            </div>

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
                  emptyStateMessage="NO UNLINKED TRANSACTIONS FOUND"
                />
              </div>
            </div>

            <div className="px-6 py-3 border-t border-border bg-muted/30">
              <div className="mono text-[10px] text-muted-foreground">
                SHOWING {transactions.filter(t => !t.link).filter(t =>
                  linkSearchQuery === '' ||
                  t.description.toLowerCase().includes(linkSearchQuery.toLowerCase())
                ).slice(0, 100).length} UNLINKED RECORDS
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
