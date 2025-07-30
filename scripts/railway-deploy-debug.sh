#!/bin/bash

# Railway Deployment Debug Script
# This script helps diagnose and fix Railway deployment issues

set -e

echo "🚀 Railway Deployment Debug Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v railway &> /dev/null; then
    print_error "Railway CLI not found. Install it with: npm i -g @railway/cli"
    exit 1
fi
print_status "Railway CLI found"

if ! command -v docker &> /dev/null; then
    print_warning "Docker not found. Local testing will be limited"
else
    print_status "Docker found"
fi

if ! command -v node &> /dev/null; then
    print_error "Node.js not found"
    exit 1
fi
print_status "Node.js found: $(node --version)"

# Check Railway login
echo ""
echo "🔐 Checking Railway authentication..."
if railway whoami &> /dev/null; then
    print_status "Logged in to Railway"
else
    print_error "Not logged in to Railway. Run: railway login"
    exit 1
fi

# Menu
echo ""
echo "🔧 What would you like to do?"
echo "1) Run local npm debug script"
echo "2) Test with debug Docker container"
echo "3) Deploy with production Dockerfile"
echo "4) Check Railway logs"
echo "5) Full diagnostic (all of the above)"
echo ""
read -p "Select option (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🔍 Running local npm debug..."
        node scripts/debug-npm-install.js
        echo ""
        print_status "Debug logs saved to npm-debug-logs/"
        ;;
    
    2)
        echo ""
        echo "🐳 Building debug Docker container..."
        docker build -f Dockerfile.debug -t clearspendly-debug .
        echo ""
        echo "Running debug container..."
        docker run --rm clearspendly-debug
        ;;
    
    3)
        echo ""
        echo "📦 Deploying to Railway..."
        echo "Using Dockerfile.production as specified in railway.json"
        railway up
        ;;
    
    4)
        echo ""
        echo "📜 Fetching Railway logs..."
        railway logs
        ;;
    
    5)
        echo ""
        echo "🔬 Running full diagnostic..."
        
        # Local debug
        echo ""
        echo "Step 1: Local npm debug"
        node scripts/debug-npm-install.js
        
        # Docker test
        if command -v docker &> /dev/null; then
            echo ""
            echo "Step 2: Docker debug test"
            docker build -f Dockerfile.debug -t clearspendly-debug . || print_warning "Docker build failed"
        fi
        
        # Deployment attempt
        echo ""
        echo "Step 3: Railway deployment"
        read -p "Deploy to Railway now? (y/n): " deploy_confirm
        if [ "$deploy_confirm" = "y" ]; then
            railway up
        fi
        
        # Show logs
        echo ""
        echo "Step 4: Recent Railway logs"
        railway logs --lines 50
        ;;
    
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "📝 Debug Summary"
echo "================"
echo "1. If npm install is failing, check npm-debug-logs/debug-report.md"
echo "2. Common fixes:"
echo "   - Clear Railway build cache in dashboard"
echo "   - Ensure all environment variables are set"
echo "   - Check for registry access issues"
echo "3. The Dockerfile.production includes detailed error logging"
echo "4. All errors will be visible in Railway build logs"
echo ""
print_status "Debug script complete"