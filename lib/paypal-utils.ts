/**
 * PayPal utility functions for email templates
 * Handles PayPal.me link formatting, validation, and payment button generation
 */

export interface PayPalConfig {
  paypal_email?: string;
  paypal_me_link?: string;
  enable_paypal_payments?: boolean;
  show_paypal_email?: boolean;
  show_paypal_me_link?: boolean;
  paypal_button_text?: string;
  paypal_instructions_text?: string;
  paypal_button_color?: string;
}

export interface PayPalBusinessInfo {
  paypal_email?: string;
  paypal_me_link?: string;
}

/**
 * Formats a PayPal.me username into a full PayPal.me link
 * Handles various input formats: username, @username, https://paypal.me/username
 */
export function formatPayPalMeLink(username: string, amount?: number): string {
  if (!username) return '';
  
  // Remove common prefixes and clean up the username
  let cleanUsername = username
    .replace(/^https?:\/\/(www\.)?paypal\.me\//, '') // Remove full URL
    .replace(/^@/, '') // Remove @ prefix
    .trim();
  
  if (!cleanUsername) return '';
  
  // Build the PayPal.me URL
  let url = `https://paypal.me/${cleanUsername}`;
  
  // Add amount if provided
  if (amount && amount > 0) {
    url += `/${amount.toFixed(2)}`;
  }
  
  return url;
}

/**
 * Validates a PayPal email address
 */
export function isValidPayPalEmail(email: string): boolean {
  if (!email) return false;
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a PayPal.me username
 */
export function isValidPayPalUsername(username: string): boolean {
  if (!username) return false;
  
  // Clean the username first
  const cleanUsername = username
    .replace(/^https?:\/\/(www\.)?paypal\.me\//, '')
    .replace(/^@/, '')
    .trim();
  
  // PayPal.me usernames should be alphanumeric, dots, dashes, underscores
  // and between 3-50 characters
  const usernameRegex = /^[a-zA-Z0-9._-]{3,50}$/;
  return usernameRegex.test(cleanUsername);
}

/**
 * Checks if PayPal payment options should be shown based on business info and template config
 */
export function shouldShowPayPalPayments(
  businessInfo: PayPalBusinessInfo,
  templateConfig: PayPalConfig
): boolean {
  if (!templateConfig.enable_paypal_payments) {
    return false;
  }
  
  // Check if at least one PayPal payment method is configured and enabled
  const hasPayPalEmail = templateConfig.show_paypal_email && 
    businessInfo.paypal_email && 
    isValidPayPalEmail(businessInfo.paypal_email);
    
  const hasPayPalMe = templateConfig.show_paypal_me_link && 
    businessInfo.paypal_me_link && 
    isValidPayPalUsername(businessInfo.paypal_me_link);
  
  return hasPayPalEmail || hasPayPalMe;
}

/**
 * Generates PayPal payment section HTML for email templates
 */
export function generatePayPalPaymentSection(
  businessInfo: PayPalBusinessInfo,
  templateConfig: PayPalConfig,
  amount?: number,
  currency: string = 'USD'
): string {
  if (!shouldShowPayPalPayments(businessInfo, templateConfig)) {
    return '';
  }
  
  const instructionsText = templateConfig.paypal_instructions_text || 'You can also pay using PayPal:';
  const buttonText = templateConfig.paypal_button_text || 'Pay with PayPal';
  const buttonColor = templateConfig.paypal_button_color || '#0070ba';
  
  let paypalSection = `
    <div class="paypal-payment-section">
      <h3 class="paypal-instructions">${instructionsText}</h3>
      <div class="paypal-options">
  `;
  
  // Add PayPal.me button if configured
  if (templateConfig.show_paypal_me_link && 
      businessInfo.paypal_me_link && 
      isValidPayPalUsername(businessInfo.paypal_me_link)) {
    
    const paypalMeLink = formatPayPalMeLink(businessInfo.paypal_me_link, amount);
    const amountText = amount ? ` $${amount.toFixed(2)}` : '';
    
    paypalSection += `
      <div class="paypal-me-option">
        <a href="${paypalMeLink}" class="paypal-button" style="background-color: ${buttonColor};">
          💳 ${buttonText}${amountText}
        </a>
        <div class="paypal-security-note">
          🔒 Secure payment via PayPal
        </div>
      </div>
    `;
  }
  
  // Add PayPal email instructions if configured
  if (templateConfig.show_paypal_email && 
      businessInfo.paypal_email && 
      isValidPayPalEmail(businessInfo.paypal_email)) {
    
    paypalSection += `
      <div class="paypal-email-option">
        <div class="paypal-email-instructions">
          <strong>Or send payment to:</strong>
          <div class="paypal-email">${businessInfo.paypal_email}</div>
          ${amount ? `<div class="payment-amount">Amount: ${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)}</div>` : ''}
        </div>
      </div>
    `;
  }
  
  paypalSection += `
      </div>
    </div>
  `;
  
  return paypalSection;
}

/**
 * Generates CSS styles for PayPal payment sections
 */
export function generatePayPalCSS(templateConfig: PayPalConfig): string {
  const buttonColor = templateConfig.paypal_button_color || '#0070ba';
  const hoverColor = darkenColor(buttonColor, 10);
  
  return `
    .paypal-payment-section {
      margin: 32px 0;
      padding: 24px;
      background: #f8f9fa;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }
    
    .paypal-instructions {
      margin: 0 0 16px 0;
      color: #374151;
      font-size: 18px;
      font-weight: 600;
    }
    
    .paypal-options {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .paypal-me-option {
      text-align: center;
    }
    
    .paypal-button {
      display: inline-block;
      background-color: ${buttonColor};
      color: white !important;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: background-color 0.3s ease;
      box-shadow: 0 2px 4px rgba(0, 112, 186, 0.2);
    }
    
    .paypal-button:hover {
      background-color: ${hoverColor};
      box-shadow: 0 4px 8px rgba(0, 112, 186, 0.3);
    }
    
    .paypal-security-note {
      color: #6b7280;
      font-size: 14px;
      margin-top: 8px;
    }
    
    .paypal-email-option {
      background: white;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #d1d5db;
    }
    
    .paypal-email-instructions strong {
      color: #374151;
      font-size: 14px;
      display: block;
      margin-bottom: 8px;
    }
    
    .paypal-email {
      font-family: monospace;
      background: #f3f4f6;
      padding: 8px 12px;
      border-radius: 6px;
      color: #1f2937;
      font-weight: 600;
      font-size: 15px;
      margin: 4px 0;
    }
    
    .payment-amount {
      color: #059669;
      font-weight: 600;
      font-size: 16px;
      margin-top: 8px;
    }
    
    @media (max-width: 600px) {
      .paypal-payment-section {
        padding: 16px;
      }
      
      .paypal-button {
        padding: 14px 24px;
        font-size: 15px;
      }
    }
  `;
}

/**
 * Helper function to darken a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  // Remove the hash if present
  hex = hex.replace('#', '');
  
  // Parse r, g, b values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate darker values
  const darkerR = Math.round(r * (100 - percent) / 100);
  const darkerG = Math.round(g * (100 - percent) / 100);
  const darkerB = Math.round(b * (100 - percent) / 100);
  
  // Convert back to hex
  return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
}

/**
 * Extract PayPal username from various input formats for display
 */
export function extractPayPalUsername(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/^https?:\/\/(www\.)?paypal\.me\//, '')
    .replace(/^@/, '')
    .trim();
}

/**
 * Generate preview text for PayPal configuration
 */
export function generatePayPalPreview(
  businessInfo: PayPalBusinessInfo,
  templateConfig: PayPalConfig,
  sampleAmount: number = 150
): { hasPayPalOptions: boolean; previewText: string } {
  if (!shouldShowPayPalPayments(businessInfo, templateConfig)) {
    return { hasPayPalOptions: false, previewText: '' };
  }
  
  let preview = '';
  
  if (templateConfig.show_paypal_me_link && businessInfo.paypal_me_link) {
    const username = extractPayPalUsername(businessInfo.paypal_me_link);
    preview += `PayPal.me button: "Pay $${sampleAmount}.00 with PayPal" → paypal.me/${username}/${sampleAmount}.00\n`;
  }
  
  if (templateConfig.show_paypal_email && businessInfo.paypal_email) {
    preview += `PayPal email: "Send payment to: ${businessInfo.paypal_email}"\n`;
  }
  
  return { hasPayPalOptions: true, previewText: preview.trim() };
}