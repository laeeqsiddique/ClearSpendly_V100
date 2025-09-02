import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTenantContext } from '@/lib/api-tenant';

// Mock settings storage - in production, this would be stored in database
let systemSettings = {
  appName: "ClearSpendly",
  defaultCurrency: "USD",
  timezone: "UTC",
  dateFormat: "MM/dd/yyyy",
  enableNotifications: true,
  enableAI: true,
  autoBackup: true,
  backupFrequency: "weekly",
  emailNotifications: false,
  emailAddress: ""
};

export async function GET() {
  try {
    // SECURITY FIX: Verify admin authorization
    const context = await requireTenantContext();
    
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

    return NextResponse.json(systemSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY FIX: Verify admin authorization for settings modification
    const context = await requireTenantContext();
    
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

    const newSettings = await request.json();
    
    // Validate required fields
    if (!newSettings.appName || !newSettings.defaultCurrency) {
      return NextResponse.json(
        { error: 'App name and default currency are required' },
        { status: 400 }
      );
    }

    // Update settings
    systemSettings = {
      ...systemSettings,
      ...newSettings
    };

    return NextResponse.json({ 
      message: 'Settings saved successfully',
      settings: systemSettings 
    });

  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save system settings' },
      { status: 500 }
    );
  }
}