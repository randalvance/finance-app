'use client';

interface Account {
  id: number;
  name: string;
  color: string;
}

interface Category {
  id: number;
  name: string;
  color: string | null;
}

interface Transaction {
  id: number;
  transactionType: 'Debit' | 'Credit' | 'Transfer';
  sourceAccountId: number | null;
  targetAccountId: number | null;
  description: string;
  amount: number;
  categoryId: number;
  category?: Category;
  date: string;
  createdAt: string;
  sourceAccount?: Account;
  targetAccount?: Account;
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

type ActionType = 'select' | 'view' | 'edit' | 'none';

interface TransactionTableProps {
  transactions: Transaction[];
  accounts?: Array<{ id: number; name: string }>;
  
  // Filtering
  showAccountFilter?: boolean;
  selectedAccountFilter?: number | null;
  onAccountFilterChange?: (accountId: number | null) => void;
  
  showSearchFilter?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  
  // Display options
  showLinkColumn?: boolean;
  showAccountsColumn?: boolean;
  maxRows?: number;
  emptyStateMessage?: string;
  
  // Actions
  actionType?: ActionType;
  onSelectTransaction?: (transactionId: number) => void;
  editable?: boolean;
  onEditRequested?: (transaction: Transaction) => void;
  onDataChanged?: () => void;
  
  // Additional filters
  filterUnlinkedOnly?: boolean;
  customFilter?: (transaction: Transaction) => boolean;
}

const getTransactionTypeBadge = (type: 'Debit' | 'Credit' | 'Transfer') => {
  const styles = {
    Debit: 'bg-red-900 text-red-200 border-red-700',
    Credit: 'bg-green-900 text-green-200 border-green-700',
    Transfer: 'bg-blue-900 text-blue-200 border-blue-700',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded border ${styles[type]}`}>
      {type}
    </span>
  );
};

export default function TransactionTable({
  transactions,
  accounts = [],
  showAccountFilter = false,
  selectedAccountFilter = null,
  onAccountFilterChange,
  showSearchFilter = false,
  searchQuery = '',
  onSearchChange,
  showLinkColumn = false,
  showAccountsColumn = true,
  maxRows,
  emptyStateMessage = 'No transactions found',
  actionType = 'none',
  onSelectTransaction,
  editable = false,
  onEditRequested,
  onDataChanged,
  filterUnlinkedOnly = false,
  customFilter,
}: TransactionTableProps) {
  const handleDelete = async (transaction: Transaction) => {
    // Check if transaction is linked
    if (transaction.link) {
      if (!confirm('This transaction is linked. Deleting will unlink it. Continue?')) {
        return;
      }
      
      // Unlink first
      try {
        const unlinkResponse = await fetch(`/api/transactions/links/${transaction.link.id}`, {
          method: 'DELETE',
        });
        
        if (!unlinkResponse.ok) {
          alert('Failed to unlink transaction');
          return;
        }
      } catch (error) {
        console.error('Error unlinking transaction:', error);
        alert('Failed to unlink transaction');
        return;
      }
    } else {
      // Regular confirmation for non-linked transactions
      if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
      }
    }

    // Delete the transaction
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDataChanged?.();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };
  // Apply filters
  let filteredTransactions = transactions;

  if (filterUnlinkedOnly) {
    filteredTransactions = filteredTransactions.filter(t => !t.link);
  }

  if (searchQuery) {
    filteredTransactions = filteredTransactions.filter(t =>
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (customFilter) {
    filteredTransactions = filteredTransactions.filter(customFilter);
  }

  if (maxRows) {
    filteredTransactions = filteredTransactions.slice(0, maxRows);
  }

  return (
    <div className="space-y-4">
      {/* Filters - Always visible when enabled */}
      {(showAccountFilter || showSearchFilter) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Account Filter */}
          {showAccountFilter && onAccountFilterChange && (
            <div className="flex-1">
              <label htmlFor="account-filter" className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Account
              </label>
              <select
                id="account-filter"
                value={selectedAccountFilter ?? ''}
                onChange={(e) => onAccountFilterChange(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Filter */}
          {showSearchFilter && onSearchChange && (
            <div className="flex-1">
              <label htmlFor="search-filter" className="block text-sm font-medium text-gray-300 mb-2">
                Search
              </label>
              <input
                id="search-filter"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by description..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Table or Empty State */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-12 text-center">
          {transactions.length === 0 && !searchQuery && !selectedAccountFilter ? (
            // Completely empty - no transactions at all
            <>
              <div className="text-gray-600 text-6xl mb-4">💰</div>
              <h3 className="text-lg font-medium text-gray-200 mb-2">No transactions yet</h3>
              <p className="text-gray-400">{emptyStateMessage}</p>
            </>
          ) : (
            // Filtered results are empty
            <p className="text-gray-400">{emptyStateMessage}</p>
          )}
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
                {showAccountsColumn && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Accounts
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                {showLinkColumn && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Link
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                {(actionType !== 'none' || editable) && (
                  <th className="px-6 py-3 text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTransactionTypeBadge(transaction.transactionType)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-100">{transaction.description}</div>
                  </td>
                  {showAccountsColumn && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.transactionType === 'Debit' && transaction.sourceAccount && (
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: transaction.sourceAccount.color }}
                          />
                          <span className="text-sm text-gray-300">{transaction.sourceAccount.name}</span>
                        </div>
                      )}
                      {transaction.transactionType === 'Credit' && transaction.targetAccount && (
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: transaction.targetAccount.color }}
                          />
                          <span className="text-sm text-gray-300">{transaction.targetAccount.name}</span>
                        </div>
                      )}
                      {transaction.transactionType === 'Transfer' && transaction.sourceAccount && transaction.targetAccount && (
                        <div className="flex items-center space-x-1 text-sm">
                          <div className="flex items-center space-x-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: transaction.sourceAccount.color }}
                            />
                            <span className="text-gray-300">{transaction.sourceAccount.name}</span>
                          </div>
                          <span className="text-gray-500">→</span>
                          <div className="flex items-center space-x-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: transaction.targetAccount.color }}
                            />
                            <span className="text-gray-300">{transaction.targetAccount.name}</span>
                          </div>
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-400">
                      {transaction.category?.name || 'Uncategorized'}
                    </span>
                  </td>
                  {showLinkColumn && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {transaction.link && (
                        <span className="text-blue-400 cursor-help" title="Linked transaction">
                          🔗
                        </span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`text-sm font-medium ${
                        transaction.transactionType === 'Credit'
                          ? 'text-green-400'
                          : transaction.transactionType === 'Debit'
                          ? 'text-red-400'
                          : 'text-blue-400'
                      }`}
                    >
                      ${transaction.amount.toFixed(2)}
                    </span>
                  </td>
                  {actionType === 'select' && onSelectTransaction && (
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onSelectTransaction(transaction.id)}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Select
                      </button>
                    </td>
                  )}
                  {editable && (
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => onEditRequested?.(transaction)}
                        className="text-blue-400 hover:text-blue-300 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(transaction)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
