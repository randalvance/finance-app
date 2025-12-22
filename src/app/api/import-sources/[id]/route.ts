import { NextRequest, NextResponse } from 'next/server';
import { ImportSourceService } from '@/services/ImportSourceService';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const source = await ImportSourceService.getImportSourceWithAccounts(id, userId);
    if (!source) {
      return NextResponse.json({ error: 'Import source not found' }, { status: 404 });
    }

    return NextResponse.json(source);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching import source:', error);
    return NextResponse.json({ error: 'Failed to fetch import source' }, { status: 500 });
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
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, config, account_ids } = body;

    // Validate account_ids if provided
    let accountIds: number[] | undefined;
    if (account_ids !== undefined) {
      if (!Array.isArray(account_ids)) {
        return NextResponse.json(
          { error: 'account_ids must be an array' },
          { status: 400 }
        );
      }
      accountIds = account_ids.map((id: unknown) => {
        const parsed = parseInt(String(id));
        if (isNaN(parsed)) {
          throw new Error('Invalid account ID');
        }
        return parsed;
      });
    }

    const source = await ImportSourceService.updateImportSource(
      { id, name, description, config, accountIds },
      userId
    );

    if (!source) {
      return NextResponse.json({ error: 'Import source not found' }, { status: 404 });
    }

    return NextResponse.json(source);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating import source:', error);
    return NextResponse.json({ error: 'Failed to update import source' }, { status: 500 });
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
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const success = await ImportSourceService.deleteImportSource(id, userId);
    if (!success) {
      return NextResponse.json({ error: 'Import source not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting import source:', error);
    return NextResponse.json({ error: 'Failed to delete import source' }, { status: 500 });
  }
}
