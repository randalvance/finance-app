import pool from '@/lib/db';
import { Expense, CreateExpenseData, UpdateExpenseData, Category } from '@/types/expense';

export class ExpenseService {
  static async getAllExpenses(): Promise<Expense[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM expenses ORDER BY date DESC, created_at DESC'
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getExpenseById(id: number): Promise<Expense | null> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM expenses WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async createExpense(data: CreateExpenseData): Promise<Expense> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO expenses (description, amount, category, date) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [data.description, data.amount, data.category, data.date]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async updateExpense(data: UpdateExpenseData): Promise<Expense> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE expenses 
         SET description = COALESCE($2, description),
             amount = COALESCE($3, amount),
             category = COALESCE($4, category),
             date = COALESCE($5, date)
         WHERE id = $1 
         RETURNING *`,
        [data.id, data.description, data.amount, data.category, data.date]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async deleteExpense(id: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM expenses WHERE id = $1', [id]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  static async getCategories(): Promise<Category[]> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM categories ORDER BY name');
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM expenses WHERE date BETWEEN $1 AND $2 ORDER BY date DESC',
        [startDate, endDate]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getExpensesByCategory(category: string): Promise<Expense[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM expenses WHERE category = $1 ORDER BY date DESC',
        [category]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
}