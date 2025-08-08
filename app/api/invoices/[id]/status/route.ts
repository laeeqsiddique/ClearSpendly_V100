import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { status } = await request.json();
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['draft', 'sent', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get user's tenant
    const { data: membership } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 });
    }

    // Update invoice status
    const { data, error } = await supabase
      .from('invoice')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('tenant_id', membership.tenant_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice status:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice: data });

  } catch (error) {
    console.error('Error updating invoice status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}