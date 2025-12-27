"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Computation {
  id: number;
  name: string;
  description: string | null;
  transactionCount: number;
  createdAt: string;
}

export default function ComputationsPage () {
  const { data: computations, error, mutate } = useSWR<Computation[]>("/api/computations", fetcher);
  const [showModal, setShowModal] = useState(false);
  const [editingComputation, setEditingComputation] = useState<Computation | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleOpenModal = (computation?: Computation) => {
    if (computation) {
      setEditingComputation(computation);
      setFormData({
        name: computation.name,
        description: computation.description || "",
      });
    } else {
      setEditingComputation(null);
      setFormData({
        name: "",
        description: "",
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingComputation
        ? `/api/computations/${editingComputation.id}`
        : "/api/computations";
      const method = editingComputation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save computation");

      await mutate();
      setShowModal(false);
    } catch (err) {
      console.error("Error saving computation:", err);
      alert("Failed to save computation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this computation?")) return;

    try {
      const response = await fetch(`/api/computations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete computation");

      await mutate();
    } catch (err) {
      console.error("Error deleting computation:", err);
      alert("Failed to delete computation");
    }
  };

  if (error) return <div className='p-8 text-destructive'>Failed to load computations</div>;
  if (!computations) return <div className='p-8 mono text-xs animate-pulse'>LOADING_COMPUTATIONS...</div>;

  return (
    <div className='container mx-auto py-8 space-y-8'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='mono text-2xl font-bold tracking-tighter'>COMPUTATIONS</h1>
          <p className='mono text-xs text-muted-foreground mt-1'>MANAGE_SAVED_CALCULATIONS</p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className='mono text-xs tracking-widest'
        >
          [+] NEW_COMPUTATION
        </Button>
      </div>

      <Card className='glass-card border-border/50'>
        <CardContent className='p-0'>
          <Table>
            <TableHeader className='bg-muted/30'>
              <TableRow className='hover:bg-transparent border-b border-border/50'>
                <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest px-6'>NAME</TableHead>
                <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest px-6'>DESCRIPTION</TableHead>
                <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest px-6 text-center'>TRANSACTIONS</TableHead>
                <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest px-6'>CREATED</TableHead>
                <TableHead className='mono text-[10px] font-bold text-primary uppercase tracking-widest px-6 text-right'>ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {computations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='text-center py-12 mono text-xs text-muted-foreground'>
                    NO_COMPUTATIONS_FOUND
                  </TableCell>
                </TableRow>
              ) : (
                computations.map((comp) => (
                  <TableRow key={comp.id} className='hover:bg-primary/5 border-b border-border/30 transition-colors'>
                    <TableCell className='px-6 py-4'>
                      <Link
                        href={`/computations/${comp.id}`}
                        className='mono text-sm font-bold hover:text-primary transition-colors'
                      >
                        {comp.name}
                      </Link>
                    </TableCell>
                    <TableCell className='px-6 py-4 mono text-xs text-muted-foreground'>
                      {comp.description || "-"}
                    </TableCell>
                    <TableCell className='px-6 py-4 text-center'>
                      <span className='mono text-xs bg-primary/10 text-primary px-2 py-1 rounded'>
                        {comp.transactionCount}
                      </span>
                    </TableCell>
                    <TableCell className='px-6 py-4 mono text-xs text-muted-foreground'>
                      {new Date(comp.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className='px-6 py-4 text-right space-x-2'>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='mono text-[10px] h-7 px-2'
                        asChild
                      >
                        <Link href={`/computations/${comp.id}`}>[VIEW]</Link>
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='mono text-[10px] h-7 px-2'
                        onClick={() => handleOpenModal(comp)}
                      >
                        [EDIT]
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='mono text-[10px] h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10'
                        onClick={() => handleDelete(comp.id)}
                      >
                        [DELETE]
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showModal && (
        <div className='fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <Card className='w-full max-w-md glass-card border-primary/20 shadow-2xl'>
            <CardHeader className='border-b border-border/50'>
              <CardTitle className='mono text-sm font-bold tracking-widest'>
                {editingComputation ? "EDIT_COMPUTATION" : "NEW_COMPUTATION"}
              </CardTitle>
            </CardHeader>
            <CardContent className='p-6'>
              <form onSubmit={handleSubmit} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name' className='mono text-[10px] uppercase tracking-widest text-muted-foreground'>NAME</Label>
                  <Input
                    id='name'
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className='mono text-sm bg-muted/30 border-border/50'
                    placeholder='e.g. Project X Expenses'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='description' className='mono text-[10px] uppercase tracking-widest text-muted-foreground'>DESCRIPTION</Label>
                  <Input
                    id='description'
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className='mono text-sm bg-muted/30 border-border/50'
                    placeholder='Optional details...'
                  />
                </div>
                <div className='flex justify-end space-x-3 pt-4'>
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => setShowModal(false)}
                    className='mono text-xs'
                  >
                    [CANCEL]
                  </Button>
                  <Button
                    type='submit'
                    disabled={submitting}
                    className='mono text-xs'
                  >
                    {submitting ? "SAVING..." : "[SAVE_COMPUTATION]"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
