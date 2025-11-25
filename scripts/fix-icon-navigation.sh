#!/bin/bash

# Script to replace icon+text navigation selectors with resource-ids in Maestro tests
echo "Starting icon+text navigation selector fixes..."

# Counter for changes
CHANGES=0

# Function to replace icon navigation in a file
fix_icon_navigation() {
  local file=$1
  local changed=false

  # Replace icon+text navigation patterns
  # Dashboard/Home patterns
  if grep -q 'text:.*"home Inicio"' "$file"; then
    sed -i 's/text: "home Inicio"/id: "tab-button-dashboard"/g' "$file"
    changed=true
  fi

  if grep -q 'text: "Inicio"' "$file"; then
    sed -i 's/    text: "Inicio"/    id: "tab-button-dashboard"/g' "$file"
    changed=true
  fi

  # Profile patterns
  if grep -q 'text:.*"person Perfil"' "$file"; then
    sed -i 's/text: "person Perfil"/id: "tab-button-profile"/g' "$file"
    changed=true
  fi

  if grep -q 'text:.*"person Profile"' "$file"; then
    sed -i 's/text: "person Profile"/id: "tab-button-profile"/g' "$file"
    changed=true
  fi

  if grep -q 'text: "Perfil"' "$file"; then
    sed -i 's/    text: "Perfil"/    id: "tab-button-profile"/g' "$file"
    changed=true
  fi

  # Readings patterns
  if grep -q 'text:.*"menu_book Lecturas"' "$file"; then
    sed -i 's/text: "menu_book Lecturas"/id: "tab-button-readings"/g' "$file"
    changed=true
  fi

  # Check if file changed
  if [ "$changed" = true ]; then
    echo "  ✓ Fixed icon navigation in: $file"
    ((CHANGES++))
  fi
}

# Find and fix all test files
echo "Searching for files with icon navigation..."
FILES=$(find maestro/tests -name "*.yaml" -exec grep -l 'text:.*"\(home Inicio\|person Perfil\|person Profile\|menu_book Lecturas\|Inicio\|Perfil\)"' {} \;)

for file in $FILES; do
  fix_icon_navigation "$file"
done

echo ""
echo "Icon navigation selector fix complete!"
echo "Total files updated: $CHANGES"