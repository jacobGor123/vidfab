#!/bin/bash

# VidFab AI Video Platform - Lint Script
# Author: VidFab Team
# Description: Run linting with logging

set -e

echo "🔍 Running VidFab Code Linting..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Get current timestamp for log file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/lint-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

# Run linting with logging
# NOTE: This repo currently does not have Next.js ESLint config set up.
# next lint will prompt interactively to create config, which breaks scripts.
# We fail fast with a clear message until ESLint is configured.
if [ ! -f .eslintrc.json ] && [ ! -f .eslintrc.js ] && [ ! -f .eslintrc.cjs ] && [ ! -f .eslintrc.yml ] && [ ! -f .eslintrc.yaml ]; then
  echo "❌ ESLint is not configured yet (.eslintrc.* missing)."
  echo "Run 'next lint' once interactively to generate config, then re-run this script."
  exit 1
fi

export CI=1
pnpm lint 2>&1 | tee "$LOG_FILE"

echo "✅ Linting completed!"
echo "📋 Lint log saved to: $LOG_FILE"