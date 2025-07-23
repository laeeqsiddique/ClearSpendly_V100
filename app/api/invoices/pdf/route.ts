import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { createClient } from '@/lib/supabase/server';

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
  client: any;
  template: any;
  items: any[];
  business: any;
}

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, invoiceData } = await request.json();
    
    // If invoice data is provided directly, use it (fallback approach)
    let completeInvoiceData: InvoiceData;
    
    if (invoiceData) {
      completeInvoiceData = invoiceData;
    } else if (invoiceId) {
      // Fetch from database approach
      const supabase = await createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      
      if (!user) {
        console.error('No user found');
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 });
      }

      // Fetch complete invoice data
      const { data: dbInvoiceData, error: invoiceError } = await supabase
        .from('invoice')
        .select(`
          *,
          client:client_id (*),
          template:template_id (*),
          items:invoice_item (*)
        `)
        .eq('id', invoiceId)
        .eq('tenant_id', membership.tenant_id)
        .single();

      if (invoiceError || !dbInvoiceData) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Get business information from tenant
      const { data: profile } = await supabase
        .from('tenant')
        .select('*')
        .eq('id', membership.tenant_id)
        .single();

      const businessInfo = {
        name: profile?.name || "Your Business",
        email: user.email || "",
        phone: profile?.phone || "",
        website: profile?.website || "",
        address_line1: profile?.address_line1 || "",
        address_line2: profile?.address_line2 || "",
        city: profile?.city || "",
        state: profile?.state || "",
        postal_code: profile?.postal_code || "",
        country: profile?.country || "United States"
      };

      completeInvoiceData = {
        ...dbInvoiceData,
        business: businessInfo,
        items: dbInvoiceData.items || []
      };
    } else {
      return NextResponse.json({ error: 'Invoice ID or data is required' }, { status: 400 });
    }

    // Generate HTML
    const html = generateInvoiceHTML(completeInvoiceData);

    // Generate PDF with Puppeteer
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '15mm',
          right: '15mm'
        }
      });
      
      await browser.close();
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Invoice-${completeInvoiceData.invoice_number}.pdf"`
        }
      });
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      console.error('Error generating PDF:', error);
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in PDF generation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateInvoiceHTML(invoiceData: InvoiceData): string {
  const { template } = invoiceData;
  const fontClass = getFontClass(template.font_family);

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${invoiceData.invoice_number}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Open+Sans:wght@300;400;500;600;700;800&family=Roboto:wght@100;300;400;500;700;900&family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap');
        
        body { 
            margin: 0; 
            padding: 20px; 
            background: white;
            font-family: ${getFontFamily(template.font_family)};
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
        }

        @media print {
            body { margin: 0; padding: 0; }
            .invoice-container { margin: 0; max-width: none; }
        }
    </style>
</head>
<body>
    <div class="invoice-container ${fontClass}">
        ${renderTemplate(invoiceData)}
    </div>
</body>
</html>`;
}

function renderTemplate(invoiceData: InvoiceData): string {
  const { template } = invoiceData;
  
  switch (template.template_type) {
    case 'bold':
      return renderBoldTemplate(invoiceData);
    case 'classic':
      return renderClassicTemplate(invoiceData);
    case 'modern':
      return renderModernTemplate(invoiceData);
    case 'minimal':
      return renderMinimalTemplate(invoiceData);
    default:
      console.log('Unknown template type:', template.template_type);
      return renderBoldTemplate(invoiceData); // fallback
  }
}

function renderBoldTemplate(invoiceData: InvoiceData): string {
  const { template, client, items } = invoiceData;
  const color = template.color_scheme || '#1e40af';
  
  // Build client address
  const clientAddress = [
    client.address_line1,
    client.address_line2,
    [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
    client.country !== 'United States' ? client.country : null
  ].filter(Boolean).join('\n');

  return `
    <!-- Bold Template - Eye-catching with Rich Colors -->
    <div class="bg-white p-8">
      
      <!-- Header Background -->
      <div class="relative p-6 mb-8 rounded-lg" style="background: linear-gradient(135deg, ${color}, ${color}dd);">
        
        <!-- Logo Section for Bold -->
        ${template.logo_url ? `
        <div class="mb-4 ${
          template.logo_position === 'center' ? 'flex justify-center' :
          template.logo_position === 'right' ? 'flex justify-end' : 'flex justify-start'
        }">
          <div class="bg-white rounded-lg p-2 inline-block">
            <img 
              src="${template.logo_url}" 
              alt="Company Logo" 
              style="height: ${getLogoHeight(template.logo_size)}px; width: auto; object-fit: contain;"
              class="max-w-full"
            />
          </div>
        </div>
        ` : ''}
        
        <div class="flex justify-between items-start text-white">
          <div>
            ${template.company_name ? `
            <h1 class="text-4xl font-bold mb-3">${template.company_name}</h1>
            ` : ''}
            ${template.company_address ? `
            <div class="text-sm opacity-90 whitespace-pre-line leading-relaxed">
              ${template.company_address}
            </div>
            ` : ''}
            ${template.company_phone || template.company_email ? `
            <div class="text-sm opacity-90 mt-2">
              <div>
                ${[template.company_phone, template.company_email].filter(Boolean).join(' | ')}
              </div>
            </div>
            ` : ''}
          </div>
          <div class="text-right">
            <div class="bg-white p-4 rounded-lg shadow-lg">
              <h2 class="text-3xl font-bold text-gray-900">INVOICE</h2>
              <div class="text-sm mt-3 space-y-1 text-gray-700">
                <div><strong>#${invoiceData.invoice_number}</strong></div>
                <div>${formatDate(invoiceData.issue_date)}</div>
                <div class="text-gray-600">Due: ${formatDate(invoiceData.due_date)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bill To -->
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-4 h-4 rounded" style="background-color: ${color};"></div>
          <h3 class="font-bold text-lg text-gray-900">BILL TO</h3>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg border-l-4" style="border-color: ${color};">
          <div class="text-gray-700">
            <div class="font-bold text-lg">${client.name}</div>
            ${client.company_name ? `<div class="font-medium text-gray-600">${client.company_name}</div>` : ''}
            ${clientAddress ? `<div class="whitespace-pre-line mt-2 text-sm">${clientAddress}</div>` : ''}
            ${client.email ? `<div class="text-sm mt-1 text-gray-600">${client.email}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="mb-8">
        <table class="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr style="background: linear-gradient(135deg, ${color}, ${color}dd); color: white;">
              <th class="text-left py-4 px-6 font-bold">DESCRIPTION</th>
              <th class="text-center py-4 px-6 font-bold w-20">QTY</th>
              <th class="text-right py-4 px-6 font-bold w-24">RATE</th>
              <th class="text-right py-4 px-6 font-bold w-24">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => `
            <tr class="border-b border-gray-200 ${index % 2 === 1 ? 'bg-gray-50' : ''}">
              <td class="py-4 px-6 text-gray-800 font-medium">${item.description}</td>
              <td class="py-4 px-6 text-gray-600 text-center">${item.quantity}</td>
              <td class="py-4 px-6 text-gray-600 text-right">$${item.rate.toFixed(2)}</td>
              <td class="py-4 px-6 text-gray-800 text-right font-bold">$${item.amount.toFixed(2)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="flex justify-end mb-8">
        <div class="w-80">
          <div class="space-y-2">
            <div class="flex justify-between py-2 px-4 bg-gray-50 rounded">
              <span class="font-medium text-gray-700">Subtotal</span>
              <span class="font-bold text-gray-900">$${invoiceData.subtotal.toFixed(2)}</span>
            </div>
            ${invoiceData.tax_rate > 0 ? `
            <div class="flex justify-between py-2 px-4 bg-gray-50 rounded">
              <span class="font-medium text-gray-700">Tax (${(invoiceData.tax_rate * 100).toFixed(1)}%)</span>
              <span class="font-bold text-gray-900">$${invoiceData.tax_amount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="flex justify-between py-4 px-4 rounded text-white font-bold text-xl" style="background-color: ${color};">
              <span>TOTAL</span>
              <span>$${invoiceData.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Terms -->
      <div class="border-t-2 pt-6" style="border-color: ${color};">
        <div class="bg-gray-50 p-4 rounded-lg">
          <div class="text-gray-700">
            <div class="font-bold text-gray-900 mb-2">Payment Information</div>
            ${invoiceData.terms ? `<div><strong>Terms:</strong> ${invoiceData.terms}</div>` : ''}
            ${invoiceData.notes ? `<div class="mt-2"><strong>Notes:</strong> ${invoiceData.notes}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function getFontClass(fontFamily?: string): string {
  if (!fontFamily) return 'font-sans';
  return fontFamily;
}

function getFontFamily(fontFamily?: string): string {
  const fontMap: Record<string, string> = {
    'font-sans': 'Inter, system-ui, sans-serif',
    'font-serif': 'ui-serif, serif',
    'font-mono': 'ui-monospace, monospace',
    'font-["Inter"]': 'Inter, sans-serif',
    'font-["Open_Sans"]': 'Open Sans, sans-serif',
    'font-["Roboto"]': 'Roboto, sans-serif',
    'font-["Poppins"]': 'Poppins, sans-serif',
  };
  
  return fontMap[fontFamily || 'font-sans'] || 'Inter, system-ui, sans-serif';
}

function getLogoHeight(size?: string): number {
  switch (size) {
    case 'small': return 40;
    case 'medium': return 60;
    case 'large': return 80;
    default: return 60;
  }
}

function renderClassicTemplate(invoiceData: InvoiceData): string {
  const { template, client, items } = invoiceData;
  const color = template.color_scheme || '#1e40af';
  
  // Build client address
  const clientAddress = [
    client.address_line1,
    client.address_line2,
    [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
    client.country !== 'United States' ? client.country : null
  ].filter(Boolean).join('\n');

  return `
    <!-- Classic Template - Traditional Layout -->
    <div class="bg-white p-8">
      <div class="border-b-4 mb-6" style="border-color: ${color};">
        
        <!-- Logo Section -->
        ${template.logo_url ? `
        <div class="mb-6 ${
          template.logo_position === 'center' ? 'flex justify-center' :
          template.logo_position === 'right' ? 'flex justify-end' : 'flex justify-start'
        }">
          <img 
            src="${template.logo_url}" 
            alt="Company Logo" 
            style="height: ${getLogoHeight(template.logo_size)}px; width: auto; object-fit: contain;"
            class="max-w-full"
          />
        </div>
        ` : ''}
        
        <div class="flex justify-between items-start mb-6">
          <div>
            ${template.company_name ? `
            <h1 class="text-4xl font-bold text-gray-900">${template.company_name}</h1>
            ` : ''}
            ${template.company_address ? `
            <div class="text-sm text-gray-600 mt-3 whitespace-pre-line leading-relaxed">
              ${template.company_address}
            </div>
            ` : ''}
            ${template.company_phone || template.company_email ? `
            <div class="text-sm text-gray-600 mt-2">
              <div>
                ${[template.company_phone, template.company_email].filter(Boolean).join(' • ')}
              </div>
            </div>
            ` : ''}
          </div>
          <div class="text-right">
            <div class="bg-gray-100 p-4 rounded">
              <h2 class="text-2xl font-bold text-gray-900">INVOICE</h2>
              <div class="text-sm text-gray-600 mt-2">
                <div><strong>Invoice #:</strong> ${invoiceData.invoice_number}</div>
                <div><strong>Date:</strong> ${formatDate(invoiceData.issue_date)}</div>
                <div><strong>Due:</strong> ${formatDate(invoiceData.due_date)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bill To -->
      <div class="mb-8">
        <div class="bg-gray-50 p-4 rounded">
          <h3 class="font-bold text-gray-900 mb-2">BILL TO:</h3>
          <div class="text-sm text-gray-700">
            <div class="font-medium text-base">${client.name}</div>
            ${client.company_name ? `<div class="font-medium">${client.company_name}</div>` : ''}
            ${clientAddress ? `<div class="whitespace-pre-line mt-1">${clientAddress}</div>` : ''}
            ${client.email ? `<div class="text-sm mt-1 text-gray-600">${client.email}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="mb-8">
        <table class="w-full border border-gray-300">
          <thead>
            <tr style="background-color: ${color}; color: white;">
              <th class="text-left py-3 px-4 font-semibold">Description</th>
              <th class="text-center py-3 px-4 font-semibold w-20">Qty</th>
              <th class="text-right py-3 px-4 font-semibold w-24">Rate</th>
              <th class="text-right py-3 px-4 font-semibold w-24">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => `
            <tr class="border-b border-gray-300 ${index % 2 === 1 ? 'bg-gray-50' : ''}">
              <td class="py-3 px-4 text-sm text-gray-700">${item.description}</td>
              <td class="py-3 px-4 text-sm text-gray-700 text-center">${item.quantity}</td>
              <td class="py-3 px-4 text-sm text-gray-700 text-right">$${item.rate.toFixed(2)}</td>
              <td class="py-3 px-4 text-sm text-gray-700 text-right font-medium">$${item.amount.toFixed(2)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="flex justify-end mb-8">
        <div class="w-72 border border-gray-300">
          <div class="bg-gray-50 flex justify-between py-2 px-4 border-b">
            <span class="text-sm font-medium text-gray-700">Subtotal:</span>
            <span class="text-sm font-medium text-gray-900">$${invoiceData.subtotal.toFixed(2)}</span>
          </div>
          ${invoiceData.tax_rate > 0 ? `
          <div class="bg-gray-50 flex justify-between py-2 px-4 border-b">
            <span class="text-sm font-medium text-gray-700">Tax (${(invoiceData.tax_rate * 100).toFixed(1)}%):</span>
            <span class="text-sm font-medium text-gray-900">$${invoiceData.tax_amount.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="flex justify-between py-3 px-4" style="background-color: ${color}; color: white;">
            <span class="font-bold">TOTAL:</span>
            <span class="font-bold text-lg">$${invoiceData.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Payment Terms -->
      <div class="border-t-2 border-gray-300 pt-6">
        <div class="text-sm text-gray-700">
          ${invoiceData.terms ? `<div><strong>Payment Terms:</strong> ${invoiceData.terms}</div>` : ''}
          ${invoiceData.notes ? `<div class="mt-2"><strong>Notes:</strong> ${invoiceData.notes}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderModernTemplate(invoiceData: InvoiceData): string {
  const { template, client, items } = invoiceData;
  const color = template.color_scheme || '#1e40af';
  
  // Build client address
  const clientAddress = [
    client.address_line1,
    client.address_line2,
    [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
    client.country !== 'United States' ? client.country : null
  ].filter(Boolean).join('\n');

  return `
    <!-- Modern Template - Clean with Accent Colors -->
    <div class="bg-white p-8">
      
      <!-- Logo Section -->
      ${template.logo_url ? `
      <div class="mb-6 ${
        template.logo_position === 'center' ? 'flex justify-center' :
        template.logo_position === 'right' ? 'flex justify-end' : 'flex justify-start'
      }">
        <img 
          src="${template.logo_url}" 
          alt="Company Logo" 
          style="height: ${getLogoHeight(template.logo_size)}px; width: auto; object-fit: contain;"
          class="max-w-full"
        />
      </div>
      ` : ''}
      
      <div class="mb-10">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="mb-6">
              ${template.company_name ? `
              <h1 class="text-4xl font-light tracking-wide" style="color: ${color};">${template.company_name}</h1>
              ` : ''}
            </div>
            ${template.company_address ? `
            <div class="text-sm text-gray-600 whitespace-pre-line pl-5 leading-relaxed">
              ${template.company_address}
            </div>
            ` : ''}
            ${template.company_phone || template.company_email ? `
            <div class="text-sm text-gray-500 pl-5 mt-2 space-y-0.5">
              ${template.company_phone ? `<div>${template.company_phone}</div>` : ''}
              ${template.company_email ? `<div>${template.company_email}</div>` : ''}
            </div>
            ` : ''}
          </div>
          <div class="text-right">
            <div class="inline-block">
              <h2 class="text-4xl font-extralight text-gray-300 mb-6 tracking-wider">INVOICE</h2>
              <div class="text-sm text-gray-600 space-y-3">
                <div class="flex justify-between items-center gap-6">
                  <span class="text-gray-400 uppercase text-xs tracking-wide">Number</span>
                  <span class="font-semibold text-gray-800">${invoiceData.invoice_number}</span>
                </div>
                <div class="flex justify-between items-center gap-6">
                  <span class="text-gray-400 uppercase text-xs tracking-wide">Date</span>
                  <span class="font-medium text-gray-700">${formatDate(invoiceData.issue_date)}</span>
                </div>
                <div class="flex justify-between items-center gap-6">
                  <span class="text-gray-400 uppercase text-xs tracking-wide">Due</span>
                  <span class="font-medium text-gray-700">${formatDate(invoiceData.due_date)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bill To -->
      <div class="mb-10">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-1 h-1 rounded-full" style="background-color: ${color};"></div>
          <h3 class="font-medium text-gray-500 uppercase text-xs tracking-wider">Bill To</h3>
        </div>
        <div class="bg-gray-50 p-6 rounded-lg border-l-2" style="border-color: ${color};">
          <div class="text-gray-700">
            <div class="font-semibold text-lg text-gray-900">${client.name}</div>
            ${client.company_name ? `<div class="text-gray-600 font-medium">${client.company_name}</div>` : ''}
            ${clientAddress ? `<div class="whitespace-pre-line text-gray-600 mt-2 text-sm leading-relaxed">${clientAddress}</div>` : ''}
            ${client.email ? `<div class="text-sm mt-1 text-gray-600">${client.email}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="mb-8">
        <table class="w-full">
          <thead>
            <tr class="border-b" style="border-color: ${color};">
              <th class="text-left py-3 text-sm font-medium text-gray-600 uppercase tracking-wide">Description</th>
              <th class="text-center py-3 text-sm font-medium text-gray-600 uppercase tracking-wide w-20">Qty</th>
              <th class="text-right py-3 text-sm font-medium text-gray-600 uppercase tracking-wide w-24">Rate</th>
              <th class="text-right py-3 text-sm font-medium text-gray-600 uppercase tracking-wide w-24">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => `
            <tr class="border-b border-gray-100">
              <td class="py-4 text-sm text-gray-800">${item.description}</td>
              <td class="py-4 text-sm text-gray-600 text-center">${item.quantity}</td>
              <td class="py-4 text-sm text-gray-600 text-right">$${item.rate.toFixed(2)}</td>
              <td class="py-4 text-sm text-gray-800 text-right font-medium">$${item.amount.toFixed(2)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="flex justify-end mb-8">
        <div class="w-64 space-y-2">
          <div class="flex justify-between py-1">
            <span class="text-sm text-gray-500">Subtotal</span>
            <span class="text-sm text-gray-800">$${invoiceData.subtotal.toFixed(2)}</span>
          </div>
          ${invoiceData.tax_rate > 0 ? `
          <div class="flex justify-between py-1">
            <span class="text-sm text-gray-500">Tax (${(invoiceData.tax_rate * 100).toFixed(1)}%)</span>
            <span class="text-sm text-gray-800">$${invoiceData.tax_amount.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="border-t border-gray-200 pt-2">
            <div class="flex justify-between items-center">
              <span class="font-medium text-gray-800">Total</span>
              <span class="font-bold text-xl" style="color: ${color};">$${invoiceData.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Terms -->
      <div class="border-t border-gray-100 pt-6">
        <div class="text-sm text-gray-600">
          ${invoiceData.terms ? `<div class="font-medium text-gray-700 mb-1">Payment Terms: ${invoiceData.terms}</div>` : ''}
          ${invoiceData.notes ? `<div class="text-gray-600 italic">${invoiceData.notes}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderMinimalTemplate(invoiceData: InvoiceData): string {
  const { template, client, items } = invoiceData;
  const color = template.color_scheme || '#1e40af';
  
  // Build client address
  const clientAddress = [
    client.address_line1,
    client.address_line2,
    [client.city, client.state, client.postal_code].filter(Boolean).join(', '),
    client.country !== 'United States' ? client.country : null
  ].filter(Boolean).join('\n');

  return `
    <!-- Minimal Template - Ultra Clean -->
    <div class="bg-white p-8">
      
      <!-- Logo Section -->
      ${template.logo_url ? `
      <div class="mb-8 ${
        template.logo_position === 'center' ? 'flex justify-center' :
        template.logo_position === 'right' ? 'flex justify-end' : 'flex justify-start'
      }">
        <img 
          src="${template.logo_url}" 
          alt="Company Logo" 
          style="height: ${getLogoHeight(template.logo_size)}px; width: auto; object-fit: contain;"
          class="max-w-full"
        />
      </div>
      ` : ''}
      
      <div class="mb-12">
        <div class="flex justify-between items-start">
          <div>
            ${template.company_name ? `
            <h1 class="text-2xl font-normal text-gray-900 mb-6">${template.company_name}</h1>
            ` : ''}
            ${template.company_address ? `
            <div class="text-xs text-gray-500 whitespace-pre-line leading-relaxed">
              ${template.company_address}
            </div>
            ` : ''}
            ${template.company_phone || template.company_email ? `
            <div class="text-xs text-gray-500 mt-2">
              ${[template.company_phone, template.company_email].filter(Boolean).join(' · ')}
            </div>
            ` : ''}
          </div>
          <div class="text-right">
            <div class="text-xs text-gray-400 mb-4">INVOICE</div>
            <div class="text-xs text-gray-600 space-y-2">
              <div>${invoiceData.invoice_number}</div>
              <div>${formatDate(invoiceData.issue_date)}</div>
              <div class="text-gray-400">Due ${formatDate(invoiceData.due_date)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bill To -->
      <div class="mb-12">
        <div class="text-xs text-gray-400 mb-3">BILL TO</div>
        <div class="text-sm text-gray-700">
          <div class="font-medium">${client.name}</div>
          ${client.company_name ? `<div class="text-gray-500">${client.company_name}</div>` : ''}
          ${clientAddress ? `<div class="whitespace-pre-line text-gray-500 text-xs mt-1">${clientAddress}</div>` : ''}
          ${client.email ? `<div class="text-xs mt-1 text-gray-500">${client.email}</div>` : ''}
        </div>
      </div>

      <!-- Items Table -->
      <div class="mb-12">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="text-left py-2 text-xs font-normal text-gray-400 uppercase tracking-wider">Description</th>
              <th class="text-center py-2 text-xs font-normal text-gray-400 uppercase tracking-wider w-16">Qty</th>
              <th class="text-right py-2 text-xs font-normal text-gray-400 uppercase tracking-wider w-20">Rate</th>
              <th class="text-right py-2 text-xs font-normal text-gray-400 uppercase tracking-wider w-20">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
            <tr class="border-b border-gray-100">
              <td class="py-3 text-sm text-gray-700">${item.description}</td>
              <td class="py-3 text-sm text-gray-500 text-center">${item.quantity}</td>
              <td class="py-3 text-sm text-gray-500 text-right">$${item.rate.toFixed(2)}</td>
              <td class="py-3 text-sm text-gray-700 text-right">${item.amount.toFixed(2)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="flex justify-end mb-12">
        <div class="w-48 space-y-1">
          <div class="flex justify-between py-1">
            <span class="text-xs text-gray-400">Subtotal</span>
            <span class="text-xs text-gray-600">$${invoiceData.subtotal.toFixed(2)}</span>
          </div>
          ${invoiceData.tax_rate > 0 ? `
          <div class="flex justify-between py-1">
            <span class="text-xs text-gray-400">Tax (${(invoiceData.tax_rate * 100).toFixed(1)}%)</span>
            <span class="text-xs text-gray-600">$${invoiceData.tax_amount.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="border-t border-gray-200 pt-1">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700">Total</span>
              <span class="text-lg font-medium text-gray-900">$${invoiceData.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Terms -->
      <div class="border-t border-gray-100 pt-6">
        <div class="text-xs text-gray-500">
          ${invoiceData.terms ? `<div class="mb-1">Payment Terms: ${invoiceData.terms}</div>` : ''}
          ${invoiceData.notes ? `<div class="italic">${invoiceData.notes}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}