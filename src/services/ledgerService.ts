import pool from '@/lib/db';
import { Ledger, CreateLedgerData, UpdateLedgerData } from '@/types/expense';

export class LedgerService {
  static async getAllLedgers(): Promise<Ledger[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM ledgers ORDER BY created_at DESC'
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getLedgerById(id: number): Promise<Ledger | null> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM ledgers WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async createLedger(data: CreateLedgerData): Promise<Ledger> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO ledgers (name, description, color) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [data.name, data.description || null, data.color || '#6366f1']
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async updateLedger(data: UpdateLedgerData): Promise<Ledger> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE ledgers 
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

  static async deleteLedger(id: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM ledgers WHERE id = $1', [id]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  static async getLedgerExpenseCount(ledgerId: number): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM expenses WHERE ledger_id = $1',
        [ledgerId]
      );
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  static async getLedgerTotalAmount(ledgerId: number): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE ledger_id = $1',
        [ledgerId]
      );
      return parseFloat(result.rows[0].total);
    } finally {
      client.release();
    }
  }
}
