import { NextRequest, NextResponse } from 'next/server';
import { ImportSourceService } from '@/services/ImportSourceService';
import { ImportService } from '@/services/ImportService';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await requireAuth();
    const sources = await ImportSourceService.getAllImportSources(userId);
    return NextResponse.json(sources);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching import sources:', error);
    return NextResponse.json({ error: 'Failed to fetch import sources' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const { name, description, config } = body;

    if (!name || !config) {
      return NextResponse.json(
        { error: 'Name and config are required' },
        { status: 400 }
      );
    }

    // Validate config structure
    if (!config.startingLine || !config.fieldMappings) {
      return NextResponse.json(
        { error: 'Invalid config structure. Must include startingLine and fieldMappings' },
        { status: 400 }
      );
    }

    // Validate field mappings using ImportService
    if (!Array.isArray(config.fieldMappings)) {
      return NextResponse.json(
        { error: 'fieldMappings must be an array' },
        { status: 400 }
      );
    }

    const validation = ImportService.validateFieldMappings(config.fieldMappings);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Invalid field mappings: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    const source = await ImportSourceService.createImportSource({
      userId,
      name,
      description,
      config,
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating import source:', error);
    return NextResponse.json({ error: 'Failed to create import source' }, { status: 500 });
  }
}
