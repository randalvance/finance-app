'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ConfirmButton from '@/components/ConfirmButton';

interface ImportSource {
  id: number;
  name: string;
  description: string | null;
  config: unknown;
  associatedAccounts?: Account[];
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
  const [currentImportRecord, setCurrentImportRecord] = useState<Import | null>(null);
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
        setDraftImports(imports.filter((imp: Import) => imp.status === 'draft' || imp.status === 'completed'));
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
    if (!category) return;

    setPreviewTransactions(prev => prev.map(tx => {
      if (tx.tempId !== tempId) return tx;

      const defaultType = category.defaultTransactionType as 'Debit' | 'Credit' | 'Transfer';
      let newSourceAccountId: number | null = tx.sourceAccountId;
      let newTargetAccountId: number | null = tx.targetAccountId;

      // Only auto-populate accounts if selectedAccountId is available
      if (selectedAccountId) {
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

  const handleDeletePreviewRow = (tempId: string) => {
    // Remove transaction from preview array
    setPreviewTransactions(prev => prev.filter(tx => tx.tempId !== tempId));

    // Clean up category mapping for this row
    setCategoryMappings(prev => {
      const updated = { ...prev };
      delete updated[tempId];
      return updated;
    });
  };

  const saveDraftData = async (showSuccessAlert = true) => {
    if (!currentImportId) return false;

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
        if (showSuccessAlert) {
          alert('Progress saved!');
          fetchData();
        }
        return true;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save progress');
        return false;
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save progress');
      return false;
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    await saveDraftData(true);
    setSaving(false);
  };

  const handleResumeDraft = async (importRecord: Import) => {
    if (!importRecord.previewData) {
      alert('This draft has no preview data. Please re-upload the CSV file.');
      return;
    }

    setCurrentImportId(importRecord.id);
    setCurrentImportRecord(importRecord);
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

  const handleDeleteDraft = async (id: number, status: string) => {
    const message = status === 'completed'
      ? 'Are you sure you want to delete this completed import? This will also delete all associated transactions.'
      : 'Are you sure you want to delete this draft import?';
    
    if (!confirm(message)) return;

    try {
      const response = await fetch(`/api/imports/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Clear preview if deleting current import
        if (id === currentImportId) {
          setCurrentImportId(null);
          setCurrentImportRecord(null);
          setPreviewTransactions([]);
          setCategoryMappings({});
          setFilename('');
        }
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete import');
      }
    } catch (error) {
      console.error('Error deleting import:', error);
      alert('Failed to delete import');
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
      // First, save the current draft state
      const saved = await saveDraftData(false);
      if (!saved) {
        setImporting(false);
        return;
      }

      // Then complete the import
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

  const getSelectableAccounts = (): Account[] => {
    if (!selectedSourceId) {
      return accounts; // No source selected, show all
    }

    const selectedSource = importSources.find(s => s.id === selectedSourceId);
    if (!selectedSource) {
      return accounts; // Source not found, show all
    }

    // If source has associated accounts, filter to those only
    if (selectedSource.associatedAccounts && selectedSource.associatedAccounts.length > 0) {
      return selectedSource.associatedAccounts;
    }

    // No associations (backward compatibility), show all accounts
    return accounts;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/50 backdrop-blur-md shadow-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-foreground">Import Transactions</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Upload Form */}
            <div className="bg-card/50 backdrop-blur-md rounded-lg shadow-lg border border-border p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Upload CSV</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Import Source *
                  </label>
                  <select
                    value={selectedSourceId || ''}
                    onChange={(e) => setSelectedSourceId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Default Account *
                  </label>
                  <select
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select account...</option>
                    {getSelectableAccounts().map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  {selectedSourceId && (() => {
                    const selectedSource = importSources.find(s => s.id === selectedSourceId);
                    const hasAssociations = selectedSource?.associatedAccounts && selectedSource.associatedAccounts.length > 0;

                    return hasAssociations && selectedSource?.associatedAccounts ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Showing {selectedSource.associatedAccounts.length} account(s) associated with this import source
                      </p>
                    ) : null;
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    CSV File *
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                </div>
              </div>

              <div className="mt-4">
                <Button
                  onClick={handleParseCSV}
                  disabled={!csvFile || !selectedSourceId || !selectedAccountId || parsing}
                  className="shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                >
                  {parsing ? 'Parsing...' : 'Parse CSV'}
                </Button>
              </div>
            </div>

            {/* Saved Imports */}
            {draftImports.length > 0 && (
              <div className="bg-card/50 backdrop-blur-md rounded-lg shadow-lg border border-border p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Saved Imports</h2>
                <div className="space-y-2">
                  {draftImports.map((imp) => {
                    const mapped = imp.previewData
                      ? Object.values(imp.previewData.categoryMappings).filter((v: unknown) => (v as number) > 0).length
                      : 0;
                    const total = imp.totalRows;

                    return (
                      <div
                        key={imp.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-md border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-foreground">{imp.filename}</div>
                            {imp.status === 'completed' && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-900/30 text-green-400 border border-green-900/50">
                                Completed
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {mapped} of {total} categories mapped • Created {new Date(imp.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => handleResumeDraft(imp)}
                            className="shadow-sm"
                            variant="secondary"
                          >
                            {imp.status === 'completed' ? 'View' : 'Resume'}
                          </Button>
                          <ConfirmButton
                            buttonText="Delete"
                            onConfirm={() => handleDeleteDraft(imp.id, imp.status)}
                            buttonClassName="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm font-medium"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preview Table */}
            {previewTransactions.length > 0 && (
              <div className="bg-card/50 backdrop-blur-md rounded-lg shadow-lg border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-foreground">
                        Preview: {filename}
                      </h2>
                      {currentImportRecord?.status === 'completed' && (
                        <span className="px-3 py-1 rounded-md text-sm font-medium bg-green-900/30 text-green-400 border border-green-900/50">
                          Viewing Completed Import (Read-Only)
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getMappedCount()} of {previewTransactions.length} categories mapped
                    </p>
                  </div>
                  {currentImportRecord?.status !== 'completed' && (
                    <div className="flex items-center space-x-3">
                      <Button
                        onClick={handleSaveDraft}
                        disabled={saving}
                        variant="outline"
                      >
                        {saving ? 'Saving...' : 'Save Draft'}
                      </Button>
                      <Button
                        onClick={handleImport}
                        disabled={importing || getMappedCount() < previewTransactions.length}
                        className="shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                      >
                        {importing ? 'Importing...' : 'Confirm Import'}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Source Account
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Target Account
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Raw
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewTransactions.map((tx) => (
                        <tr key={tx.tempId} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                            {tx.date}
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground max-w-xs">
                            <div className="line-clamp-2">{tx.description}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                tx.transactionType === 'Debit'
                                  ? 'bg-red-900/30 text-red-400 border border-red-900/50'
                                  : tx.transactionType === 'Credit'
                                  ? 'bg-green-900/30 text-green-400 border border-green-900/50'
                                  : 'bg-blue-900/30 text-blue-400 border border-blue-900/50'
                              }`}
                            >
                              {tx.transactionType}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-foreground font-mono">
                            ${tx.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {currentImportRecord?.status === 'completed' ? (
                              <span className="text-sm text-muted-foreground">
                                {categories.find(cat => cat.id === categoryMappings[tx.tempId])?.name || 'None'}
                              </span>
                            ) : (
                              <select
                                value={categoryMappings[tx.tempId] || ''}
                                onChange={(e) => handleCategoryChange(tx.tempId, parseInt(e.target.value))}
                                className={`w-full px-2 py-1 bg-input border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                                  !categoryMappings[tx.tempId] || categoryMappings[tx.tempId] === 0
                                    ? 'border-destructive'
                                    : 'border-border'
                                }`}
                              >
                                <option value="">Select category...</option>
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {currentImportRecord?.status === 'completed' ? (
                              <span className="text-sm text-muted-foreground">
                                {accounts.find(acc => acc.id === tx.sourceAccountId)?.name || 'None'}
                              </span>
                            ) : (
                              <select
                                value={tx.sourceAccountId || ''}
                                onChange={(e) => handleAccountChange(tx.tempId, 'source', e.target.value ? parseInt(e.target.value) : null)}
                                className={`w-full px-2 py-1 bg-input border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                                  (tx.transactionType === 'Debit' || tx.transactionType === 'Transfer') && !tx.sourceAccountId
                                    ? 'border-destructive'
                                    : 'border-border'
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
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {currentImportRecord?.status === 'completed' ? (
                              <span className="text-sm text-muted-foreground">
                                {accounts.find(acc => acc.id === tx.targetAccountId)?.name || 'None'}
                              </span>
                            ) : (
                              <select
                                value={tx.targetAccountId || ''}
                                onChange={(e) => handleAccountChange(tx.tempId, 'target', e.target.value ? parseInt(e.target.value) : null)}
                                className={`w-full px-2 py-1 bg-input border rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                                  (tx.transactionType === 'Credit' || tx.transactionType === 'Transfer') && !tx.targetAccountId
                                    ? 'border-destructive'
                                    : 'border-border'
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
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <Button
                              onClick={() => {
                                setSelectedRawData(tx.rawCsvRow || null);
                                setShowRawDataModal(true);
                              }}
                              variant="outline"
                              size="sm"
                              title="View original CSV data"
                            >
                              📄 View
                            </Button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {currentImportRecord?.status !== 'completed' && (
                              <ConfirmButton
                                buttonText="Delete"
                                onConfirm={() => handleDeletePreviewRow(tx.tempId)}
                                buttonClassName="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm"
                              />
                            )}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg shadow-2xl border border-border max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Original CSV Data</h3>
              <button
                onClick={() => {
                  setShowRawDataModal(false);
                  setSelectedRawData(null);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-auto flex-1">
              <pre className="bg-muted/30 rounded-lg p-4 overflow-x-auto text-sm text-muted-foreground font-mono border border-border">
{JSON.stringify(selectedRawData, null, 2)}
              </pre>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end space-x-3">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedRawData, null, 2));
                  alert('Copied to clipboard!');
                }}
                variant="outline"
              >
                📋 Copy JSON
              </Button>
              <Button
                onClick={() => {
                  setShowRawDataModal(false);
                  setSelectedRawData(null);
                }}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
