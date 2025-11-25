#!/bin/bash
# Quick Web Environment Setup (no tests)
# For faster setup in cloud environments

set -e  # Exit on error

echo "⚡ Quick setup for Diabetactic..."

# Check environment
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  echo "📦 Claude Code Web environment detected"
elif [ -n "$CODEX_CLOUD" ]; then
  echo "📦 Codex Cloud environment detected"
elif [ -n "$JULES_ENV" ]; then
  echo "📦 Jules environment detected"
fi

# Install dependencies only
echo "📦 Installing npm dependencies..."
npm install

# Quick verification
echo "✅ Quick verification..."
node -v
npm -v

echo ""
echo "✅ Quick setup complete! Skipped tests for speed."
echo "   Run 'npm run test:ci' to verify."
echo ""

exit 0
