#!/bin/bash

echo "Testing npm install locally..."
echo "================================"

# Clean existing modules
rm -rf node_modules package-lock.json

# Try npm install with verbose logging
echo "Running npm install --verbose..."
npm install --verbose 2>&1 | tee npm-install.log

if [ $? -eq 0 ]; then
    echo "✅ npm install succeeded locally"
else
    echo "❌ npm install failed locally"
    echo "Check npm-install.log for details"
fi