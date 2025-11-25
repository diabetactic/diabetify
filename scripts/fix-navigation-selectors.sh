#!/bin/bash

# Script to replace text-based navigation selectors with resource-ids in Maestro tests
echo "Starting navigation selector fixes..."

# Counter for changes
CHANGES=0

# Function to replace navigation selectors in a file
fix_navigation() {
  local file=$1
  local temp_file="${file}.tmp"
  local changed=false

  # Create backup
  cp "$file" "$temp_file"

  # Replace Readings navigation
  if grep -q 'tapOn:.*".*Lecturas\|Readings.*"' "$file"; then
    sed -i 's/- tapOn: "Lecturas|Readings"/- tapOn:\n    id: "tab-button-readings"/g' "$file"
    sed -i "s/- tapOn: 'Lecturas|Readings'/- tapOn:\n    id: \"tab-button-readings\"/g" "$file"
    sed -i 's/- tapOn: "menu_book Lecturas"/- tapOn:\n    id: "tab-button-readings"/g' "$file"
    changed=true
  fi

  # Replace Dashboard/Home navigation
  if grep -q 'tapOn:.*".*Inicio\|Home\|Dashboard.*"' "$file"; then
    sed -i 's/- tapOn: "Inicio|Home|Dashboard"/- tapOn:\n    id: "tab-button-dashboard"/g' "$file"
    sed -i 's/- tapOn: "Inicio|Home|Panel de Control|Dashboard"/- tapOn:\n    id: "tab-button-dashboard"/g' "$file"
    sed -i 's/- tapOn: "Inicio|Home"/- tapOn:\n    id: "tab-button-dashboard"/g' "$file"
    sed -i "s/- tapOn: 'Inicio|Home'/- tapOn:\n    id: \"tab-button-dashboard\"/g" "$file"
    changed=true
  fi

  # Replace Profile navigation
  if grep -q 'tapOn:.*".*Perfil\|Profile.*"' "$file"; then
    sed -i 's/- tapOn: "Perfil|Profile"/- tapOn:\n    id: "tab-button-profile"/g' "$file"
    sed -i "s/- tapOn: 'Perfil|Profile'/- tapOn:\n    id: \"tab-button-profile\"/g" "$file"
    sed -i 's/- tapOn: "Perfil|Profile|Settings"/- tapOn:\n    id: "tab-button-profile"/g' "$file"
    changed=true
  fi

  # Replace Appointments navigation
  if grep -q 'tapOn:.*".*Citas\|Appointments.*"' "$file"; then
    sed -i 's/- tapOn: "Citas|Appointments"/- tapOn:\n    id: "tab-button-appointments"/g' "$file"
    sed -i "s/- tapOn: 'Citas|Appointments'/- tapOn:\n    id: \"tab-button-appointments\"/g" "$file"
    changed=true
  fi

  # Check if file changed
  if [ "$changed" = true ]; then
    if ! diff -q "$file" "$temp_file" > /dev/null; then
      echo "  ✓ Fixed navigation in: $file"
      ((CHANGES++))
    fi
  fi

  # Remove temp file
  rm -f "$temp_file"
}

# Find and fix all test files with navigation patterns
echo "Searching for files to fix..."
FILES=$(find maestro/tests -name "*.yaml" | xargs grep -l "tapOn:" | xargs grep -l "Lecturas\|Readings\|Inicio\|Home\|Perfil\|Profile\|Citas\|Appointments")

for file in $FILES; do
  fix_navigation "$file"
done

echo ""
echo "Navigation selector fix complete!"
echo "Total files updated: $CHANGES"
echo ""
echo "Note: Some files may still use text selectors for non-tab navigation (like buttons)."
echo "Those are intentional and don't need resource-ids."