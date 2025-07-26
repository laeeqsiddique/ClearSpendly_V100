import { Resend } from 'resend';
import { createClient } from './supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

interface TeamInvitationData {
  inviterName: string;
  inviterEmail: string;
  inviteeName: string;
  inviteeEmail: string;
  role: string;
  companyName?: string;
  invitationToken: string;
  invitationUrl: string;
  expiresAt: string;
}

interface InvitationEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class TeamInvitationService {
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'invite@updates.flowvya.com';
  }

  // Helper to clean strings for email fields (removes newlines, tabs, etc.)
  private cleanEmailString(str: string): string {
    return str.replace(/[\r\n\t]/g, ' ').trim();
  }

  private getRoleDescription(role: string): string {
    switch (role) {
      case 'owner':
        return 'Owner - Full access to everything';
      case 'admin':
        return 'Admin - Manage team and most operations';
      case 'member':
        return 'Member - Can manage own records and create new ones';
      case 'viewer':
        return 'Viewer - Read-only access to data';
      default:
        return 'Team Member';
    }
  }

  private generateInvitationEmailHTML(data: TeamInvitationData): string {
    const roleDescription = this.getRoleDescription(data.role);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #374151;
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header .subtitle {
      color: rgba(255, 255, 255, 0.9);
      margin: 8px 0 0 0;
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #1f2937;
    }
    .invitation-card {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
      border-left: 4px solid #8b5cf6;
    }
    .invitation-details {
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 12px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #4b5563;
    }
    .detail-value {
      color: #1f2937;
      font-weight: 500;
    }
    .role-badge {
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 30px 0;
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
    }
    .expiry-notice {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      color: #92400e;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 8px 0;
      color: #6b7280;
      font-size: 14px;
    }
    .help-text {
      color: #6b7280;
      font-size: 14px;
      margin-top: 20px;
      line-height: 1.5;
    }
    @media (max-width: 600px) {
      .container {
        margin: 10px;
        border-radius: 8px;
      }
      .header, .content, .footer {
        padding: 20px;
      }
      .detail-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You're Invited!</h1>
      <p class="subtitle">Join the Flowvya team</p>
    </div>
    
    <div class="content">
      <p class="greeting">Hi there!</p>
      
      <p><strong>${data.inviterName}</strong> (${data.inviterEmail}) has invited you to join their team on <strong>Flowvya</strong>, the all-in-one expense tracking and invoice management platform.</p>
      
      <div class="invitation-card">
        <h3 style="margin-top: 0; color: #1f2937;">Invitation Details</h3>
        <div class="invitation-details">
          <div class="detail-row">
            <span class="detail-label">Invited by:</span>
            <span class="detail-value">${data.inviterName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Your role:</span>
            <span class="role-badge">${data.role.charAt(0).toUpperCase() + data.role.slice(1)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Permissions:</span>
            <span class="detail-value">${roleDescription}</span>
          </div>
          ${data.companyName ? `
          <div class="detail-row">
            <span class="detail-label">Company:</span>
            <span class="detail-value">${data.companyName}</span>
          </div>
          ` : ''}
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.invitationUrl}" class="cta-button">Accept Invitation</a>
      </div>
      
      <div class="expiry-notice">
        <strong>⏰ Important:</strong> This invitation will expire on ${new Date(data.expiresAt).toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        })} at ${new Date(data.expiresAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}. Please accept it before then to join the team.
      </div>
      
      <p class="help-text">
        <strong>What happens next?</strong><br>
        When you click "Accept Invitation", you'll be taken to Flowvya where you can create your account (if you don't have one) or sign in to join the team. Once you're set up, you'll have access to all the features your role allows.
      </p>
      
      <p class="help-text">
        If you have any questions about this invitation or need help getting started, feel free to reach out to ${data.inviterName} at ${data.inviterEmail}.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Flowvya</strong> - Streamline your expense tracking and invoicing</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      <p style="margin-top: 20px;">
        <a href="${data.invitationUrl}" style="color: #8b5cf6;">Accept Invitation</a> | 
        <a href="https://flowvya.com" style="color: #6b7280;">Learn More</a>
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  private generateInvitationEmailText(data: TeamInvitationData): string {
    const roleDescription = this.getRoleDescription(data.role);
    
    return `
Team Invitation - Join Flowvya

Hi there!

${data.inviterName} (${data.inviterEmail}) has invited you to join their team on Flowvya, the all-in-one expense tracking and invoice management platform.

Invitation Details:
- Invited by: ${data.inviterName}
- Your role: ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}
- Permissions: ${roleDescription}
${data.companyName ? `- Company: ${data.companyName}` : ''}

To accept this invitation, click the link below:
${data.invitationUrl}

IMPORTANT: This invitation will expire on ${new Date(data.expiresAt).toLocaleDateString('en-US', { 
  weekday: 'long',
  year: 'numeric', 
  month: 'long', 
  day: 'numeric'
})} at ${new Date(data.expiresAt).toLocaleTimeString('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
})}. Please accept it before then to join the team.

What happens next?
When you click the link, you'll be taken to Flowvya where you can create your account (if you don't have one) or sign in to join the team. Once you're set up, you'll have access to all the features your role allows.

If you have any questions about this invitation or need help getting started, feel free to reach out to ${data.inviterName} at ${data.inviterEmail}.

---
Flowvya - Streamline your expense tracking and invoicing
If you didn't expect this invitation, you can safely ignore this email.

Accept Invitation: ${data.invitationUrl}
Learn More: https://flowvya.com
`;
  }

  async sendTeamInvitation(data: TeamInvitationData): Promise<InvitationEmailResult> {
    try {
      console.log('📧 TeamInvitationService - Starting email send');
      
      if (!process.env.RESEND_API_KEY) {
        console.error('❌ Resend API key not configured');
        throw new Error('Resend API key not configured');
      }

      // Clean all data fields to prevent newline issues
      const cleanData = {
        ...data,
        inviterName: this.cleanEmailString(data.inviterName),
        inviterEmail: this.cleanEmailString(data.inviterEmail),
        inviteeName: this.cleanEmailString(data.inviteeName),
        inviteeEmail: this.cleanEmailString(data.inviteeEmail),
        role: this.cleanEmailString(data.role),
        companyName: data.companyName ? this.cleanEmailString(data.companyName) : undefined,
      };

      console.log('📧 Email details:', {
        from: this.fromEmail,
        to: cleanData.inviteeEmail,
        inviter: cleanData.inviterName,
        role: cleanData.role,
        fromEnv: process.env.RESEND_FROM_EMAIL,
        apiKeyExists: !!process.env.RESEND_API_KEY
      });

      const emailData = {
        from: this.fromEmail,
        to: [cleanData.inviteeEmail],
        subject: `🎉 You're invited to join ${cleanData.inviterName}'s team on Flowvya`,
        html: this.generateInvitationEmailHTML(cleanData),
        text: this.generateInvitationEmailText(cleanData),
      };

      const response = await resend.emails.send(emailData);
      console.log('📧 Resend response:', JSON.stringify(response, null, 2));

      if (response.error) {
        console.error('❌ Resend API error:', response.error);
        throw new Error(`Resend API error: ${response.error.message}`);
      }

      if (!response.data?.id) {
        console.error('❌ No message ID returned from Resend');
        throw new Error('Email sent but no message ID returned');
      }

      return {
        success: true,
        messageId: response.data?.id
      };

    } catch (error) {
      console.error('Error sending team invitation email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
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

// Default team invitation service instance
export const teamInvitationService = new TeamInvitationService();