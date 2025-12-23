import { NextRequest, NextResponse } from 'next/server';
import { TransactionService } from '@/services/TransactionService';
import { CategoryService } from '@/services/categoryService';
import { requireAuth } from '@/lib/auth';
import { CreateTransactionData } from '@/types/transaction';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    const transactions = await TransactionService.getAllTransactionsWithLinks(
      userId,
      accountId ? parseInt(accountId) : undefined
    );

    return NextResponse.json(transactions);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const {
      transaction_type,
      source_account_id,
      target_account_id,
      description,
      amount,
      category,
      category_id,
      date
    } = body;

    // Validate required fields
    if (!transaction_type || !description || !amount || (!category && !category_id) || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate transaction type
    if (!['Debit', 'Credit', 'Transfer'].includes(transaction_type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type. Must be Debit, Credit, or Transfer' },
        { status: 400 }
      );
    }

    // Handle category - accept either ID or name
    let categoryId: number;
    if (category_id) {
      categoryId = Number(category_id);
    } else if (category) {
      // Look up category by name
      const categories = await CategoryService.getAllCategories(userId);
      const foundCategory = categories.find(c => c.name === category);
      if (!foundCategory) {
        return NextResponse.json(
          { error: `Category not found: ${category}` },
          { status: 400 }
        );
      }
      categoryId = foundCategory.id;
    } else {
      return NextResponse.json(
        { error: 'Either category or category_id is required' },
        { status: 400 }
      );
    }

    // Build transaction data based on type
    const transactionData: CreateTransactionData = {
      userId,
      transactionType: transaction_type,
      sourceAccountId: source_account_id ? Number(source_account_id) : undefined,
      targetAccountId: target_account_id ? Number(target_account_id) : undefined,
      description,
      amount: Number(amount),
      categoryId,
      date,
    } as CreateTransactionData;

    const transaction = await TransactionService.createTransaction(transactionData);
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Validation errors from TransactionService
      if (error.message.includes('require') || error.message.includes('must be different')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
