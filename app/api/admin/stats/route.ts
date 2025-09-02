import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/api-tenant';

export async function GET() {
  try {
    // SECURITY FIX: Get current user's tenant and verify authorization
    const context = await requireTenantContext();
    
    // Check if user has admin privileges
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
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    // SECURITY FIX: Get total receipts for current user's tenant only
    const { count: totalReceipts } = await supabase
      .from('receipt')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', context.tenantId);

    // Get total amount for current user's tenant only
    const { data: receiptAmounts } = await supabase
      .from('receipt')
      .select('total_amount')
      .eq('tenant_id', context.tenantId);

    const totalAmount = receiptAmounts?.reduce((sum, receipt) => sum + receipt.total_amount, 0) || 0;

    // Get total tags for current user's tenant only
    const { count: totalTags } = await supabase
      .from('tag')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', context.tenantId);

    // Get total vendors for current user's tenant only
    const { count: totalVendors } = await supabase
      .from('vendor')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', context.tenantId);

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