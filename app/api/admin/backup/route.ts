import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/api-tenant';

export async function POST() {
  try {
    // SECURITY FIX: Get current user's tenant and verify authorization
    const context = await requireTenantContext();
    
    // Check if user has admin privileges for backup operations
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from('membership')
      .select('role')
      .eq('user_id', context.userId)
      .eq('tenant_id', context.tenantId)
      .in('role', ['owner', 'admin'])
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Admin privileges required for backup operations' },
        { status: 403 }
      );
    }
    const backupData: any = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      tenantId: context.tenantId, // SECURITY FIX: Use current user's tenant
      data: {}
    };

    // SECURITY FIX: Export receipts for current user's tenant only
    const { data: receipts } = await supabase
      .from('receipt')
      .select(`
        *,
        vendor:vendor_id(*),
        lineItems:receipt_item(*),
        tags:receipt_tag(tag:tag_id(*))
      `)
      .eq('tenant_id', context.tenantId);

    backupData.data.receipts = receipts;

    // Export vendors for current user's tenant only
    const { data: vendors } = await supabase
      .from('vendor')
      .select('*')
      .eq('tenant_id', context.tenantId);

    backupData.data.vendors = vendors;

    // Export tags and categories for current user's tenant only
    const { data: tagCategories } = await supabase
      .from('tag_category')
      .select('*')
      .eq('tenant_id', context.tenantId);

    const { data: tags } = await supabase
      .from('tag')
      .select('*')
      .eq('tenant_id', context.tenantId);

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