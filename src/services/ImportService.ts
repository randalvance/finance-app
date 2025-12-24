import { db } from '@/lib/db';
import { imports, transactions } from '@/db/schema';
import {
  Import,
  CreateImportData,
  UpdateImportData,
  ParsedCSVRow,
  ImportSourceConfig,
  PreviewTransaction,
  ImportPreviewData,
  FieldMapping,
  TransactionFieldType
} from '@/types/transaction';
import { eq, and, desc } from 'drizzle-orm';
import { parse as parseDate, format } from 'date-fns';

export class ImportService {
  /**
   * Validate field mappings configuration
   */
  static validateFieldMappings(mappings: FieldMapping[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Check for required fields
    const hasDate = mappings.some(m => m.transactionField === 'date');
    const hasDescription = mappings.some(m => m.transactionField === 'description');

    if (!hasDate) errors.push('date field mapping is required');
    if (!hasDescription) errors.push('description field mapping is required');

    // 2. Check for amount fields (must have debit/credit fields)
    const hasDebit = mappings.some(m => m.transactionField === 'debit');
    const hasCredit = mappings.some(m => m.transactionField === 'credit');

    if (!hasDebit && !hasCredit) {
      errors.push('Must have at least one of debit or credit field mappings');
    }

    // 3. Check date field has format
    const dateMapping = mappings.find(m => m.transactionField === 'date');
    if (dateMapping && !dateMapping.format) {
      errors.push('date field must have format specified');
    }

    // 4. Check for duplicate mappings (same transactionField mapped twice)
    const fieldCounts = new Map<TransactionFieldType, number>();
    mappings.forEach(m => {
      fieldCounts.set(m.transactionField, (fieldCounts.get(m.transactionField) || 0) + 1);
    });

    fieldCounts.forEach((count, field) => {
      if (count > 1) {
        errors.push(`${field} field is mapped multiple times`);
      }
    });

    // 5. Check for duplicate source columns with exception for debit/credit pair
    const sourceCounts = new Map<string, string[]>();
    mappings.forEach(m => {
      if (!sourceCounts.has(m.sourceColumn)) {
        sourceCounts.set(m.sourceColumn, []);
      }
      sourceCounts.get(m.sourceColumn)!.push(m.transactionField);
    });

    sourceCounts.forEach((fields, source) => {
      if (fields.length > 1) {
        // Allow same source column for debit AND credit (signed amount column)
        const isDebitCreditPair = fields.length === 2 &&
                                   fields.includes('debit') &&
                                   fields.includes('credit');

        if (!isDebitCreditPair) {
          errors.push(`Source column "${source}" is mapped multiple times`);
        }
      }
    });

    // 6. Validate data types match fields
    mappings.forEach(m => {
      if (m.transactionField === 'date' && m.dataType !== 'date') {
        errors.push('date field must have dataType "date"');
      }
      if ((m.transactionField === 'debit' || m.transactionField === 'credit') && m.dataType !== 'number') {
        errors.push(`${m.transactionField} field must have dataType "number"`);
      }
      if ((m.transactionField === 'description' || m.transactionField === 'reference') && m.dataType !== 'string') {
        errors.push(`${m.transactionField} field must have dataType "string"`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
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

    // Build mapping index: transactionField -> { columnIndex, format?, dataType }
    const mappingIndex = new Map<TransactionFieldType, { idx: number; format?: string; dataType: string }>();

    config.fieldMappings.forEach(mapping => {
      const idx = headers.indexOf(mapping.sourceColumn);
      if (idx === -1 && mapping.required) {
        throw new Error(`Required column "${mapping.sourceColumn}" not found in CSV`);
      }
      if (idx !== -1) {
        mappingIndex.set(mapping.transactionField, {
          idx,
          format: mapping.format,
          dataType: mapping.dataType
        });
      }
    });

    // Verify required mappings exist
    const dateMapping = mappingIndex.get('date');
    const descMapping = mappingIndex.get('description');

    if (!dateMapping) {
      throw new Error('date field mapping is required');
    }
    if (!descMapping) {
      throw new Error('description field mapping is required');
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
      const dateStr = values[dateMapping.idx]?.trim();
      if (!dateStr) continue;

      let parsedDateObj: Date;
      try {
        parsedDateObj = parseDate(dateStr, dateMapping.format!, new Date());
      } catch {
        console.warn(`Failed to parse date: ${dateStr}`);
        continue;
      }

      // Parse amounts
      const debitMapping = mappingIndex.get('debit');
      const creditMapping = mappingIndex.get('credit');

      let debitAmount: number | null = null;
      let creditAmount: number | null = null;

      // Check if debit and credit point to the same source column (signed amount)
      const isSameSourceColumn = debitMapping && creditMapping &&
                                  debitMapping.idx === creditMapping.idx;

      if (isSameSourceColumn) {
        // Single signed amount column - use sign to determine debit vs credit
        const amountStr = values[debitMapping!.idx]?.trim();
        if (amountStr) {
          const signedAmount = this.parseSignedAmount(amountStr);
          if (signedAmount !== null) {
            if (signedAmount < 0) {
              debitAmount = Math.abs(signedAmount);
              creditAmount = null;
            } else if (signedAmount > 0) {
              debitAmount = null;
              creditAmount = signedAmount;
            }
            // signedAmount === 0, skip this row (both remain null)
          }
        }
      } else {
        // Separate debit and credit columns - original logic
        if (debitMapping) {
          const debitStr = values[debitMapping.idx]?.trim();
          debitAmount = debitStr ? this.parseAmount(debitStr) : null;
        }

        if (creditMapping) {
          const creditStr = values[creditMapping.idx]?.trim();
          creditAmount = creditStr ? this.parseAmount(creditStr) : null;
        }
      }

      // Skip if both amounts are null or zero
      if (!debitAmount && !creditAmount) {
        continue;
      }

      // Build description from available fields
      const descValue = values[descMapping.idx]?.trim() || '';
      const refMapping = mappingIndex.get('reference');
      const refValue = refMapping ? values[refMapping.idx]?.trim() : '';

      let description = '';
      if (descValue && refValue) {
        description = `${refValue} - ${descValue}`;
      } else if (refValue) {
        description = refValue;
      } else if (descValue) {
        description = descValue;
      } else {
        description = 'NULL';
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
   * Parse signed amount string to number (preserves sign)
   */
  private static parseSignedAmount(amountStr: string): number | null {
    const cleaned = amountStr.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed; // Keep the sign!
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

    // Validate all transactions before inserting
    const errors: string[] = [];
    previewTransactions.forEach(preview => {
      // Validate category
      if (!categoryMappings[preview.tempId]) {
        errors.push(`Transaction "${preview.description}" is missing a category`);
      }

      // Validate account assignments based on transaction type
      if (preview.transactionType === 'Debit' && !preview.sourceAccountId) {
        errors.push(`Debit transaction "${preview.description}" is missing source account`);
      } else if (preview.transactionType === 'Credit' && !preview.targetAccountId) {
        errors.push(`Credit transaction "${preview.description}" is missing target account`);
      } else if (preview.transactionType === 'Transfer') {
        if (!preview.sourceAccountId || !preview.targetAccountId) {
          errors.push(`Transfer transaction "${preview.description}" is missing source or target account`);
        } else if (preview.sourceAccountId === preview.targetAccountId) {
          errors.push(`Transfer transaction "${preview.description}" has same source and target account`);
        }
      }
    });

    if (errors.length > 0) {
      throw new Error(`Validation errors:\n${errors.join('\n')}`);
    }

    // Prepare transaction data
    const transactionValues = previewTransactions.map(preview => ({
      userId,
      importId,
      sourceAccountId: preview.sourceAccountId,
      targetAccountId: preview.targetAccountId,
      transactionType: preview.transactionType,
      description: preview.description,
      amount: preview.amount,
      categoryId: categoryMappings[preview.tempId],
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
