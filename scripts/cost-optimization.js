#!/usr/bin/env node

/**
 * Cost Optimization and Monitoring Script
 * Tracks deployment costs and suggests optimizations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CostOptimizer {
  constructor() {
    this.costsFile = path.join(process.cwd(), 'costs.json');
    this.currentCosts = this.loadCosts();
  }

  loadCosts() {
    try {
      if (fs.existsSync(this.costsFile)) {
        return JSON.parse(fs.readFileSync(this.costsFile, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load existing costs:', error.message);
    }
    
    return {
      railway: { monthly: 0, usage: {} },
      vercel: { monthly: 0, usage: {} },
      supabase: { monthly: 0, usage: {} },
      external: { monthly: 0, services: {} },
      total: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  saveCosts() {
    this.currentCosts.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.costsFile, JSON.stringify(this.currentCosts, null, 2));
  }

  async checkRailwayUsage() {
    console.log('📊 Checking Railway usage...');
    
    try {
      // Get Railway usage data
      const output = execSync('railway usage --json', { encoding: 'utf8' });
      const usage = JSON.parse(output);
      
      // Estimate costs based on Railway pricing
      const cpuHours = usage.cpu || 0;
      const memoryGB = usage.memory || 0;
      const networkGB = usage.network || 0;
      const diskGB = usage.disk || 0;
      
      // Railway pricing (2024 rates)
      const cpuCost = cpuHours * 0.000463; // $0.000463/vCPU hour
      const memoryCost = memoryGB * 0.000231; // $0.000231/GB hour
      const networkCost = networkGB * 0.10; // $0.10/GB outbound
      const diskCost = diskGB * 0.25; // $0.25/GB/month persistent disk
      
      const totalRailwayCost = cpuCost + memoryCost + networkCost + diskCost;
      
      this.currentCosts.railway = {
        monthly: totalRailwayCost,
        usage: {
          cpuHours,
          memoryGB,
          networkGB,
          diskGB,
          costs: { 
            cpu: cpuCost, 
            memory: memoryCost, 
            network: networkCost,
            disk: diskCost 
          }
        }
      };
      
      console.log(`Railway estimated cost: $${totalRailwayCost.toFixed(2)}/month`);
      
      // Cost optimization recommendations
      if (totalRailwayCost > 15) {
        console.log('💡 Railway optimization tips:');
        console.log('   - Enable auto-sleep for staging environments');
        console.log('   - Use smaller resource allocations during low traffic');
        console.log('   - Implement efficient caching to reduce CPU usage');
      }
      
      return totalRailwayCost;
      
    } catch (error) {
      console.warn('Could not fetch Railway usage:', error.message);
      // Provide fallback estimates for planning
      const estimatedCost = 12; // Typical small app cost
      this.currentCosts.railway = {
        monthly: estimatedCost,
        usage: { estimated: true }
      };
      return estimatedCost;
    }
  }

  async checkExternalServices() {
    console.log('🔌 Checking external service usage...');
    
    const services = {
      openai: this.estimateOpenAICost(),
      resend: this.estimateResendCost(),
      supabase: this.estimateSupabaseCost()
    };
    
    const totalExternal = Object.values(services).reduce((sum, cost) => sum + cost, 0);
    
    this.currentCosts.external = {
      monthly: totalExternal,
      services
    };
    
    console.log(`External services estimated cost: $${totalExternal.toFixed(2)}/month`);
    return totalExternal;
  }

  estimateOpenAICost() {
    // Rough estimate based on OCR usage
    // Assume 1000 receipts/month, avg 500 tokens each
    const receiptsPerMonth = 1000;
    const avgTokensPerReceipt = 500;
    const costPerToken = 0.000001; // GPT-4o-mini pricing
    
    return receiptsPerMonth * avgTokensPerReceipt * costPerToken;
  }

  estimateResendCost() {
    // Resend: 100 emails free, then $0.30/1000 emails
    const emailsPerMonth = 500; // Estimate
    const freeEmails = 100;
    const paidEmails = Math.max(0, emailsPerMonth - freeEmails);
    
    return (paidEmails / 1000) * 0.30;
  }

  estimateSupabaseCost() {
    // Supabase Pro: $25/month with good limits
    return 25;
  }

  generateOptimizationReport() {
    const totalCost = this.currentCosts.railway.monthly + 
                     this.currentCosts.external.monthly;
    
    console.log('\n📈 COST OPTIMIZATION REPORT');
    console.log('================================');
    console.log(`Total estimated monthly cost: $${totalCost.toFixed(2)}`);
    console.log('\nBreakdown:');
    console.log(`- Railway: $${this.currentCosts.railway.monthly.toFixed(2)}`);
    console.log(`- Supabase: $${this.currentCosts.external.services.supabase.toFixed(2)}`);
    console.log(`- OpenAI: $${this.currentCosts.external.services.openai.toFixed(2)}`);
    console.log(`- Resend: $${this.currentCosts.external.services.resend.toFixed(2)}`);
    
    console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
    
    // Railway optimizations
    if (this.currentCosts.railway.monthly > 20) {
      console.log('🔧 Railway: Consider reducing resource allocation or implementing auto-sleep');
    }
    
    // AI cost optimizations
    if (this.currentCosts.external.services.openai > 10) {
      console.log('🤖 AI: High OpenAI usage. Consider:');
      console.log('   - Implementing local Ollama for development');
      console.log('   - Caching OCR results');
      console.log('   - Using smaller models for simple extractions');
    }
    
    // General recommendations
    if (totalCost < 50) {
      console.log('✅ Cost is within startup budget range');
    } else {
      console.log('⚠️  Consider cost reduction strategies');
    }
    
    // Alternative platform suggestions
    console.log('\n🔄 ALTERNATIVE PLATFORMS:');
    console.log('- If cost > $30/month: Consider DigitalOcean App Platform ($12/month)');
    console.log('- If traffic low: Consider Vercel Pro ($20/month)');
    console.log('- If want more control: DigitalOcean Droplet ($6/month) + nginx');
    
    this.currentCosts.total = totalCost;
  }

  async run() {
    console.log('🎯 Running cost optimization analysis...\n');
    
    try {
      await this.checkRailwayUsage();
      await this.checkExternalServices();
      
      this.generateOptimizationReport();
      this.saveCosts();
      
      console.log(`\n📊 Cost data saved to: ${this.costsFile}`);
      
    } catch (error) {
      console.error('Cost analysis failed:', error.message);
      process.exit(1);
    }
  }
}

// Run cost optimization
const optimizer = new CostOptimizer();
optimizer.run().catch(console.error);