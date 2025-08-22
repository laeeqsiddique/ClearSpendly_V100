/**
 * Comprehensive Tenant Setup Service
 * Creates all necessary seed data for new tenants
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { 
  DEFAULT_TAG_CATEGORIES, 
  DEFAULT_EMAIL_TEMPLATES, 
  DEFAULT_USER_PREFERENCES,
  DEFAULT_INVOICE_TEMPLATE,
  IRS_MILEAGE_RATES,
  DEFAULT_USAGE_LIMITS
} from './default-data';

interface SetupContext {
  tenantId: string;
  userId: string;
  userEmail: string;
  companyName: string;
  subscriptionPlan: string;
}

interface SetupResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  rollbackPerformed?: boolean;
}

interface SetupStep {
  name: string;
  execute: (context: SetupContext) => Promise<any>;
  rollback?: (context: SetupContext, data: any) => Promise<void>;
}

export class TenantSetupService {
  private adminSupabase = createAdminClient();
  private setupSteps: SetupStep[] = [];
  private executedSteps: Array<{ step: SetupStep; result: any }> = [];

  constructor() {
    this.initializeSetupSteps();
  }

  private initializeSetupSteps() {
    this.setupSteps = [
      {
        name: 'Create Default Tag Categories and Tags',
        execute: this.createTagSystem.bind(this),
        rollback: this.rollbackTagSystem.bind(this)
      },
      {
        name: 'Create Default Email Templates',
        execute: this.createEmailTemplates.bind(this),
        rollback: this.rollbackEmailTemplates.bind(this)
      },
      {
        name: 'Create Default Invoice Template',
        execute: this.createInvoiceTemplate.bind(this),
        rollback: this.rollbackInvoiceTemplate.bind(this)
      },
      {
        name: 'Initialize User Preferences',
        execute: this.createUserPreferences.bind(this),
        rollback: this.rollbackUserPreferences.bind(this)
      },
      {
        name: 'Setup IRS Mileage Rates',
        execute: this.createIRSMileageRates.bind(this),
        rollback: this.rollbackIRSMileageRates.bind(this)
      },
      {
        name: 'Initialize Usage Tracking',
        execute: this.createUsageTracking.bind(this),
        rollback: this.rollbackUsageTracking.bind(this)
      },
      {
        name: 'Create Default Vendor Categories',
        execute: this.createVendorCategories.bind(this),
        rollback: this.rollbackVendorCategories.bind(this)
      },
      {
        name: 'Setup Tenant Branding',
        execute: this.setupTenantBranding.bind(this),
        rollback: this.rollbackTenantBranding.bind(this)
      }
    ];
  }

  async setupTenant(context: SetupContext): Promise<SetupResult> {
    console.log(`Starting comprehensive tenant setup for tenant: ${context.tenantId}`);
    const startTime = Date.now();
    
    // Start a transaction-like approach using a setup session
    const setupSessionId = crypto.randomUUID();
    
    try {
      // Validate context
      const validationResult = await this.validateSetupContext(context);
      if (!validationResult.valid) {
        return {
          success: false,
          message: 'Setup context validation failed',
          errors: validationResult.errors
        };
      }

      const results: any[] = [];
      this.executedSteps = [];

      // Log setup start
      await this.logSetupStart(context, setupSessionId);

      // Execute all setup steps with retry logic
      for (const step of this.setupSteps) {
        console.log(`Executing step: ${step.name}`);
        
        const stepStartTime = Date.now();
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            const result = await this.executeStepWithTimeout(step, context, 30000); // 30 second timeout
            
            this.executedSteps.push({ step, result });
            results.push({ 
              step: step.name, 
              success: true, 
              data: result,
              executionTimeMs: Date.now() - stepStartTime,
              retryCount
            });
            console.log(`✓ Completed: ${step.name} (${Date.now() - stepStartTime}ms, ${retryCount} retries)`);
            break; // Success, break retry loop
            
          } catch (error) {
            retryCount++;
            console.error(`✗ Attempt ${retryCount} failed for step: ${step.name}`, error);
            
            if (retryCount > maxRetries) {
              console.error(`Failed step after ${maxRetries} retries: ${step.name}`);
              
              // Attempt rollback of completed steps
              await this.performRollbackWithLogging(context, setupSessionId);
              
              return {
                success: false,
                message: `Setup failed at step: ${step.name} after ${maxRetries} retries`,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                rollbackPerformed: true,
                setupTimeMs: Date.now() - startTime
              };
            }
            
            // Wait before retry (exponential backoff)
            await this.delay(Math.pow(2, retryCount) * 1000);
          }
        }
      }

      // Log successful setup
      await this.logSetupCompletion(context, results, setupSessionId);

      const totalTime = Date.now() - startTime;
      console.log(`Tenant setup completed successfully in ${totalTime}ms`);

      return {
        success: true,
        message: 'Tenant setup completed successfully',
        data: {
          tenantId: context.tenantId,
          stepsCompleted: results.length,
          setupTimeMs: totalTime,
          setupSessionId,
          results
        }
      };

    } catch (error) {
      console.error('Critical error during tenant setup:', error);
      
      // Attempt rollback
      await this.performRollbackWithLogging(context, setupSessionId);
      
      return {
        success: false,
        message: 'Critical error during tenant setup',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        rollbackPerformed: true,
        setupTimeMs: Date.now() - startTime
      };
    }
  }

  private async performRollback(context: SetupContext): Promise<void> {
    console.log('Performing rollback of completed setup steps...');
    
    // Rollback in reverse order
    for (let i = this.executedSteps.length - 1; i >= 0; i--) {
      const { step, result } = this.executedSteps[i];
      
      if (step.rollback) {
        try {
          await step.rollback(context, result);
          console.log(`✓ Rolled back: ${step.name}`);
        } catch (rollbackError) {
          console.error(`✗ Rollback failed for: ${step.name}`, rollbackError);
        }
      }
    }
  }

  // Step 1: Create Tag System
  private async createTagSystem(context: SetupContext) {
    const createdCategories = [];
    const createdTags = [];

    for (const categoryData of DEFAULT_TAG_CATEGORIES) {
      // Create tag category
      const { data: category, error: categoryError } = await this.adminSupabase
        .from('tag_category')
        .insert({
          tenant_id: context.tenantId,
          name: categoryData.name,
          description: categoryData.description,
          color: categoryData.color,
          required: categoryData.required,
          multiple: categoryData.multiple,
          sort_order: categoryData.sort_order
        })
        .select()
        .single();

      if (categoryError) throw categoryError;
      createdCategories.push(category);

      // Create tags for this category
      for (const tagName of categoryData.tags) {
        const { data: tag, error: tagError } = await this.adminSupabase
          .from('tag')
          .insert({
            tenant_id: context.tenantId,
            category_id: category.id,
            name: tagName,
            created_by: context.userId
          })
          .select()
          .single();

        if (tagError) throw tagError;
        createdTags.push(tag);
      }
    }

    return { categories: createdCategories, tags: createdTags };
  }

  private async rollbackTagSystem(context: SetupContext, data: any) {
    await this.adminSupabase
      .from('tag')
      .delete()
      .eq('tenant_id', context.tenantId);
    
    await this.adminSupabase
      .from('tag_category')
      .delete()
      .eq('tenant_id', context.tenantId);
  }

  // Step 2: Create Email Templates
  private async createEmailTemplates(context: SetupContext) {
    const createdTemplates = [];

    for (const templateData of DEFAULT_EMAIL_TEMPLATES) {
      const { data: template, error } = await this.adminSupabase
        .from('email_templates')
        .insert({
          tenant_id: context.tenantId,
          template_type: templateData.template_type,
          name: templateData.name,
          description: templateData.description,
          subject_template: templateData.subject_template,
          greeting_message: templateData.greeting_message,
          footer_message: templateData.footer_message,
          primary_color: templateData.primary_color,
          secondary_color: templateData.secondary_color,
          accent_color: templateData.accent_color,
          company_name: context.companyName,
          is_active: true,
          created_by: context.userId
        })
        .select()
        .single();

      if (error) throw error;
      createdTemplates.push(template);
    }

    return createdTemplates;
  }

  private async rollbackEmailTemplates(context: SetupContext, data: any) {
    await this.adminSupabase
      .from('email_templates')
      .delete()
      .eq('tenant_id', context.tenantId);
  }

  // Step 3: Create Invoice Template
  private async createInvoiceTemplate(context: SetupContext) {
    const { data: template, error } = await this.adminSupabase
      .from('invoice_template')
      .insert({
        tenant_id: context.tenantId,
        name: DEFAULT_INVOICE_TEMPLATE.name,
        description: DEFAULT_INVOICE_TEMPLATE.description,
        template_data: DEFAULT_INVOICE_TEMPLATE.template_data,
        is_default: DEFAULT_INVOICE_TEMPLATE.is_default,
        created_by: context.userId
      })
      .select()
      .single();

    if (error) throw error;
    return template;
  }

  private async rollbackInvoiceTemplate(context: SetupContext, data: any) {
    await this.adminSupabase
      .from('invoice_template')
      .delete()
      .eq('tenant_id', context.tenantId);
  }

  // Step 4: Create User Preferences
  private async createUserPreferences(context: SetupContext) {
    const { data: preferences, error } = await this.adminSupabase
      .from('user_preferences')
      .insert({
        user_id: context.userId,
        tenant_id: context.tenantId,
        preferences: DEFAULT_USER_PREFERENCES
      })
      .select()
      .single();

    if (error) throw error;
    return preferences;
  }

  private async rollbackUserPreferences(context: SetupContext, data: any) {
    await this.adminSupabase
      .from('user_preferences')
      .delete()
      .eq('tenant_id', context.tenantId)
      .eq('user_id', context.userId);
  }

  // Step 5: Create IRS Mileage Rates
  private async createIRSMileageRates(context: SetupContext) {
    const createdRates = [];

    for (const rateData of IRS_MILEAGE_RATES) {
      const { data: rate, error } = await this.adminSupabase
        .from('irs_mileage_rate')
        .insert({
          tenant_id: context.tenantId,
          user_id: context.userId,
          year: rateData.year,
          rate: rateData.rate,
          effective_date: rateData.effective_date,
          notes: rateData.notes
        })
        .select()
        .single();

      if (error) throw error;
      createdRates.push(rate);
    }

    return createdRates;
  }

  private async rollbackIRSMileageRates(context: SetupContext, data: any) {
    await this.adminSupabase
      .from('irs_mileage_rate')
      .delete()
      .eq('tenant_id', context.tenantId);
  }

  // Step 6: Create Usage Tracking
  private async createUsageTracking(context: SetupContext) {
    const limits = DEFAULT_USAGE_LIMITS[context.subscriptionPlan as keyof typeof DEFAULT_USAGE_LIMITS] 
      || DEFAULT_USAGE_LIMITS.free;

    const { data: usage, error } = await this.adminSupabase
      .from('tenant_usage')
      .insert({
        tenant_id: context.tenantId,
        plan_type: context.subscriptionPlan,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        limits: limits,
        usage: {
          receipts_this_month: 0,
          invoices_this_month: 0,
          storage_used_mb: 0,
          api_calls_today: 0
        }
      })
      .select()
      .single();

    if (error) throw error;
    return usage;
  }

  private async rollbackUsageTracking(context: SetupContext, data: any) {
    await this.adminSupabase
      .from('tenant_usage')
      .delete()
      .eq('tenant_id', context.tenantId);
  }

  // Step 7: Create Default Vendor Categories
  private async createVendorCategories(context: SetupContext) {
    const defaultCategories = [
      'Office Supplies', 'Software & Subscriptions', 'Professional Services',
      'Travel & Transportation', 'Meals & Entertainment', 'Utilities',
      'Equipment & Technology', 'Marketing & Advertising', 'Insurance',
      'Banking & Finance'
    ];

    const createdCategories = [];

    for (const categoryName of defaultCategories) {
      const { data: category, error } = await this.adminSupabase
        .from('vendor_category')
        .insert({
          tenant_id: context.tenantId,
          name: categoryName,
          created_by: context.userId
        })
        .select()
        .single();

      if (error) throw error;
      createdCategories.push(category);
    }

    return createdCategories;
  }

  private async rollbackVendorCategories(context: SetupContext, data: any) {
    await this.adminSupabase
      .from('vendor_category')
      .delete()
      .eq('tenant_id', context.tenantId);
  }

  // Step 8: Setup Tenant Branding
  private async setupTenantBranding(context: SetupContext) {
    const { data: branding, error } = await this.adminSupabase
      .from('tenant')
      .update({
        settings: {
          branding: {
            primary_color: '#667eea',
            secondary_color: '#764ba2',
            logo_url: null,
            company_name: context.companyName
          },
          features: {
            ai_enhanced_ocr: true,
            multi_currency: false,
            team_collaboration: true,
            advanced_analytics: context.subscriptionPlan !== 'free'
          },
          defaults: {
            currency: 'USD',
            timezone: 'America/New_York',
            date_format: 'MM/DD/YYYY'
          }
        }
      })
      .eq('id', context.tenantId)
      .select()
      .single();

    if (error) throw error;
    return branding;
  }

  private async rollbackTenantBranding(context: SetupContext, data: any) {
    await this.adminSupabase
      .from('tenant')
      .update({
        settings: {}
      })
      .eq('id', context.tenantId);
  }

  // Enhanced error handling and transaction safety methods
  private async validateSetupContext(context: SetupContext): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Validate tenant exists and is accessible
    try {
      const { data: tenant, error } = await this.adminSupabase
        .from('tenant')
        .select('id, name')
        .eq('id', context.tenantId)
        .single();
      
      if (error || !tenant) {
        errors.push('Tenant not found or inaccessible');
      }
    } catch (error) {
      errors.push('Failed to validate tenant');
    }
    
    // Validate user exists
    try {
      const { data: user, error } = await this.adminSupabase
        .from('user')
        .select('id, email')
        .eq('id', context.userId)
        .single();
      
      if (error || !user) {
        errors.push('User not found');
      }
    } catch (error) {
      errors.push('Failed to validate user');
    }
    
    // Validate required fields
    if (!context.tenantId || !context.userId) {
      errors.push('Missing required context fields');
    }
    
    return { valid: errors.length === 0, errors };
  }

  private async executeStepWithTimeout(step: SetupStep, context: SetupContext, timeoutMs: number): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Step ${step.name} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      try {
        const result = await step.execute(context);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async performRollbackWithLogging(context: SetupContext, setupSessionId: string): Promise<void> {
    console.log('Performing rollback of completed setup steps...');
    
    try {
      await this.performRollback(context);
      
      // Log rollback
      await this.logSetupRollback(context, setupSessionId);
    } catch (rollbackError) {
      console.error('Critical: Rollback failed', rollbackError);
      
      // Log rollback failure
      await this.logSetupRollbackFailure(context, setupSessionId, rollbackError);
    }
  }

  private async logSetupStart(context: SetupContext, setupSessionId: string): Promise<void> {
    try {
      await this.adminSupabase
        .from('tenant_setup_log')
        .insert({
          id: setupSessionId,
          tenant_id: context.tenantId,
          user_id: context.userId,
          setup_version: '1.0.0',
          steps_completed: 0,
          setup_data: { status: 'started', context },
          completed_at: null
        });
    } catch (error) {
      console.error('Failed to log setup start:', error);
    }
  }

  private async logSetupCompletion(context: SetupContext, results: any[], setupSessionId: string): Promise<void> {
    try {
      await this.adminSupabase
        .from('tenant_setup_log')
        .update({
          steps_completed: results.length,
          setup_data: { 
            status: 'completed', 
            context, 
            results,
            summary: {
              totalSteps: this.setupSteps.length,
              completedSteps: results.length,
              successRate: (results.length / this.setupSteps.length) * 100
            }
          },
          completed_at: new Date().toISOString()
        })
        .eq('id', setupSessionId);
    } catch (error) {
      console.error('Failed to log setup completion:', error);
    }
  }

  private async logSetupRollback(context: SetupContext, setupSessionId: string): Promise<void> {
    try {
      await this.adminSupabase
        .from('tenant_setup_log')
        .update({
          setup_data: { 
            status: 'rolled_back', 
            context,
            rollback_completed_at: new Date().toISOString()
          },
          rollback_performed: true
        })
        .eq('id', setupSessionId);
    } catch (error) {
      console.error('Failed to log setup rollback:', error);
    }
  }

  private async logSetupRollbackFailure(context: SetupContext, setupSessionId: string, rollbackError: any): Promise<void> {
    try {
      await this.adminSupabase
        .from('tenant_setup_log')
        .update({
          setup_data: { 
            status: 'rollback_failed', 
            context,
            rollback_error: rollbackError instanceof Error ? rollbackError.message : 'Unknown rollback error',
            rollback_failed_at: new Date().toISOString()
          },
          rollback_performed: false,
          rollback_reason: 'Rollback execution failed'
        })
        .eq('id', setupSessionId);
    } catch (error) {
      console.error('Failed to log setup rollback failure:', error);
    }
  }

  // Utility method to check if tenant needs setup
  async checkTenantSetupStatus(tenantId: string): Promise<boolean> {
    try {
      const { data: setupLog } = await this.adminSupabase
        .from('tenant_setup_log')
        .select('id')
        .eq('tenant_id', tenantId)
        .single();

      return !!setupLog;
    } catch {
      return false;
    }
  }

  // Method to add missing components to existing tenants
  async addMissingComponents(tenantId: string, userId: string): Promise<SetupResult> {
    console.log(`Checking for missing components in tenant: ${tenantId}`);
    
    const context: SetupContext = {
      tenantId,
      userId,
      userEmail: '',
      companyName: 'Your Company',
      subscriptionPlan: 'free'
    };

    // Check which components are missing and add them
    const missingComponents = await this.identifyMissingComponents(tenantId);
    const results = [];

    for (const component of missingComponents) {
      try {
        const step = this.setupSteps.find(s => s.name === component);
        if (step) {
          const result = await step.execute(context);
          results.push({ component, success: true, data: result });
        }
      } catch (error) {
        results.push({ 
          component, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return {
      success: true,
      message: `Added ${results.filter(r => r.success).length} missing components`,
      data: results
    };
  }

  private async identifyMissingComponents(tenantId: string): Promise<string[]> {
    const missing = [];

    // Check for tag categories
    const { data: tagCategories } = await this.adminSupabase
      .from('tag_category')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    
    if (!tagCategories?.length) {
      missing.push('Create Default Tag Categories and Tags');
    }

    // Check for email templates
    const { data: emailTemplates } = await this.adminSupabase
      .from('email_templates')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    
    if (!emailTemplates?.length) {
      missing.push('Create Default Email Templates');
    }

    // Check for IRS rates
    const { data: irsRates } = await this.adminSupabase
      .from('irs_mileage_rate')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);
    
    if (!irsRates?.length) {
      missing.push('Setup IRS Mileage Rates');
    }

    return missing;
  }
}