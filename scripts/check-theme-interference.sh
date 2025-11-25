#!/bin/bash
# Script de verificación rápida para detectar interferencias de tema
# Uso: ./scripts/check-theme-interference.sh

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
}

print_check() {
    local status=$1
    local message=$2
    if [ "$status" = "ok" ]; then
        echo -e "${GREEN}✓${NC} $message"
    elif [ "$status" = "warn" ]; then
        echo -e "${YELLOW}⚠${NC} $message"
    else
        echo -e "${RED}✗${NC} $message"
    fi
}

print_header "Diabetactic - Theme Interference Checker"

# 1. Verificar meta tag en index.html
print_header "1. Verificando meta tag color-scheme"
if grep -q 'name="color-scheme" content="light"' src/index.html 2>/dev/null; then
    print_check "ok" "Meta tag correcto: content=\"light\""
else
    print_check "error" "Meta tag incorrecto o no encontrado"
    echo -e "  ${YELLOW}Debería ser:${NC} <meta name=\"color-scheme\" content=\"light\" />"
fi

# 2. Verificar que no haya media queries activos
print_header "2. Verificando media queries prefers-color-scheme"
if grep -r "@media.*prefers-color-scheme" src/global.scss | grep -v "^[[:space:]]*//"; then
    print_check "error" "Media queries activos encontrados en global.scss"
    echo -e "  ${YELLOW}Líneas:${NC}"
    grep -n "@media.*prefers-color-scheme" src/global.scss | grep -v "^[[:space:]]*//"
else
    print_check "ok" "No hay media queries activos (todos comentados)"
fi

# 3. Verificar variables de entorno del sistema
print_header "3. Verificando variables de entorno"

variables_found=false

if [ -n "$GTK_THEME" ]; then
    print_check "warn" "GTK_THEME está set: $GTK_THEME"
    variables_found=true
fi

if [ -n "$QT_STYLE_OVERRIDE" ]; then
    print_check "warn" "QT_STYLE_OVERRIDE está set: $QT_STYLE_OVERRIDE"
    variables_found=true
fi

if [ -n "$QT_QPA_PLATFORMTHEME" ]; then
    print_check "warn" "QT_QPA_PLATFORMTHEME está set: $QT_QPA_PLATFORMTHEME"
    variables_found=true
fi

if [ "$variables_found" = false ]; then
    print_check "ok" "No hay variables de tema del sistema activas"
fi

# 4. Verificar plasma-browser-integration
print_header "4. Verificando Plasma Browser Integration"
if pacman -Qs plasma-browser-integration > /dev/null 2>&1; then
    print_check "warn" "plasma-browser-integration está instalado"
    echo -e "  ${YELLOW}Consejo:${NC} Deshabilita la extensión en Chrome o desinstala el paquete"
else
    print_check "ok" "plasma-browser-integration no está instalado"
fi

# 5. Verificar archivos de flags de Chrome
print_header "5. Verificando flags de Chrome/Chromium"

flags_found=false

if [ -f ~/.config/chromium-flags.conf ]; then
    print_check "warn" "Encontrado: ~/.config/chromium-flags.conf"
    if grep -E "(force-dark|WebUIDarkMode|AutoDarkMode)" ~/.config/chromium-flags.conf 2>/dev/null; then
        print_check "error" "Flags problemáticos encontrados:"
        grep -E "(force-dark|WebUIDarkMode|AutoDarkMode)" ~/.config/chromium-flags.conf
        flags_found=true
    fi
fi

if [ -f ~/.config/chrome-flags.conf ]; then
    print_check "warn" "Encontrado: ~/.config/chrome-flags.conf"
    if grep -E "(force-dark|WebUIDarkMode|AutoDarkMode)" ~/.config/chrome-flags.conf 2>/dev/null; then
        print_check "error" "Flags problemáticos encontrados:"
        grep -E "(force-dark|WebUIDarkMode|AutoDarkMode)" ~/.config/chrome-flags.conf
        flags_found=true
    fi
fi

if [ "$flags_found" = false ]; then
    print_check "ok" "No se encontraron flags problemáticos"
fi

# 6. Verificar que el servidor esté corriendo
print_header "6. Verificando Dev Server"
if lsof -Pi :4200 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_check "ok" "Dev server corriendo en puerto 4200"
else
    print_check "warn" "Dev server NO está corriendo"
    echo -e "  ${YELLOW}Ejecuta:${NC} npm start"
fi

# 7. Verificar extensiones de navegador comunes
print_header "7. Extensiones de navegador (manual)"
echo -e "${YELLOW}Por favor verifica manualmente en Chrome/Chromium:${NC}"
echo "  1. Abre chrome://extensions/"
echo "  2. Deshabilita temporalmente:"
echo "     • Dark Reader"
echo "     • Night Eye"
echo "     • Turn Off the Lights"
echo "     • Plasma Integration"
echo "     • Cualquier extensión de temas"

# Resumen final
print_header "Resumen"

echo -e "${BLUE}Próximos pasos:${NC}"
echo ""
echo -e "${GREEN}1. Ejecutar modo aislado:${NC}"
echo -e "   ${YELLOW}./scripts/run-isolated.sh${NC}"
echo ""
echo -e "${GREEN}2. Verificar en DevTools (F12):${NC}"
echo -e "   • Ctrl+Shift+P → 'Show Rendering'"
echo -e "   • Verificar 'prefers-color-scheme': No emulation"
echo ""
echo -e "${GREEN}3. Documentación completa:${NC}"
echo -e "   ${YELLOW}docs/BROWSER_OS_THEMING_PREVENTION.md${NC}"
echo ""

print_header "✓ Verificación completada"
