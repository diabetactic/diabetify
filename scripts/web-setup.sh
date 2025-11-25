#!/bin/bash
# Web Environment Setup Script
# Used by Jules, Codex Cloud, and Claude Code Web

set -e  # Exit on error

echo "🚀 Setting up Diabetactic development environment..."

# Check if running in remote/cloud environment
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  echo "📦 Running in Claude Code Web remote environment"
elif [ -n "$CODEX_CLOUD" ]; then
  echo "📦 Running in Codex Cloud environment"
elif [ -n "$JULES_ENV" ]; then
  echo "📦 Running in Jules environment"
else
  echo "📦 Running in local/unknown environment"
fi

# Install Node.js dependencies
echo "📦 Installing npm dependencies..."
npm install

# Verify critical packages
echo "✅ Verifying installations..."
npx -v > /dev/null && echo "  ✓ npx available"
npm list @angular/cli > /dev/null 2>&1 && echo "  ✓ Angular CLI installed"
npm list @ionic/angular > /dev/null 2>&1 && echo "  ✓ Ionic installed"

# Run tests to verify setup
echo "🧪 Running tests to verify setup..."
npm run test:ci

# Check code quality
echo "🔍 Checking code quality..."
npm run lint

# Show success message
echo ""
echo "✅ Environment setup complete!"
echo ""
echo "📋 Available commands:"
echo "  npm start              - Start dev server"
echo "  npm run test           - Run unit tests"
echo "  npm run test:e2e       - Run E2E tests"
echo "  npm run lint           - Check code quality"
echo "  npm run build          - Build for production"
echo ""

exit 0
