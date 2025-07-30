#!/usr/bin/env node

/**
 * ClearSpendly Deployment Setup Script
 * Guides users through the deployment setup process
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class DeploymentSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.config = {};
    this.steps = [
      'Welcome',
      'Environment Setup',
      'GitHub Secrets',
      'Vercel Configuration',
      'Supabase Setup',
      'Final Verification'
    ];
    this.currentStep = 0;
  }

  async start() {
    console.log('\n🚀 ClearSpendly Deployment Setup Wizard');
    console.log('=======================================');
    console.log('This will guide you through setting up automated deployment\n');
    
    try {
      await this.runSetupSteps();
      await this.generateSetupReport();
      console.log('\n🎉 Setup completed successfully!');
      console.log('📖 Check DEPLOYMENT_GUIDE_BUSINESS.md for detailed instructions');
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
    } finally {
      this.rl.close();
    }
  }

  async runSetupSteps() {
    for (let i = 0; i < this.steps.length; i++) {
      this.currentStep = i;
      console.log(`\n📋 Step ${i + 1}/${this.steps.length}: ${this.steps[i]}`);
      await this.executeStep(this.steps[i]);
    }
  }

  async executeStep(stepName) {
    switch (stepName) {
      case 'Welcome':
        await this.welcomeStep();
        break;
      case 'Environment Setup':
        await this.environmentStep();
        break;
      case 'GitHub Secrets':
        await this.githubStep();
        break;
      case 'Vercel Configuration':
        await this.vercelStep();
        break;
      case 'Supabase Setup':
        await this.supabaseStep();
        break;
      case 'Final Verification':
        await this.verificationStep();
        break;
    }
  }

  async welcomeStep() {
    console.log('\n🎯 What this setup will accomplish:');
    console.log('  ✅ Eliminate manual database migrations');
    console.log('  ✅ Automatic deployments on code push');
    console.log('  ✅ Cost monitoring and optimization');
    console.log('  ✅ Professional deployment pipeline');
    
    console.log('\n💰 Current cost: $0/month (free tiers only)');
    console.log('📈 Scaling cost: ~$45-75/month at 1,000+ users');
    
    const proceed = await this.ask('\nReady to continue? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      throw new Error('Setup cancelled by user');
    }
  }

  async environmentStep() {
    console.log('\n🔧 Setting up environment variables...');
    
    // Check if .env.local exists
    const envPath = path.join(process.cwd(), '.env.local');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    if (!fs.existsSync(envPath)) {
      if (fs.existsSync(envExamplePath)) {
        console.log('📋 Copying .env.example to .env.local...');
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Created .env.local file');
      } else {
        console.log('⚠️  .env.example not found, creating basic .env.local');
        this.createBasicEnvFile(envPath);
      }
    } else {
      console.log('✅ .env.local already exists');
    }

    console.log('\n📝 You need to fill in these environment variables:');
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENAI_API_KEY',
      'SUPABASE_ACCESS_TOKEN',
      'SUPABASE_PROJECT_REF'
    ];

    requiredVars.forEach(varName => {
      console.log(`  • ${varName}`);
    });

    const envConfigured = await this.ask('\nHave you filled in your .env.local file? (y/n): ');
    this.config.environmentConfigured = envConfigured.toLowerCase() === 'y';
  }

  async githubStep() {
    console.log('\n🐙 GitHub Secrets Configuration...');
    
    console.log('\nYou need to add these secrets to your GitHub repository:');
    console.log('(Go to: Repository → Settings → Secrets and variables → Actions)');
    
    const secrets = [
      { name: 'SUPABASE_ACCESS_TOKEN', description: 'From Supabase dashboard → Settings → API' },
      { name: 'SUPABASE_PROJECT_REF', description: 'Your project ref (short ID)' },
      { name: 'SUPABASE_DB_PASSWORD', description: 'Database password' },
      { name: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Your Supabase URL' },
      { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Your Supabase anon key' },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Service role key (secret!)' },
      { name: 'OPENAI_API_KEY', description: 'OpenAI API key for OCR enhancement' },
      { name: 'VERCEL_TOKEN', description: 'Vercel deployment token' },
      { name: 'VERCEL_ORG_ID', description: 'Vercel organization ID' },
      { name: 'VERCEL_PROJECT_ID', description: 'Vercel project ID' }
    ];

    secrets.forEach(secret => {
      console.log(`\n📝 ${secret.name}`);
      console.log(`   ${secret.description}`);
    });

    const githubConfigured = await this.ask('\nHave you added all GitHub secrets? (y/n): ');
    this.config.githubConfigured = githubConfigured.toLowerCase() === 'y';
  }

  async vercelStep() {
    console.log('\n▲ Vercel Configuration...');
    
    console.log('\n🔧 Steps for Vercel setup:');
    console.log('1. Create account at vercel.com (if you haven\'t)');
    console.log('2. Import your GitHub repository');
    console.log('3. Add all environment variables from .env.local');
    console.log('4. Get your Vercel token, org ID, and project ID');
    
    console.log('\n📝 To get Vercel IDs:');
    console.log('• Token: Account Settings → Tokens → Create Token');
    console.log('• Org ID: Team Settings → General → Team ID');
    console.log('• Project ID: Project Settings → General → Project ID');

    const vercelConfigured = await this.ask('\nIs Vercel configured and connected? (y/n): ');
    this.config.vercelConfigured = vercelConfigured.toLowerCase() === 'y';
  }

  async supabaseStep() {
    console.log('\n🐘 Supabase Configuration...');
    
    console.log('\n🔧 Supabase setup checklist:');
    console.log('✅ Project created in Supabase dashboard');
    console.log('✅ Database password set');
    console.log('✅ API keys generated');
    console.log('✅ RLS (Row Level Security) configured');
    
    console.log('\n📊 Current migration count:');
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
      console.log(`   Found ${migrations.length} migration files`);
      this.config.migrationCount = migrations.length;
    } else {
      console.log('   ⚠️  Migrations directory not found');
      this.config.migrationCount = 0;
    }

    const supabaseConfigured = await this.ask('\nIs Supabase properly configured? (y/n): ');
    this.config.supabaseConfigured = supabaseConfigured.toLowerCase() === 'y';
  }

  async verificationStep() {
    console.log('\n🔍 Final Verification...');
    
    // Check if all components are ready
    const checks = [
      { name: 'Environment Variables', status: this.config.environmentConfigured },
      { name: 'GitHub Secrets', status: this.config.githubConfigured },
      { name: 'Vercel Configuration', status: this.config.vercelConfigured },
      { name: 'Supabase Setup', status: this.config.supabaseConfigured }
    ];

    console.log('\n📋 Setup Status:');
    checks.forEach(check => {
      const icon = check.status ? '✅' : '❌';
      const status = check.status ? 'CONFIGURED' : 'NEEDS ATTENTION';
      console.log(`${icon} ${check.name}: ${status}`);
    });

    const allConfigured = checks.every(check => check.status);
    
    if (allConfigured) {
      console.log('\n🎉 All components configured successfully!');
      console.log('\n🚀 Next steps:');
      console.log('1. Push your code to the master branch');
      console.log('2. GitHub Actions will automatically deploy');
      console.log('3. Check deployment status in GitHub Actions tab');
      console.log('4. Your app will be live on Vercel!');
    } else {
      console.log('\n⚠️  Some components need attention before deployment');
      console.log('Please complete the missing configurations above');
    }

    this.config.readyForDeployment = allConfigured;
  }

  async generateSetupReport() {
    const report = {
      timestamp: new Date().toISOString(),
      setupStatus: this.config,
      nextSteps: this.config.readyForDeployment ? [
        'Push code to master branch',
        'Monitor GitHub Actions for deployment status',
        'Verify app is live on Vercel',
        'Run cost monitoring: npm run monitor:cost',
        'Set up weekly optimization reviews'
      ] : [
        'Complete missing configuration items',
        'Re-run setup script: node scripts/setup-deployment.js',
        'Check DEPLOYMENT_GUIDE_BUSINESS.md for detailed help'
      ],
      resources: {
        businessGuide: 'DEPLOYMENT_GUIDE_BUSINESS.md',
        costMonitoring: 'npm run monitor:cost',
        resourceOptimization: 'npm run optimize:resources',
        healthCheck: 'npm run health:all'
      },
      estimatedCosts: {
        current: '$0/month (free tiers)',
        scaling: '$45-75/month at 1,000+ users',
        enterprise: '$200-500/month at 10,000+ users'
      }
    };

    const reportsDir = path.join(process.cwd(), 'setup-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, `setup-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Setup report saved: ${reportPath}`);
    
    // Display summary
    console.log('\n📊 SETUP SUMMARY:');
    console.log(`   Status: ${this.config.readyForDeployment ? '✅ READY' : '⚠️  NEEDS WORK'}`);
    console.log(`   Migrations: ${this.config.migrationCount || 0} files`);
    console.log(`   Cost: $0/month (free tiers)`);
    console.log(`   Deployment: ${this.config.readyForDeployment ? 'Automated' : 'Manual setup needed'}`);
  }

  createBasicEnvFile(envPath) {
    const basicEnv = `# ClearSpendly Environment Variables
# Fill in your actual values

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_ACCESS_TOKEN=your-access-token
SUPABASE_DB_PASSWORD=your-db-password

# AI Configuration
OPENAI_API_KEY=sk-your-openai-key

# Deployment Configuration
NODE_ENV=development
AUTO_ROLLBACK=false
ENABLE_MIGRATION_SAFETY_CHECK=true
`;

    fs.writeFileSync(envPath, basicEnv);
  }

  async ask(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }
}

// Main execution
async function main() {
  const setup = new DeploymentSetup();
  await setup.start();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DeploymentSetup;