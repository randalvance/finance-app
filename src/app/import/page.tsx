'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ImportSource {
  id: number;
  name: string;
  description: string | null;
  config: unknown;
}

interface Account {
  id: number;
  name: string;
  color: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
  defaultTransactionType: string;
}

interface PreviewTransaction {
  tempId: string;
  date: string;
  description: string;
  amount: number;
  transactionType: 'Debit' | 'Credit' | 'Transfer';
  sourceAccountId: number | null;
  targetAccountId: number | null;
  categoryId?: number | null;
  rawCsvRow?: Record<string, string>;
}

interface Import {
  id: number;
  filename: string;
  status: string;
  totalRows: number;
  importedRows: number;
  previewData: {
    transactions: PreviewTransaction[];
    categoryMappings: Record<string, number>;
  } | null;
  createdAt: string;
}

export default function ImportPage() {
  const [importSources, setImportSources] = useState<ImportSource[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [draftImports, setDraftImports] = useState<Import[]>([]);

  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [currentImportId, setCurrentImportId] = useState<number | null>(null);
  const [previewTransactions, setPreviewTransactions] = useState<PreviewTransaction[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<Record<string, number>>({});
  const [filename, setFilename] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showRawDataModal, setShowRawDataModal] = useState(false);
  const [selectedRawData, setSelectedRawData] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sourcesRes, accountsRes, categoriesRes, importsRes] = await Promise.all([
        fetch('/api/import-sources'),
        fetch('/api/accounts'),
        fetch('/api/categories'),
        fetch('/api/imports'),
      ]);

      if (sourcesRes.ok) setImportSources(await sourcesRes.json());
      if (accountsRes.ok) setAccounts(await accountsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (importsRes.ok) {
        const imports = await importsRes.json();
        setDraftImports(imports.filter((imp: Import) => imp.status === 'draft'));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
    }
  };

  const handleParseCSV = async () => {
    if (!csvFile || !selectedSourceId || !selectedAccountId) {
      alert('Please select a file, import source, and default account');
      return;
    }

    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('import_source_id', selectedSourceId.toString());
      formData.append('default_account_id', selectedAccountId.toString());

      const response = await fetch('/api/imports/parse', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentImportId(data.import.id);
        setPreviewTransactions(data.transactions);
        setFilename(data.filename);
        setCategoryMappings(data.categoryMappings);

        // Refresh draft imports list
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to parse CSV');
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Failed to parse CSV');
    } finally {
      setParsing(false);
    }
  };

  const handleCategoryChange = (tempId: string, categoryId: number) => {
    setCategoryMappings(prev => ({
      ...prev,
      [tempId]: categoryId,
    }));

    // Populate accounts based on category's defaultTransactionType
    const category = categories.find(c => c.id === categoryId);
    if (!category || !selectedAccountId) return;

    setPreviewTransactions(prev => prev.map(tx => {
      if (tx.tempId !== tempId) return tx;

      const defaultType = category.defaultTransactionType as 'Debit' | 'Credit' | 'Transfer';
      let newSourceAccountId: number | null = null;
      let newTargetAccountId: number | null = null;

      if (defaultType === 'Debit') {
        newSourceAccountId = selectedAccountId;
        newTargetAccountId = null;
      } else if (defaultType === 'Credit') {
        newSourceAccountId = null;
        newTargetAccountId = selectedAccountId;
      } else if (defaultType === 'Transfer') {
        // For transfers, populate based on original debit/credit from CSV
        if (tx.transactionType === 'Debit') {
          newSourceAccountId = selectedAccountId;
          newTargetAccountId = null;
        } else {
          newSourceAccountId = null;
          newTargetAccountId = selectedAccountId;
        }
      }

      return {
        ...tx,
        transactionType: defaultType,
        sourceAccountId: newSourceAccountId,
        targetAccountId: newTargetAccountId,
        categoryId,
      };
    }));
  };

  const handleAccountChange = (tempId: string, field: 'source' | 'target', accountId: number | null) => {
    setPreviewTransactions(prev => prev.map(tx => {
      if (tx.tempId !== tempId) return tx;

      if (field === 'source') {
        return { ...tx, sourceAccountId: accountId };
      } else {
        return { ...tx, targetAccountId: accountId };
      }
    }));
  };

  const handleSaveDraft = async () => {
    if (!currentImportId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/imports/${currentImportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preview_data: {
            transactions: previewTransactions,
            categoryMappings
          },
          status: 'draft'
        }),
      });

      if (response.ok) {
        alert('Progress saved!');
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save progress');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save progress');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeDraft = async (importRecord: Import) => {
    if (!importRecord.previewData) {
      alert('This draft has no preview data. Please re-upload the CSV file.');
      return;
    }

    setCurrentImportId(importRecord.id);
    setFilename(importRecord.filename);
    setPreviewTransactions(importRecord.previewData.transactions);
    setCategoryMappings(importRecord.previewData.categoryMappings);

    // Scroll to preview section
    setTimeout(() => {
      const previewSection = document.querySelector('h2');
      if (previewSection && previewSection.textContent?.includes('Preview')) {
        previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleDeleteDraft = async (id: number) => {
    if (!confirm('Are you sure you want to delete this draft import?')) return;

    try {
      const response = await fetch(`/api/imports/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Clear preview if deleting current import
        if (id === currentImportId) {
          setCurrentImportId(null);
          setPreviewTransactions([]);
          setCategoryMappings({});
          setFilename('');
        }
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete draft');
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert('Failed to delete draft');
    }
  };

  const handleImport = async () => {
    if (!currentImportId) return;

    // Validate all transactions have categories
    const unmappedCount = previewTransactions.filter(tx => !categoryMappings[tx.tempId] || categoryMappings[tx.tempId] === 0).length;
    if (unmappedCount > 0) {
      alert(`Please select categories for all ${unmappedCount} unmapped transactions`);
      return;
    }

    // Validate account assignments based on transaction type
    const invalidTransactions = previewTransactions.filter(tx => {
      if (tx.transactionType === 'Debit') {
        return !tx.sourceAccountId;
      } else if (tx.transactionType === 'Credit') {
        return !tx.targetAccountId;
      } else if (tx.transactionType === 'Transfer') {
        return !tx.sourceAccountId || !tx.targetAccountId || tx.sourceAccountId === tx.targetAccountId;
      }
      return false;
    });

    if (invalidTransactions.length > 0) {
      const errorMessages = invalidTransactions.map(tx => {
        if (tx.transactionType === 'Debit' && !tx.sourceAccountId) {
          return `Debit transaction "${tx.description}" missing source account`;
        } else if (tx.transactionType === 'Credit' && !tx.targetAccountId) {
          return `Credit transaction "${tx.description}" missing target account`;
        } else if (tx.transactionType === 'Transfer') {
          if (!tx.sourceAccountId || !tx.targetAccountId) {
            return `Transfer transaction "${tx.description}" missing source or target account`;
          } else if (tx.sourceAccountId === tx.targetAccountId) {
            return `Transfer transaction "${tx.description}" has same source and target account`;
          }
        }
        return '';
      }).filter(msg => msg);

      alert(`Invalid account assignments:\n\n${errorMessages.join('\n')}`);
      return;
    }

    setImporting(true);
    try {
      const response = await fetch(`/api/imports/${currentImportId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_mappings: categoryMappings,
        }),
      });

      if (response.ok) {
        alert('Import completed successfully!');
        // Reset form
        setCsvFile(null);
        setPreviewTransactions([]);
        setCategoryMappings({});
        setSelectedSourceId(null);
        setSelectedAccountId(null);
        setCurrentImportId(null);
        setFilename('');
        // Refresh data
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to import transactions');
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('Failed to import transactions');
    } finally {
      setImporting(false);
    }
  };

  const getMappedCount = () => {
    return Object.values(categoryMappings).filter(v => v > 0).length;
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
              <h1 className="text-2xl font-bold text-gray-100">Import Transactions</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Upload Form */}
            <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6">
              <h2 className="text-xl font-bold text-gray-100 mb-4">Upload CSV</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Import Source *
                  </label>
                  <select
                    value={selectedSourceId || ''}
                    onChange={(e) => setSelectedSourceId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select import source...</option>
                    {importSources.map(source => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Account *
                  </label>
                  <select
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select account...</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CSV File *
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={handleParseCSV}
                  disabled={!csvFile || !selectedSourceId || !selectedAccountId || parsing}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {parsing ? 'Parsing...' : 'Parse CSV'}
                </button>
              </div>
            </div>

            {/* Draft Imports */}
            {draftImports.length > 0 && (
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6">
                <h2 className="text-xl font-bold text-gray-100 mb-4">Draft Imports</h2>
                <div className="space-y-2">
                  {draftImports.map((imp) => {
                    const mapped = imp.previewData
                      ? Object.values(imp.previewData.categoryMappings).filter((v: unknown) => (v as number) > 0).length
                      : 0;
                    const total = imp.totalRows;

                    return (
                      <div
                        key={imp.id}
                        className="flex items-center justify-between p-4 bg-gray-800 rounded-md border border-gray-700 hover:border-gray-600 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-100">{imp.filename}</div>
                          <div className="text-sm text-gray-400">
                            {mapped} of {total} categories mapped • Created {new Date(imp.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleResumeDraft(imp)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                          >
                            Resume
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(imp.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preview Table */}
            {previewTransactions.length > 0 && (
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-100">
                      Preview: {filename}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {getMappedCount()} of {previewTransactions.length} categories mapped
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleSaveDraft}
                      disabled={saving}
                      className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={importing || getMappedCount() < previewTransactions.length}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importing ? 'Importing...' : 'Confirm Import'}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-800">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Source Account
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Target Account
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Raw
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {previewTransactions.map((tx) => (
                        <tr key={tx.tempId} className="hover:bg-gray-800 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {tx.date}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300 max-w-md truncate">
                            {tx.description}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                tx.transactionType === 'Debit'
                                  ? 'bg-red-900 text-red-200'
                                  : tx.transactionType === 'Credit'
                                  ? 'bg-green-900 text-green-200'
                                  : 'bg-blue-900 text-blue-200'
                              }`}
                            >
                              {tx.transactionType}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300 font-mono">
                            ${tx.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={categoryMappings[tx.tempId] || ''}
                              onChange={(e) => handleCategoryChange(tx.tempId, parseInt(e.target.value))}
                              className={`w-full px-2 py-1 bg-gray-800 border rounded text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                !categoryMappings[tx.tempId] || categoryMappings[tx.tempId] === 0
                                  ? 'border-red-500'
                                  : 'border-gray-700'
                              }`}
                            >
                              <option value="">Select category...</option>
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={tx.sourceAccountId || ''}
                              onChange={(e) => handleAccountChange(tx.tempId, 'source', e.target.value ? parseInt(e.target.value) : null)}
                              className={`w-full px-2 py-1 bg-gray-800 border rounded text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                (tx.transactionType === 'Debit' || tx.transactionType === 'Transfer') && !tx.sourceAccountId
                                  ? 'border-red-500'
                                  : 'border-gray-700'
                              }`}
                              disabled={tx.transactionType === 'Credit'}
                            >
                              <option value="">None</option>
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={tx.targetAccountId || ''}
                              onChange={(e) => handleAccountChange(tx.tempId, 'target', e.target.value ? parseInt(e.target.value) : null)}
                              className={`w-full px-2 py-1 bg-gray-800 border rounded text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                (tx.transactionType === 'Credit' || tx.transactionType === 'Transfer') && !tx.targetAccountId
                                  ? 'border-red-500'
                                  : 'border-gray-700'
                              }`}
                              disabled={tx.transactionType === 'Debit'}
                            >
                              <option value="">None</option>
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button
                              onClick={() => {
                                setSelectedRawData(tx.rawCsvRow || null);
                                setShowRawDataModal(true);
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors text-sm px-2 py-1 rounded border border-gray-700 hover:border-blue-500"
                              title="View original CSV data"
                            >
                              📄 View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Raw Data Modal */}
      {showRawDataModal && selectedRawData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl border border-gray-800 max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">Original CSV Data</h3>
              <button
                onClick={() => {
                  setShowRawDataModal(false);
                  setSelectedRawData(null);
                }}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-auto flex-1">
              <pre className="bg-gray-950 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 font-mono border border-gray-800">
{JSON.stringify(selectedRawData, null, 2)}
              </pre>
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex justify-end space-x-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedRawData, null, 2));
                  alert('Copied to clipboard!');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                📋 Copy JSON
              </button>
              <button
                onClick={() => {
                  setShowRawDataModal(false);
                  setSelectedRawData(null);
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
