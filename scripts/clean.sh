#!/bin/bash

# VidFab AI Video Platform - Clean Script
# Author: VidFab Team
# Description: Clean build artifacts and logs

set -e

echo "🧹 Cleaning VidFab Project..."

# Clean build artifacts
echo "🗑️  Removing build artifacts..."
rm -rf .next
rm -rf out
rm -rf dist

# Clean node modules if requested
if [ "$1" = "--full" ]; then
    echo "🗑️  Removing node_modules..."
    rm -rf node_modules
    rm -rf .pnpm-store
fi

# Clean old logs (keep last 10)
echo "🗑️  Cleaning old logs..."
if [ -d "logs" ]; then
    cd logs
    ls -t *.log 2>/dev/null | tail -n +11 | xargs -r rm --
    cd ..
fi

echo "✅ Cleaning completed!"

if [ "$1" = "--full" ]; then
    echo "💡 Run ./scripts/install.sh to reinstall dependencies"
fi