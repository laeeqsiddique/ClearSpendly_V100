import React from 'react';
import { renderToString } from 'react-dom/server';
import { TemplateConfig, InvoiceData, ColorScheme } from '../types';
import { ReactRenderer } from './react-renderer';

// This file is server-only and should not be imported on the client side

export class ReactToPDFRenderer {
  private reactRenderer: ReactRenderer;

  constructor() {
    this.reactRenderer = new ReactRenderer();
  }

  /**
   * Generate complete HTML document with Tailwind CSS for PDF generation
   * This ensures 100% visual consistency with React preview
   */
  generateCompleteDocument(config: TemplateConfig, invoiceData: InvoiceData): string {
    console.log('ReactToPDFRenderer: Generating PDF HTML using React SSR');
    
    // Get the React component from ReactRenderer
    const reactComponent = this.reactRenderer.render(config, invoiceData);
    
    // Render React component to HTML string
    const htmlContent = renderToString(reactComponent);
    
    // Get font family for the document
    const fontFamily = this.getFontFamily(config.primaryFont);
    
    // Generate complete HTML document with Tailwind CSS
    return this.generateDocumentHTML(htmlContent, invoiceData, fontFamily);
  }

  /**
   * Generate complete HTML document wrapper with enhanced PDF support
   */
  private generateDocumentHTML(content: string, invoiceData: InvoiceData, fontFamily: string): string {
    // Extract primary color for CSS variables
    const primaryColor = invoiceData.template.color_scheme || '#1e40af';
    const colorScheme = this.generateColorScheme(primaryColor);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Invoice ${invoiceData.invoice_number}</title>
    
    <!-- Tailwind CSS CDN with complete configuration -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Google Fonts for consistent typography -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
    
    <style>
        /* CSS Variables for consistent theming */
        :root {
            --primary-color: ${colorScheme.primary};
            --secondary-color: ${colorScheme.secondary};
            --accent-color: ${colorScheme.accent};
            --text-color: ${colorScheme.text};
            --text-secondary-color: ${colorScheme.textSecondary};
            --background-color: ${colorScheme.background};
            --border-color: ${colorScheme.border};
        }
        
        /* PDF-optimized base styles */
        body { 
            margin: 0; 
            padding: 20px; 
            background: white;
            font-family: ${fontFamily};
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
            font-size: 14px;
            line-height: 1.5;
        }
        
        /* Force color preservation in PDF */
        *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        
        /* Enhanced backdrop blur support for PDFs */
        .backdrop-blur-md {
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            /* Enhanced fallback for PDF rendering */
            background-color: rgba(255, 255, 255, 0.15) !important;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        /* Gradient preservation for PDFs */
        [style*="background: linear-gradient"],
        [style*="background-image: linear-gradient"] {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        
        /* Enhanced shadow support */
        .shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important; }
        .shadow { box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1) !important; }
        .shadow-md { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important; }
        .shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important; }
        .shadow-xl { box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important; }
        
        /* Opacity class fixes for PDF */
        .bg-white\\/10 { background-color: rgba(255, 255, 255, 0.1) !important; }
        .bg-white\\/15 { background-color: rgba(255, 255, 255, 0.15) !important; }
        .bg-white\\/20 { background-color: rgba(255, 255, 255, 0.2) !important; }
        .bg-white\\/90 { background-color: rgba(255, 255, 255, 0.9) !important; }
        .text-white\\/70 { color: rgba(255, 255, 255, 0.7) !important; }
        .text-white\\/80 { color: rgba(255, 255, 255, 0.8) !important; }
        .text-white\\/90 { color: rgba(255, 255, 255, 0.9) !important; }
        .border-white\\/20 { border-color: rgba(255, 255, 255, 0.2) !important; }
        
        /* Primary color backgrounds with opacity */
        .bg-primary\\/05 { background-color: ${this.hexToRgba(primaryColor, 0.05)} !important; }
        .bg-primary\\/08 { background-color: ${this.hexToRgba(primaryColor, 0.08)} !important; }
        .bg-primary\\/10 { background-color: ${this.hexToRgba(primaryColor, 0.1)} !important; }
        .border-primary\\/20 { border-color: ${this.hexToRgba(primaryColor, 0.2)} !important; }
        .border-primary\\/40 { border-color: ${this.hexToRgba(primaryColor, 0.4)} !important; }
        
        /* Print-specific optimizations */
        @media print {
            body { 
                margin: 0; 
                padding: 0; 
            }
            
            .invoice-container { 
                margin: 0; 
                max-width: none; 
                box-shadow: none !important;
            }
            
            /* Force all colors and backgrounds to print */
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
        
        /* Page break control */
        .invoice-container {
            page-break-inside: avoid;
        }
        
        table {
            page-break-inside: avoid;
        }
        
        thead {
            display: table-header-group;
        }
        
        tr {
            page-break-inside: avoid;
        }
    </style>
    
    <!-- Enhanced Tailwind configuration -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        'sans': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                        'serif': ['ui-serif', 'Georgia', 'Cambria', 'serif'],
                        'mono': ['ui-monospace', 'SFMono-Regular', 'monospace']
                    },
                    backdropBlur: {
                        'sm': '4px',
                        'md': '12px',
                        'lg': '16px'
                    },
                    colors: {
                        'white/5': 'rgba(255, 255, 255, 0.05)',
                        'white/10': 'rgba(255, 255, 255, 0.1)',
                        'white/15': 'rgba(255, 255, 255, 0.15)',
                        'white/20': 'rgba(255, 255, 255, 0.2)',
                        'white/70': 'rgba(255, 255, 255, 0.7)',
                        'white/80': 'rgba(255, 255, 255, 0.8)',
                        'white/90': 'rgba(255, 255, 255, 0.9)',
                        'primary': '${primaryColor}',
                        'primary/5': '${this.hexToRgba(primaryColor, 0.05)}',
                        'primary/8': '${this.hexToRgba(primaryColor, 0.08)}',
                        'primary/10': '${this.hexToRgba(primaryColor, 0.1)}',
                        'primary/20': '${this.hexToRgba(primaryColor, 0.2)}',
                        'primary/40': '${this.hexToRgba(primaryColor, 0.4)}'
                    },
                    spacing: {
                        '18': '4.5rem',
                        '72': '18rem',
                        '80': '20rem',
                        '96': '24rem'
                    }
                }
            },
            corePlugins: {
                preflight: false
            }
        }
    </script>
</head>
<body>
    <div class="invoice-container">
        ${content}
    </div>
</body>
</html>`;
  }

  /**
   * Get font family CSS from Tailwind font class
   */
  private getFontFamily(fontClass?: string): string {
    const fontMap: Record<string, string> = {
      'font-sans': 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
      'font-serif': 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      'font-mono': 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    };
    
    return fontMap[fontClass || 'font-sans'] || fontMap['font-sans'];
  }

  /**
   * Convert hex color to rgba string
   */
  private hexToRgba(hex: string, alpha: number): string {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Generate color scheme from primary color
   */
  private generateColorScheme(primaryColor: string): ColorScheme {
    const hex = primaryColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const darken = (factor: number) => {
      return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
    };

    const lighten = (factor: number) => {
      const mix = (color: number) => Math.floor(color + (255 - color) * factor);
      return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
    };

    return {
      primary: primaryColor,
      secondary: darken(0.8),
      accent: lighten(0.2),
      text: '#111827',
      textSecondary: '#6b7280',
      background: '#ffffff',
      border: '#e5e7eb'
    };
  }
}

// Export singleton instance
export const reactToPDFRenderer = new ReactToPDFRenderer();