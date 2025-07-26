import { NextRequest, NextResponse } from 'next/server';
import { withPermission, withRecordOwnership } from '@/lib/api-middleware';
import { createClient } from '@/lib/supabase/server';

// Example: Anyone with receipts:view permission can list receipts
export async function GET(request: NextRequest) {
  return withPermission('receipts:view')(request, async (req, context) => {
    try {
      const supabase = await createClient();
      
      // Get receipts for the user's tenant
      const { data: receipts, error } = await supabase
        .from('receipt')
        .select('*')
        .eq('tenant_id', context.membership.tenant_id)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch receipts' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: receipts
      });
    } catch (error) {
      console.error('Error fetching receipts:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// Example: Anyone with receipts:create permission can create receipts
export async function POST(request: NextRequest) {
  return withPermission('receipts:create')(request, async (req, context) => {
    try {
      const body = await req.json();
      const supabase = await createClient();
      
      // Create receipt with user attribution
      const { data: receipt, error } = await supabase
        .from('receipt')
        .insert({
          ...body,
          tenant_id: context.membership.tenant_id,
          created_by: context.user.id
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to create receipt' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: receipt,
        message: 'Receipt created successfully'
      });
    } catch (error) {
      console.error('Error creating receipt:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// Example: Protected update - can only edit if you have permission AND (own the record OR are admin+)
export async function PATCH(request: NextRequest) {
  return withRecordOwnership(
    'receipts',
    async (req, context) => {
      // Extract receipt ID from URL and get the created_by field
      const url = new URL(req.url);
      const receiptId = url.pathname.split('/').pop();
      
      if (!receiptId) return null;
      
      const supabase = await createClient();
      const { data: receipt } = await supabase
        .from('receipt')
        .select('created_by')
        .eq('id', receiptId)
        .eq('tenant_id', context.membership.tenant_id)
        .single();
      
      return receipt?.created_by || null;
    }
  )(request, async (req, context) => {
    try {
      const body = await req.json();
      const supabase = await createClient();
      const url = new URL(req.url);
      const receiptId = url.pathname.split('/').pop();

      // Update receipt with user attribution
      const { data: receipt, error } = await supabase
        .from('receipt')
        .update({
          ...body,
          updated_by: context.user.id
        })
        .eq('id', receiptId)
        .eq('tenant_id', context.membership.tenant_id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update receipt' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: receipt,
        message: 'Receipt updated successfully'
      });
    } catch (error) {
      console.error('Error updating receipt:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}