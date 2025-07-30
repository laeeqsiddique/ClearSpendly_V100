#!/usr/bin/env node

/**
 * Debug npm installation issues for Railway deployment
 * This script provides comprehensive analysis of npm install failures
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class NpmDebugger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'npm-debug-logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(filename, content) {
    const logPath = path.join(this.logDir, filename);
    fs.writeFileSync(logPath, content, 'utf8');
    console.log(`✓ Logged to ${filename}`);
  }

  runCommand(command, description) {
    console.log(`\n🔍 ${description}`);
    try {
      const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      return { success: true, output };
    } catch (error) {
      return { 
        success: false, 
        output: error.stdout || '', 
        error: error.stderr || error.message 
      };
    }
  }

  async diagnose() {
    console.log('🚀 Starting npm installation diagnosis...\n');

    // 1. System Information
    console.log('📊 Gathering system information...');
    const systemInfo = [
      `Node Version: ${process.version}`,
      `npm Version: ${this.runCommand('npm --version', 'Checking npm version').output.trim()}`,
      `Platform: ${process.platform}`,
      `Architecture: ${process.arch}`,
      `Memory: ${Math.round(require('os').totalmem() / 1024 / 1024 / 1024)}GB`,
      `Free Memory: ${Math.round(require('os').freemem() / 1024 / 1024 / 1024)}GB`,
      `CPUs: ${require('os').cpus().length}`,
      `Current Directory: ${process.cwd()}`
    ].join('\n');
    this.log('system-info.log', systemInfo);

    // 2. npm Configuration
    console.log('\n📋 Checking npm configuration...');
    const npmConfig = this.runCommand('npm config list', 'Getting npm config');
    this.log('npm-config.log', npmConfig.output);

    // 3. Package.json Analysis
    console.log('\n📦 Analyzing package.json...');
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const analysis = {
        name: pkg.name,
        version: pkg.version,
        dependencies: Object.keys(pkg.dependencies || {}).length,
        devDependencies: Object.keys(pkg.devDependencies || {}).length,
        engines: pkg.engines || 'Not specified',
        scripts: Object.keys(pkg.scripts || {}),
        problematicPackages: this.findProblematicPackages(pkg)
      };
      this.log('package-analysis.json', JSON.stringify(analysis, null, 2));
    } catch (error) {
      this.log('package-analysis-error.log', error.toString());
    }

    // 4. Clean Install Attempt
    console.log('\n🧹 Cleaning npm cache and artifacts...');
    this.runCommand('npm cache clean --force', 'Cleaning npm cache');
    this.runCommand('rm -rf node_modules package-lock.json', 'Removing node_modules');

    // 5. Detailed Install Attempts
    const installStrategies = [
      { cmd: 'npm ci --verbose', desc: 'Standard CI install' },
      { cmd: 'npm ci --legacy-peer-deps --verbose', desc: 'CI with legacy peer deps' },
      { cmd: 'npm install --verbose', desc: 'Fresh install' },
      { cmd: 'npm install --legacy-peer-deps --verbose', desc: 'Fresh install with legacy peer deps' },
      { cmd: 'npm install --force --verbose', desc: 'Force install' }
    ];

    for (const strategy of installStrategies) {
      console.log(`\n🔧 Attempting: ${strategy.desc}`);
      const result = this.runCommand(strategy.cmd, strategy.desc);
      
      const logContent = [
        `Command: ${strategy.cmd}`,
        `Description: ${strategy.desc}`,
        `Success: ${result.success}`,
        `Exit Code: ${result.success ? 0 : 1}`,
        '\n--- STDOUT ---',
        result.output,
        '\n--- STDERR ---',
        result.error || 'No errors'
      ].join('\n');
      
      this.log(`install-attempt-${installStrategies.indexOf(strategy) + 1}.log`, logContent);

      if (result.success) {
        console.log('✅ Installation successful!');
        break;
      } else {
        console.log('❌ Installation failed');
        // Extract specific error patterns
        this.analyzeError(result.error || result.output);
      }
    }

    // 6. Post-install verification
    if (fs.existsSync('node_modules')) {
      console.log('\n✓ node_modules created, verifying installation...');
      const verification = this.runCommand('npm ls --depth=0', 'Listing installed packages');
      this.log('installed-packages.log', verification.output);

      // Check for missing dependencies
      const missing = this.runCommand('npm ls', 'Checking for missing dependencies');
      if (!missing.success) {
        this.log('missing-dependencies.log', missing.error);
      }
    }

    // 7. Generate summary report
    this.generateReport();
  }

  findProblematicPackages(pkg) {
    const problematic = [
      'canvas', 'puppeteer', 'sharp', 'bcrypt', 'node-sass',
      'fibers', 'grpc', 'sqlite3', 'bufferutil', 'utf-8-validate'
    ];
    
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies
    };

    return problematic.filter(p => allDeps[p]);
  }

  analyzeError(errorText) {
    const patterns = [
      { pattern: /EACCES/, issue: 'Permission denied' },
      { pattern: /ENOSPC/, issue: 'No space left on device' },
      { pattern: /ETIMEDOUT/, issue: 'Network timeout' },
      { pattern: /ENOTFOUND/, issue: 'Registry not found' },
      { pattern: /E404/, issue: 'Package not found' },
      { pattern: /ERESOLVE/, issue: 'Dependency resolution conflict' },
      { pattern: /gyp ERR/, issue: 'Native module compilation error' },
      { pattern: /Python/, issue: 'Python dependency issue' },
      { pattern: /node-pre-gyp/, issue: 'Pre-built binary issue' },
      { pattern: /EBUSY/, issue: 'Resource busy or locked' }
    ];

    console.log('\n🔍 Error Analysis:');
    patterns.forEach(({ pattern, issue }) => {
      if (pattern.test(errorText)) {
        console.log(`  ⚠️  ${issue} detected`);
      }
    });
  }

  generateReport() {
    console.log('\n📄 Generating debug report...');
    
    const report = [
      '# npm Installation Debug Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      `- Node Version: ${process.version}`,
      `- Platform: ${process.platform}`,
      `- Log Directory: ${this.logDir}`,
      '',
      '## Files Generated',
      ...fs.readdirSync(this.logDir).map(f => `- ${f}`),
      '',
      '## Next Steps',
      '1. Review the log files for specific error messages',
      '2. Check system-info.log for environment details',
      '3. Review package-analysis.json for dependency conflicts',
      '4. Examine install-attempt-*.log files for specific failures',
      '',
      '## Common Solutions',
      '- EACCES: Check file permissions or use --unsafe-perm',
      '- ERESOLVE: Use --legacy-peer-deps or --force',
      '- gyp ERR: Install build tools (python, make, g++)',
      '- EBUSY: Clear caches and locks, restart Docker',
      '- Network: Check proxy settings and registry access'
    ].join('\n');

    this.log('debug-report.md', report);
    console.log('\n✅ Debug report generated at:', path.join(this.logDir, 'debug-report.md'));
    console.log('\n📁 All logs saved to:', this.logDir);
  }
}

// Run the debugger
const debugger = new NpmDebugger();
debugger.diagnose().catch(error => {
  console.error('\n❌ Debug script failed:', error);
  process.exit(1);
});