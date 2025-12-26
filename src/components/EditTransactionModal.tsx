"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCurrencySymbol } from "@/lib/currency";
import type { Currency } from "@/db/schema";
import {
  Account,
  TransactionWithAccounts,
  TransactionWithLink,
  Category,
} from "@/types/transaction";
import TransactionTable from "@/components/TransactionTable";

interface EditTransactionModalProps {
  transaction:
    | (TransactionWithAccounts & {
      link?: { id: number; linkedTransactionId: number };
    })
    | null; // null = create mode, object = edit mode
  accounts: Account[];
  categories: Category[];
  allTransactions?: TransactionWithLink[];

  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;

  // Optional defaults for create mode
  defaultSourceAccountId?: number;

  showLinkSelection?: boolean;
}

export default function EditTransactionModal ({
  transaction,
  accounts,
  categories,
  allTransactions = [],
  isOpen,
  onClose,
  onSaved,
  defaultSourceAccountId,
  showLinkSelection = false,
}: EditTransactionModalProps) {
  const [formData, setFormData] = useState({
    transaction_type: "Debit" as
      | "Debit"
      | "TransferOut"
      | "Credit"
      | "TransferIn",
    source_account_id: "",
    target_account_id: "",
    description: "",
    amount: "",
    category_id: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedLinkTransactionId, setSelectedLinkTransactionId] = useState<
    number | null
  >(null);

  // View state for iOS-style slide navigation
  const [currentView, setCurrentView] = useState<"form" | "linkSelector">(
    "form"
  );
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [linkModalAccountFilter, setLinkModalAccountFilter] = useState<
    number | null
  >(null);
  const [filterByDate, setFilterByDate] = useState(true);

  // Initialize form data when transaction changes or for create mode
  useEffect(() => {
    if (transaction) {
      // Edit mode
      setFormData({
        transaction_type: transaction.transactionType as
          | "Debit"
          | "TransferOut"
          | "Credit"
          | "TransferIn",
        source_account_id: transaction.sourceAccountId?.toString() || "",
        target_account_id: transaction.targetAccountId?.toString() || "",
        description: transaction.description,
        amount: Math.abs(transaction.amount).toString(),
        category_id: transaction.categoryId?.toString() || "",
        date: transaction.date,
      });
      setSelectedLinkTransactionId(
        transaction.link?.linkedTransactionId || null
      );
    } else {
      // Create mode - reset to defaults
      setFormData({
        transaction_type: "Debit",
        source_account_id: defaultSourceAccountId?.toString() || "",
        target_account_id: "",
        description: "",
        amount: "",
        category_id: "",
        date: new Date().toISOString().split("T")[0],
      });
      setSelectedLinkTransactionId(null);
    }
    // Reset view to form when modal opens/transaction changes
    setCurrentView("form");
  }, [transaction, defaultSourceAccountId]);

  if (!isOpen) return null;

  // Get currency symbol based on selected account
  const getCurrencySymbolForAccount = () => {
    let accountId: number | null = null;

    if (formData.transaction_type === "Debit" && formData.source_account_id) {
      accountId = parseInt(formData.source_account_id);
    } else if (
      formData.transaction_type === "TransferOut" &&
      formData.source_account_id
    ) {
      accountId = parseInt(formData.source_account_id);
    } else if (
      formData.transaction_type === "Credit" &&
      formData.target_account_id
    ) {
      accountId = parseInt(formData.target_account_id);
    } else if (
      formData.transaction_type === "TransferIn" &&
      formData.target_account_id
    ) {
      accountId = parseInt(formData.target_account_id);
    }

    if (accountId) {
      const account = accounts.find((a) => a.id === accountId);
      if (account?.currency) {
        return getCurrencySymbol(account.currency as Currency);
      }
    }

    return "$"; // Default to dollar
  };

  const handleCategoryChange = (categoryId: string) => {
    const selectedCategory = categories.find(
      (c) => c.id.toString() === categoryId
    );
    if (selectedCategory && selectedCategory.defaultTransactionType) {
      setFormData({
        ...formData,
        category_id: categoryId,
        transaction_type: selectedCategory.defaultTransactionType as
          | "Debit"
          | "TransferOut"
          | "Credit"
          | "TransferIn",
      });
    } else {
      setFormData({
        ...formData,
        category_id: categoryId,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate based on transaction type
      if (
        formData.transaction_type === "Debit" &&
        !formData.source_account_id
      ) {
        alert("Debit transactions require a source account");
        setSubmitting(false);
        return;
      }
      if (
        formData.transaction_type === "Credit" &&
        !formData.target_account_id
      ) {
        alert("Credit transactions require a target account");
        setSubmitting(false);
        return;
      }
      if (
        formData.transaction_type === "TransferOut" ||
        formData.transaction_type === "TransferIn"
      ) {
        if (!formData.source_account_id || !formData.target_account_id) {
          alert(
            "Transfer transactions require both source and target accounts"
          );
          setSubmitting(false);
          return;
        }
        if (formData.source_account_id === formData.target_account_id) {
          alert("Source and target accounts must be different for transfers");
          setSubmitting(false);
          return;
        }
      }

      const isEditing = transaction !== null;
      const url = isEditing
        ? `/api/transactions/${transaction.id}`
        : "/api/transactions";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_type: formData.transaction_type,
          source_account_id: formData.source_account_id
            ? parseInt(formData.source_account_id)
            : null,
          target_account_id: formData.target_account_id
            ? parseInt(formData.target_account_id)
            : null,
          description: formData.description,
          amount: parseFloat(formData.amount),
          category_id: parseInt(formData.category_id),
          date: formData.date,
        }),
      });

      if (response.ok) {
        const savedTransaction = await response.json();

        // Handle link changes if link selection is enabled
        if (showLinkSelection) {
          const originalLinkId = transaction?.link?.linkedTransactionId;
          const linkChanged = originalLinkId !== selectedLinkTransactionId;

          if (!isEditing || linkChanged) {
            // Delete old link if it existed and changed
            if (isEditing && transaction?.link && linkChanged) {
              try {
                await fetch(`/api/transactions/links/${transaction.link.id}`, {
                  method: "DELETE",
                });
              } catch (linkErr) {
                console.error("Error removing old link:", linkErr);
              }
            }

            // Create new link if one was selected
            if (selectedLinkTransactionId) {
              try {
                const linkResponse = await fetch("/api/transactions/links", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    transaction_1_id: savedTransaction.id,
                    transaction_2_id: selectedLinkTransactionId,
                  }),
                });

                if (!linkResponse.ok) {
                  const linkError = await linkResponse.json();
                  alert(
                    `Transaction ${
                      isEditing ? "updated" : "created"
                    } but linking failed: ${linkError.error}`
                  );
                }
              } catch (linkErr) {
                console.error("Error creating link:", linkErr);
                alert(
                  `Transaction ${
                    isEditing ? "updated" : "created"
                  } but linking failed`
                );
              }
            }
          }
        }

        onSaved();
        onClose();
      } else {
        const error = await response.json();
        alert(
          error.error ||
            `Failed to ${isEditing ? "update" : "create"} transaction`
        );
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert(`Failed to ${transaction ? "update" : "create"} transaction`);
    } finally {
      setSubmitting(false);
    }
  };

  // Get filtered transactions for link selector
  const getFilteredTransactions = () => {
    return allTransactions.filter((t) => {
      // Exclude current transaction
      if (transaction && t.id === transaction.id) {
        return false;
      }
      // Filter out already linked transactions
      if (t.link) {
        return false;
      }
      // Filter by date if enabled
      if (filterByDate && t.date !== formData.date) {
        return false;
      }
      // Filter by search query
      if (
        linkSearchQuery &&
        !t.description.toLowerCase().includes(linkSearchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  };

  return (
    <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
      <div
        className={`frosted-glass rounded-lg w-full h-[90vh] flex flex-col animate-slide-up-fade shadow-2xl overflow-hidden ${
          currentView === "linkSelector" ? "max-w-6xl" : "max-w-md"
        }`}
      >
        {/* Header - changes based on current view */}
        <div className='px-6 border-b-2 border-primary/30 bg-primary/5 flex-shrink-0 h-[60px] flex items-center'>
          {currentView === "linkSelector"
            ? (
              <div className='flex items-center gap-3 w-full'>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setCurrentView("form")}
                  className='mono text-xs -ml-2 h-8'
                >
                  ← BACK
                </Button>
                <h3 className='mono text-sm font-bold tracking-wider'>
                  [SELECT] TRANSACTION_TO_LINK
                </h3>
              </div>
            )
            : (
              <h3 className='mono text-sm font-bold tracking-wider'>
                {transaction ? "[EDIT] TRANSACTION" : "[NEW] TRANSACTION"}
              </h3>
            )}
        </div>

        {/* Content area with two sliding panels */}
        <div className='flex-1 relative overflow-hidden'>
          {/* Form Panel */}
          <div
            className={`absolute inset-0 transition-transform duration-300 ${
              currentView === "linkSelector"
                ? "-translate-x-full"
                : "translate-x-0"
            }`}
          >
            <form
              onSubmit={handleSubmit}
              className='h-full overflow-y-auto p-6 space-y-4'
            >
              {/* Transaction Type Selector */}
              <div>
                <label className='mono text-xs text-muted-foreground tracking-wider block mb-2'>
                  TRANSACTION_TYPE *
                </label>
                <div className='grid grid-cols-4 gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() =>
                      setFormData({ ...formData, transaction_type: "Debit" })}
                    className={`mono text-xs ${
                      formData.transaction_type === "Debit"
                        ? "bg-red-900/30 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:bg-red-900/40"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    DEBIT
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() =>
                      setFormData({
                        ...formData,
                        transaction_type: "TransferOut",
                      })}
                    className={`mono text-xs ${
                      formData.transaction_type === "TransferOut"
                        ? "bg-red-900/30 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:bg-red-900/40"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    TRANSFER_OUT
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() =>
                      setFormData({ ...formData, transaction_type: "Credit" })}
                    className={`mono text-xs ${
                      formData.transaction_type === "Credit"
                        ? "bg-green-900/30 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)] hover:bg-green-900/40"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    CREDIT
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() =>
                      setFormData({
                        ...formData,
                        transaction_type: "TransferIn",
                      })}
                    className={`mono text-xs ${
                      formData.transaction_type === "TransferIn"
                        ? "bg-green-900/30 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)] hover:bg-green-900/40"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    TRANSFER_IN
                  </Button>
                </div>
              </div>

              {/* Conditional Account Fields */}
              {formData.transaction_type === "TransferOut" ||
              formData.transaction_type === "TransferIn"
                ? (
                  <>
                    <div>
                      <label
                        htmlFor='source-account'
                        className='mono text-xs text-muted-foreground tracking-wider block mb-2'
                      >
                        SOURCE_ACCOUNT *
                      </label>
                      <select
                        id='source-account'
                        required
                        value={formData.source_account_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            source_account_id: e.target.value,
                          })}
                        className='w-full px-3 py-2 bg-background/50 border border-border rounded mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50'
                      >
                        <option value=''>SELECT_SOURCE_ACCOUNT</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor='target-account'
                        className='mono text-xs text-muted-foreground tracking-wider block mb-2'
                      >
                        TARGET_ACCOUNT *
                      </label>
                      <select
                        id='target-account'
                        required
                        value={formData.target_account_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            target_account_id: e.target.value,
                          })}
                        className='w-full px-3 py-2 bg-background/50 border border-border rounded mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50'
                      >
                        <option value=''>SELECT_TARGET_ACCOUNT</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )
                : (
                  <div>
                    <label
                      htmlFor='account'
                      className='mono text-xs text-muted-foreground tracking-wider block mb-2'
                    >
                      ACCOUNT *
                    </label>
                    <select
                      id='account'
                      required
                      value={
                        formData.transaction_type === "Debit"
                          ? formData.source_account_id
                          : formData.target_account_id
                      }
                      onChange={(e) => {
                        if (formData.transaction_type === "Debit") {
                          setFormData({
                            ...formData,
                            source_account_id: e.target.value,
                          });
                        } else {
                          setFormData({
                            ...formData,
                            target_account_id: e.target.value,
                          });
                        }
                      }}
                      className='w-full px-3 py-2 bg-background/50 border border-border rounded mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50'
                    >
                      <option value=''>SELECT_AN_ACCOUNT</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              <div>
                <label
                  htmlFor='transaction-description'
                  className='mono text-xs text-muted-foreground tracking-wider block mb-2'
                >
                  DESCRIPTION *
                </label>
                <input
                  type='text'
                  id='transaction-description'
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })}
                  className='w-full px-3 py-2 bg-background/50 border border-border rounded mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50'
                  placeholder='TRANSACTION_DESCRIPTION'
                />
              </div>

              <div>
                <label
                  htmlFor='amount'
                  className='mono text-xs text-muted-foreground tracking-wider block mb-2'
                >
                  AMOUNT *
                </label>
                <div className='relative'>
                  <span className='absolute left-3 top-2 mono text-xs text-muted-foreground'>
                    {getCurrencySymbolForAccount()}
                  </span>
                  <input
                    type='number'
                    id='amount'
                    required
                    step='0.01'
                    min='0'
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })}
                    className='w-full pl-8 pr-3 py-2 bg-background/50 border border-border rounded mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50'
                    placeholder='0.00'
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor='category'
                  className='mono text-xs text-muted-foreground tracking-wider block mb-2'
                >
                  CATEGORY *
                </label>
                <select
                  id='category'
                  required
                  value={formData.category_id}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className='w-full px-3 py-2 bg-background/50 border border-border rounded mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50'
                >
                  <option value=''>SELECT_A_CATEGORY</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor='date'
                  className='mono text-xs text-muted-foreground tracking-wider block mb-2'
                >
                  DATE *
                </label>
                <input
                  type='date'
                  id='date'
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })}
                  className='w-full px-3 py-2 bg-background/50 border border-border rounded mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50'
                />
              </div>

              {/* Link Selection - only show if enabled */}
              {showLinkSelection && (
                <div className='border-t border-border pt-4'>
                  <label className='mono text-xs text-muted-foreground tracking-wider block mb-2'>
                    LINK_TO_TRANSACTION
                  </label>
                  {selectedLinkTransactionId
                    ? (
                      <div className='space-y-2'>
                        <div className='flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded'>
                          <div className='flex-1 min-w-0'>
                            <div className='text-sm text-primary-foreground truncate'>
                              {
                                allTransactions.find(
                                  (t) => t.id === selectedLinkTransactionId
                                )?.description
                              }
                            </div>
                            <div className='mono text-xs text-muted-foreground mt-1'>
                              {allTransactions.find(
                                (t) => t.id === selectedLinkTransactionId
                              ) && (
                                <>
                                  {new Date(
                                    allTransactions.find(
                                      (t) => t.id === selectedLinkTransactionId
                                    )!.date
                                  ).toLocaleDateString()}{" "}
                                  - $
                                  {allTransactions
                                    .find(
                                      (t) => t.id === selectedLinkTransactionId
                                    )!
                                    .amount.toFixed(2)}
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => setSelectedLinkTransactionId(null)}
                            className='mono text-[10px] text-destructive'
                          >
                            ✕
                          </Button>
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => setCurrentView("linkSelector")}
                          className='mono w-full justify-between text-xs'
                        >
                          <span>[CHANGE] LINKED TRANSACTION</span>
                          <span>→</span>
                        </Button>
                      </div>
                    )
                    : (
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => setCurrentView("linkSelector")}
                        className='mono w-full justify-between text-xs'
                      >
                        <span>[SELECT] TRANSACTION</span>
                        <span>→</span>
                      </Button>
                    )}
                </div>
              )}

              <div className='flex justify-end space-x-3 pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={onClose}
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
                  {submitting
                    ? "PROCESSING..."
                    : transaction
                      ? "UPDATE"
                      : "CREATE"}
                </Button>
              </div>
            </form>
          </div>

          {/* Link Selector Panel */}
          <div
            className={`absolute inset-0 transition-transform duration-300 ${
              currentView === "linkSelector"
                ? "translate-x-0"
                : "translate-x-full"
            }`}
          >
            <div className='h-full overflow-hidden flex flex-col'>
              {/* Date filter checkbox at top */}
              <div className='px-6 pt-6 pb-2 flex-shrink-0'>
                {formData.date && (
                  <div className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      id='filterByDate'
                      checked={filterByDate}
                      onChange={(e) => setFilterByDate(e.target.checked)}
                      className='w-4 h-4'
                    />
                    <label
                      htmlFor='filterByDate'
                      className='mono text-xs text-muted-foreground cursor-pointer'
                    >
                      Only show transactions from{" "}
                      {new Date(formData.date).toLocaleDateString()}
                    </label>
                  </div>
                )}
              </div>

              {/* Full TransactionTable */}
              <div className='flex-1 overflow-y-auto px-6 pb-6'>
                <div className='overflow-x-auto'>
                  <TransactionTable
                    transactions={getFilteredTransactions()}
                    accounts={accounts}
                    showAccountFilter
                    selectedAccountFilter={linkModalAccountFilter}
                    onAccountFilterChange={setLinkModalAccountFilter}
                    showSearchFilter
                    searchQuery={linkSearchQuery}
                    onSearchChange={setLinkSearchQuery}
                    showLinkColumn={false}
                    showAccountsColumn={false}
                    showCategoryColumn={false}
                    maxRows={100}
                    actionType='select'
                    onSelectTransaction={(id) => {
                      setSelectedLinkTransactionId(id);
                      setCurrentView("form");
                    }}
                    filterUnlinkedOnly
                    emptyStateMessage='NO UNLINKED TRANSACTIONS FOUND'
                  />
                </div>
              </div>

              {/* Record count footer */}
              <div className='px-6 py-3 border-t border-border bg-muted/30 flex-shrink-0'>
                <div className='mono text-[10px] text-muted-foreground'>
                  SHOWING{" "}
                  {
                    getFilteredTransactions()
                      .filter((t) => !t.link)
                      .filter(
                        (t) =>
                          linkSearchQuery === "" ||
                          t.description
                            .toLowerCase()
                            .includes(linkSearchQuery.toLowerCase())
                      )
                      .slice(0, 100).length
                  }{" "}
                  UNLINKED RECORDS
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
