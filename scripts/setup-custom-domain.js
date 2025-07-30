#!/usr/bin/env node

/**
 * Custom Domain Setup Script
 * Configures domain, SSL, and DNS for production deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');

class DomainSetup {
  constructor() {
    this.domain = process.env.CUSTOM_DOMAIN || 'clearspendly.com';
    this.subdomain = process.env.SUBDOMAIN || 'app';
    this.fullDomain = `${this.subdomain}.${this.domain}`;
  }

  log(message) {
    console.log(`[DOMAIN] ${message}`);
  }

  async setupRailwayDomain() {
    this.log(`Setting up custom domain: ${this.fullDomain}`);
    
    try {
      // Add custom domain to Railway
      execSync(`railway domain add ${this.fullDomain}`, { stdio: 'inherit' });
      
      this.log('✅ Domain added to Railway');
      
      // Get domain verification records
      const domainInfo = execSync(`railway domain list --json`, { encoding: 'utf8' });
      const domains = JSON.parse(domainInfo);
      const ourDomain = domains.find(d => d.domain === this.fullDomain);
      
      if (ourDomain) {
        this.log('📋 DNS Configuration Required:');
        this.log(`   CNAME: ${this.subdomain} -> ${ourDomain.target}`);
        
        if (ourDomain.verification) {
          this.log(`   TXT: ${ourDomain.verification.name} -> ${ourDomain.verification.value}`);
        }
      }
      
      return true;
    } catch (error) {
      this.log(`❌ Domain setup failed: ${error.message}`);
      return false;
    }
  }

  generateNginxConfig() {
    const nginxConfig = `
# Optional: If you want to use your own server later
server {
    listen 80;
    server_name ${this.fullDomain};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${this.fullDomain};
    
    # SSL configuration (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/${this.fullDomain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${this.fullDomain}/privkey.pem;
    
    # Proxy to Next.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
}`;

    fs.writeFileSync('nginx.conf', nginxConfig);
    this.log('📄 Nginx configuration generated: nginx.conf');
  }

  displaySetupInstructions() {
    this.log('\n🚀 DOMAIN SETUP INSTRUCTIONS:');
    this.log('================================');
    this.log(`1. Add DNS records for ${this.fullDomain}:`);
    this.log('   - Check Railway dashboard for exact CNAME target');
    this.log('   - Add any required TXT records for verification');
    this.log('');
    this.log('2. Update environment variables:');
    this.log(`   NEXT_PUBLIC_APP_URL=https://${this.fullDomain}`);
    this.log(`   BETTER_AUTH_URL=https://${this.fullDomain}`);
    this.log('');
    this.log('3. Update external service webhooks:');
    this.log(`   - Stripe: https://${this.fullDomain}/api/webhooks/stripe`);
    this.log(`   - Polar: https://${this.fullDomain}/api/webhooks/polar`);
    this.log('');
    this.log('4. SSL will be automatically provisioned by Railway');
    this.log('');
    this.log('📞 SUPPORT:');
    this.log('- Railway docs: https://docs.railway.app/deploy/custom-domains');
    this.log('- DNS propagation: https://whatsmydns.net/');
  }

  async run() {
    this.log('🌐 Starting custom domain setup...');
    
    try {
      // Setup Railway domain
      await this.setupRailwayDomain();
      
      // Generate nginx config for reference
      this.generateNginxConfig();
      
      // Display instructions
      this.displaySetupInstructions();
      
      this.log('✅ Domain setup completed');
      
    } catch (error) {
      this.log(`❌ Domain setup failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run domain setup
const domainSetup = new DomainSetup();
domainSetup.run().catch(console.error);