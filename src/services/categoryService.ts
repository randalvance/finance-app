import pool from '@/lib/db';
import { Category } from '@/types/expense';

interface CreateCategoryData {
  name: string;
  color?: string;
}

interface UpdateCategoryData {
  id: number;
  name?: string;
  color?: string;
}

export class CategoryService {
  static async getAllCategories(): Promise<Category[]> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM categories ORDER BY name');
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getCategoryById(id: number): Promise<Category | null> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM categories WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async createCategory(data: CreateCategoryData): Promise<Category> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO categories (name, color) 
         VALUES ($1, $2) 
         RETURNING *`,
        [data.name, data.color || '#6366f1']
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async updateCategory(data: UpdateCategoryData): Promise<Category> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE categories 
         SET name = COALESCE($2, name),
             color = COALESCE($3, color)
         WHERE id = $1 
         RETURNING *`,
        [data.id, data.name, data.color]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async deleteCategory(id: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM categories WHERE id = $1', [id]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }
}
