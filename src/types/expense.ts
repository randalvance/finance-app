export interface Account {
  id: number;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  account_id: number;
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

export interface CreateAccountData {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateAccountData extends Partial<CreateAccountData> {
  id: number;
}

export interface CreateExpenseData {
  account_id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  id: number;
}