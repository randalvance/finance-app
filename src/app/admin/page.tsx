'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Account {
  id: number;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
  default_transaction_type?: string;
  created_at: string;
}

interface ImportSource {
  id: number;
  name: string;
  description: string | null;
  config: {
    startingLine: number;
    fieldMappings: {
      dateColumn: string;
      dateFormat: string;
      descriptionColumn: string;
      debitColumn: string | null;
      creditColumn: string | null;
      referenceColumn?: string;
    };
  };
  created_at: string;
  associatedAccounts?: Account[];
}

export default function AdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [importSources, setImportSources] = useState<ImportSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'accounts' | 'categories' | 'import-sources'>('accounts');
  
  // Account modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountFormData, setAccountFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  });
  
  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    color: '#3b82f6',
    default_transaction_type: 'Debit' as 'Debit' | 'Credit' | 'Transfer'
  });

  // Import source modal state
  const [showImportSourceModal, setShowImportSourceModal] = useState(false);
  const [editingImportSource, setEditingImportSource] = useState<ImportSource | null>(null);
  const [importSourceFormData, setImportSourceFormData] = useState({
    name: '',
    description: '',
    config: '',
    accountIds: [] as number[]
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
    fetchCategories();
    fetchImportSources();
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

  const fetchImportSources = async () => {
    try {
      const response = await fetch('/api/import-sources');
      if (response.ok) {
        const data = await response.json();
        setImportSources(data);
      }
    } catch (error) {
      console.error('Error fetching import sources:', error);
    }
  };

  // Account handlers
  const openAccountModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setAccountFormData({
        name: account.name,
        description: account.description || '',
        color: account.color
      });
    } else {
      setEditingAccount(null);
      setAccountFormData({ name: '', description: '', color: '#3b82f6' });
    }
    setShowAccountModal(true);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingAccount 
        ? `/api/accounts/${editingAccount.id}`
        : '/api/accounts';
      
      const response = await fetch(url, {
        method: editingAccount ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountFormData),
      });

      if (response.ok) {
        setShowAccountModal(false);
        setEditingAccount(null);
        setAccountFormData({ name: '', description: '', color: '#3b82f6' });
        fetchAccounts();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save account');
      }
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Failed to save account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('Are you sure you want to delete this account? This will fail if there are transactions associated with it.')) return;
    
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

  // Category handlers
  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name,
        color: category.color,
        default_transaction_type: (category.default_transaction_type as 'Debit' | 'Credit' | 'Transfer') || 'Debit'
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({ name: '', color: '#3b82f6', default_transaction_type: 'Debit' });
    }
    setShowCategoryModal(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories';
      
      const response = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryFormData),
      });

      if (response.ok) {
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCategoryFormData({ name: '', color: '#3b82f6', default_transaction_type: 'Debit' });
        fetchCategories();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save category');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCategories();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  // Import source handlers
  const openImportSourceModal = (source?: ImportSource) => {
    if (source) {
      setEditingImportSource(source);
      setImportSourceFormData({
        name: source.name,
        description: source.description || '',
        config: JSON.stringify(source.config, null, 2),
        accountIds: source.associatedAccounts?.map(a => a.id) || []
      });
    } else {
      setEditingImportSource(null);
      setImportSourceFormData({
        name: '',
        description: '',
        config: JSON.stringify({
          startingLine: 1,
          fieldMappings: [
            { sourceColumn: '', transactionField: 'date', dataType: 'date', required: true, format: 'dd MMM yyyy' },
            { sourceColumn: '', transactionField: 'description', dataType: 'string', required: true },
            { sourceColumn: '', transactionField: 'debit', dataType: 'number', required: false },
            { sourceColumn: '', transactionField: 'credit', dataType: 'number', required: false },
            { sourceColumn: '', transactionField: 'reference', dataType: 'string', required: false }
          ]
        }, null, 2),
        accountIds: []
      });
    }
    setShowImportSourceModal(true);
  };

  const handleImportSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Parse and validate config JSON
      let config;
      try {
        config = JSON.parse(importSourceFormData.config);
      } catch {
        alert('Invalid JSON in config field');
        setSubmitting(false);
        return;
      }

      const url = editingImportSource
        ? `/api/import-sources/${editingImportSource.id}`
        : '/api/import-sources';

      const response = await fetch(url, {
        method: editingImportSource ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: importSourceFormData.name,
          description: importSourceFormData.description,
          config,
          account_ids: importSourceFormData.accountIds
        }),
      });

      if (response.ok) {
        setShowImportSourceModal(false);
        setEditingImportSource(null);
        setImportSourceFormData({ name: '', description: '', config: '', accountIds: [] });
        fetchImportSources();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save import source');
      }
    } catch (error) {
      console.error('Error saving import source:', error);
      alert('Failed to save import source');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteImportSource = async (id: number) => {
    if (!confirm('Are you sure you want to delete this import source?')) return;

    try {
      const response = await fetch(`/api/import-sources/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchImportSources();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete import source');
      }
    } catch (error) {
      console.error('Error deleting import source:', error);
      alert('Failed to delete import source');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 shadow-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-400 hover:text-gray-200">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-100">Admin</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-800">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('accounts')}
                className={`${
                  activeTab === 'accounts'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Accounts ({accounts.length})
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`${
                  activeTab === 'categories'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Categories ({categories.length})
              </button>
              <button
                onClick={() => setActiveTab('import-sources')}
                className={`${
                  activeTab === 'import-sources'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Import Sources ({importSources.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-100">Manage Accounts</h2>
              <button
                onClick={() => openAccountModal()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                + New Account
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : (
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Color
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {accounts.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: account.color }}
                            />
                            <span className="text-sm font-medium text-gray-100">{account.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-400">{account.description || '—'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-400">{account.color}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => openAccountModal(account)}
                            className="text-blue-400 hover:text-blue-300 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-100">Manage Categories</h2>
              <button
                onClick={() => openCategoryModal()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                + New Category
              </button>
            </div>

            <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Color
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Default Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm font-medium text-gray-100">{category.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-400">{category.color}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-300">{category.default_transaction_type || 'Debit'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => openCategoryModal(category)}
                          className="text-blue-400 hover:text-blue-300 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import Sources Tab */}
        {activeTab === 'import-sources' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-100">Manage Import Sources</h2>
              <button
                onClick={() => openImportSourceModal()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                + New Import Source
              </button>
            </div>

            <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {importSources.map((source) => (
                    <tr key={source.id} className="hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-100">{source.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">{source.description || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => openImportSourceModal(source)}
                          className="text-blue-400 hover:text-blue-300 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteImportSource(source.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl border border-gray-800 max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-gray-100">
                {editingAccount ? 'Edit Account' : 'Create New Account'}
              </h3>
            </div>
            
            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="account-name" className="block text-sm font-medium text-gray-300 mb-2">
                  Account Name *
                </label>
                <input
                  type="text"
                  id="account-name"
                  required
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Personal, Business"
                />
              </div>

              <div>
                <label htmlFor="account-description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="account-description"
                  value={accountFormData.description}
                  onChange={(e) => setAccountFormData({ ...accountFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label htmlFor="account-color" className="block text-sm font-medium text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    id="account-color"
                    value={accountFormData.color}
                    onChange={(e) => setAccountFormData({ ...accountFormData, color: e.target.value })}
                    className="h-10 w-20 rounded cursor-pointer bg-gray-800 border border-gray-700"
                  />
                  <span className="text-sm text-gray-400">{accountFormData.color}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountModal(false);
                    setEditingAccount(null);
                    setAccountFormData({ name: '', description: '', color: '#3b82f6' });
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
                  {submitting ? 'Saving...' : editingAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl border border-gray-800 max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-gray-100">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
            </div>
            
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="category-name" className="block text-sm font-medium text-gray-300 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  id="category-name"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Food & Dining, Transportation"
                />
              </div>

              <div>
                <label htmlFor="category-color" className="block text-sm font-medium text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    id="category-color"
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    className="h-10 w-20 rounded cursor-pointer bg-gray-800 border border-gray-700"
                  />
                  <span className="text-sm text-gray-400">{categoryFormData.color}</span>
                </div>
              </div>

              <div>
                <label htmlFor="default-transaction-type" className="block text-sm font-medium text-gray-300 mb-2">
                  Default Transaction Type
                </label>
                <select
                  id="default-transaction-type"
                  value={categoryFormData.default_transaction_type}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, default_transaction_type: e.target.value as 'Debit' | 'Credit' | 'Transfer' })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Debit">Debit (Spending)</option>
                  <option value="Credit">Credit (Income)</option>
                  <option value="Transfer">Transfer</option>
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  This will be pre-selected when creating transactions with this category
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setCategoryFormData({ name: '', color: '#3b82f6', default_transaction_type: 'Debit' });
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
                  {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Source Modal */}
      {showImportSourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl border border-gray-800 max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-gray-100">
                {editingImportSource ? 'Edit Import Source' : 'Create New Import Source'}
              </h3>
            </div>

            <form onSubmit={handleImportSourceSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="source-name" className="block text-sm font-medium text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  id="source-name"
                  required
                  value={importSourceFormData.name}
                  onChange={(e) => setImportSourceFormData({ ...importSourceFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., DBS Bank Statement"
                />
              </div>

              <div>
                <label htmlFor="source-description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="source-description"
                  value={importSourceFormData.description}
                  onChange={(e) => setImportSourceFormData({ ...importSourceFormData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label htmlFor="associated-accounts" className="block text-sm font-medium text-gray-300 mb-2">
                  Associated Accounts (Optional)
                </label>
                <div className="bg-gray-800 border border-gray-700 rounded-md p-3 max-h-48 overflow-y-auto">
                  {accounts.length === 0 ? (
                    <p className="text-sm text-gray-400">No accounts available</p>
                  ) : (
                    <div className="space-y-2">
                      {accounts.map(account => (
                        <label key={account.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-750 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={importSourceFormData.accountIds.includes(account.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setImportSourceFormData(prev => ({
                                ...prev,
                                accountIds: checked
                                  ? [...prev.accountIds, account.id]
                                  : prev.accountIds.filter(id => id !== account.id)
                              }));
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-2 flex-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: account.color }}
                            />
                            <span className="text-sm text-gray-200">{account.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  When selected, only these accounts will appear in the import page. Leave empty to allow all accounts.
                </p>
              </div>

              <div>
                <label htmlFor="source-config" className="block text-sm font-medium text-gray-300 mb-2">
                  Configuration (JSON) *
                </label>
                <textarea
                  id="source-config"
                  required
                  value={importSourceFormData.config}
                  onChange={(e) => setImportSourceFormData({ ...importSourceFormData, config: e.target.value })}
                  rows={12}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="{...}"
                />
                <p className="mt-1 text-xs text-gray-400">
                  JSON configuration for CSV field mappings. Must include startingLine and fieldMappings.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportSourceModal(false);
                    setEditingImportSource(null);
                    setImportSourceFormData({ name: '', description: '', config: '', accountIds: [] });
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
                  {submitting ? 'Saving...' : editingImportSource ? 'Update Import Source' : 'Create Import Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
