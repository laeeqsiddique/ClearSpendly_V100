import { Resend } from 'resend';
import { createClient } from './supabase/server';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface WelcomeEmailData {
  email: string;
  fullName: string;
  verificationToken?: string;
  tenantName?: string;
  isOAuthUser: boolean;
}

interface VerificationEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class AuthEmailService {
  private fromEmail: string;
  private siteUrl: string;

  constructor() {
    this.fromEmail = process.env.RESEND_FROM_EMAIL_AUTH || process.env.RESEND_FROM_EMAIL || 'registration@updates.flowvya.com';
    this.siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.flowvya.com';
  }

  private generateWelcomeEmailTemplate(data: WelcomeEmailData): { subject: string; html: string; text: string } {
    const verificationUrl = data.verificationToken 
      ? `${this.siteUrl}/verify-email?token=${data.verificationToken}`
      : null;

    return {
      subject: `Welcome to FlowVya${data.tenantName ? ` - ${data.tenantName}` : ''}!`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to FlowVya!</title>
          <!--[if mso]>
          <noscript>
            <xml>
              <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          </noscript>
          <![endif]-->
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #1a1a1a;
              background-color: #f5f5f5;
            }
            .wrapper {
              width: 100%;
              background-color: #f5f5f5;
              padding: 40px 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 48px 40px;
              text-align: center;
            }
            .logo {
              width: 80px;
              height: 80px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 50%;
              margin: 0 auto 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
              color: white;
              font-weight: bold;
            }
            .header h1 {
              margin: 0 0 8px 0;
              color: #ffffff;
              font-size: 36px;
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            .header p {
              margin: 0;
              color: rgba(255, 255, 255, 0.9);
              font-size: 18px;
              font-weight: 400;
            }
            .content {
              padding: 48px 40px;
            }
            .greeting {
              font-size: 24px;
              color: #1a1a1a;
              margin-bottom: 24px;
              font-weight: 600;
            }
            .welcome-message {
              font-size: 18px;
              color: #4a5568;
              margin-bottom: 32px;
              line-height: 1.7;
            }
            .features-section {
              background: linear-gradient(to bottom, #fafbfc 0%, #f4f5f7 100%);
              border: 1px solid #e1e4e8;
              border-radius: 12px;
              padding: 32px;
              margin: 32px 0;
            }
            .features-title {
              font-size: 20px;
              font-weight: 600;
              color: #1a1a1a;
              margin-bottom: 24px;
              text-align: center;
            }
            .features-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 24px;
            }
            .feature-item {
              text-align: center;
            }
            .feature-icon {
              font-size: 32px;
              margin-bottom: 12px;
            }
            .feature-title {
              font-size: 16px;
              font-weight: 600;
              color: #1a1a1a;
              margin-bottom: 8px;
            }
            .feature-desc {
              font-size: 14px;
              color: #6b7280;
              line-height: 1.5;
            }
            .verification-section {
              background: #fef3c7;
              border: 1px solid #fbbf24;
              border-radius: 12px;
              padding: 24px;
              margin: 32px 0;
              text-align: center;
            }
            .verification-title {
              font-size: 18px;
              font-weight: 600;
              color: #92400e;
              margin-bottom: 16px;
            }
            .verification-desc {
              font-size: 16px;
              color: #78350f;
              margin-bottom: 24px;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white !important;
              padding: 16px 32px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
              transition: all 0.3s ease;
            }
            .cta-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
            }
            .verified-badge {
              background: #ecfdf5;
              border: 1px solid #86efac;
              border-radius: 12px;
              padding: 24px;
              margin: 32px 0;
              text-align: center;
            }
            .verified-badge h3 {
              color: #047857;
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .verified-badge p {
              color: #065f46;
              font-size: 16px;
              margin: 0;
            }
            .next-steps {
              background: #f8fafc;
              border-left: 4px solid #667eea;
              border-radius: 0 8px 8px 0;
              padding: 24px;
              margin: 32px 0;
            }
            .next-steps h3 {
              color: #1a1a1a;
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 16px;
            }
            .next-steps ul {
              margin: 0;
              padding-left: 24px;
            }
            .next-steps li {
              color: #4b5563;
              font-size: 16px;
              margin-bottom: 8px;
            }
            .security-note {
              background: #f3f4f6;
              border-radius: 8px;
              padding: 16px;
              margin: 24px 0;
              text-align: center;
            }
            .security-note p {
              margin: 0;
              color: #6b7280;
              font-size: 14px;
            }
            .divider {
              height: 1px;
              background: #e5e7eb;
              margin: 32px 0;
            }
            .footer {
              background: #f9fafb;
              padding: 32px 40px;
              text-align: center;
            }
            .footer-logo {
              font-size: 24px;
              font-weight: 700;
              color: #667eea;
              margin-bottom: 16px;
            }
            .contact-info {
              font-size: 14px;
              color: #6b7280;
              line-height: 1.6;
            }
            .contact-info a {
              color: #667eea;
              text-decoration: none;
            }
            @media (max-width: 600px) {
              .wrapper {
                padding: 20px 10px;
              }
              .header {
                padding: 32px 24px;
              }
              .content {
                padding: 32px 24px;
              }
              .features-grid {
                grid-template-columns: 1fr;
                gap: 20px;
              }
              .cta-button {
                padding: 14px 28px;
                font-size: 15px;
              }
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <!-- Header -->
              <div class="header">
                <div class="logo">🚀</div>
                <h1>Welcome!</h1>
                <p>You're now part of FlowVya</p>
              </div>

              <!-- Content -->
              <div class="content">
                <div class="greeting">Hello ${data.fullName}! 👋</div>
                
                <div class="welcome-message">
                  Thank you for joining FlowVya - the smart expense management platform that makes tracking business expenses effortless. ${data.isOAuthUser ? 'We noticed you signed up with Google, so you\'re almost ready to get started!' : 'We\'re excited to have you on board!'}
                </div>

                ${verificationUrl ? `
                  <div class="verification-section">
                    <div class="verification-title">📧 Verify Your Email</div>
                    <div class="verification-desc">To ensure the security of your account and enable all features, please verify your email address.</div>
                    <a href="${verificationUrl}" class="cta-button">Verify Email Address</a>
                  </div>
                ` : `
                  <div class="verified-badge">
                    <h3>✅ Account Ready</h3>
                    <p>Your account is set up and ready to use!</p>
                  </div>
                `}

                <!-- Features Section -->
                <div class="features-section">
                  <div class="features-title">What you can do with FlowVya</div>
                  <div class="features-grid">
                    <div class="feature-item">
                      <div class="feature-icon">📱</div>
                      <div class="feature-title">Smart Receipt Capture</div>
                      <div class="feature-desc">Snap photos of receipts and let AI extract all the details automatically</div>
                    </div>
                    <div class="feature-item">
                      <div class="feature-icon">📊</div>
                      <div class="feature-title">Expense Analytics</div>
                      <div class="feature-desc">Get insights into your spending patterns with beautiful charts and reports</div>
                    </div>
                    <div class="feature-item">
                      <div class="feature-icon">🧾</div>
                      <div class="feature-title">Invoice Management</div>
                      <div class="feature-desc">Create, send, and track professional invoices with payment integration</div>
                    </div>
                    <div class="feature-item">
                      <div class="feature-icon">🚗</div>
                      <div class="feature-title">Mileage Tracking</div>
                      <div class="feature-desc">Track business trips and automatically calculate IRS-compliant deductions</div>
                    </div>
                  </div>
                </div>

                <div class="next-steps">
                  <h3>🎯 Get Started in Minutes</h3>
                  <ul>
                    <li>Complete your business profile setup</li>
                    <li>Upload your first receipt or create an invoice</li>
                    <li>Explore the dashboard and analytics</li>
                    <li>Set up payment methods if needed</li>
                  </ul>
                </div>

                ${verificationUrl ? `
                  <div class="security-note">
                    <p>This verification link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
                  </div>
                ` : ''}

                <div class="divider"></div>

                <p style="color: #6b7280; font-size: 14px; text-align: center;">
                  Need help getting started? Just reply to this email and our team will be happy to assist you.
                </p>
              </div>

              <!-- Footer -->
              <div class="footer">
                <div class="footer-logo">FlowVya</div>
                <div class="contact-info">
                  Smart expense management for modern businesses<br>
                  <a href="https://www.flowvya.com">www.flowvya.com</a>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to FlowVya!

Hello ${data.fullName},

Thank you for joining FlowVya - the smart expense management platform that makes tracking business expenses effortless. ${data.isOAuthUser ? 'We noticed you signed up with Google, so you\'re almost ready to get started!' : 'We\'re excited to have you on board!'}

${verificationUrl ? `📧 VERIFY YOUR EMAIL
To ensure the security of your account and enable all features, please verify your email address by clicking this link:
${verificationUrl}

This link expires in 24 hours.` : '✅ Your account is set up and ready to use!'}

🎯 WHAT YOU CAN DO WITH FLOWVYA:

📱 Smart Receipt Capture
Snap photos of receipts and let AI extract all the details automatically

📊 Expense Analytics  
Get insights into your spending patterns with beautiful charts and reports

🧾 Invoice Management
Create, send, and track professional invoices with payment integration

🚗 Mileage Tracking
Track business trips and automatically calculate IRS-compliant deductions

🎯 GET STARTED IN MINUTES:
• Complete your business profile setup
• Upload your first receipt or create an invoice  
• Explore the dashboard and analytics
• Set up payment methods if needed

Need help getting started? Just reply to this email and our team will be happy to assist you.

Best regards,
The FlowVya Team
https://www.flowvya.com

${verificationUrl ? '\nIf you didn\'t create this account, you can safely ignore this email.' : ''}
      `
    };
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<VerificationEmailResult> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('Resend API key not configured, welcome email sending disabled');
        return {
          success: false,
          error: 'Email service not configured'
        };
      }

      if (!resend) {
        return {
          success: false,
          error: 'Email service not initialized'
        };
      }

      const emailContent = this.generateWelcomeEmailTemplate(data);

      console.log('AuthEmailService: Sending welcome email to:', data.email, {
        hasToken: !!data.verificationToken,
        isOAuth: data.isOAuthUser,
        tenantName: data.tenantName
      });

      const emailData = {
        from: this.fromEmail,
        to: [data.email],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      };

      const response = await resend.emails.send(emailData);

      if (response.error) {
        throw new Error(`Resend API error: ${response.error.message}`);
      }

      // Update the user record to mark welcome email as sent
      const supabase = await createClient();
      await supabase
        .from('user')
        .update({
          welcome_email_sent: true,
          welcome_email_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', data.email);

      console.log('AuthEmailService: Welcome email sent successfully:', response.data?.id);

      return {
        success: true,
        messageId: response.data?.id
      };

    } catch (error) {
      console.error('AuthEmailService: Error sending welcome email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async generateVerificationToken(userId: string, email: string): Promise<string | null> {
    try {
      const supabase = await createClient();
      
      // Generate a secure random token
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Store the token in the database
      const { error } = await supabase
        .from('user')
        .update({
          email_verification_token: token,
          email_verification_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('AuthEmailService: Error storing verification token:', error);
        return null;
      }

      return token;
    } catch (error) {
      console.error('AuthEmailService: Error generating verification token:', error);
      return null;
    }
  }

  async verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; email?: string }> {
    try {
      const supabase = await createClient();

      // Find user with this token and ensure it's not expired
      const { data: user, error } = await supabase
        .from('user')
        .select('id, email, email_verification_sent_at')
        .eq('email_verification_token', token)
        .eq('email_verified', false)
        .single();

      if (error || !user) {
        return { success: false };
      }

      // Check if token is expired (24 hours)
      const sentAt = new Date(user.email_verification_sent_at);
      const expiryTime = new Date(sentAt.getTime() + 24 * 60 * 60 * 1000);
      
      if (new Date() > expiryTime) {
        return { success: false };
      }

      // Mark email as verified
      const { error: updateError } = await supabase
        .from('user')
        .update({
          email_verified: true,
          email_verified_at: new Date().toISOString(),
          email_verification_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('AuthEmailService: Error marking email as verified:', updateError);
        return { success: false };
      }

      return {
        success: true,
        userId: user.id,
        email: user.email
      };
    } catch (error) {
      console.error('AuthEmailService: Error verifying email token:', error);
      return { success: false };
    }
  }

  async checkUserNeedsVerification(email: string): Promise<boolean> {
    try {
      const supabase = await createClient();
      
      const { data: user, error } = await supabase
        .from('user')
        .select('email_verified, welcome_email_sent')
        .eq('email', email)
        .single();

      if (error || !user) {
        return true; // If user doesn't exist, assume verification needed
      }

      return !user.email_verified;
    } catch (error) {
      console.error('AuthEmailService: Error checking verification status:', error);
      return true;
    }
  }

  async testEmailConfiguration(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        return { success: false, error: 'Resend API key not configured' };
      }

      if (!this.fromEmail) {
        return { success: false, error: 'From email address not configured' };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Default auth email service instance
export const authEmailService = new AuthEmailService();