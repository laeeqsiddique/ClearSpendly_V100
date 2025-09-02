import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authEmailService } from '@/lib/auth-email-service';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, fullName, organizationName } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Use admin client to check if user exists and needs verification
    const adminSupabase = createAdminClient();
    
    // Check if user exists in our database
    const { data: existingUser } = await adminSupabase
      .from('user')
      .select('id, email_verified, welcome_email_sent')
      .eq('email', email)
      .single();

    // For regular email sign-ups, Supabase handles verification link
    // We just send a nice welcome email without verification token
    const result = await authEmailService.sendWelcomeEmail({
      email,
      fullName: fullName || email.split('@')[0],
      tenantName: organizationName,
      isOAuthUser: false, // Regular email sign-up
      // No verification token - Supabase handles that
    });

    if (result.success && existingUser) {
      // Mark welcome email as sent
      await adminSupabase
        .from('user')
        .update({ 
          welcome_email_sent: true,
          welcome_email_sent_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);
    }

    return NextResponse.json({ 
      success: result.success,
      messageId: result.messageId,
      message: result.success ? 'Welcome email sent successfully' : result.error
    });

  } catch (error) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    );
  }
}