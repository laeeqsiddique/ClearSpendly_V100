import { TemplateConfig } from '../types';

export const traditionalCorporateTemplate: TemplateConfig = {
  type: 'traditional-corporate',
  name: 'Traditional Corporate',
  description: 'Classic business layout with structured presentation and formal styling. Perfect for established enterprises, financial services, and formal sectors.',
  category: 'corporate',
  
  // Typography
  primaryFont: 'font-serif',
  secondaryFont: 'font-serif',
  fontSizeBase: '14px',
  
  // Layout
  headerStyle: 'bordered',
  tableStyle: 'classic',
  
  styles: {
    react: {
      container: 'bg-white border rounded-lg shadow-sm overflow-hidden font-serif',
      header: 'p-8 text-white border-b-4 mb-6',
      headerContent: 'flex justify-between items-start mb-6',
      companyInfo: 'text-white/90 text-sm space-y-1',
      invoiceInfo: 'bg-gray-100 p-4 rounded',
      clientSection: 'bg-gray-50 p-4 rounded',
      itemsTable: {
        container: 'w-full border border-gray-300',
        header: 'text-left py-3 px-4 font-semibold text-white',
        row: 'border-b border-gray-300',
        cell: 'py-3 px-4 text-sm'
      },
      totals: 'w-72 border border-gray-300',
      footer: 'border-t-2 border-gray-300 pt-6'
    },
    html: {
      container: 'max-width: 210mm; margin: 0 auto; background: white; font-family: ui-serif, serif;',
      header: 'padding: 32px; color: white; border-bottom: 4px solid; margin-bottom: 24px;',
      headerContent: 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;',
      companyInfo: 'color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.4;',
      invoiceInfo: 'background: #f3f4f6; padding: 16px; border-radius: 4px;',
      clientSection: 'background: #f9fafb; padding: 16px; border-radius: 4px;',
      itemsTable: {
        container: 'width: 100%; border: 1px solid #d1d5db; border-collapse: collapse;',
        header: 'text-align: left; padding: 12px 16px; font-weight: 600; color: white;',
        row: 'border-bottom: 1px solid #d1d5db;',
        cell: 'padding: 12px 16px; font-size: 14px;'
      },
      totals: 'width: 288px; border: 1px solid #d1d5db;',
      footer: 'border-top: 2px solid #d1d5db; padding-top: 24px;',
      inlineStyles: {
        'formal-header': 'background-color: var(--primary-color); color: white;',
        'bordered-section': 'border: 1px solid #e5e7eb; padding: 16px; margin: 8px 0;',
        'formal-text': 'color: #374151; font-weight: normal;',
        'total-row': 'background-color: var(--primary-color); color: white; font-weight: bold; padding: 12px 16px;'
      }
    }
  }
};