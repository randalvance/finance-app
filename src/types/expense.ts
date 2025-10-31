export interface Ledger {
  id: number;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  ledger_id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface CreateLedgerData {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateLedgerData extends Partial<CreateLedgerData> {
  id: number;
}

export interface CreateExpenseData {
  ledger_id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  id: number;
}