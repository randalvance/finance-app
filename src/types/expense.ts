export interface Expense {
  id: number;
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

export interface CreateExpenseData {
  description: string;
  amount: number;
  category: string;
  date: string;
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  id: number;
}