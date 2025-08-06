import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { createClient } from '@/lib/supabase/server';
import { serverTemplateEngine } from '@/lib/template-engine/server';
import { InvoiceData, LEGACY_TEMPLATE_MAPPING, TemplateType } from '@/lib/template-engine/types';

export async function POST(request: NextRequest) {
  console.log('PDF Generation API called');
  try {
    const { invoiceId, invoiceData } = await request.json();
    console.log('PDF API received:', { invoiceId: !!invoiceId, invoiceData: !!invoiceData });
    
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

      // Debug logging to see what template type is loaded
      if (dbInvoiceData?.template) {
        console.log('Loaded template from database:', {
          template_id: dbInvoiceData.template.id,
          template_name: dbInvoiceData.template.name,
          template_type: dbInvoiceData.template.template_type,
          color_scheme: dbInvoiceData.template.color_scheme
        });
      }

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

    // Convert to EXACT SAME format as invoice preview uses
    const unifiedInvoiceData: InvoiceData = {
      id: completeInvoiceData.id,
      invoice_number: completeInvoiceData.invoice_number,
      issue_date: completeInvoiceData.issue_date,
      due_date: completeInvoiceData.due_date,
      status: completeInvoiceData.status,
      subject: completeInvoiceData.subject,
      notes: completeInvoiceData.notes,
      terms: completeInvoiceData.terms || completeInvoiceData.template?.default_payment_terms,
      footer_text: completeInvoiceData.footer_text,
      
      subtotal: completeInvoiceData.subtotal,
      tax_rate: completeInvoiceData.tax_rate,
      tax_amount: completeInvoiceData.tax_amount || (completeInvoiceData.subtotal * completeInvoiceData.tax_rate),
      total_amount: completeInvoiceData.total_amount,
      currency: completeInvoiceData.currency || 'USD',
      
      template: completeInvoiceData.template,
      business: completeInvoiceData.business,
      client: completeInvoiceData.client,
      items: completeInvoiceData.items
    };
    
    console.log('MATCHING PREVIEW DATA STRUCTURE:', {
      templateType: unifiedInvoiceData.template?.template_type,
      templateName: unifiedInvoiceData.template?.name,
      colorScheme: unifiedInvoiceData.template?.color_scheme,
      showTax: unifiedInvoiceData.template?.show_tax,
      companyName: unifiedInvoiceData.template?.company_name
    });
    
    // Get template type - handle both legacy and new template types
    const rawTemplateType = completeInvoiceData.template?.template_type || 'traditional-corporate';
    const templateType = LEGACY_TEMPLATE_MAPPING[rawTemplateType as keyof typeof LEGACY_TEMPLATE_MAPPING] || rawTemplateType as TemplateType;
    
    console.log('Template Type Detection:', {
      rawTemplateType,
      finalTemplateType: templateType,
      templateData: completeInvoiceData.template
    });
    
    // Generate HTML using server template engine - MUST MATCH PREVIEW EXACTLY
    console.log('PDF Generation: Generating HTML with template type:', templateType);
    console.log('PDF Generation: Using color scheme:', unifiedInvoiceData.template?.color_scheme);
    
    const html = serverTemplateEngine.generatePDFDocument(templateType, unifiedInvoiceData);
    
    // Validate consistency (development mode)
    if (process.env.NODE_ENV === 'development') {
      const { consistencyChecker } = await import('@/lib/template-engine/validation/consistency-checker');
      const report = consistencyChecker.validateTemplate(templateType, unifiedInvoiceData, html);
      
      console.log('PDF Consistency Report:', {
        score: report.score,
        isConsistent: report.isConsistent,
        issueCount: report.issues.length
      });
      
      if (!report.isConsistent) {
        console.warn('PDF Consistency Issues:', report.issues);
        console.warn('Recommendations:', report.recommendations);
      }
    }
    
    // Log HTML snippet for debugging (first 500 chars)
    console.log('PDF Generation: HTML preview:', html.substring(0, 500) + '...');

    // Generate PDF with Puppeteer - Enhanced configuration for perfect styling
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--enable-font-antialiasing',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2
      });
      
      // Enable console logging for debugging
      page.on('console', msg => console.log('PDF Page Log:', msg.text()));
      page.on('pageerror', error => console.error('PDF Page Error:', error.message));
      
      // Set content with extended wait conditions
      await page.setContent(html, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      });
      
      // Wait for fonts, images, and Tailwind to load completely
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          let fontsLoaded = false;
          let imagesLoaded = false;
          let tailwindReady = false;
          
          // Check fonts
          if (document.fonts) {
            document.fonts.ready.then(() => {
              fontsLoaded = true;
              checkAllReady();
            });
          } else {
            fontsLoaded = true;
          }
          
          // Check images
          const images = Array.from(document.images);
          if (images.length === 0) {
            imagesLoaded = true;
          } else {
            let loadedCount = 0;
            images.forEach(img => {
              if (img.complete) {
                loadedCount++;
              } else {
                img.onload = img.onerror = () => {
                  loadedCount++;
                  if (loadedCount === images.length) {
                    imagesLoaded = true;
                    checkAllReady();
                  }
                };
              }
            });
            if (loadedCount === images.length) {
              imagesLoaded = true;
            }
          }
          
          // Check Tailwind
          const checkTailwind = () => {
            if (window.tailwind && document.readyState === 'complete') {
              tailwindReady = true;
              checkAllReady();
            } else {
              setTimeout(checkTailwind, 100);
            }
          };
          checkTailwind();
          
          function checkAllReady() {
            if (fontsLoaded && imagesLoaded && tailwindReady) {
              // Extra delay for final render
              setTimeout(resolve, 500);
            }
          }
        });
      });
      
      // Generate PDF with optimal settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        margin: {
          top: '10mm',
          bottom: '10mm', 
          left: '10mm',
          right: '10mm'
        },
        // Force high quality rendering
        scale: 1,
        timeout: 30000
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

// Legacy rendering functions removed - now using unified template engine

// Legacy template rendering functions removed - using unified template engine now