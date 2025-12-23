import { NextRequest, NextResponse } from 'next/server';
import { TransactionService } from '@/services/TransactionService';
import { CategoryService } from '@/services/categoryService';
import { requireAuth } from '@/lib/auth';
import { TransactionType } from '@/types/transaction';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    const transaction = await TransactionService.getTransactionById(id, userId);
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Convert snake_case to camelCase for update
    const updateData: {
      id: number;
      transactionType?: TransactionType;
      sourceAccountId?: number | null;
      targetAccountId?: number | null;
      description?: string;
      amount?: number;
      categoryId?: number;
      date?: string;
    } = { id };

    if (body.transaction_type !== undefined) updateData.transactionType = body.transaction_type as TransactionType;
    if (body.source_account_id !== undefined) updateData.sourceAccountId = body.source_account_id ? parseInt(body.source_account_id) : null;
    if (body.target_account_id !== undefined) updateData.targetAccountId = body.target_account_id ? parseInt(body.target_account_id) : null;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
    if (body.date !== undefined) updateData.date = body.date;

    // Handle category - accept either ID or name
    if (body.category_id !== undefined) {
      updateData.categoryId = parseInt(body.category_id);
    } else if (body.category !== undefined) {
      // Look up category by name
      const categories = await CategoryService.getAllCategories(userId);
      const foundCategory = categories.find(c => c.name === body.category);
      if (!foundCategory) {
        return NextResponse.json(
          { error: `Category not found: ${body.category}` },
          { status: 400 }
        );
      }
      updateData.categoryId = foundCategory.id;
    }

    const transaction = await TransactionService.updateTransaction(updateData, userId);

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Validation errors
      if (error.message.includes('require') || error.message.includes('must be different')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    const deleted = await TransactionService.deleteTransaction(id, userId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
