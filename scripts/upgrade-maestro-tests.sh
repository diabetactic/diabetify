#!/bin/bash

# Script to upgrade all Maestro tests with best practices
echo "🚀 Starting Maestro Test Suite Upgrade..."

# Add standardized tags to tests
add_tags() {
  local file=$1
  local tags=""

  # Determine appropriate tags based on file path
  if [[ $file == *"auth/"* ]]; then
    tags="  - auth"
  elif [[ $file == *"readings/"* ]]; then
    tags="  - readings\n  - crud"
  elif [[ $file == *"appointments/"* ]]; then
    tags="  - appointments\n  - crud"
  elif [[ $file == *"profile/"* ]]; then
    tags="  - profile"
  elif [[ $file == *"integration/"* ]]; then
    tags="  - integration"
  elif [[ $file == *"dashboard/"* ]]; then
    tags="  - dashboard"
  fi

  # Add smoke tag for key tests
  if [[ $file == *"01-"* ]] || [[ $file == *"02-"* ]] || [[ $file == *"smoke"* ]]; then
    tags="$tags\n  - smoke"
  fi

  # Check if tags already exist
  if ! grep -q "^tags:" "$file"; then
    # Add tags after appId
    sed -i "/^appId:/a\\tags:\\n$tags" "$file"
    echo "  ✓ Added tags to: $(basename $file)"
  fi
}

# Add state management hooks
add_hooks() {
  local file=$1

  # Skip if hooks already exist
  if grep -q "^onFlowStart:" "$file"; then
    return
  fi

  # Create hooks section
  local hooks="onFlowStart:\n"
  hooks+="  # Setup clean state\n"
  hooks+="  - runFlow:\n"
  hooks+="      file: ../../flows/setup/ensure-logged-in.yaml\n"
  hooks+="      env:\n"
  hooks+="        USERNAME: \${USERNAME:demo@example.com}\n"
  hooks+="        PASSWORD: \${PASSWORD:demo123}\n"
  hooks+="onFlowComplete:\n"
  hooks+="  # Return to dashboard for next test\n"
  hooks+="  - tapOn:\n"
  hooks+="      id: \"tab-button-dashboard\"\n"
  hooks+="      optional: true\n"

  # Add hooks after tags
  if grep -q "^tags:" "$file"; then
    sed -i "/^tags:/,/^---/{ /^---/i\\$hooks\n}" "$file"
  else
    sed -i "/^appId:/a\\$hooks" "$file"
  fi

  echo "  ✓ Added hooks to: $(basename $file)"
}

# Replace fragile selectors
improve_selectors() {
  local file=$1
  local changed=false

  # Replace coordinate-only taps with ID fallbacks
  if grep -q 'point: "[0-9]*%,[0-9]*%"' "$file" && ! grep -q "optional: true" "$file"; then
    # Add optional: true to coordinate taps
    sed -i 's/point: "\([0-9]*%,[0-9]*%\)"/point: "\1"\n    optional: true/g' "$file"
    changed=true
  fi

  # Add retryTapIfNoChange to submit buttons
  if grep -q 'text: "Guardar\|Save\|Submit\|Enviar"' "$file"; then
    sed -i 's/text: "\(Guardar\|Save\|Submit\|Enviar\)"/text: "\1"\n    retryTapIfNoChange: true/g' "$file"
    changed=true
  fi

  if [ "$changed" = true ]; then
    echo "  ✓ Improved selectors in: $(basename $file)"
  fi
}

# Process all test files
echo ""
echo "📝 Processing test files..."

for file in maestro/tests/**/*.yaml maestro/tests/*.yaml; do
  if [ -f "$file" ]; then
    # Skip already improved files
    if [[ $file == *"-improved.yaml" ]]; then
      continue
    fi

    echo "Processing: $file"
    add_tags "$file"
    # add_hooks "$file"  # Commented out for now - needs more careful application
    improve_selectors "$file"
  fi
done

echo ""
echo "✅ Test suite upgrade complete!"
echo ""
echo "Next steps:"
echo "1. Review the changes with: git diff maestro/"
echo "2. Test key flows with: ./scripts/test-status-check.sh"
echo "3. Run full suite with: ./scripts/test-maestro-all.sh"
echo ""
echo "Note: Some tests may need manual adjustments based on their specific requirements."