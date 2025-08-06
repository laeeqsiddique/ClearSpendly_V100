import { TemplateConfig } from '../types';

export const modernCreativeTemplate: TemplateConfig = {
  type: 'modern-creative',
  name: 'Modern Creative',
  description: 'Bold, vibrant design with creative flair for design agencies, marketing firms, and creative professionals.',
  category: 'creative',
  
  // Typography
  primaryFont: 'font-sans',
  secondaryFont: 'font-light',
  fontSizeBase: '15px',
  
  // Layout
  headerStyle: 'gradient',
  tableStyle: 'modern',
  
  styles: {
    react: {
      container: 'bg-white relative overflow-hidden shadow-2xl',
      header: 'bg-gradient-to-br from-[--primary-color] via-[--primary-color]/80 to-[--accent-color] relative overflow-hidden',
      headerContent: 'relative z-20 p-16 flex justify-between items-start',
      companyInfo: 'text-white/90 text-sm font-medium space-y-2',
      invoiceInfo: 'text-right',
      clientSection: 'bg-gradient-to-r from-[--primary-color]/5 to-[--accent-color]/5 rounded-3xl shadow-lg p-10 mx-12 -mt-8 relative z-10 border border-[--primary-color]/20',
      itemsTable: {
        container: 'bg-white rounded-3xl shadow-xl overflow-hidden mx-12 mt-12 border border-gray-100',
        header: 'bg-gradient-to-r from-[--primary-color] to-[--secondary-color] text-white text-xs font-bold uppercase tracking-widest',
        row: 'border-b border-gray-50 hover:bg-gradient-to-r hover:from-[--primary-color]/5 hover:to-[--accent-color]/5 transition-all duration-200',
        cell: 'py-6 px-8 text-gray-700'
      },
      totals: 'bg-gradient-to-br from-[--primary-color] via-[--secondary-color] to-[--accent-color] text-white rounded-3xl shadow-2xl m-12 p-10',
      footer: 'bg-gradient-to-r from-[--primary-color]/5 to-[--accent-color]/5 rounded-3xl p-10 mx-12 mt-12 border-t-4 border-[--primary-color]/30'
    },
    html: {
      container: 'max-width: 210mm; margin: 0 auto; background: white; font-family: Inter, system-ui, sans-serif;',
      header: 'padding: 32px;',
      headerContent: 'display: flex; justify-content: space-between; align-items: center;',
      companyInfo: 'color: rgba(255,255,255,0.8); font-size: 12px; line-height: 1.4;',
      invoiceInfo: 'background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border-radius: 8px; padding: 24px; text-align: center;',
      clientSection: 'background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 8px; padding: 16px;',
      itemsTable: {
        container: 'overflow: hidden; border-radius: 8px; border: 1px solid #e5e7eb;',
        header: 'background: #f9fafb; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; padding: 16px 24px;',
        row: 'border-bottom: 1px solid #f3f4f6;',
        cell: 'padding: 16px 24px; font-size: 14px;'
      },
      totals: 'background: #f9fafb; border-radius: 8px; padding: 24px; width: 320px;',
      footer: 'display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;',
      inlineStyles: {
        'gradient-header': 'background: linear-gradient(135deg, var(--primary-color) 0%, color-mix(in srgb, var(--primary-color) 80%, transparent) 100%);',
        'light-text': 'color: rgba(255,255,255,0.9); font-weight: 300;',
        'accent-border': 'border-left: 2px solid var(--primary-color);'
      }
    }
  }
};