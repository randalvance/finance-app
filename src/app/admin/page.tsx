"use client";

import { useEffect, useState } from "react";
import { getAvailableCurrencies } from "@/lib/currency";
import type { Currency } from "@/db/schema";
import type { TransactionType } from "@/types/transaction";
import { TRANSACTION_TYPE_LABELS } from "@/types/transaction";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Account {
  id: number;
  name: string;
  description: string | null;
  color: string;
  currency: string;
  isInvestmentAccount?: string;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
  defaultTransactionType?: string;
  createdAt: string;
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

export default function AdminPage () {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [importSources, setImportSources] = useState<ImportSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"accounts" | "categories" | "import-sources">("accounts");

  // Account modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountFormData, setAccountFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    currency: "USD" as Currency,
    isInvestmentAccount: false
  });

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    color: "#3b82f6",
    default_transaction_type: "Debit" as TransactionType
  });

  // Import source modal state
  const [showImportSourceModal, setShowImportSourceModal] = useState(false);
  const [editingImportSource, setEditingImportSource] = useState<ImportSource | null>(null);
  const [importSourceFormData, setImportSourceFormData] = useState({
    name: "",
    description: "",
    config: "",
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
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchImportSources = async () => {
    try {
      const response = await fetch("/api/import-sources");
      if (response.ok) {
        const data = await response.json();
        setImportSources(data);
      }
    } catch (error) {
      console.error("Error fetching import sources:", error);
    }
  };

  // Account handlers
  const openAccountModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setAccountFormData({
        name: account.name,
        description: account.description || "",
        color: account.color,
        currency: account.currency as Currency,
        isInvestmentAccount: account.isInvestmentAccount === "true"
      });
    } else {
      setEditingAccount(null);
      setAccountFormData({ name: "", description: "", color: "#3b82f6", currency: "USD", isInvestmentAccount: false });
    }
    setShowAccountModal(true);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingAccount
        ? `/api/accounts/${editingAccount.id}`
        : "/api/accounts";

      const response = await fetch(url, {
        method: editingAccount ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: accountFormData.name,
          description: accountFormData.description,
          color: accountFormData.color,
          currency: accountFormData.currency,
          is_investment_account: accountFormData.isInvestmentAccount
        }),
      });

      if (response.ok) {
        setShowAccountModal(false);
        setEditingAccount(null);
        setAccountFormData({ name: "", description: "", color: "#3b82f6", currency: "USD", isInvestmentAccount: false });
        fetchAccounts();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save account");
      }
    } catch (error) {
      console.error("Error saving account:", error);
      alert("Failed to save account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm("Are you sure you want to delete this account? This will fail if there are transactions associated with it.")) return;

    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchAccounts();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account");
    }
  };

  // Category handlers
  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name,
        color: category.color,
        default_transaction_type: (category.defaultTransactionType as TransactionType) || "Debit"
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({ name: "", color: "#3b82f6", default_transaction_type: "Debit" });
    }
    setShowCategoryModal(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories";

      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryFormData),
      });

      if (response.ok) {
        setShowCategoryModal(false);
        setEditingCategory(null);
        setCategoryFormData({ name: "", color: "#3b82f6", default_transaction_type: "Debit" });
        fetchCategories();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save category");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCategories();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category");
    }
  };

  // Import source handlers
  const openImportSourceModal = (source?: ImportSource) => {
    if (source) {
      setEditingImportSource(source);
      setImportSourceFormData({
        name: source.name,
        description: source.description || "",
        config: JSON.stringify(source.config, null, 2),
        accountIds: source.associatedAccounts?.map(a => a.id) || []
      });
    } else {
      setEditingImportSource(null);
      setImportSourceFormData({
        name: "",
        description: "",
        config: JSON.stringify({
          startingLine: 1,
          fieldMappings: [
            { sourceColumn: "", transactionField: "date", dataType: "date", required: true, format: "dd MMM yyyy" },
            { sourceColumn: "", transactionField: "description", dataType: "string", required: true },
            { sourceColumn: "", transactionField: "debit", dataType: "number", required: false },
            { sourceColumn: "", transactionField: "credit", dataType: "number", required: false },
            { sourceColumn: "", transactionField: "reference", dataType: "string", required: false }
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
        alert("Invalid JSON in config field");
        setSubmitting(false);
        return;
      }

      const url = editingImportSource
        ? `/api/import-sources/${editingImportSource.id}`
        : "/api/import-sources";

      const response = await fetch(url, {
        method: editingImportSource ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
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
        setImportSourceFormData({ name: "", description: "", config: "", accountIds: [] });
        fetchImportSources();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save import source");
      }
    } catch (error) {
      console.error("Error saving import source:", error);
      alert("Failed to save import source");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteImportSource = async (id: number) => {
    if (!confirm("Are you sure you want to delete this import source?")) return;

    try {
      const response = await fetch(`/api/import-sources/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchImportSources();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete import source");
      }
    } catch (error) {
      console.error("Error deleting import source:", error);
      alert("Failed to delete import source");
    }
  };

  return (
    <main className='max-w-[1600px] mx-auto px-6 py-8'>
      {/* Tabs */}
      <div className='mb-8'>
        <div className='glass-card rounded-lg p-1 inline-flex space-x-1 border border-border'>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`mono text-xs px-4 py-2 rounded transition-all duration-200 ${
              activeTab === "accounts"
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            [ACCOUNTS]
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`mono text-xs px-4 py-2 rounded transition-all duration-200 ${
              activeTab === "categories"
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            [CATEGORIES]
          </button>
          <button
            onClick={() => setActiveTab("import-sources")}
            className={`mono text-xs px-4 py-2 rounded transition-all duration-200 ${
              activeTab === "import-sources"
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            [IMPORT_SOURCES]
          </button>
        </div>
      </div>

      {/* Accounts Tab */}
      {activeTab === "accounts" && (
        <div className='animate-slide-up-fade'>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h2 className='mono text-sm font-bold tracking-wider text-primary'>MANAGE_ACCOUNTS</h2>
              <p className='mono text-xs text-muted-foreground mt-1'>{accounts.length} RECORDS</p>
            </div>
            <Button
              onClick={() => openAccountModal()}
              className='mono text-xs font-bold tracking-wider terminal-border bg-primary hover:bg-primary/90'
            >
              [+] NEW_ACCOUNT
            </Button>
          </div>

          {loading
            ? (
              <div className='glass-card rounded-lg p-12 text-center'>
                <div className='mono text-sm text-muted-foreground animate-pulse'>LOADING_DATA...</div>
              </div>
            )
            : (
              <div className='glass-card rounded-lg border border-border overflow-hidden'>
                <Table>
                  <TableHeader className='glass bg-muted/30 border-b border-primary/20'>
                    <TableRow className='border-border/50 hover:bg-muted/30'>
                      <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest'>NAME</TableHead>
                      <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest'>DESCRIPTION</TableHead>
                      <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest'>CURRENCY</TableHead>
                      <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest'>TYPE</TableHead>
                      <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest'>COLOR</TableHead>
                      <TableHead className='mono text-[10px] text-center font-bold text-primary uppercase tracking-widest'>ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className='divide-y divide-border/30'>
                    {accounts.map((account) => (
                      <TableRow key={account.id} className='hover:bg-primary/5 transition-all duration-200 group'>
                        <TableCell>
                          <div className='flex items-center space-x-3'>
                            <div
                              className='w-3 h-3 rounded-full'
                              style={{ backgroundColor: account.color }}
                            />
                            <span className='text-sm font-medium text-foreground'>{account.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className='text-sm text-muted-foreground'>{account.description || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className='text-sm text-muted-foreground'>{account.currency}</span>
                        </TableCell>
                        <TableCell>
                          {account.isInvestmentAccount === "true"
                            ? <span className='mono text-xs px-2 py-1 bg-accent/20 text-accent rounded border border-accent/30'>INVESTMENT</span>
                            : <span className='text-sm text-muted-foreground'>REGULAR</span>}
                        </TableCell>
                        <TableCell>
                          <span className='mono text-xs text-muted-foreground'>{account.color}</span>
                        </TableCell>
                        <TableCell className='text-center space-x-1'>
                          {account.isInvestmentAccount === "true" && (
                            <a
                              href={`/accounts/${account.id}/balance-history`}
                              className='mono text-xs px-2 py-1 text-secondary hover:bg-secondary/10 rounded border border-secondary/30 hover:border-secondary transition-all inline-block'
                            >
                              HISTORY
                            </a>
                          )}
                          <button
                            onClick={() => openAccountModal(account)}
                            className='mono text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded border border-primary/30 hover:border-primary transition-all mr-2'
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className='mono text-xs px-2 py-1 text-destructive hover:bg-destructive/10 rounded border border-destructive/30 hover:border-destructive transition-all'
                          >
                            DELETE
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div className='animate-slide-up-fade'>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h2 className='mono text-sm font-bold tracking-wider text-primary'>MANAGE_CATEGORIES</h2>
              <p className='mono text-xs text-muted-foreground mt-1'>{categories.length} RECORDS</p>
            </div>
            <Button
              onClick={() => openCategoryModal()}
              className='mono text-xs font-bold tracking-wider terminal-border bg-primary hover:bg-primary/90'
            >
              [+] NEW_CATEGORY
            </Button>
          </div>

          <div className='glass-card rounded-lg border border-border overflow-hidden'>
            <Table>
              <TableHeader className='glass bg-muted/30 border-b border-primary/20'>
                <TableRow className='border-border/50 hover:bg-muted/30'>
                  <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest'>NAME</TableHead>
                  <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest'>COLOR</TableHead>
                  <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest'>DEFAULT_TYPE</TableHead>
                  <TableHead className='mono text-[10px] text-center font-bold text-primary uppercase tracking-widest'>ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='divide-y divide-border/30'>
                {categories.map((category) => (
                  <TableRow key={category.id} className='hover:bg-primary/5 transition-all duration-200 group'>
                    <TableCell>
                      <div className='flex items-center space-x-3'>
                        <div
                          className='w-3 h-3 rounded-full'
                          style={{ backgroundColor: category.color }}
                        />
                        <span className='text-sm font-medium text-foreground'>{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className='text-sm text-muted-foreground'>{category.color}</span>
                    </TableCell>
                    <TableCell>
                      <span className='text-sm text-foreground'>{category.defaultTransactionType || "Debit"}</span>
                    </TableCell>
                    <TableCell className='text-center'>
                      <button
                        onClick={() => openCategoryModal(category)}
                        className='mono text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded border border-primary/30 hover:border-primary transition-all mr-2'
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className='mono text-xs px-2 py-1 text-destructive hover:bg-destructive/10 rounded border border-destructive/30 hover:border-destructive transition-all'
                      >
                        DELETE
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Import Sources Tab */}
      {activeTab === "import-sources" && (
        <div className='animate-slide-up-fade'>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h2 className='mono text-sm font-bold tracking-wider text-primary'>MANAGE_IMPORT_SOURCES</h2>
              <p className='mono text-xs text-muted-foreground mt-1'>{importSources.length} RECORDS</p>
            </div>
            <Button
              onClick={() => openImportSourceModal()}
              className='mono text-xs font-bold tracking-wider terminal-border bg-primary hover:bg-primary/90'
            >
              [+] NEW_SOURCE
            </Button>
          </div>

          <div className='glass-card rounded-lg border border-border overflow-hidden'>
            <Table>
              <TableHeader className='glass bg-muted/30 border-b border-primary/20'>
                <TableRow className='border-border/50 hover:bg-muted/30'>
                  <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest'>NAME</TableHead>
                  <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest'>DESCRIPTION</TableHead>
                  <TableHead className='mono text-[10px] text-center font-bold text-primary uppercase tracking-widest'>ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='divide-y divide-border/30'>
                {importSources.map((source) => (
                  <TableRow key={source.id} className='hover:bg-primary/5 transition-all duration-200 group'>
                    <TableCell>
                      <span className='text-sm font-medium text-foreground'>{source.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className='text-sm text-muted-foreground'>{source.description || "—"}</span>
                    </TableCell>
                    <TableCell className='text-center'>
                      <button
                        onClick={() => openImportSourceModal(source)}
                        className='mono text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded border border-primary/30 hover:border-primary transition-all mr-2'
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDeleteImportSource(source.id)}
                        className='mono text-xs px-2 py-1 text-destructive hover:bg-destructive/10 rounded border border-destructive/30 hover:border-destructive transition-all'
                      >
                        DELETE
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='frosted-glass rounded-lg shadow-2xl max-w-md w-full animate-slide-up-fade'>
            <div className='px-6 py-4 border-b-2 border-primary/30 bg-primary/5'>
              <h3 className='mono text-sm font-bold tracking-wider'>
                {editingAccount ? "[EDIT] ACCOUNT" : "[NEW] ACCOUNT"}
              </h3>
            </div>

            <form onSubmit={handleAccountSubmit} className='p-6 space-y-4'>
              <div>
                <label htmlFor='account-name' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  ACCOUNT_NAME *
                </label>
                <input
                  type='text'
                  id='account-name'
                  required
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  className='w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                  placeholder='Personal, Business...'
                />
              </div>

              <div>
                <label htmlFor='account-description' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  DESCRIPTION
                </label>
                <textarea
                  id='account-description'
                  value={accountFormData.description}
                  onChange={(e) => setAccountFormData({ ...accountFormData, description: e.target.value })}
                  rows={3}
                  className='w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                  placeholder='Optional...'
                />
              </div>

              <div>
                <label htmlFor='account-color' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  COLOR
                </label>
                <div className='flex items-center space-x-3'>
                  <input
                    type='color'
                    id='account-color'
                    value={accountFormData.color}
                    onChange={(e) => setAccountFormData({ ...accountFormData, color: e.target.value })}
                    className='h-10 w-20 rounded cursor-pointer bg-input border border-border'
                  />
                  <span className='mono text-xs text-muted-foreground'>{accountFormData.color}</span>
                </div>
              </div>

              <div>
                <label htmlFor='account-currency' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  CURRENCY *
                </label>
                <select
                  id='account-currency'
                  value={accountFormData.currency}
                  onChange={(e) => setAccountFormData({ ...accountFormData, currency: e.target.value as Currency })}
                  className='mono w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                >
                  {getAvailableCurrencies().map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.name} ({curr.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className='flex items-center space-x-3'>
                <input
                  type='checkbox'
                  id='account-investment'
                  checked={accountFormData.isInvestmentAccount}
                  onChange={(e) => setAccountFormData({ ...accountFormData, isInvestmentAccount: e.target.checked })}
                  className='w-4 h-4 rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                />
                <label htmlFor='account-investment' className='mono text-xs font-bold text-primary cursor-pointer'>
                  INVESTMENT_ACCOUNT
                </label>
                <span className='text-xs text-muted-foreground'>(Manual balance tracking)</span>
              </div>

              <div className='flex justify-end space-x-3 pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setShowAccountModal(false);
                    setEditingAccount(null);
                    setAccountFormData({ name: "", description: "", color: "#3b82f6", currency: "USD", isInvestmentAccount: false });
                  }}
                  disabled={submitting}
                  className='mono text-xs'
                >
                  CANCEL
                </Button>
                <Button
                  type='submit'
                  disabled={submitting}
                  className='mono text-xs bg-primary hover:bg-primary/90'
                >
                  {submitting ? "PROCESSING..." : editingAccount ? "UPDATE" : "CREATE"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='frosted-glass rounded-lg shadow-2xl max-w-md w-full animate-slide-up-fade'>
            <div className='px-6 py-4 border-b-2 border-primary/30 bg-primary/5'>
              <h3 className='mono text-sm font-bold tracking-wider'>
                {editingCategory ? "[EDIT] CATEGORY" : "[NEW] CATEGORY"}
              </h3>
            </div>

            <form onSubmit={handleCategorySubmit} className='p-6 space-y-4'>
              <div>
                <label htmlFor='category-name' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  CATEGORY_NAME *
                </label>
                <input
                  type='text'
                  id='category-name'
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className='w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                  placeholder='Food & Dining, Transportation...'
                />
              </div>

              <div>
                <label htmlFor='category-color' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  COLOR
                </label>
                <div className='flex items-center space-x-3'>
                  <input
                    type='color'
                    id='category-color'
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    className='h-10 w-20 rounded cursor-pointer bg-input border border-border'
                  />
                  <span className='mono text-xs text-muted-foreground'>{categoryFormData.color}</span>
                </div>
              </div>

              <div>
                <label htmlFor='default-transaction-type' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  DEFAULT_TYPE
                </label>
                <select
                  id='default-transaction-type'
                  value={categoryFormData.default_transaction_type}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, default_transaction_type: e.target.value as TransactionType })}
                  className='mono w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                >
                  <option value='Debit'>{TRANSACTION_TYPE_LABELS.Debit}</option>
                  <option value='TransferOut'>{TRANSACTION_TYPE_LABELS.TransferOut}</option>
                  <option value='Credit'>{TRANSACTION_TYPE_LABELS.Credit}</option>
                  <option value='TransferIn'>{TRANSACTION_TYPE_LABELS.TransferIn}</option>
                </select>
                <p className='mono mt-1 text-[10px] text-muted-foreground'>
                  Pre-selected when creating transactions
                </p>
              </div>

              <div className='flex justify-end space-x-3 pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setCategoryFormData({ name: "", color: "#3b82f6", default_transaction_type: "Debit" });
                  }}
                  disabled={submitting}
                  className='mono text-xs'
                >
                  CANCEL
                </Button>
                <Button
                  type='submit'
                  disabled={submitting}
                  className='mono text-xs bg-primary hover:bg-primary/90'
                >
                  {submitting ? "PROCESSING..." : editingCategory ? "UPDATE" : "CREATE"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Source Modal */}
      {showImportSourceModal && (
        <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='frosted-glass rounded-lg shadow-2xl max-w-2xl w-full animate-slide-up-fade'>
            <div className='px-6 py-4 border-b-2 border-primary/30 bg-primary/5'>
              <h3 className='mono text-sm font-bold tracking-wider'>
                {editingImportSource ? "[EDIT] IMPORT_SOURCE" : "[NEW] IMPORT_SOURCE"}
              </h3>
            </div>

            <form onSubmit={handleImportSourceSubmit} className='p-6 space-y-4 max-h-[70vh] overflow-y-auto'>
              <div>
                <label htmlFor='source-name' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  SOURCE_NAME *
                </label>
                <input
                  type='text'
                  id='source-name'
                  required
                  value={importSourceFormData.name}
                  onChange={(e) => setImportSourceFormData({ ...importSourceFormData, name: e.target.value })}
                  className='w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                  placeholder='DBS Bank Statement...'
                />
              </div>

              <div>
                <label htmlFor='source-description' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  DESCRIPTION
                </label>
                <textarea
                  id='source-description'
                  value={importSourceFormData.description}
                  onChange={(e) => setImportSourceFormData({ ...importSourceFormData, description: e.target.value })}
                  rows={2}
                  className='w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                  placeholder='Optional...'
                />
              </div>

              <div>
                <label htmlFor='associated-accounts' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  ASSOCIATED_ACCOUNTS
                </label>
                <div className='bg-input border border-border rounded-md p-3 max-h-48 overflow-y-auto'>
                  {accounts.length === 0
                    ? (
                      <p className='text-sm text-muted-foreground'>No accounts available</p>
                    )
                    : (
                      <div className='space-y-2'>
                        {accounts.map(account => (
                          <label key={account.id} className='flex items-center space-x-3 cursor-pointer hover:bg-muted/30 p-2 rounded'>
                            <input
                              type='checkbox'
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
                              className='w-4 h-4 text-primary bg-input border-border rounded focus:ring-ring'
                            />
                            <div className='flex items-center space-x-2 flex-1'>
                              <div
                                className='w-3 h-3 rounded-full'
                                style={{ backgroundColor: account.color }}
                              />
                              <span className='text-sm text-foreground'>{account.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                </div>
                <p className='mono mt-1 text-[10px] text-muted-foreground'>
                  Filters accounts in import page
                </p>
              </div>

              <div>
                <label htmlFor='source-config' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  CONFIG_JSON *
                </label>
                <textarea
                  id='source-config'
                  required
                  value={importSourceFormData.config}
                  onChange={(e) => setImportSourceFormData({ ...importSourceFormData, config: e.target.value })}
                  rows={12}
                  className='mono w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                  placeholder='{...}'
                />
                <p className='mono mt-1 text-[10px] text-muted-foreground'>
                  CSV field mappings configuration
                </p>
              </div>

              <div className='flex justify-end space-x-3 pt-4 border-t border-border/50 mt-6'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setShowImportSourceModal(false);
                    setEditingImportSource(null);
                    setImportSourceFormData({ name: "", description: "", config: "", accountIds: [] });
                  }}
                  disabled={submitting}
                  className='mono text-xs'
                >
                  CANCEL
                </Button>
                <Button
                  type='submit'
                  disabled={submitting}
                  className='mono text-xs bg-primary hover:bg-primary/90'
                >
                  {submitting ? "PROCESSING..." : editingImportSource ? "UPDATE" : "CREATE"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
