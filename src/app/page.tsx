'use client';

import { useEffect, useState } from 'react';

interface AccountWithStats {
  id: number;
  name: string;
  description: string | null;
  color: string;
  expenseCount: number;
  totalAmount: number;
}

export default function Home() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
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

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchAccounts();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 shadow-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-100">Expense Tracker</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">Welcome back!</span>
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
                      <dt className="text-sm font-medium text-gray-400 truncate">Total Transactions</dt>
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
                        {accounts.reduce((sum, a) => sum + a.expenseCount, 0)}
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

          {/* Accounts Section */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-100">Your Accounts</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                + New Account
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-400">Loading accounts...</div>
              </div>
            ) : accounts.length === 0 ? (
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-12 text-center">
                <div className="text-gray-600 text-6xl mb-4">📒</div>
                <h3 className="text-lg font-medium text-gray-200 mb-2">No accounts yet</h3>
                <p className="text-gray-400 mb-4">Create your first account to start tracking transactions</p>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  Create Your First Account
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: account.color }}
                        />
                        <h3 className="text-lg font-semibold text-gray-100">{account.name}</h3>
                      </div>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-gray-500 hover:text-red-500 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    {account.description && (
                      <p className="text-sm text-gray-400 mb-4">{account.description}</p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Total Transactions</span>
                        <span className="text-lg font-semibold text-gray-100">
                          ${account.totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Count</span>
                        <span className="text-sm text-gray-300">{account.expenseCount}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-800 flex space-x-2">
                      <button className="flex-1 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                        View Details
                      </button>
                      <button className="flex-1 text-sm text-gray-400 hover:text-gray-300 transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
