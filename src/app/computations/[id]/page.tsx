"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TransactionTable from "@/components/TransactionTable";
import { formatCurrency } from "@/lib/currency";
import { ComputationWithTransactions, ComputationAggregation, Transaction } from "@/types/transaction";
import { ArrowLeft, Edit2, Save, X } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ComputationDetailPage () {
  const params = useParams();
  const id = params.id as string;

  const { data: computation, error: compError, mutate: mutateComp } = useSWR<ComputationWithTransactions>(
    `/api/computations/${id}`,
    fetcher
  );
  const { data: aggregation, error: aggError, mutate: mutateAgg } = useSWR<ComputationAggregation>(
    `/api/computations/${id}/aggregation`,
    fetcher
  );

  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  // Initialize selectedIds and excludedIds when computation data loads
  useEffect(() => {
    if (computation && !editMode) {
      setSelectedIds(new Set(computation.transactions.map(t => t.id)));
      setExcludedIds(new Set(computation.excludedTransactionIds || []));
    }
  }, [computation, editMode]);

  const handleToggleExclude = async (transactionId: number) => {
    const newExcludedIds = new Set(excludedIds);

    if (newExcludedIds.has(transactionId)) {
      newExcludedIds.delete(transactionId);
    } else {
      newExcludedIds.add(transactionId);
    }

    setExcludedIds(newExcludedIds);

    // Optimistically update UI, then sync with backend
    try {
      await fetch(`/api/computations/${id}/transactions/exclude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: transactionId,
          is_excluded: newExcludedIds.has(transactionId) ? 1 : 0
        }),
      });

      // Refresh aggregation after exclusion change
      mutateAgg();
    } catch (err) {
      console.error("Error toggling exclusion:", err);
      // Revert on error
      setExcludedIds(excludedIds);
    }
  };

  const handleSaveSelection = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/computations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_ids: Array.from(selectedIds)
        }),
      });

      if (!response.ok) throw new Error("Failed to save selection");

      await Promise.all([mutateComp(), mutateAgg()]);
      setEditMode(false);
    } catch (err) {
      console.error("Error saving selection:", err);
      alert("Failed to save selection");
    } finally {
      setSaving(false);
    }
  };

  const customFilter = useMemo(() => {
    if (editMode) return undefined; // Show all transactions in edit mode (filtered by table's internal filters)
    return (t: Transaction) => selectedIds.has(t.id);
  }, [editMode, selectedIds]);

  if (compError || aggError) return <div className='p-8 text-destructive'>Failed to load computation details</div>;
  if (!computation || !aggregation) return <div className='p-8 mono text-xs animate-pulse'>LOADING_DETAILS...</div>;

  return (
    <div className='container mx-auto py-8 space-y-8'>
      <div className='flex flex-col space-y-4'>
        <Link
          href='/computations'
          className='flex items-center text-xs mono text-muted-foreground hover:text-primary transition-colors w-fit'
        >
          <ArrowLeft className='w-3 h-3 mr-1' /> [BACK_TO_LIST]
        </Link>

        <div className='flex justify-between items-start'>
          <div>
            <h1 className='mono text-3xl font-bold tracking-tighter uppercase'>{computation.name}</h1>
            <p className='mono text-sm text-muted-foreground mt-1'>{computation.description || "NO_DESCRIPTION"}</p>
          </div>
          <div className='flex space-x-2'>
            {editMode ? (
              <>
                <Button
                  variant='outline'
                  onClick={() => setEditMode(false)}
                  className='mono text-xs'
                  disabled={saving}
                >
                  <X className='w-3 h-3 mr-2' /> [CANCEL]
                </Button>
                <Button
                  onClick={handleSaveSelection}
                  className='mono text-xs'
                  disabled={saving}
                >
                  <Save className='w-3 h-3 mr-2' /> {saving ? "SAVING..." : "[SAVE_SELECTION]"}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setEditMode(true)}
                className='mono text-xs'
              >
                <Edit2 className='w-3 h-3 mr-2' /> [EDIT_SELECTION]
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Aggregation Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card className='glass-card border-emerald-500/20 bg-emerald-500/5'>
          <CardHeader className='pb-2'>
            <CardTitle className='mono text-[10px] uppercase tracking-widest text-emerald-500'>TOTAL_CREDITS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='mono text-2xl font-bold text-emerald-500'>
              {formatCurrency(aggregation.totalCredits, "USD")}
            </div>
            <p className='mono text-[10px] text-muted-foreground mt-1'>{aggregation.creditCount} TRANSACTIONS</p>
          </CardContent>
        </Card>

        <Card className='glass-card border-rose-500/20 bg-rose-500/5'>
          <CardHeader className='pb-2'>
            <CardTitle className='mono text-[10px] uppercase tracking-widest text-rose-500'>TOTAL_DEBITS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='mono text-2xl font-bold text-rose-500'>
              {formatCurrency(aggregation.totalDebits, "USD")}
            </div>
            <p className='mono text-[10px] text-muted-foreground mt-1'>{aggregation.debitCount} TRANSACTIONS</p>
          </CardContent>
        </Card>

        <Card className={`glass-card border-border/50 ${aggregation.netBalance >= 0 ? "bg-emerald-500/5" : "bg-rose-500/5"}`}>
          <CardHeader className='pb-2'>
            <CardTitle className='mono text-[10px] uppercase tracking-widest text-muted-foreground'>NET_BALANCE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`mono text-2xl font-bold ${aggregation.netBalance >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {formatCurrency(aggregation.netBalance, "USD")}
            </div>
            <p className='mono text-[10px] text-muted-foreground mt-1'>FINAL_RESULT</p>
          </CardContent>
        </Card>

        <Card className='glass-card border-border/50 bg-primary/5'>
          <CardHeader className='pb-2'>
            <CardTitle className='mono text-[10px] uppercase tracking-widest text-primary'>TOTAL_COUNT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='mono text-2xl font-bold text-primary'>
              {aggregation.transactionCount}
            </div>
            <p className='mono text-[10px] text-muted-foreground mt-1'>
              INCLUDED
              {excludedIds.size > 0 && (
                <span className='computation-excluded-count ml-2'>
                  {excludedIds.size} EXCLUDED
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Selection Section */}
      <div className='space-y-4'>
        <div className='flex justify-between items-center'>
          <h2 className='mono text-sm font-bold tracking-widest uppercase'>
            {editMode ? "SELECT_TRANSACTIONS" : "SELECTED_TRANSACTIONS"}
          </h2>
          {editMode && (
            <div className='mono text-[10px] text-primary bg-primary/10 px-2 py-1 rounded'>
              {selectedIds.size} SELECTED
            </div>
          )}
        </div>

        <TransactionTable
          multiSelectMode={editMode}
          selectedTransactionIds={selectedIds}
          onSelectionChange={setSelectedIds}
          customFilter={customFilter}
          showAccountFilter={editMode}
          showSearchFilter={editMode}
          showDateFilter={editMode}
          emptyStateMessage={editMode ? "No transactions found matching filters" : "No transactions selected for this computation"}
          excludedTransactionIds={excludedIds}
          onToggleExclude={handleToggleExclude}
          showExcludeButton={!editMode}
        />
      </div>
    </div>
  );
}
