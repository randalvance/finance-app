import { NextRequest, NextResponse } from 'next/server';
import { ImportService } from '@/services/ImportService';
import { ImportSourceService } from '@/services/ImportSourceService';
import { ImportSourceConfig } from '@/types/transaction';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const formData = await request.formData();

    const file = formData.get('file') as File;
    const importSourceId = formData.get('import_source_id') as string;
    const defaultAccountId = formData.get('default_account_id') as string;

    if (!file || !importSourceId || !defaultAccountId) {
      return NextResponse.json(
        { error: 'File, import source, and default account are required' },
        { status: 400 }
      );
    }

    // Get import source config
    const importSource = await ImportSourceService.getImportSourceById(
      parseInt(importSourceId),
      userId
    );

    if (!importSource) {
      return NextResponse.json(
        { error: 'Import source not found' },
        { status: 404 }
      );
    }

    // Read file content
    const csvContent = await file.text();

    // Parse CSV
    const parsedRows = ImportService.parseCSV(csvContent, importSource.config as ImportSourceConfig);

    // Convert to preview transactions
    const previewTransactions = ImportService.rowsToPreviewTransactions(
      parsedRows,
      parseInt(defaultAccountId)
    );

    // Initialize category mappings (all unmapped)
    const categoryMappings: Record<string, number> = {};
    previewTransactions.forEach(tx => {
      categoryMappings[tx.tempId] = 0; // 0 means unmapped
    });

    // Create draft import with preview data
    const draftImport = await ImportService.createDraftImport({
      userId,
      importSourceId: parseInt(importSourceId),
      filename: file.name,
      defaultAccountId: parseInt(defaultAccountId),
      status: 'draft',
      previewData: {
        transactions: previewTransactions,
        categoryMappings
      },
      totalRows: previewTransactions.length,
      importedRows: 0
    });

    return NextResponse.json({
      import: draftImport,
      filename: file.name,
      rowCount: previewTransactions.length,
      transactions: previewTransactions,
      categoryMappings
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error parsing CSV:', error);
    return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 500 });
  }
}
