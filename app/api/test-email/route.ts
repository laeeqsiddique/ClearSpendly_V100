import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 });
    }

    const { to } = await request.json();

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'test@updates.flowvya.com',
      to: to || 'laeeq.siddique@gmail.com',
      subject: 'ClearSpendly Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0071e3;">Email Setup Successful! 🎉</h2>
          <p>This is a test email from your ClearSpendly application.</p>
          <p>The email service is now configured and working properly.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e5e5;">
          <p style="font-size: 12px; color: #666;">
            This email was sent via ClearSpendly email service for testing purposes.
          </p>
        </div>
      `
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      messageId: result.data?.id,
      message: 'Test email sent successfully!'
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    }, { status: 500 });
  }
}