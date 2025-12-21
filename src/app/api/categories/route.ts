import { NextResponse } from 'next/server';
import { CategoryService } from '@/services/categoryService';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await requireAuth();
    const categories = await CategoryService.getAllCategories(userId);
    return NextResponse.json(categories);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const category = await CategoryService.createCategory({
      userId,
      ...body
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}