import { NextRequest, NextResponse } from 'next/server';
import { LedgerService } from '@/services/ledgerService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ledgerId = parseInt(id);
    
    if (isNaN(ledgerId)) {
      return NextResponse.json(
        { error: 'Invalid ledger ID' },
        { status: 400 }
      );
    }

    const ledger = await LedgerService.getLedgerById(ledgerId);
    if (!ledger) {
      return NextResponse.json(
        { error: 'Ledger not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(ledger);
  } catch (error) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ledgerId = parseInt(id);
    
    if (isNaN(ledgerId)) {
      return NextResponse.json(
        { error: 'Invalid ledger ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const ledger = await LedgerService.updateLedger({ id: ledgerId, ...body });

    return NextResponse.json(ledger);
  } catch (error) {
    console.error('Error updating ledger:', error);
    return NextResponse.json(
      { error: 'Failed to update ledger' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ledgerId = parseInt(id);
    
    if (isNaN(ledgerId)) {
      return NextResponse.json(
        { error: 'Invalid ledger ID' },
        { status: 400 }
      );
    }

    const deleted = await LedgerService.deleteLedger(ledgerId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Ledger not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Ledger deleted successfully' });
  } catch (error) {
    console.error('Error deleting ledger:', error);
    return NextResponse.json(
      { error: 'Failed to delete ledger. Make sure there are no expenses associated with it.' },
      { status: 500 }
    );
  }
}
