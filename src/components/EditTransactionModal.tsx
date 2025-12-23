'use client';

import { useState, useEffect } from 'react';

interface Account {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
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
  };
  date: string;
  link?: {
    id: number;
    linkedTransactionId: number;
  };
}

interface EditTransactionModalProps {
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  allTransactions?: Transaction[];
  onClose: () => void;
  onSaved: () => void;
  showLinkSelection?: boolean;
}

export default function EditTransactionModal({
  transaction,
  accounts,
  categories,
  allTransactions = [],
  onClose,
  onSaved,
  showLinkSelection = false
}: EditTransactionModalProps) {
  const [formData, setFormData] = useState({
    transaction_type: 'Debit' as 'Debit' | 'Credit' | 'Transfer',
    source_account_id: '',
    target_account_id: '',
    description: '',
    amount: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedLinkTransactionId, setSelectedLinkTransactionId] = useState<number | null>(null);

  useEffect(() => {
    if (transaction) {
      setFormData({
        transaction_type: transaction.transactionType,
        source_account_id: transaction.sourceAccountId?.toString() || '',
        target_account_id: transaction.targetAccountId?.toString() || '',
        description: transaction.description,
        amount: transaction.amount.toString(),
        category_id: transaction.categoryId.toString(),
        date: transaction.date
      });
      setSelectedLinkTransactionId(transaction.link?.linkedTransactionId || null);
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleCategoryChange = (categoryId: string) => {
    const selectedCategory = categories.find(c => c.id.toString() === categoryId);
    if (selectedCategory && selectedCategory.defaultTransactionType) {
      setFormData({
        ...formData,
        category_id: categoryId,
        transaction_type: selectedCategory.defaultTransactionType
      });
    } else {
      setFormData({
        ...formData,
        category_id: categoryId
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate based on transaction type
      if (formData.transaction_type === 'Debit' && !formData.source_account_id) {
        alert('Debit transactions require a source account');
        setSubmitting(false);
        return;
      }
      if (formData.transaction_type === 'Credit' && !formData.target_account_id) {
        alert('Credit transactions require a target account');
        setSubmitting(false);
        return;
      }
      if (formData.transaction_type === 'Transfer') {
        if (!formData.source_account_id || !formData.target_account_id) {
          alert('Transfer transactions require both source and target accounts');
          setSubmitting(false);
          return;
        }
        if (formData.source_account_id === formData.target_account_id) {
          alert('Source and target accounts must be different for transfers');
          setSubmitting(false);
          return;
        }
      }

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_type: formData.transaction_type,
          source_account_id: formData.source_account_id ? parseInt(formData.source_account_id) : null,
          target_account_id: formData.target_account_id ? parseInt(formData.target_account_id) : null,
          description: formData.description,
          amount: parseFloat(formData.amount),
          category_id: parseInt(formData.category_id),
          date: formData.date,
        }),
      });

      if (response.ok) {
        // Handle link changes if link selection is enabled
        if (showLinkSelection) {
          const originalLinkId = transaction.link?.linkedTransactionId;
          const linkChanged = originalLinkId !== selectedLinkTransactionId;

          if (linkChanged) {
            // Delete old link if it existed
            if (transaction.link) {
              try {
                await fetch(`/api/transactions/links/${transaction.link.id}`, {
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
                    transaction_1_id: transaction.id,
                    transaction_2_id: selectedLinkTransactionId,
                  }),
                });

                if (!linkResponse.ok) {
                  const linkError = await linkResponse.json();
                  alert(`Transaction updated but linking failed: ${linkError.error}`);
                }
              } catch (linkErr) {
                console.error('Error creating link:', linkErr);
                alert('Transaction updated but linking failed');
              }
            }
          }
        }

        onSaved();
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to update transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl border border-gray-800 max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-gray-100">Edit Transaction</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transaction Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Transaction Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, transaction_type: 'Debit' })}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  formData.transaction_type === 'Debit'
                    ? 'bg-red-900 border-red-700 text-red-200'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                Debit
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, transaction_type: 'Credit' })}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  formData.transaction_type === 'Credit'
                    ? 'bg-green-900 border-green-700 text-green-200'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                Credit
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, transaction_type: 'Transfer' })}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  formData.transaction_type === 'Transfer'
                    ? 'bg-blue-900 border-blue-700 text-blue-200'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                Transfer
              </button>
            </div>
          </div>

          {/* Conditional Account Fields */}
          {formData.transaction_type === 'Transfer' ? (
            <>
              <div>
                <label htmlFor="source-account" className="block text-sm font-medium text-gray-300 mb-2">
                  Source Account *
                </label>
                <select
                  id="source-account"
                  required
                  value={formData.source_account_id}
                  onChange={(e) => setFormData({ ...formData, source_account_id: e.target.value })}
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

              <div>
                <label htmlFor="target-account" className="block text-sm font-medium text-gray-300 mb-2">
                  Target Account *
                </label>
                <select
                  id="target-account"
                  required
                  value={formData.target_account_id}
                  onChange={(e) => setFormData({ ...formData, target_account_id: e.target.value })}
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
            <div>
              <label htmlFor="account" className="block text-sm font-medium text-gray-300 mb-2">
                Account *
              </label>
              <select
                id="account"
                required
                value={formData.transaction_type === 'Debit' ? formData.source_account_id : formData.target_account_id}
                onChange={(e) => {
                  if (formData.transaction_type === 'Debit') {
                    setFormData({ ...formData, source_account_id: e.target.value });
                  } else {
                    setFormData({ ...formData, target_account_id: e.target.value });
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
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
              value={formData.category_id}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-2">
              Date *
            </label>
            <input
              type="date"
              id="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Link Selection - only show if enabled */}
          {showLinkSelection && (
            <div className="border-t border-gray-800 pt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Link to Transaction (Optional)
              </label>
              {selectedLinkTransactionId ? (
                <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-700 rounded-md">
                  <div className="flex-1">
                    <div className="text-sm text-blue-200">
                      {allTransactions.find(t => t.id === selectedLinkTransactionId)?.description}
                    </div>
                    <div className="text-xs text-blue-300 mt-1">
                      {new Date(allTransactions.find(t => t.id === selectedLinkTransactionId)?.date || '').toLocaleDateString()} -
                      ${allTransactions.find(t => t.id === selectedLinkTransactionId)?.amount.toFixed(2)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLinkTransactionId(null)}
                    className="ml-3 text-xs px-2 py-1 text-red-200 border border-red-700 rounded hover:bg-red-900/30"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {/* Link selection modal would go here */}}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-300 hover:border-gray-600 hover:text-gray-100 transition-colors text-left"
                  disabled
                >
                  Select transaction to link...
                </button>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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
              {submitting ? 'Updating...' : 'Update Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
