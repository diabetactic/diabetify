#!/bin/bash
# Fix all common Maestro test issues

echo "🔧 Fixing all Maestro tests..."

# 1. Remove pipe syntax from text selectors (app is in Spanish only)
find maestro -name "*.yaml" -type f -exec sed -i 's/"Iniciar Sesión|Sign In"/"Iniciar Sesión"/g' {} \;
find maestro -name "*.yaml" -type f -exec sed -i 's/"Panel de Control|Dashboard"/"Panel de Control"/g' {} \;
find maestro -name "*.yaml" -type f -exec sed -i 's/"Inicio|Home"/"Inicio"/g' {} \;
find maestro -name "*.yaml" -type f -exec sed -i 's/"Lecturas|Readings"/"Lecturas"/g' {} \;

# 2. Fix credentials everywhere
find maestro -name "*.yaml" -type f -exec sed -i 's/demo@example.com/1000/g' {} \;
find maestro -name "*.yaml" -type f -exec sed -i 's/demo123/tuvieja/g' {} \;

# 3. Fix common test issues
# Add data-test-mode header for heroku tests
for file in maestro/tests/**/*.heroku.yaml maestro/tests/*.heroku.yaml; do
  if [ -f "$file" ]; then
    if ! grep -q "X-Test-Mode" "$file"; then
      sed -i '/^appId:/a\\nenv:\n  X-Test-Mode: true' "$file"
    fi
  fi
done

echo "✅ Fixed text selectors"
echo "✅ Updated credentials"
echo "✅ Added test headers"

# Show summary
echo ""
echo "Test a few key flows:"
echo "1. maestro test maestro/tests/smoke-test.yaml"
echo "2. maestro test maestro/tests/02-dashboard-navigation.yaml"
echo "3. maestro test maestro/tests/03-theme-toggle.yaml"