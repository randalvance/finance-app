"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAvailableCurrencies } from "@/lib/currency";
import type { Currency } from "@/db/schema";

interface Account {
  id: number;
  name: string;
  color: string;
  currency: string;
}

interface BalanceEntry {
  id: number;
  date: string;
  currency: string;
  amount: number;
  createdAt: string;
}

export default function BalanceHistoryPage () {
  const router = useRouter();
  const params = useParams();
  const accountId = parseInt(params.id as string);

  const [account, setAccount] = useState<Account | null>(null);
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBalance, setEditingBalance] = useState<BalanceEntry | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    currency: "USD" as Currency,
    amount: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAccount = useCallback(async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setAccount(data);
      } else {
        alert("Account not found");
        router.push("/admin");
      }
    } catch (error) {
      console.error("Error fetching account:", error);
      alert("Failed to load account");
      router.push("/admin");
    }
  }, [accountId, router]);

  const fetchBalances = useCallback(async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/balances`);
      if (response.ok) {
        const data = await response.json();
        setBalances(data);
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (!isNaN(accountId)) {
      fetchAccount();
      fetchBalances();
    }
  }, [accountId, fetchAccount, fetchBalances]);

  const openModal = (balance?: BalanceEntry) => {
    if (balance) {
      setEditingBalance(balance);
      setFormData({
        date: balance.date,
        currency: balance.currency as Currency,
        amount: balance.amount.toString()
      });
    } else {
      setEditingBalance(null);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        currency: "USD" as Currency,
        amount: ""
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingBalance
        ? `/api/accounts/${accountId}/balances/${editingBalance.id}`
        : `/api/accounts/${accountId}/balances`;

      const response = await fetch(url, {
        method: editingBalance ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: formData.date,
          currency: formData.currency,
          amount: parseFloat(formData.amount),
        }),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingBalance(null);
        setFormData({ date: new Date().toISOString().split("T")[0], currency: "USD", amount: "" });
        fetchBalances();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save balance");
      }
    } catch (error) {
      console.error("Error saving balance:", error);
      alert("Failed to save balance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this balance entry?")) return;

    try {
      const response = await fetch(`/api/accounts/${accountId}/balances/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchBalances();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete balance");
      }
    } catch (error) {
      console.error("Error deleting balance:", error);
      alert("Failed to delete balance");
    }
  };

  if (loading) {
    return (
      <main className='max-w-[1600px] mx-auto px-6 py-8'>
        <div className='glass-card rounded-lg p-12 text-center'>
          <div className='mono text-sm text-muted-foreground animate-pulse'>LOADING_DATA...</div>
        </div>
      </main>
    );
  }

  if (!account) {
    return (
      <main className='max-w-[1600px] mx-auto px-6 py-8'>
        <div className='glass-card rounded-lg p-12 text-center'>
          <div className='mono text-sm text-destructive'>ACCOUNT_NOT_FOUND</div>
        </div>
      </main>
    );
  }

  const latestBalance = balances.length > 0 ? balances[0].amount : 0;

  return (
    <main className='max-w-[1600px] mx-auto px-6 py-8'>
      {/* Back Button */}
      <div className='mb-8'>
        <button
          onClick={() => router.push("/admin")}
          className='mono text-xs px-4 py-2 text-primary hover:bg-primary/10 rounded border border-primary/30 hover:border-primary transition-all'
        >
          ← BACK_TO_ADMIN
        </button>
      </div>

      {/* Account Info Card */}
      <div className='glass-card rounded-lg border border-border p-6 mb-8'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <div
              className='w-8 h-8 rounded-full'
              style={{ backgroundColor: account.color }}
            />
            <div>
              <h1 className='mono text-lg font-bold text-foreground'>{account.name}</h1>
              <p className='mono text-xs text-muted-foreground mt-1'>INVESTMENT_ACCOUNT</p>
            </div>
          </div>
          <div className='text-right'>
            <div className='mono text-2xl font-bold text-foreground'>
              {latestBalance.toFixed(2)} {account.currency}
            </div>
            <p className='mono text-xs text-muted-foreground mt-1'>LATEST_BALANCE</p>
          </div>
        </div>
      </div>

      {/* Balance History Section */}
      <div className='animate-slide-up-fade'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h2 className='mono text-sm font-bold tracking-wider text-primary'>BALANCE_HISTORY</h2>
            <p className='mono text-xs text-muted-foreground mt-1'>{balances.length} ENTRIES</p>
          </div>
          <Button
            onClick={() => openModal()}
            className='mono text-xs font-bold tracking-wider terminal-border bg-primary hover:bg-primary/90'
          >
            [+] ADD_BALANCE
          </Button>
        </div>

        {balances.length === 0 ? (
          <div className='glass-card rounded-lg border border-border p-12 text-center'>
            <div className='mono text-sm text-muted-foreground'>NO_BALANCE_ENTRIES</div>
            <p className='mono text-xs text-muted-foreground mt-2'>Add your first balance entry to get started</p>
          </div>
        ) : (
          <div className='glass-card rounded-lg border border-border overflow-hidden'>
            <Table>
              <TableHeader className='glass bg-muted/30 border-b border-primary/20'>
                <TableRow className='border-border/50 hover:bg-muted/30'>
                  <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest'>DATE</TableHead>
                  <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest'>CURRENCY</TableHead>
                  <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest text-right'>AMOUNT</TableHead>
                  <TableHead className='mono text-[10px] text-center font-bold text-primary uppercase tracking-widest'>ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='divide-y divide-border/30'>
                {balances.map((balance) => (
                  <TableRow key={balance.id} className='hover:bg-primary/5 transition-all duration-200 group'>
                    <TableCell>
                      <span className='text-sm font-medium text-foreground'>{new Date(balance.date).toLocaleDateString()}</span>
                    </TableCell>
                    <TableCell>
                      <span className='text-sm text-muted-foreground'>{balance.currency}</span>
                    </TableCell>
                    <TableCell>
                      <span className='text-sm font-medium text-foreground text-right block'>{balance.amount.toFixed(2)}</span>
                    </TableCell>
                    <TableCell className='text-center'>
                      <button
                        onClick={() => openModal(balance)}
                        className='mono text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded border border-primary/30 hover:border-primary transition-all mr-2'
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDelete(balance.id)}
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

      {/* Balance Modal */}
      {showModal && (
        <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='frosted-glass rounded-lg shadow-2xl max-w-md w-full animate-slide-up-fade'>
            <div className='px-6 py-4 border-b-2 border-primary/30 bg-primary/5'>
              <h3 className='mono text-sm font-bold tracking-wider'>
                {editingBalance ? "[EDIT] BALANCE" : "[NEW] BALANCE"}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className='p-6 space-y-4'>
              <div>
                <label htmlFor='balance-date' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  DATE *
                </label>
                <input
                  type='date'
                  id='balance-date'
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className='w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                />
              </div>

              <div>
                <label htmlFor='balance-currency' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  CURRENCY *
                </label>
                <select
                  id='balance-currency'
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
                  className='mono w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                >
                  {getAvailableCurrencies().map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.name} ({curr.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor='balance-amount' className='mono block text-[10px] font-bold text-primary mb-2 tracking-widest'>
                  AMOUNT *
                </label>
                <input
                  type='number'
                  id='balance-amount'
                  required
                  step='0.01'
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className='w-full px-3 py-2 bg-input border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                  placeholder='0.00'
                />
              </div>

              <div className='flex justify-end space-x-3 pt-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setShowModal(false);
                    setEditingBalance(null);
                    setFormData({ date: new Date().toISOString().split("T")[0], currency: "USD", amount: "" });
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
                  {submitting ? "PROCESSING..." : editingBalance ? "UPDATE" : "CREATE"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
