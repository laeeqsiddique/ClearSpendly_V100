// Template Consistency Checker
// Validates that PDF output matches React preview

import { InvoiceData, TemplateType, LegacyTemplateType } from '../types';

export interface ConsistencyReport {
  isConsistent: boolean;
  score: number;
  issues: ConsistencyIssue[];
  recommendations: string[];
}

export interface ConsistencyIssue {
  type: 'color' | 'font' | 'layout' | 'spacing' | 'content';
  severity: 'low' | 'medium' | 'high';
  description: string;
  element?: string;
}

export class ConsistencyChecker {
  /**
   * Validate template consistency between React preview and PDF
   */
  validateTemplate(
    templateType: TemplateType | LegacyTemplateType, 
    invoiceData: InvoiceData, 
    pdfHtml: string
  ): ConsistencyReport {
    const issues: ConsistencyIssue[] = [];
    
    // Check color consistency
    this.checkColorConsistency(invoiceData, pdfHtml, issues);
    
    // Check font consistency
    this.checkFontConsistency(pdfHtml, issues);
    
    // Check layout structure
    this.checkLayoutStructure(templateType, pdfHtml, issues);
    
    // Check content completeness
    this.checkContentCompleteness(invoiceData, pdfHtml, issues);
    
    // Calculate consistency score
    const score = this.calculateConsistencyScore(issues);
    
    return {
      isConsistent: score >= 90,
      score,
      issues,
      recommendations: this.generateRecommendations(issues)
    };
  }

  /**
   * Check if colors are properly applied
   */
  private checkColorConsistency(invoiceData: InvoiceData, html: string, issues: ConsistencyIssue[]): void {
    const primaryColor = invoiceData.template.color_scheme || '#1e40af';
    
    // Check if primary color is present in HTML
    if (!html.includes(primaryColor)) {
      issues.push({
        type: 'color',
        severity: 'high',
        description: `Primary color ${primaryColor} not found in PDF HTML`,
        element: 'color-scheme'
      });
    }
    
    // Check for CSS variables
    if (!html.includes('--primary-color:')) {
      issues.push({
        type: 'color',
        severity: 'medium',
        description: 'CSS variables for colors not found',
        element: 'css-variables'
      });
    }
    
    // Check for opacity classes
    const opacityClasses = ['bg-white/15', 'text-white/90', 'border-white/20'];
    opacityClasses.forEach(className => {
      if (html.includes(className) && !html.includes(className.replace('/', '\\/'))) {
        issues.push({
          type: 'color',
          severity: 'medium',
          description: `Opacity class ${className} may not render correctly`,
          element: className
        });
      }
    });
  }

  /**
   * Check font consistency
   */
  private checkFontConsistency(html: string, issues: ConsistencyIssue[]): void {
    // Check for Inter font
    if (!html.includes('Inter')) {
      issues.push({
        type: 'font',
        severity: 'medium',
        description: 'Inter font not found in PDF HTML',
        element: 'font-family'
      });
    }
    
    // Check for Google Fonts link
    if (!html.includes('fonts.googleapis.com')) {
      issues.push({
        type: 'font',
        severity: 'low',
        description: 'Google Fonts not loaded',
        element: 'font-loading'
      });
    }
    
    // Check for font feature settings
    if (!html.includes('font-feature-settings')) {
      issues.push({
        type: 'font',
        severity: 'low',
        description: 'Font feature settings not applied',
        element: 'font-features'
      });
    }
  }

  /**
   * Check layout structure consistency
   */
  private checkLayoutStructure(templateType: TemplateType | LegacyTemplateType, html: string, issues: ConsistencyIssue[]): void {
    const requiredElements = {
      'executive-professional': [
        'bg-gradient-to-br',
        'backdrop-blur-md',
        'shadow-2xl',
        'rounded-xl'
      ],
      'traditional-corporate': [
        'border-b-2',
        'grid-cols-1',
        'md:grid-cols-2',
        'border-collapse'
      ]
    };
    
    const elements = requiredElements[templateType as keyof typeof requiredElements] || [];
    
    elements.forEach(element => {
      if (!html.includes(element)) {
        issues.push({
          type: 'layout',
          severity: 'medium',
          description: `Required layout element '${element}' not found`,
          element
        });
      }
    });
    
    // Check for Tailwind CDN
    if (!html.includes('tailwindcss.com')) {
      issues.push({
        type: 'layout',
        severity: 'high',
        description: 'Tailwind CSS CDN not loaded',
        element: 'tailwind-cdn'
      });
    }
  }

  /**
   * Check content completeness
   */
  private checkContentCompleteness(invoiceData: InvoiceData, html: string, issues: ConsistencyIssue[]): void {
    // Check for invoice number
    if (!html.includes(invoiceData.invoice_number)) {
      issues.push({
        type: 'content',
        severity: 'high',
        description: 'Invoice number not found in PDF',
        element: 'invoice-number'
      });
    }
    
    // Check for client name
    if (!html.includes(invoiceData.client.name)) {
      issues.push({
        type: 'content',
        severity: 'high',
        description: 'Client name not found in PDF',
        element: 'client-name'
      });
    }
    
    // Check for business name
    const businessName = invoiceData.template.company_name || invoiceData.business.name;
    if (businessName && !html.includes(businessName)) {
      issues.push({
        type: 'content',
        severity: 'medium',
        description: 'Business name not found in PDF',
        element: 'business-name'
      });
    }
    
    // Check for line items
    if (invoiceData.items.length > 0) {
      const firstItem = invoiceData.items[0];
      if (!html.includes(firstItem.description)) {
        issues.push({
          type: 'content',
          severity: 'high',
          description: 'Invoice items not found in PDF',
          element: 'line-items'
        });
      }
    }
    
    // Check for total amount
    const totalAmount = invoiceData.total_amount.toFixed(2);
    if (!html.includes(totalAmount)) {
      issues.push({
        type: 'content',
        severity: 'high',
        description: 'Total amount not found in PDF',
        element: 'total-amount'
      });
    }
  }

  /**
   * Calculate consistency score based on issues
   */
  private calculateConsistencyScore(issues: ConsistencyIssue[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  /**
   * Generate recommendations based on issues
   */
  generateRecommendations(issues: ConsistencyIssue[]): string[] {
    const recommendations: string[] = [];
    
    const issuesByType = issues.reduce((acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = [];
      acc[issue.type].push(issue);
      return acc;
    }, {} as Record<string, ConsistencyIssue[]>);
    
    // Color recommendations
    if (issuesByType.color) {
      recommendations.push(
        'Ensure all color variables are properly defined in CSS and opacity classes are escaped correctly'
      );
    }
    
    // Font recommendations
    if (issuesByType.font) {
      recommendations.push(
        'Verify Google Fonts are loaded and font feature settings are applied for optimal typography'
      );
    }
    
    // Layout recommendations
    if (issuesByType.layout) {
      recommendations.push(
        'Check that all Tailwind classes are available and template structure matches React components'
      );
    }
    
    // Content recommendations
    if (issuesByType.content) {
      recommendations.push(
        'Verify all invoice data is properly rendered and no content is missing from the PDF'
      );
    }
    
    // Spacing recommendations
    if (issuesByType.spacing) {
      recommendations.push(
        'Review spacing and margin classes to ensure consistent layout between preview and PDF'
      );
    }
    
    return recommendations;
  }

  /**
   * Quick validation for development
   */
  quickValidate(invoiceData: InvoiceData, pdfHtml: string): boolean {
    // Basic checks for development
    const hasInvoiceNumber = pdfHtml.includes(invoiceData.invoice_number);
    const hasClientName = pdfHtml.includes(invoiceData.client.name);
    const hasTailwind = pdfHtml.includes('tailwindcss.com');
    const hasColors = pdfHtml.includes('--primary-color:');
    
    return hasInvoiceNumber && hasClientName && hasTailwind && hasColors;
  }
}

// Export singleton instance
export const consistencyChecker = new ConsistencyChecker();