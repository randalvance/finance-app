import pool from '@/lib/db';
import { Account, CreateAccountData, UpdateAccountData } from '@/types/expense';

export class AccountService {
  static async getAllAccounts(): Promise<Account[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM accounts ORDER BY created_at DESC'
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getAccountById(id: number): Promise<Account | null> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM accounts WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async createAccount(data: CreateAccountData): Promise<Account> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO accounts (name, description, color) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [data.name, data.description || null, data.color || '#6366f1']
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async updateAccount(data: UpdateAccountData): Promise<Account> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE accounts 
         SET name = COALESCE($2, name),
             description = COALESCE($3, description),
             color = COALESCE($4, color)
         WHERE id = $1 
         RETURNING *`,
        [data.id, data.name, data.description, data.color]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async deleteAccount(id: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM accounts WHERE id = $1', [id]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  static async getAccountExpenseCount(accountId: number): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM expenses WHERE account_id = $1',
        [accountId]
      );
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  static async getAccountTotalAmount(accountId: number): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE account_id = $1',
        [accountId]
      );
      return parseFloat(result.rows[0].total);
    } finally {
      client.release();
    }
  }
}
