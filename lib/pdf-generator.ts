import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface InvoiceData {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  subject?: string;
  notes?: string;
  terms?: string;
  footer_text?: string;
  currency: string;
  
  // Client information
  client: {
    name: string;
    email: string;
    company_name?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  
  // Template styling
  template: {
    name: string;
    template_type: string;
    color_scheme: string;
    footer_text?: string;
    company_name?: string;
    company_address?: string;
    company_phone?: string;
    company_email?: string;
  };
  
  // Line items
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  
  // Business information (from user profile)
  business: {
    name: string;
    email: string;
    phone?: string;
    website?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

interface ColorScheme {
  primary: string;
  secondary: string;
  text: string;
  light: string;
}

const colorSchemes: Record<string, ColorScheme> = {
  blue: {
    primary: '#2563eb',
    secondary: '#dbeafe',
    text: '#1e40af',
    light: '#f0f9ff'
  },
  green: {
    primary: '#059669',
    secondary: '#d1fae5',
    text: '#047857',
    light: '#f0fdf4'
  },
  purple: {
    primary: '#7c3aed',
    secondary: '#e9d5ff',
    text: '#6d28d9',
    light: '#faf5ff'
  },
  orange: {
    primary: '#ea580c',
    secondary: '#fed7aa',
    text: '#c2410c',
    light: '#fff7ed'
  },
  gray: {
    primary: '#374151',
    secondary: '#e5e7eb',
    text: '#1f2937',
    light: '#f9fafb'
  },
  red: {
    primary: '#dc2626',
    secondary: '#fecaca',
    text: '#b91c1c',
    light: '#fef2f2'
  }
};

export class InvoicePDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private colors: ColorScheme;

  constructor(private invoiceData: InvoiceData) {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
    
    // Debug logging
    console.log('PDF Generator - Invoice Data:', invoiceData);
    console.log('PDF Generator - Template Data:', invoiceData.template);
    console.log('PDF Generator - Business Data:', invoiceData.business);
    
    // Ensure we have valid template and color scheme
    const colorSchemeValue = invoiceData.template?.color_scheme || 'blue';
    
    // Check if it's a hex color (starts with #) or a named scheme
    if (colorSchemeValue.startsWith('#')) {
      // Create a custom color scheme from the hex color
      this.colors = this.createColorSchemeFromHex(colorSchemeValue);
    } else {
      // Use predefined color scheme
      this.colors = colorSchemes[colorSchemeValue] || colorSchemes.blue;
    }
    
    console.log('PDF Generator - Using color scheme:', colorSchemeValue, this.colors);
  }

  public generate(): Blob {
    this.addHeader();
    this.addInvoiceInfo();
    this.addBillingInfo();
    this.addLineItems();
    this.addTotals();
    this.addNotes();
    this.addFooter();
    
    return this.doc.output('blob');
  }

  public download(filename?: string): void {
    const name = filename || `Invoice-${this.invoiceData.invoice_number}.pdf`;
    // Generate the PDF content before downloading
    this.addHeader();
    this.addInvoiceInfo();
    this.addBillingInfo();
    this.addLineItems();
    this.addTotals();
    this.addNotes();
    this.addFooter();
    
    this.doc.save(name);
  }

  private addHeader(): void {
    const yPos = this.margin;
    
    // Add colored header background
    const [r, g, b] = this.hexToRgb(this.colors.primary);
    this.doc.setFillColor(r, g, b);
    this.doc.rect(0, 0, this.pageWidth, 60, 'F');
    
    // Business name and invoice title
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    // Use template company name, show placeholder if empty, no fallback to tenant
    const templateCompanyName = this.invoiceData.template?.company_name?.trim();
    const businessName = (templateCompanyName && templateCompanyName !== '') ? 
                         templateCompanyName : 
                         '[Company Name Not Set]';
    
    console.log('PDF Generator - Business name selection:', {
      templateCompanyName: this.invoiceData.template?.company_name,
      businessName: this.invoiceData.business?.name,
      businessEmail: this.invoiceData.business?.email,
      finalBusinessName: businessName
    });
    
    this.doc.text(businessName, this.margin, yPos + 15);
    
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('INVOICE', this.pageWidth - this.margin - 40, yPos + 15);
    
    // Business contact info - use ONLY template info, show placeholders if empty
    this.doc.setFontSize(10);
    let contactY = yPos + 25;
    
    const templateEmail = this.invoiceData.template?.company_email?.trim();
    if (templateEmail) {
      this.doc.text(templateEmail, this.margin, contactY);
      contactY += 5;
    } else {
      this.doc.setTextColor(150, 150, 150); // Gray color for placeholder
      this.doc.text('[Email Not Set]', this.margin, contactY);
      this.doc.setTextColor(255, 255, 255); // Reset to white
      contactY += 5;
    }
    
    const templatePhone = this.invoiceData.template?.company_phone?.trim();
    if (templatePhone) {
      this.doc.text(templatePhone, this.margin, contactY);
      contactY += 5;
    } else {
      this.doc.setTextColor(150, 150, 150);
      this.doc.text('[Phone Not Set]', this.margin, contactY);
      this.doc.setTextColor(255, 255, 255);
      contactY += 5;
    }
    
    const templateAddress = this.invoiceData.template?.company_address?.trim();
    if (templateAddress) {
      this.doc.text(templateAddress, this.margin, contactY);
    } else {
      this.doc.setTextColor(150, 150, 150);
      this.doc.text('[Address Not Set]', this.margin, contactY);
      this.doc.setTextColor(255, 255, 255);
    }
    
    // Invoice number and status
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`#${this.invoiceData.invoice_number}`, this.pageWidth - this.margin - 50, yPos + 35);
    
    // Status badge
    const [sr, sg, sb] = this.getStatusColor(this.invoiceData.status);
    this.doc.setFillColor(sr, sg, sb);
    this.doc.roundedRect(this.pageWidth - this.margin - 50, yPos + 40, 40, 8, 2, 2, 'F');
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(8);
    this.doc.text(this.invoiceData.status.toUpperCase(), this.pageWidth - this.margin - 45, yPos + 46);
  }

  private addInvoiceInfo(): void {
    const yPos = 80;
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    
    // Invoice details section
    this.doc.text('Invoice Details', this.margin, yPos);
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    
    const detailsY = yPos + 10;
    this.doc.text(`Issue Date: ${this.formatDate(this.invoiceData.issue_date)}`, this.margin, detailsY);
    this.doc.text(`Due Date: ${this.formatDate(this.invoiceData.due_date)}`, this.margin, detailsY + 8);
    
    if (this.invoiceData.subject) {
      this.doc.text(`Subject: ${this.invoiceData.subject}`, this.margin, detailsY + 16);
    }
  }

  private addBillingInfo(): void {
    const yPos = 80;
    const rightX = this.pageWidth / 2 + 10;
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Bill To:', rightX, yPos);
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    
    let billY = yPos + 10;
    
    // Client name
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(this.invoiceData.client.name, rightX, billY);
    billY += 8;
    
    this.doc.setFont('helvetica', 'normal');
    
    // Company name
    if (this.invoiceData.client.company_name) {
      this.doc.text(this.invoiceData.client.company_name, rightX, billY);
      billY += 6;
    }
    
    // Email
    this.doc.text(this.invoiceData.client.email, rightX, billY);
    billY += 6;
    
    // Address
    if (this.invoiceData.client.address_line1) {
      this.doc.text(this.invoiceData.client.address_line1, rightX, billY);
      billY += 6;
    }
    
    if (this.invoiceData.client.address_line2) {
      this.doc.text(this.invoiceData.client.address_line2, rightX, billY);
      billY += 6;
    }
    
    if (this.invoiceData.client.city || this.invoiceData.client.state) {
      const cityState = [
        this.invoiceData.client.city,
        this.invoiceData.client.state,
        this.invoiceData.client.postal_code
      ].filter(Boolean).join(', ');
      
      if (cityState) {
        this.doc.text(cityState, rightX, billY);
        billY += 6;
      }
    }
    
    if (this.invoiceData.client.country && this.invoiceData.client.country !== 'United States') {
      this.doc.text(this.invoiceData.client.country, rightX, billY);
    }
  }

  private addLineItems(): void {
    const startY = 150;
    
    // Table headers
    const headers = [['Description', 'Qty', 'Rate', 'Amount']];
    
    // Table data - ensure we have items
    const items = this.invoiceData.items || [];
    if (items.length === 0) {
      this.doc.setFontSize(10);
      this.doc.text('No items found', this.margin, startY);
      return;
    }
    
    const data = items.map(item => [
      item.description || 'N/A',
      (item.quantity || 0).toString(),
      this.formatCurrency(item.rate || 0),
      this.formatCurrency(item.amount || 0)
    ]);

    (this.doc as any).autoTable({
      head: headers,
      body: data,
      startY: startY,
      margin: { left: this.margin, right: this.margin },
      headStyles: {
        fillColor: this.hexToRgb(this.colors.primary),
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      },
      alternateRowStyles: {
        fillColor: this.hexToRgb(this.colors.light)
      }
    });
  }

  private addTotals(): void {
    // Handle case when no table was generated
    const finalY = (this.doc as any).lastAutoTable?.finalY 
      ? (this.doc as any).lastAutoTable.finalY + 20 
      : 180;
    const rightX = this.pageWidth - this.margin - 60;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    let totalsY = finalY;
    
    // Subtotal
    this.doc.text('Subtotal:', rightX - 30, totalsY);
    this.doc.text(this.formatCurrency(this.invoiceData.subtotal), rightX, totalsY);
    totalsY += 8;
    
    // Tax (if applicable)
    if (this.invoiceData.tax_rate > 0) {
      this.doc.text(`Tax (${(this.invoiceData.tax_rate * 100).toFixed(1)}%):`, rightX - 30, totalsY);
      this.doc.text(this.formatCurrency(this.invoiceData.tax_amount), rightX, totalsY);
      totalsY += 8;
    }
    
    // Total line
    this.doc.setLineWidth(0.5);
    this.doc.line(rightX - 30, totalsY + 2, rightX + 30, totalsY + 2);
    totalsY += 10;
    
    // Total amount
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('Total:', rightX - 30, totalsY);
    this.doc.text(this.formatCurrency(this.invoiceData.total_amount), rightX, totalsY);
  }

  private addNotes(): void {
    const finalY = (this.doc as any).lastAutoTable?.finalY 
      ? (this.doc as any).lastAutoTable.finalY + 80
      : 250;
    
    if (this.invoiceData.notes) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Notes:', this.margin, finalY);
      
      this.doc.setFont('helvetica', 'normal');
      const splitNotes = this.doc.splitTextToSize(this.invoiceData.notes, this.pageWidth - 2 * this.margin);
      this.doc.text(splitNotes, this.margin, finalY + 10);
    }
    
    if (this.invoiceData.terms) {
      const notesHeight = this.invoiceData.notes ? 
        this.doc.splitTextToSize(this.invoiceData.notes, this.pageWidth - 2 * this.margin).length * 5 : 0;
      
      const termsY = finalY + 20 + notesHeight;
      
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Terms & Conditions:', this.margin, termsY);
      
      this.doc.setFont('helvetica', 'normal');
      const splitTerms = this.doc.splitTextToSize(this.invoiceData.terms, this.pageWidth - 2 * this.margin);
      this.doc.text(splitTerms, this.margin, termsY + 10);
    }
  }

  private addFooter(): void {
    const footerY = this.pageHeight - 30;
    
    // Footer background
    const [fr, fg, fb] = this.hexToRgb(this.colors.secondary);
    this.doc.setFillColor(fr, fg, fb);
    this.doc.rect(0, footerY - 10, this.pageWidth, 40, 'F');
    
    const [tr, tg, tb] = this.hexToRgb(this.colors.text);
    this.doc.setTextColor(tr, tg, tb);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    
    const footerText = this.invoiceData.template.footer_text || 
                      this.invoiceData.footer_text || 
                      `Generated on ${new Date().toLocaleDateString()}`;
    
    this.doc.text(footerText, this.pageWidth / 2, footerY, { align: 'center' });
    
    // Page number
    this.doc.text(`Page 1`, this.pageWidth - this.margin, footerY);
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.invoiceData.currency || 'USD'
    }).format(amount);
  }

  private hexToRgb(hex: string): [number, number, number] {
    // Handle case where hex might be undefined or invalid
    if (!hex || typeof hex !== 'string') {
      return [0, 0, 0];
    }
    
    // Remove # if present and ensure it's a valid hex
    const cleanHex = hex.replace('#', '');
    if (!/^[a-f\d]{6}$/i.test(cleanHex)) {
      return [0, 0, 0];
    }
    
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }

  private createColorSchemeFromHex(primaryHex: string): ColorScheme {
    // Convert hex to RGB for calculations
    const [r, g, b] = this.hexToRgb(primaryHex);
    
    // Create lighter version for secondary (add 50 to each RGB component, max 255)
    const lightR = Math.min(255, r + 50);
    const lightG = Math.min(255, g + 50); 
    const lightB = Math.min(255, b + 50);
    
    // Create very light version for background (add 100 to each, max 255)
    const veryLightR = Math.min(255, r + 100);
    const veryLightG = Math.min(255, g + 100);
    const veryLightB = Math.min(255, b + 100);
    
    return {
      primary: primaryHex,
      secondary: this.rgbToHex(lightR, lightG, lightB),
      text: primaryHex, // Use same color for text
      light: this.rgbToHex(veryLightR, veryLightG, veryLightB)
    };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private getStatusColor(status: string): [number, number, number] {
    switch (status.toLowerCase()) {
      case 'paid':
        return [34, 197, 94]; // green
      case 'sent':
      case 'viewed':
        return [59, 130, 246]; // blue
      case 'overdue':
        return [239, 68, 68]; // red
      case 'draft':
        return [156, 163, 175]; // gray
      default:
        return [107, 114, 128]; // gray
    }
  }
}

// Utility function to generate PDF for an invoice
export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Blob> {
  const generator = new InvoicePDFGenerator(invoiceData);
  return generator.generate();
}

// Utility function to download PDF
export async function downloadInvoicePDF(invoiceData: InvoiceData, filename?: string): Promise<void> {
  const generator = new InvoicePDFGenerator(invoiceData);
  generator.download(filename);
}