#!/bin/bash
# Fix all Maestro tests to use Spanish-only selectors
# The app is in Spanish only, so bilingual selectors fail

echo "🔧 Fixing all tests to use Spanish-only selectors..."

# Fix all bilingual text selectors to Spanish-only
find maestro -name "*.yaml" -type f -exec sed -i \
  -e 's/"Panel de Control|Dashboard|Inicio|Home"/"Panel de Control"/g' \
  -e 's/"Panel de Control|Dashboard"/"Panel de Control"/g' \
  -e 's/"Inicio|Home"/"Inicio"/g' \
  -e 's/"Lecturas|Readings"/"Lecturas"/g' \
  -e 's/"Citas|Appointments"/"Citas"/g' \
  -e 's/"Perfil|Profile"/"Perfil"/g' \
  -e 's/"Recent|Recientes|Recent Readings|Lecturas Recientes"/"Lecturas Recientes"/g' \
  -e 's/"Appointments|Citas|My Appointments|Mis Citas"/"Mis Citas"/g' \
  -e 's/"Profile|Perfil"/"Perfil"/g' \
  -e 's/"Readings|Lecturas"/"Lecturas"/g' \
  -e 's/"Iniciar Sesión|Login"/"Iniciar Sesión"/g' \
  -e 's/"Iniciar Sesión|Sign In"/"Iniciar Sesión"/g' \
  -e 's/"Guardar|Save"/"Guardar"/g' \
  -e 's/"Cancelar|Cancel"/"Cancelar"/g' \
  -e 's/"Settings|Configuración"/"Configuración"/g' \
  -e 's/"Logout|Cerrar Sesión"/"Cerrar Sesión"/g' \
  -e 's/"Add|Agregar"/"Agregar"/g' \
  -e 's/"Delete|Eliminar"/"Eliminar"/g' \
  -e 's/"Edit|Editar"/"Editar"/g' \
  {} \;

echo "✅ Removed all bilingual selectors"

# Show what was changed
echo ""
echo "📋 Summary of changes:"
echo "- All English|Spanish selectors → Spanish only"
echo "- Dashboard navigation should now find 'Panel de Control'"
echo "- Readings tab should find 'Lecturas'"
echo "- Appointments should find 'Mis Citas'"

echo ""
echo "🚀 Ready to test! Try:"
echo "maestro test maestro/tests/smoke-test.yaml"
echo "maestro test maestro/tests/02-dashboard-navigation.yaml"