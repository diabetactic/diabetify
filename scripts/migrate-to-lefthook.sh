#!/bin/bash
# Migration script from Husky to Lefthook
# This script automates the transition to Lefthook for git hooks

set -e

echo "🔄 Migrating from Husky to Lefthook..."

# Step 1: Install Lefthook
echo "📦 Installing Lefthook..."
npm install --save-dev lefthook

# Step 2: Remove Husky and lint-staged
echo "🗑️  Removing Husky and lint-staged..."
npm uninstall husky lint-staged

# Step 3: Delete .husky directory
echo "🧹 Cleaning up .husky directory..."
if [ -d ".husky" ]; then
  rm -rf .husky
  echo "✓ Removed .husky directory"
else
  echo "⚠️  .husky directory not found (already removed)"
fi

# Step 4: Remove Husky/lint-staged config from package.json
echo "📝 Removing Husky/lint-staged config from package.json..."
# Use npm pkg delete if available (npm 7.24.0+)
if npm pkg --version >/dev/null 2>&1; then
  npm pkg delete lint-staged 2>/dev/null || echo "⚠️  lint-staged config not found in package.json"
else
  echo "⚠️  npm pkg command not available, please manually remove lint-staged config from package.json"
fi

# Step 5: Install Lefthook git hooks
echo "🔧 Installing Lefthook git hooks..."
npx lefthook install

# Step 6: Verify installation
echo "✅ Verifying Lefthook installation..."
if npx lefthook version >/dev/null 2>&1; then
  echo "✓ Lefthook installed successfully"
  npx lefthook version
else
  echo "❌ Lefthook installation failed"
  exit 1
fi

# Step 7: Show next steps
echo ""
echo "✨ Migration complete! Next steps:"
echo "1. Review lefthook.yml configuration"
echo "2. Test hooks with: npx lefthook run pre-commit"
echo "3. Commit the changes:"
echo "   git add lefthook.yml package.json package-lock.json"
echo "   git commit -m 'chore: migrate from Husky to Lefthook for faster parallel hooks'"
echo ""
echo "📚 Lefthook documentation: https://github.com/evilmartians/lefthook"
