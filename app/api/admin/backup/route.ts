import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const tenantId = 'default-tenant';
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const backupData: any = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      tenantId,
      data: {}
    };

    // Export receipts with related data
    const { data: receipts } = await supabase
      .from('receipt')
      .select(`
        *,
        vendor:vendor_id(*),
        lineItems:receipt_item(*),
        tags:receipt_tag(tag:tag_id(*))
      `)
      .eq('tenant_id', tenantId);

    backupData.data.receipts = receipts;

    // Export vendors
    const { data: vendors } = await supabase
      .from('vendor')
      .select('*')
      .eq('tenant_id', tenantId);

    backupData.data.vendors = vendors;

    // Export tags and categories
    const { data: tagCategories } = await supabase
      .from('tag_category')
      .select('*')
      .eq('tenant_id', tenantId);

    const { data: tags } = await supabase
      .from('tag')
      .select('*')
      .eq('tenant_id', tenantId);

    backupData.data.tagCategories = tagCategories;
    backupData.data.tags = tags;

    // Create JSON blob
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Return as downloadable file
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="clearspendly-backup-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}