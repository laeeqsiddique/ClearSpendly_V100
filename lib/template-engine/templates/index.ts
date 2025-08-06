// Template Registry
// Centralized export of all invoice templates

import { executiveProfessionalTemplate } from './executive-professional';
import { modernCreativeTemplate } from './modern-creative';
import { minimalScandinavianTemplate } from './minimal-scandinavian';
import { traditionalCorporateTemplate } from './traditional-corporate';
import { TemplateConfig, TemplateType, LEGACY_TEMPLATE_MAPPING, LegacyTemplateType } from '../types';

// Template registry mapping
export const TEMPLATE_REGISTRY: Record<TemplateType, TemplateConfig> = {
  'executive-professional': executiveProfessionalTemplate,
  'modern-creative': modernCreativeTemplate,
  'minimal-scandinavian': minimalScandinavianTemplate,
  'traditional-corporate': traditionalCorporateTemplate
};

// Template utilities
export class TemplateRegistry {
  /**
   * Get template configuration by type
   */
  static getTemplate(templateType: TemplateType | LegacyTemplateType): TemplateConfig {
    // Handle legacy template type mapping
    let normalizedType: TemplateType;
    
    console.log('TemplateRegistry.getTemplate called with:', {
      input: templateType,
      isInLegacyMapping: templateType in LEGACY_TEMPLATE_MAPPING,
      legacyMapping: LEGACY_TEMPLATE_MAPPING
    });
    
    if (templateType in LEGACY_TEMPLATE_MAPPING) {
      normalizedType = LEGACY_TEMPLATE_MAPPING[templateType as LegacyTemplateType];
      console.log('Mapped legacy type:', templateType, '->', normalizedType);
    } else {
      normalizedType = templateType as TemplateType;
      console.log('Using type as-is:', normalizedType);
    }

    const template = TEMPLATE_REGISTRY[normalizedType];
    if (!template) {
      // Fallback to traditional corporate for unknown types
      console.warn(`Unknown template type: ${templateType}, falling back to traditional-corporate`);
      return TEMPLATE_REGISTRY['traditional-corporate'];
    }

    console.log('Resolved template:', {
      requestedType: templateType,
      normalizedType: normalizedType,
      resolvedTemplate: template.name
    });

    return template;
  }

  /**
   * Get all available templates
   */
  static getAllTemplates(): TemplateConfig[] {
    return Object.values(TEMPLATE_REGISTRY);
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: string): TemplateConfig[] {
    return Object.values(TEMPLATE_REGISTRY).filter(
      template => template.category === category
    );
  }

  /**
   * Check if template type exists
   */
  static isValidTemplateType(templateType: string): boolean {
    // Check both current and legacy template types
    return templateType in TEMPLATE_REGISTRY || templateType in LEGACY_TEMPLATE_MAPPING;
  }

  /**
   * Get template display information for UI
   */
  static getTemplateDisplayInfo(): Array<{
    type: TemplateType;
    name: string;
    description: string;
    category: string;
  }> {
    return Object.values(TEMPLATE_REGISTRY).map(template => ({
      type: template.type,
      name: template.name,
      description: template.description,
      category: template.category
    }));
  }
}

// Export individual templates for direct access
export {
  executiveProfessionalTemplate,
  modernCreativeTemplate,
  minimalScandinavianTemplate,
  traditionalCorporateTemplate
};

// Export template types
export type { TemplateConfig, TemplateType } from '../types';