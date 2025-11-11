#!/bin/bash
# Script para ejecutar Diabetify sin interferencias del sistema o navegador
# Uso: ./scripts/run-isolated.sh [chrome|chromium]

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_color() {
    local color=$1
    shift
    echo -e "${color}$@${NC}"
}

# Banner
print_color $BLUE "═══════════════════════════════════════════════════"
print_color $BLUE "  Diabetify - Isolated Browser Mode"
print_color $BLUE "═══════════════════════════════════════════════════"
echo ""

# Detectar navegador
BROWSER=${1:-chromium}  # Default: chromium

if ! command -v $BROWSER &> /dev/null; then
    print_color $RED "✗ Error: $BROWSER no está instalado"
    print_color $YELLOW "Probando con navegador alternativo..."

    if command -v chromium &> /dev/null; then
        BROWSER="chromium"
    elif command -v google-chrome-stable &> /dev/null; then
        BROWSER="google-chrome-stable"
    elif command -v chrome &> /dev/null; then
        BROWSER="chrome"
    else
        print_color $RED "✗ Error: No se encontró ningún navegador Chromium"
        exit 1
    fi
fi

print_color $GREEN "✓ Usando navegador: $BROWSER"
echo ""

# Limpiar procesos previos
print_color $YELLOW "→ Limpiando procesos previos..."
pkill -f "$BROWSER.*4200" 2>/dev/null
sleep 1

# Verificar si el dev server está corriendo
if ! lsof -Pi :4200 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    print_color $YELLOW "→ Dev server no está corriendo. Iniciando..."

    # Verificar que estamos en el directorio correcto
    if [ ! -f "package.json" ]; then
        print_color $RED "✗ Error: No se encuentra package.json"
        print_color $YELLOW "  Ejecuta este script desde la raíz del proyecto"
        exit 1
    fi

    # Iniciar dev server en background
    npm start > /dev/null 2>&1 &
    DEV_SERVER_PID=$!

    print_color $YELLOW "  Esperando a que el dev server inicie..."

    # Esperar hasta que el servidor esté listo (máximo 30 segundos)
    for i in {1..30}; do
        if lsof -Pi :4200 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            print_color $GREEN "✓ Dev server iniciado correctamente"
            break
        fi
        sleep 1
        echo -n "."
    done
    echo ""

    if ! lsof -Pi :4200 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        print_color $RED "✗ Error: El dev server no pudo iniciar"
        print_color $YELLOW "  Intenta ejecutar 'npm start' manualmente"
        exit 1
    fi
else
    print_color $GREEN "✓ Dev server ya está corriendo"
fi

echo ""
print_color $BLUE "═══════════════════════════════════════════════════"
print_color $BLUE "  Configuración del Navegador Aislado"
print_color $BLUE "═══════════════════════════════════════════════════"
echo ""
print_color $YELLOW "Flags activos:"
echo "  • --new-window                    (Nueva ventana)"
echo "  • --disable-features=             (Sin dark mode automático)"
echo "      WebUIDarkMode,"
echo "      AutoDarkMode"
echo "  • --disable-extensions            (Sin extensiones)"
echo "  • --user-data-dir=/tmp/...        (Perfil temporal limpio)"
echo ""

# Crear directorio temporal para perfil
TEMP_PROFILE="/tmp/diabetify-chrome-profile-$$"
print_color $YELLOW "→ Creando perfil temporal: $TEMP_PROFILE"

# Lanzar navegador con configuración aislada
print_color $GREEN "✓ Lanzando $BROWSER..."
echo ""
print_color $BLUE "═══════════════════════════════════════════════════"
print_color $GREEN "  App disponible en: http://localhost:4200"
print_color $BLUE "═══════════════════════════════════════════════════"
echo ""
print_color $YELLOW "Instrucciones:"
echo "  1. La app debería abrirse automáticamente"
echo "  2. Verifica que NO haya interferencias del sistema"
echo "  3. Prueba cambiar entre modo claro y oscuro"
echo "  4. Cierra el navegador cuando termines"
echo ""
print_color $YELLOW "Para detener el dev server:"
echo "  Ctrl+C en la terminal donde se ejecutó 'npm start'"
echo ""

# Lanzar navegador
$BROWSER \
  --new-window \
  --disable-features=WebUIDarkMode,AutoDarkMode \
  --disable-extensions \
  --user-data-dir="$TEMP_PROFILE" \
  http://localhost:4200 2>/dev/null &

BROWSER_PID=$!

# Esperar a que el navegador se lance
sleep 2

if ps -p $BROWSER_PID > /dev/null; then
    print_color $GREEN "✓ Navegador lanzado correctamente (PID: $BROWSER_PID)"
else
    print_color $RED "✗ Error al lanzar el navegador"
    exit 1
fi

echo ""
print_color $BLUE "═══════════════════════════════════════════════════"
print_color $YELLOW "  Presiona Ctrl+C para limpiar y salir"
print_color $BLUE "═══════════════════════════════════════════════════"
echo ""

# Función de limpieza
cleanup() {
    echo ""
    print_color $YELLOW "→ Limpiando..."

    # Matar navegador si sigue corriendo
    if ps -p $BROWSER_PID > /dev/null 2>&1; then
        print_color $YELLOW "  Cerrando navegador..."
        kill $BROWSER_PID 2>/dev/null
    fi

    # Eliminar perfil temporal
    if [ -d "$TEMP_PROFILE" ]; then
        print_color $YELLOW "  Eliminando perfil temporal..."
        rm -rf "$TEMP_PROFILE"
    fi

    print_color $GREEN "✓ Limpieza completada"
    echo ""
    print_color $BLUE "═══════════════════════════════════════════════════"
    print_color $GREEN "  ¡Hasta luego!"
    print_color $BLUE "═══════════════════════════════════════════════════"
    echo ""
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Esperar a que el navegador se cierre
wait $BROWSER_PID

# Limpieza automática cuando el navegador se cierra
cleanup
