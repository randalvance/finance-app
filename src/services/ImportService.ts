import { db } from '@/lib/db';
import { imports, transactions } from '@/db/schema';
import {
  Import,
  CreateImportData,
  UpdateImportData,
  ParsedCSVRow,
  ImportSourceConfig,
  PreviewTransaction,
  ImportPreviewData
} from '@/types/transaction';
import { eq, and, desc } from 'drizzle-orm';
import { parse as parseDate, format } from 'date-fns';

export class ImportService {
  /**
   * Parse CSV content based on import source config
   */
  static parseCSV(csvContent: string, config: ImportSourceConfig): ParsedCSVRow[] {
    const lines = csvContent.split('\n');
    const dataLines = lines.slice(config.startingLine - 1); // Convert 1-based to 0-based

    if (dataLines.length === 0) {
      throw new Error('No data found in CSV after starting line');
    }

    // Parse header row
    const headerLine = dataLines[0];
    const headers = this.parseCSVLine(headerLine);

    // Find column indexes
    const { fieldMappings } = config;
    const dateIdx = headers.indexOf(fieldMappings.dateColumn);
    const descIdx = headers.indexOf(fieldMappings.descriptionColumn);
    const debitIdx = fieldMappings.debitColumn ? headers.indexOf(fieldMappings.debitColumn) : -1;
    const creditIdx = fieldMappings.creditColumn ? headers.indexOf(fieldMappings.creditColumn) : -1;
    const refIdx = fieldMappings.referenceColumn ? headers.indexOf(fieldMappings.referenceColumn) : -1;

    if (dateIdx === -1 || descIdx === -1) {
      throw new Error('Required columns not found in CSV');
    }

    // Parse data rows
    const parsedRows: ParsedCSVRow[] = [];
    for (let i = 1; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = this.parseCSVLine(line);
      if (values.length < headers.length) continue; // Skip incomplete rows

      // Build raw row object
      const rawRow: Record<string, string> = {};
      headers.forEach((header, idx) => {
        rawRow[header] = values[idx] || '';
      });

      // Parse date
      const dateStr = values[dateIdx]?.trim();
      if (!dateStr) continue;

      let parsedDateObj: Date;
      try {
        parsedDateObj = parseDate(dateStr, fieldMappings.dateFormat, new Date());
      } catch {
        console.warn(`Failed to parse date: ${dateStr}`);
        continue;
      }

      // Parse amounts
      const debitStr = debitIdx >= 0 ? values[debitIdx]?.trim() : '';
      const creditStr = creditIdx >= 0 ? values[creditIdx]?.trim() : '';

      const debitAmount = debitStr ? this.parseAmount(debitStr) : null;
      const creditAmount = creditStr ? this.parseAmount(creditStr) : null;

      // Skip if both amounts are null or both are present
      if ((!debitAmount && !creditAmount) || (debitAmount && creditAmount)) {
        continue;
      }

      // Build description from available fields
      const descValue = values[descIdx]?.trim();
      const refValue = refIdx >= 0 ? values[refIdx]?.trim() : '';

      let description = '';
      if (descValue && refValue) {
        description = `${refValue} - ${descValue}`;
      } else if (refValue) {
        description = refValue;
      } else if (descValue) {
        description = descValue;
      } else {
        // Fallback to Statement Code or Reference if both description fields are empty
        const statementCode = rawRow['Statement Code']?.trim();
        const reference = rawRow['Reference']?.trim();
        if (statementCode && reference) {
          description = `${statementCode} - ${reference}`;
        } else {
          description = statementCode || reference || 'NULL';
        }
      }

      parsedRows.push({
        date: format(parsedDateObj, 'yyyy-MM-dd'),
        description,
        debitAmount,
        creditAmount,
        rawRow
      });
    }

    return parsedRows;
  }

  /**
   * Parse CSV line handling quoted fields
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  /**
   * Parse amount string to number
   */
  private static parseAmount(amountStr: string): number | null {
    const cleaned = amountStr.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : Math.abs(parsed);
  }

  /**
   * Convert parsed CSV rows to preview transactions
   */
  static rowsToPreviewTransactions(
    rows: ParsedCSVRow[],
    defaultAccountId: number
  ): PreviewTransaction[] {
    return rows.map((row, idx) => ({
      tempId: `temp-${Date.now()}-${idx}`,
      date: row.date,
      description: row.description,
      amount: row.debitAmount || row.creditAmount || 0,
      transactionType: row.debitAmount ? ('Debit' as const) : ('Credit' as const),
      sourceAccountId: row.debitAmount ? defaultAccountId : null,
      targetAccountId: row.creditAmount ? defaultAccountId : null,
      rawCsvRow: row.rawRow,
    }));
  }

  /**
   * Create draft import
   */
  static async createDraftImport(data: CreateImportData): Promise<Import> {
    const result = await db.insert(imports).values({
      userId: data.userId,
      importSourceId: data.importSourceId,
      filename: data.filename,
      defaultAccountId: data.defaultAccountId,
      status: data.status,
      previewData: data.previewData || null,
      totalRows: data.totalRows,
      importedRows: data.importedRows,
    }).returning();

    return result[0];
  }

  /**
   * Update import (for saving draft progress)
   */
  static async updateImport(data: UpdateImportData, userId: number): Promise<Import | null> {
    const updateData: Partial<typeof imports.$inferInsert> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.previewData !== undefined) updateData.previewData = data.previewData;
    if (data.importedRows !== undefined) updateData.importedRows = data.importedRows;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;

    const result = await db.update(imports)
      .set(updateData)
      .where(and(eq(imports.id, data.id), eq(imports.userId, userId)))
      .returning();

    return result[0] || null;
  }

  /**
   * Complete import - create transactions and update status
   */
  static async completeImport(
    importId: number,
    categoryMappings: Record<string, number>,
    userId: number
  ): Promise<Import | null> {
    // Get import record
    const importRecord = await this.getImportById(importId, userId);
    if (!importRecord || !importRecord.previewData) {
      throw new Error('Import not found or missing preview data');
    }

    const previewData = importRecord.previewData as ImportPreviewData;
    const previewTransactions = previewData.transactions;

    // Prepare transaction data
    const transactionValues = previewTransactions.map(preview => ({
      userId,
      importId,
      sourceAccountId: preview.sourceAccountId,
      targetAccountId: preview.targetAccountId,
      transactionType: preview.transactionType,
      description: preview.description,
      amount: preview.amount,
      category: categoryMappings[preview.tempId]?.toString() || 'Uncategorized',
      date: preview.date,
    }));

    // Bulk insert transactions
    if (transactionValues.length > 0) {
      await db.insert(transactions).values(transactionValues);
    }

    // Update import status
    const result = await db.update(imports)
      .set({
        status: 'completed',
        importedRows: transactionValues.length,
        completedAt: new Date(),
      })
      .where(and(eq(imports.id, importId), eq(imports.userId, userId)))
      .returning();

    return result[0] || null;
  }

  /**
   * Get all imports for a user
   */
  static async getAllImports(userId: number): Promise<Import[]> {
    const result = await db.select()
      .from(imports)
      .where(eq(imports.userId, userId))
      .orderBy(desc(imports.createdAt));
    return result;
  }

  /**
   * Get import by ID
   */
  static async getImportById(id: number, userId: number): Promise<Import | null> {
    const result = await db.select()
      .from(imports)
      .where(and(eq(imports.id, id), eq(imports.userId, userId)));
    return result[0] || null;
  }

  /**
   * Delete import (for draft imports)
   */
  static async deleteImport(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(imports)
      .where(and(eq(imports.id, id), eq(imports.userId, userId)))
      .returning();
    return result.length > 0;
  }
}
