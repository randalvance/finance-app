import { NextRequest, NextResponse } from 'next/server';
import { ExpenseService } from '@/services/expenseService';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await requireAuth();
    const expenses = await ExpenseService.getAllExpenses(userId);
    return NextResponse.json(expenses);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const { account_id, description, amount, category, date } = body;

    if (!account_id || !description || !amount || !category || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const expense = await ExpenseService.createExpense({
      userId,
      accountId: parseInt(account_id),
      description,
      amount: parseFloat(amount),
      category,
      date,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}