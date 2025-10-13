import { NextResponse } from 'next/server';
import { ExpenseService } from '@/services/expenseService';

export async function GET() {
  try {
    const categories = await ExpenseService.getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}