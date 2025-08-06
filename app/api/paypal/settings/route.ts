import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mock database storage - In production, use actual database
let mockPayPalSettings: any = null;

export async function GET(request: NextRequest) {
  try {
    // TODO: In production, fetch user's PayPal settings from database
    // For now, return mock settings or null if not configured
    
    return NextResponse.json({
      success: true,
      settings: mockPayPalSettings
    });

  } catch (error) {
    console.error('Error fetching PayPal settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PayPal settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled, environment, clientId, clientSecret, email, businessName } = body;

    // Validate required fields
    if (enabled && (!clientId || !clientSecret || !email || !businessName)) {
      return NextResponse.json(
        { error: 'All fields are required when enabling PayPal' },
        { status: 400 }
      );
    }

    // TODO: In production, validate PayPal credentials by making test API call
    // For now, just save the settings
    
    const settings = {
      enabled: enabled || false,
      environment: environment || 'sandbox',
      clientId: clientId || '',
      clientSecret: clientSecret || '', // In production, encrypt this
      email: email || '',
      businessName: businessName || '',
      status: enabled ? 'connected' : 'disconnected',
      lastTested: enabled ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    };

    // Mock save to database
    mockPayPalSettings = settings;
    
    console.log('Saved PayPal settings:', { ...settings, clientSecret: '[REDACTED]' });

    return NextResponse.json({
      success: true,
      message: 'PayPal settings saved successfully',
      settings: {
        ...settings,
        clientSecret: '[REDACTED]' // Never return the actual secret
      }
    });

  } catch (error) {
    console.error('Error saving PayPal settings:', error);
    return NextResponse.json(
      { error: 'Failed to save PayPal settings' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // TODO: In production, remove user's PayPal settings from database
    // and deactivate any active payment links
    
    mockPayPalSettings = null;
    
    console.log('Deleted PayPal settings');

    return NextResponse.json({
      success: true,
      message: 'PayPal settings deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting PayPal settings:', error);
    return NextResponse.json(
      { error: 'Failed to delete PayPal settings' },
      { status: 500 }
    );
  }
}