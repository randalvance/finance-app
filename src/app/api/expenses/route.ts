import { NextRequest, NextResponse } from 'next/server';
import { ExpenseService } from '@/services/expenseService';

export async function GET() {
  try {
    const expenses = await ExpenseService.getAllExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, amount, category, date } = body;

    if (!description || !amount || !category || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const expense = await ExpenseService.createExpense({
      description,
      amount: parseFloat(amount),
      category,
      date,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}