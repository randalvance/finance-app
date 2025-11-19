import { NextRequest, NextResponse } from 'next/server';
import { AccountService } from '@/services/accountService';

export async function GET() {
  try {
    const accounts = await AccountService.getAllAccounts();
    
    // Enrich accounts with expense counts and totals
    const enrichedAccounts = await Promise.all(
      accounts.map(async (account) => {
        const expenseCount = await AccountService.getAccountExpenseCount(account.id);
        const totalAmount = await AccountService.getAccountTotalAmount(account.id);
        return {
          ...account,
          expenseCount,
          totalAmount,
        };
      })
    );
    
    return NextResponse.json(enrichedAccounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
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
        { error: 'Account name is required' },
        { status: 400 }
      );
    }

    const account = await AccountService.createAccount({
      name,
      description,
      color,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
