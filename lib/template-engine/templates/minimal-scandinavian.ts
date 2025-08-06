import { TemplateConfig } from '../types';

export const minimalScandinavianTemplate: TemplateConfig = {
  type: 'minimal-scandinavian',
  name: 'Minimal Scandinavian',
  description: 'Ultra-clean design with typography focus and maximum readability. Perfect for tech startups, SaaS companies, and modern businesses.',
  category: 'minimal',
  
  // Typography
  primaryFont: 'font-mono',
  secondaryFont: 'font-light',
  fontSizeBase: '12px',
  
  // Layout
  headerStyle: 'minimal',
  tableStyle: 'minimal',
  
  styles: {
    react: {
      container: 'bg-white border-0 shadow-none overflow-hidden font-mono',
      header: 'p-12 border-b-2 border-[--primary-color]',
      headerContent: 'flex justify-between items-start',
      companyInfo: 'text-xs text-gray-500 space-y-1',
      invoiceInfo: 'text-right',
      clientSection: 'text-xs text-gray-600 p-6 bg-[--primary-color]/5 rounded-lg border-l-4 border-[--primary-color]',
      itemsTable: {
        container: 'w-full text-xs',
        header: 'border-b-2 border-[--primary-color] text-[--primary-color] uppercase tracking-wider font-medium bg-[--primary-color]/5',
        row: 'border-b border-gray-100 hover:bg-[--primary-color]/5 transition-colors',
        cell: 'py-3 px-2'
      },
      totals: 'w-64 space-y-2 text-xs p-4 bg-[--primary-color]/10 rounded-lg border border-[--primary-color]/20',
      footer: 'pt-8 border-t-2 border-[--primary-color] space-y-6 bg-[--primary-color]/5 p-6 rounded-lg'
    },
    html: {
      container: 'max-width: 210mm; margin: 0 auto; background: white; font-family: ui-monospace, monospace;',
      header: 'padding: 48px; border-bottom: 1px solid #e5e7eb;',
      headerContent: 'display: flex; justify-content: space-between; align-items: flex-start;',
      companyInfo: 'font-size: 12px; color: #6b7280; line-height: 1.4;',
      invoiceInfo: 'text-align: right;',
      clientSection: 'font-size: 12px; color: #4b5563;',
      itemsTable: {
        container: 'width: 100%; font-size: 12px;',
        header: 'border-bottom: 1px solid #d1d5db; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; font-weight: normal; padding: 8px 0;',
        row: 'border-bottom: 1px solid #f3f4f6;',
        cell: 'padding: 12px 0;'
      },
      totals: 'width: 256px; font-size: 12px;',
      footer: 'padding-top: 32px; border-top: 1px solid #d1d5db;',
      inlineStyles: {
        'minimal-text': 'color: #374151; font-weight: normal;',
        'subtle-text': 'color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px;',
        'clean-border': 'border: 1px solid #f3f4f6;',
        'minimal-total': 'border-top: 1px solid #111827; padding-top: 8px; font-weight: 500;'
      }
    }
  }
};