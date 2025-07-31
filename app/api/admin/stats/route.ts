import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const tenantId = 'default-tenant';
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get total receipts
    const { count: totalReceipts } = await supabase
      .from('receipt')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Get total amount
    const { data: receiptAmounts } = await supabase
      .from('receipt')
      .select('total_amount')
      .eq('tenant_id', tenantId);

    const totalAmount = receiptAmounts?.reduce((sum, receipt) => sum + receipt.total_amount, 0) || 0;

    // Get total tags
    const { count: totalTags } = await supabase
      .from('tag')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Get total vendors
    const { count: totalVendors } = await supabase
      .from('vendor')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Calculate storage usage (simplified)
    const storageUsed = Math.round((totalReceipts || 0) * 0.5) + " MB";

    // Get last backup date (mock for now)
    const lastBackup = "2024-07-15 10:30:00";

    return NextResponse.json({
      totalReceipts: totalReceipts || 0,
      totalAmount: totalAmount,
      totalTags: totalTags || 0,
      totalVendors: totalVendors || 0,
      storageUsed,
      lastBackup
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system statistics' },
      { status: 500 }
    );
  }
}