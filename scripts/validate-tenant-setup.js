/**
 * Validation script for the comprehensive tenant setup system
 * This script validates that all components of the setup system are working correctly
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

class TenantSetupValidator {
  constructor() {
    this.validationResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  log(type, message, details = null) {
    const entry = {
      type,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.validationResults.details.push(entry);
    
    const prefix = {
      'PASS': '✓',
      'FAIL': '✗',
      'WARN': '⚠',
      'INFO': 'ℹ'
    }[type] || '•';
    
    console.log(`${prefix} ${message}`);
    if (details) {
      console.log(`  ${JSON.stringify(details, null, 2)}`);
    }

    if (type === 'PASS') this.validationResults.passed++;
    if (type === 'FAIL') this.validationResults.failed++;
    if (type === 'WARN') this.validationResults.warnings++;
  }

  async validateDatabaseSchema() {
    this.log('INFO', 'Validating database schema...');

    const requiredTables = [
      'tenant',
      'user',
      'membership',
      'tag_category',
      'tag',
      'email_templates',
      'invoice_template',
      'user_preferences',
      'tenant_usage',
      'vendor_category',
      'tenant_setup_log',
      'irs_mileage_rate'
    ];

    for (const table of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          this.log('FAIL', `Table ${table} not accessible`, { error: error.message });
        } else {
          this.log('PASS', `Table ${table} is accessible`);
        }
      } catch (error) {
        this.log('FAIL', `Table ${table} validation failed`, { error: error.message });
      }
    }
  }

  async validateDefaultData() {
    this.log('INFO', 'Validating default data templates...');

    // Check if we can access the default data module
    try {
      const { 
        DEFAULT_TAG_CATEGORIES,
        DEFAULT_EMAIL_TEMPLATES,
        DEFAULT_USER_PREFERENCES,
        DEFAULT_INVOICE_TEMPLATE,
        IRS_MILEAGE_RATES
      } = require('../lib/tenant-setup/default-data.ts');

      this.log('PASS', `Default tag categories defined: ${DEFAULT_TAG_CATEGORIES.length}`);
      this.log('PASS', `Default email templates defined: ${DEFAULT_EMAIL_TEMPLATES.length}`);
      this.log('PASS', `Default user preferences defined`);
      this.log('PASS', `Default invoice template defined`);
      this.log('PASS', `IRS mileage rates defined: ${IRS_MILEAGE_RATES.length}`);

      // Validate tag categories structure
      for (const category of DEFAULT_TAG_CATEGORIES) {
        if (!category.name || !category.tags || !Array.isArray(category.tags)) {
          this.log('FAIL', `Invalid tag category structure`, { category: category.name });
        } else {
          this.log('PASS', `Tag category ${category.name} has ${category.tags.length} tags`);
        }
      }

    } catch (error) {
      this.log('FAIL', 'Could not load default data module', { error: error.message });
    }
  }

  async validateSetupService() {
    this.log('INFO', 'Validating tenant setup service...');

    try {
      const { TenantSetupService } = require('../lib/tenant-setup/tenant-setup-service.ts');
      const setupService = new TenantSetupService();
      
      this.log('PASS', 'Tenant setup service instantiated successfully');

      // Check if methods exist
      const requiredMethods = [
        'setupTenant',
        'checkTenantSetupStatus',
        'addMissingComponents'
      ];

      for (const method of requiredMethods) {
        if (typeof setupService[method] === 'function') {
          this.log('PASS', `Method ${method} exists`);
        } else {
          this.log('FAIL', `Method ${method} is missing`);
        }
      }

    } catch (error) {
      this.log('FAIL', 'Could not load tenant setup service', { error: error.message });
    }
  }

  async validateAPIEndpoints() {
    this.log('INFO', 'Validating API endpoints...');

    const endpoints = [
      '/api/setup-tenant',
      '/api/admin/migrate-existing-tenants',
      '/api/admin/setup-individual-tenant'
    ];

    for (const endpoint of endpoints) {
      try {
        // Check if the file exists
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '..', 'app', 'api', endpoint.slice(5), 'route.ts');
        
        if (fs.existsSync(filePath)) {
          this.log('PASS', `API endpoint file exists: ${endpoint}`);
        } else {
          this.log('FAIL', `API endpoint file missing: ${endpoint}`);
        }
      } catch (error) {
        this.log('FAIL', `Could not validate endpoint: ${endpoint}`, { error: error.message });
      }
    }
  }

  async validateExistingTenants() {
    this.log('INFO', 'Checking existing tenants...');

    try {
      // Get tenant count
      const { count: totalTenants, error: countError } = await supabase
        .from('tenant')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        this.log('FAIL', 'Could not count tenants', { error: countError.message });
        return;
      }

      this.log('INFO', `Found ${totalTenants} total tenants`);

      // Check setup completion
      const { count: setupTenants, error: setupError } = await supabase
        .from('tenant_setup_log')
        .select('*', { count: 'exact', head: true });

      if (setupError) {
        this.log('WARN', 'Could not count setup logs', { error: setupError.message });
      } else {
        const completionRate = totalTenants > 0 ? Math.round((setupTenants / totalTenants) * 100) : 0;
        this.log('INFO', `${setupTenants} tenants have completed setup (${completionRate}%)`);

        if (completionRate < 100 && totalTenants > 0) {
          this.log('WARN', `${totalTenants - setupTenants} tenants need migration`);
        }
      }

      // Sample a few tenants for detailed validation
      const { data: sampleTenants, error: sampleError } = await supabase
        .from('tenant')
        .select('id, name')
        .limit(3);

      if (sampleError) {
        this.log('WARN', 'Could not fetch sample tenants', { error: sampleError.message });
      } else if (sampleTenants && sampleTenants.length > 0) {
        for (const tenant of sampleTenants) {
          await this.validateTenantComponents(tenant.id, tenant.name);
        }
      }

    } catch (error) {
      this.log('FAIL', 'Error validating existing tenants', { error: error.message });
    }
  }

  async validateTenantComponents(tenantId, tenantName) {
    this.log('INFO', `Validating components for tenant: ${tenantName}`);

    const components = [
      { table: 'tag_category', name: 'Tag Categories' },
      { table: 'email_templates', name: 'Email Templates' },
      { table: 'invoice_template', name: 'Invoice Templates' },
      { table: 'tenant_usage', name: 'Usage Tracking' },
      { table: 'irs_mileage_rate', name: 'IRS Rates' }
    ];

    for (const component of components) {
      try {
        const { data, error } = await supabase
          .from(component.table)
          .select('id')
          .eq('tenant_id', tenantId)
          .limit(1);

        if (error) {
          this.log('WARN', `Could not check ${component.name} for ${tenantName}`, { error: error.message });
        } else if (data && data.length > 0) {
          this.log('PASS', `${component.name} exists for ${tenantName}`);
        } else {
          this.log('WARN', `${component.name} missing for ${tenantName}`);
        }
      } catch (error) {
        this.log('WARN', `Error checking ${component.name} for ${tenantName}`, { error: error.message });
      }
    }
  }

  async validateMigrations() {
    this.log('INFO', 'Checking database migrations...');

    try {
      // Check if the latest migration tables exist
      const migrationTables = [
        'tenant_setup_log',
        'migration_log',
        'user_preferences',
        'invoice_template',
        'tenant_usage',
        'vendor_category'
      ];

      for (const table of migrationTables) {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);

        if (error) {
          this.log('FAIL', `Migration table ${table} not found - migration may be needed`);
        } else {
          this.log('PASS', `Migration table ${table} exists`);
        }
      }

    } catch (error) {
      this.log('FAIL', 'Error checking migrations', { error: error.message });
    }
  }

  async runValidation() {
    console.log('🚀 Starting Tenant Setup System Validation\n');

    await this.validateDatabaseSchema();
    await this.validateDefaultData();
    await this.validateSetupService();
    await this.validateAPIEndpoints();
    await this.validateMigrations();
    await this.validateExistingTenants();

    console.log('\n📊 Validation Summary:');
    console.log(`✓ Passed: ${this.validationResults.passed}`);
    console.log(`✗ Failed: ${this.validationResults.failed}`);
    console.log(`⚠ Warnings: ${this.validationResults.warnings}`);

    if (this.validationResults.failed === 0) {
      console.log('\n🎉 All critical validations passed!');
      if (this.validationResults.warnings > 0) {
        console.log('⚠️  Some warnings were found - check the details above.');
      }
    } else {
      console.log('\n❌ Some critical validations failed - system may not work correctly.');
    }

    return this.validationResults;
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new TenantSetupValidator();
  validator.runValidation()
    .then((results) => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('Validation failed with error:', error);
      process.exit(1);
    });
}

module.exports = { TenantSetupValidator };