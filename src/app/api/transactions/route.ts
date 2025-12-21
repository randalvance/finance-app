import { NextRequest, NextResponse } from 'next/server';
import { TransactionService } from '@/services/TransactionService';
import { requireAuth } from '@/lib/auth';
import { CreateTransactionData } from '@/types/transaction';

export async function GET() {
  try {
    const userId = await requireAuth();
    const transactions = await TransactionService.getAllTransactions(userId);
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
      date
    } = body;

    // Validate required fields
    if (!transaction_type || !description || !amount || !category || !date) {
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

    // Build transaction data based on type
    const transactionData: CreateTransactionData = {
      userId,
      transactionType: transaction_type,
      sourceAccountId: source_account_id ? Number(source_account_id) : undefined,
      targetAccountId: target_account_id ? Number(target_account_id) : undefined,
      description,
      amount: Number(amount),
      category,
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
