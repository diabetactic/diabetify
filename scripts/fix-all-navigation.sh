#!/bin/bash
# Fix all navigation in Maestro tests to use resource-ids

echo "Fixing navigation in all Maestro tests..."

# Dashboard navigation
find maestro/tests -name "*.yaml" -exec sed -i \
  -e 's/- tapOn: ".*\(Inicio\|Home\).*"/- tapOn:\n    id: "tab-button-dashboard"/g' \
  -e 's/- tapOn: "home Inicio"/- tapOn:\n    id: "tab-button-dashboard"/g' \
  {} \;

# Readings navigation
find maestro/tests -name "*.yaml" -exec sed -i \
  -e 's/- tapOn: ".*\(Lecturas\|Readings\).*"/- tapOn:\n    id: "tab-button-readings"/g' \
  -e 's/- tapOn: "menu_book Lecturas"/- tapOn:\n    id: "tab-button-readings"/g' \
  {} \;

# Appointments navigation
find maestro/tests -name "*.yaml" -exec sed -i \
  -e 's/- tapOn: ".*\(Citas\|Appointments\).*"/- tapOn:\n    id: "tab-button-appointments"/g' \
  -e 's/- tapOn: "calendar_today Citas"/- tapOn:\n    id: "tab-button-appointments"/g' \
  {} \;

# Profile navigation
find maestro/tests -name "*.yaml" -exec sed -i \
  -e 's/- tapOn: ".*\(Perfil\|Profile\).*"/- tapOn:\n    id: "tab-button-profile"/g' \
  -e 's/- tapOn: "person Perfil"/- tapOn:\n    id: "tab-button-profile"/g' \
  {} \;

echo "Navigation fixed in all tests!"