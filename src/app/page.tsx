'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

interface AccountWithStats {
  id: number;
  name: string;
  description: string | null;
  color: string;
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
  transaction_type: 'Debit' | 'Credit' | 'Transfer';
  source_account_id: number | null;
  target_account_id: number | null;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
  source_account?: {
    id: number;
    name: string;
    color: string;
  };
  target_account?: {
    id: number;
    name: string;
    color: string;
  };
}

export default function Home() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionFormData, setTransactionFormData] = useState({
    transaction_type: 'Debit' as 'Debit' | 'Credit' | 'Transfer',
    source_account_id: '',
    target_account_id: '',
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
    fetchTransactions();
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

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
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

  const handleCategoryChange = (categoryName: string) => {
    const selectedCategory = categories.find(c => c.name === categoryName);
    if (selectedCategory && selectedCategory.defaultTransactionType) {
      setTransactionFormData({
        ...transactionFormData,
        category: categoryName,
        transaction_type: selectedCategory.defaultTransactionType
      });
    } else {
      setTransactionFormData({
        ...transactionFormData,
        category: categoryName
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

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_type: transactionFormData.transaction_type,
          source_account_id: transactionFormData.source_account_id ? parseInt(transactionFormData.source_account_id) : null,
          target_account_id: transactionFormData.target_account_id ? parseInt(transactionFormData.target_account_id) : null,
          description: transactionFormData.description,
          amount: parseFloat(transactionFormData.amount),
          category: transactionFormData.category,
          date: transactionFormData.date,
        }),
      });

      if (response.ok) {
        setShowTransactionModal(false);
        setTransactionFormData({
          transaction_type: 'Debit',
          source_account_id: '',
          target_account_id: '',
          description: '',
          amount: '',
          category: '',
          date: new Date().toISOString().split('T')[0]
        });
        fetchAccounts(); // Refresh to update account totals
        fetchTransactions(); // Refresh to show new transaction
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create transaction');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const getTransactionTypeBadge = (type: 'Debit' | 'Credit' | 'Transfer') => {
    const styles = {
      Debit: 'bg-red-900 text-red-200 border-red-700',
      Credit: 'bg-green-900 text-green-200 border-green-700',
      Transfer: 'bg-blue-900 text-blue-200 border-blue-700'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded border ${styles[type]}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 shadow-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-100">Randal&apos;s Finance App</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={openTransactionModal}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-md hover:bg-blue-700 transition-colors font-medium shadow-lg"
              >
                + Add Transaction
              </button>
              <Link
                href="/admin"
                className="text-gray-400 hover:text-gray-200 px-4 py-2.5 rounded-md border border-gray-700 hover:border-gray-600 transition-colors text-sm"
              >
                ⚙️ Admin
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
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
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">$</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">Total Net Balance</dt>
                      <dd className="text-lg font-medium text-gray-100">
                        ${accounts.reduce((sum, a) => sum + a.totalAmount, 0).toFixed(2)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">#</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">Transaction Count</dt>
                      <dd className="text-lg font-medium text-gray-100">
                        {accounts.reduce((sum, a) => sum + a.transactionCount, 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">📒</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">Active Accounts</dt>
                      <dd className="text-lg font-medium text-gray-100">{accounts.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions Section */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-100">Recent Transactions</h2>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-400">Loading transactions...</div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-12 text-center">
                <div className="text-gray-600 text-6xl mb-4">💰</div>
                <h3 className="text-lg font-medium text-gray-200 mb-2">No transactions yet</h3>
                <p className="text-gray-400 mb-4">Get started by adding your first transaction</p>
                <button
                  onClick={openTransactionModal}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Your First Transaction
                </button>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Accounts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {transactions.slice(0, 20).map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTransactionTypeBadge(transaction.transaction_type)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-100">{transaction.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.transaction_type === 'Debit' && transaction.source_account && (
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: transaction.source_account.color }}
                              />
                              <span className="text-sm text-gray-300">{transaction.source_account.name}</span>
                            </div>
                          )}
                          {transaction.transaction_type === 'Credit' && transaction.target_account && (
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: transaction.target_account.color }}
                              />
                              <span className="text-sm text-gray-300">{transaction.target_account.name}</span>
                            </div>
                          )}
                          {transaction.transaction_type === 'Transfer' && transaction.source_account && transaction.target_account && (
                            <div className="flex items-center space-x-1 text-sm">
                              <div className="flex items-center space-x-1">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: transaction.source_account.color }}
                                />
                                <span className="text-gray-300">{transaction.source_account.name}</span>
                              </div>
                              <span className="text-gray-500">→</span>
                              <div className="flex items-center space-x-1">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: transaction.target_account.color }}
                                />
                                <span className="text-gray-300">{transaction.target_account.name}</span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-400">{transaction.category}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-medium ${
                            transaction.transaction_type === 'Credit' ? 'text-green-400' :
                            transaction.transaction_type === 'Debit' ? 'text-red-400' :
                            'text-blue-400'
                          }`}>
                            {transaction.transaction_type === 'Credit' ? '+' : transaction.transaction_type === 'Debit' ? '-' : ''}
                            ${parseFloat(transaction.amount.toString()).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl border border-gray-800 max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-gray-100">Add New Transaction</h3>
            </div>

            <form onSubmit={handleTransactionSubmit} className="p-6 space-y-4">
              {/* Transaction Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Transaction Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionFormData({ ...transactionFormData, transaction_type: 'Debit' })}
                    className={`px-4 py-2 rounded-md border transition-colors ${
                      transactionFormData.transaction_type === 'Debit'
                        ? 'bg-red-900 border-red-700 text-red-200'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    Debit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionFormData({ ...transactionFormData, transaction_type: 'Credit' })}
                    className={`px-4 py-2 rounded-md border transition-colors ${
                      transactionFormData.transaction_type === 'Credit'
                        ? 'bg-green-900 border-green-700 text-green-200'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionFormData({ ...transactionFormData, transaction_type: 'Transfer' })}
                    className={`px-4 py-2 rounded-md border transition-colors ${
                      transactionFormData.transaction_type === 'Transfer'
                        ? 'bg-blue-900 border-blue-700 text-blue-200'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    Transfer
                  </button>
                </div>
              </div>

              {/* Conditional Account Fields */}
              {transactionFormData.transaction_type === 'Transfer' ? (
                <>
                  {/* Source Account for Transfer */}
                  <div>
                    <label htmlFor="source-account" className="block text-sm font-medium text-gray-300 mb-2">
                      Source Account *
                    </label>
                    <select
                      id="source-account"
                      required
                      value={transactionFormData.source_account_id}
                      onChange={(e) => setTransactionFormData({ ...transactionFormData, source_account_id: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label htmlFor="target-account" className="block text-sm font-medium text-gray-300 mb-2">
                      Target Account *
                    </label>
                    <select
                      id="target-account"
                      required
                      value={transactionFormData.target_account_id}
                      onChange={(e) => setTransactionFormData({ ...transactionFormData, target_account_id: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label htmlFor="account" className="block text-sm font-medium text-gray-300 mb-2">
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label htmlFor="transaction-description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  id="transaction-description"
                  required
                  value={transactionFormData.description}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Grocery shopping"
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">$</span>
                  <input
                    type="number"
                    id="amount"
                    required
                    step="0.01"
                    min="0"
                    value={transactionFormData.amount}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, amount: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  required
                  value={transactionFormData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  id="date"
                  required
                  value={transactionFormData.date}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransactionModal(false);
                    setTransactionFormData({
                      transaction_type: 'Debit',
                      source_account_id: '',
                      target_account_id: '',
                      description: '',
                      amount: '',
                      category: '',
                      date: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adding...' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
