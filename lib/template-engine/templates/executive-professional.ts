import { TemplateConfig } from '../types';

export const executiveProfessionalTemplate: TemplateConfig = {
  type: 'executive-professional',
  name: 'Executive Professional',
  description: 'Sophisticated design with premium aesthetics for high-value consulting, legal services, and executive-level business communications.',
  category: 'professional',
  
  // Typography
  primaryFont: 'font-serif',
  secondaryFont: 'font-sans',
  fontSizeBase: '16px',
  
  // Layout
  headerStyle: 'gradient',
  tableStyle: 'bold',
  
  styles: {
    react: {
      container: 'bg-gradient-to-br from-[--primary-color]/5 to-gray-100 shadow-2xl border border-[--primary-color]/20 font-serif relative overflow-hidden',
      header: 'bg-gradient-to-r from-[--primary-color] via-[--secondary-color] to-[--primary-color] text-white relative overflow-hidden',
      headerContent: 'relative z-20 p-12 flex justify-between items-start',
      companyInfo: 'text-white/90 text-sm font-light space-y-1.5 leading-relaxed',
      invoiceInfo: 'text-right',
      clientSection: 'bg-white rounded-2xl shadow-lg border-l-4 border-[--primary-color] p-8 mx-8 -mt-6 relative z-10',
      itemsTable: {
        container: 'bg-white rounded-2xl shadow-lg overflow-hidden mx-8 mt-8',
        header: 'bg-gradient-to-r from-[--primary-color] to-[--secondary-color] text-white text-xs font-bold uppercase tracking-widest',
        row: 'border-b border-slate-100 hover:bg-[--primary-color]/5 transition-colors',
        cell: 'py-5 px-6 text-slate-700'
      },
      totals: 'bg-gradient-to-br from-[--primary-color] to-[--secondary-color] text-white rounded-2xl shadow-xl m-8 p-8',
      footer: 'bg-[--primary-color]/5 rounded-2xl p-8 mx-8 mt-8 border-t-4 border-[--primary-color]'
    },
    html: {
      container: 'max-width: 210mm; margin: 0 auto; background: white; font-family: Inter, system-ui, sans-serif;',
      header: 'position: relative; overflow: hidden; padding: 40px;',
      headerContent: 'position: relative; z-index: 10; display: flex; justify-content: space-between; align-items: center;',
      companyInfo: 'color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500; line-height: 1.4;',
      invoiceInfo: 'background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); border-radius: 12px; padding: 32px 24px; border: 1px solid rgba(255,255,255,0.3);',
      clientSection: 'border: 2px solid; border-radius: 12px; padding: 24px;',
      itemsTable: {
        container: 'overflow: hidden; border-radius: 12px; border: 2px solid;',
        header: 'font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; color: white; padding: 16px 24px;',
        row: 'border-bottom: 2px solid #f3f4f6;',
        cell: 'padding: 16px 24px; font-size: 14px;'
      },
      totals: 'background: #111827; color: white; border-radius: 12px; padding: 32px; width: 384px;',
      footer: 'display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding-top: 32px; border-top: 2px solid #e5e7eb;',
      inlineStyles: {
        'decorative-bg': 'position: absolute; inset: 0; opacity: 0.1;',
        'decorative-circle-1': 'position: absolute; top: 0; right: 0; width: 256px; height: 256px; border-radius: 50%; background: white; transform: translate(30%, -30%);',
        'decorative-circle-2': 'position: absolute; bottom: 0; left: 0; width: 192px; height: 192px; border-radius: 50%; background: white; transform: translate(-30%, 30%);'
      }
    }
  }
};