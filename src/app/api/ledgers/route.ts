import { NextRequest, NextResponse } from 'next/server';
import { LedgerService } from '@/services/ledgerService';

export async function GET() {
  try {
    const ledgers = await LedgerService.getAllLedgers();
    
    // Enrich ledgers with expense counts and totals
    const enrichedLedgers = await Promise.all(
      ledgers.map(async (ledger) => {
        const expenseCount = await LedgerService.getLedgerExpenseCount(ledger.id);
        const totalAmount = await LedgerService.getLedgerTotalAmount(ledger.id);
        return {
          ...ledger,
          expenseCount,
          totalAmount,
        };
      })
    );
    
    return NextResponse.json(enrichedLedgers);
  } catch (error) {
    console.error('Error fetching ledgers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledgers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Ledger name is required' },
        { status: 400 }
      );
    }

    const ledger = await LedgerService.createLedger({
      name,
      description,
      color,
    });

    return NextResponse.json(ledger, { status: 201 });
  } catch (error) {
    console.error('Error creating ledger:', error);
    return NextResponse.json(
      { error: 'Failed to create ledger' },
      { status: 500 }
    );
  }
}
