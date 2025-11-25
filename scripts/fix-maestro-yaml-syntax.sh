#!/bin/bash
# Maestro YAML Syntax Bulk Fix Script
# Fixes common YAML syntax errors in Maestro test files

echo "🔧 Fixing Maestro YAML Syntax Errors..."

# Count files before fix
TOTAL_FILES=$(find maestro/tests -name "*.yaml" | wc -l)
echo "📁 Found $TOTAL_FILES test files"

# Fix 1: swipeLeft -> proper swipe syntax
echo "🔄 Fixing swipeLeft syntax..."
find maestro/tests -name "*.yaml" -type f -exec sed -i 's/^- swipeLeft$/- swipe:\n    direction: LEFT/g' {} \;

# Fix 2: swipeRight -> proper swipe syntax
echo "🔄 Fixing swipeRight syntax..."
find maestro/tests -name "*.yaml" -type f -exec sed -i 's/^- swipeRight$/- swipe:\n    direction: RIGHT/g' {} \;

# Fix 3: Remove standalone 'direction: LEFT' lines (from double processing)
echo "🔄 Cleaning up duplicate direction properties..."
find maestro/tests -name "*.yaml" -type f -exec sed -i '/^  direction: LEFT$/d' {} \;
find maestro/tests -name "*.yaml" -type f -exec sed -i '/^  direction: RIGHT$/d' {} \;

# Fix 4: Fix environment variable substitution (if any remain)
echo "🔄 Fixing environment variable syntax..."
find maestro/tests -name "*.yaml" -type f -exec sed -i 's/\${USERNAME:-1000}/1000/g' {} \;
find maestro/tests -name "*.yaml" -type f -exec sed -i 's/\${PASSWORD:-tuvieja}/tuvieja/g' {} \;

echo ""
echo "✅ YAML Syntax Fixes Complete!"
echo ""
echo "📊 Summary:"
echo "   - Fixed swipeLeft/swipeRight commands"
echo "   - Fixed environment variable substitution"
echo "   - Cleaned up duplicate properties"
echo ""
echo "🔍 Validation:"
maestro validate maestro/tests/*.yaml 2>&1 | head -20

echo ""
echo "✅ Script complete!"
