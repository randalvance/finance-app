import { NextResponse } from 'next/server';
import { CategoryService } from '@/services/categoryService';
import { requireAuth } from '@/lib/auth';
import { TransactionType } from '@/types/transaction';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await context.params;
    const category = await CategoryService.getCategoryById(parseInt(id), userId);
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await context.params;
    const body = await request.json();

    const updateData: {
      id: number;
      name?: string;
      color?: string;
      defaultTransactionType?: TransactionType;
    } = {
      id: parseInt(id),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.default_transaction_type !== undefined || body.defaultTransactionType !== undefined) {
      updateData.defaultTransactionType = (body.default_transaction_type || body.defaultTransactionType) as TransactionType;
    }

    const category = await CategoryService.updateCategory(updateData, userId);

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await context.params;
    const success = await CategoryService.deleteCategory(parseInt(id), userId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
