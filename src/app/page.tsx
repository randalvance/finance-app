'use client';

import { useEffect, useState } from 'react';

interface LedgerWithStats {
  id: number;
  name: string;
  description: string | null;
  color: string;
  expenseCount: number;
  totalAmount: number;
}

export default function Home() {
  const [ledgers, setLedgers] = useState<LedgerWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLedgers();
  }, []);

  const fetchLedgers = async () => {
    try {
      const response = await fetch('/api/ledgers');
      if (response.ok) {
        const data = await response.json();
        setLedgers(data);
      }
    } catch (error) {
      console.error('Error fetching ledgers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLedger = async (id: number) => {
    if (!confirm('Are you sure you want to delete this ledger?')) return;
    
    try {
      const response = await fetch(`/api/ledgers/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchLedgers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete ledger');
      }
    } catch (error) {
      console.error('Error deleting ledger:', error);
      alert('Failed to delete ledger');
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
          {/* Ledgers Section */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-100">Your Ledgers</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                + New Ledger
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-400">Loading ledgers...</div>
              </div>
            ) : ledgers.length === 0 ? (
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-12 text-center">
                <div className="text-gray-600 text-6xl mb-4">📒</div>
                <h3 className="text-lg font-medium text-gray-200 mb-2">No ledgers yet</h3>
                <p className="text-gray-400 mb-4">Create your first ledger to start tracking expenses</p>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  Create Your First Ledger
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {ledgers.map((ledger) => (
                  <div
                    key={ledger.id}
                    className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ledger.color }}
                        />
                        <h3 className="text-lg font-semibold text-gray-100">{ledger.name}</h3>
                      </div>
                      <button
                        onClick={() => handleDeleteLedger(ledger.id)}
                        className="text-gray-500 hover:text-red-500 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    {ledger.description && (
                      <p className="text-sm text-gray-400 mb-4">{ledger.description}</p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Total Expenses</span>
                        <span className="text-lg font-semibold text-gray-100">
                          ${ledger.totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Transactions</span>
                        <span className="text-sm text-gray-300">{ledger.expenseCount}</span>
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
                      <dt className="text-sm font-medium text-gray-400 truncate">Total Expenses</dt>
                      <dd className="text-lg font-medium text-gray-100">
                        ${ledgers.reduce((sum, l) => sum + l.totalAmount, 0).toFixed(2)}
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
                      <dt className="text-sm font-medium text-gray-400 truncate">Total Transactions</dt>
                      <dd className="text-lg font-medium text-gray-100">
                        {ledgers.reduce((sum, l) => sum + l.expenseCount, 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">�</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">Active Ledgers</dt>
                      <dd className="text-lg font-medium text-gray-100">{ledgers.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-3">
            <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6">
              <h2 className="text-lg font-medium text-gray-100 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="flex flex-col items-center p-4 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">
                  <span className="text-2xl mb-2">➕</span>
                  <span className="text-sm font-medium text-gray-200">Add Expense</span>
                </button>
                
                <button className="flex flex-col items-center p-4 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">
                  <span className="text-2xl mb-2">📊</span>
                  <span className="text-sm font-medium text-gray-200">View Reports</span>
                </button>
                
                <button className="flex flex-col items-center p-4 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">
                  <span className="text-2xl mb-2">🏷️</span>
                  <span className="text-sm font-medium text-gray-200">Categories</span>
                </button>
                
                <button className="flex flex-col items-center p-4 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors">
                  <span className="text-2xl mb-2">⚙️</span>
                  <span className="text-sm font-medium text-gray-200">Settings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="lg:col-span-3">
            <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800">
              <div className="px-6 py-4 border-b border-gray-800">
                <h2 className="text-lg font-medium text-gray-100">Recent Expenses</h2>
              </div>
              <div className="p-6">
                <div className="text-center py-8">
                  <div className="text-gray-600 text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-medium text-gray-200 mb-2">No expenses yet</h3>
                  <p className="text-gray-400 mb-4">Get started by adding your first expense</p>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                    Add Your First Expense
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}