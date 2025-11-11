# Prevención de Interferencias del Sistema/Navegador

Este documento contiene todas las verificaciones y configuraciones necesarias para asegurar que SOLO los estilos de la app Diabetify se apliquen, sin interferencias de Chrome, Chromium, o KDE Plasma.

## ✅ Cambios Realizados en la App

### 1. Meta Tag `color-scheme`
**Archivo**: `src/index.html` línea 9

**Antes**:
```html
<meta name="color-scheme" content="light dark" />
```

**Después**:
```html
<meta name="color-scheme" content="light" />
```

**Por qué**: La meta tag `light dark` le dice al navegador que la app soporta ambos temas y permite que el navegador aplique sus propios estilos nativos. Al cambiarla a solo `light`, forzamos que la app use ÚNICAMENTE sus propios estilos CSS, incluso cuando el usuario cambia al modo oscuro dentro de la app (que se controla mediante la clase `.dark-theme`).

## 🔧 Configuraciones del Navegador

### Chrome/Chromium

1. **Abrir DevTools** (F12)
2. **Verificar que no haya override de tema**:
   - Presiona `Ctrl+Shift+P` (Command Palette)
   - Escribe "rendering"
   - Selecciona "Show Rendering"
   - En el panel de Rendering, verifica:
     - ✅ **Emulate CSS media feature prefers-color-scheme**: Debe estar en "No emulation"
     - ✅ **Disable local fonts**: Debe estar desmarcado
     - ✅ **Enable automatic dark mode**: Debe estar desmarcado

3. **Verificar extensiones**:
   - Abre `chrome://extensions/` o `chromium://extensions/`
   - Deshabilita temporalmente extensiones de temas oscuros como:
     - Dark Reader
     - Night Eye
     - Turn Off the Lights
     - Cualquier extensión de temas
   - Recarga la app (F5)

4. **Verificar configuración de Chrome**:
   - Abre `chrome://settings/appearance` o `chromium://settings/appearance`
   - En "Themes", asegúrate de usar el tema por defecto (Default)
   - En "Color mode", déjalo en "System default" (esto NO afectará la app ahora que cambiamos la meta tag)

5. **Flags de Chrome** (opcional, pero recomendado):
   - Abre `chrome://flags/` o `chromium://flags/`
   - Busca "force-dark"
   - Asegúrate que **"Auto Dark Mode for Web Contents"** esté en "Default" o "Disabled"
   - Reinicia Chrome si cambias algún flag

### Chromium específico para Arch Linux

Si instalaste Chromium desde los repos de Arch, verifica:

```bash
# Ver flags de inicio de Chromium
cat ~/.config/chromium-flags.conf

# O si usas Chrome
cat ~/.config/chrome-flags.conf
```

**Asegúrate de que NO haya flags como**:
- `--force-dark-mode`
- `--enable-features=WebUIDarkMode`
- `--enable-features=AutoDarkMode`

Si los encuentras, coméntalos o elimínalos:
```bash
# Editar archivo de flags
nano ~/.config/chromium-flags.conf
# Comenta las líneas problemáticas con #
```

## 🎨 Configuraciones de KDE Plasma

KDE Plasma puede aplicar colores del sistema a las aplicaciones web. Aquí está cómo deshabilitarlo:

### 1. Configuración de Colores del Sistema

1. **Abrir System Settings**:
   ```bash
   systemsettings5
   ```

2. **Navegar a**:
   - Appearance → Colors → Applications

3. **Verificar esquema de color**:
   - Puedes usar cualquier esquema de color del sistema
   - Pero asegúrate de que las apps web no lo hereden

### 2. Prevenir que Plasma afecte Chromium

1. **Deshabilitar integración de Plasma con Chrome**:
   ```bash
   # Verificar si tienes plasma-browser-integration instalado
   pacman -Qs plasma-browser-integration

   # Si lo tienes y quieres deshabilitarlo solo para testing
   # Opción 1: Deshabilitar la extensión en Chrome
   # chrome://extensions/ → Deshabilitar "Plasma Integration"

   # Opción 2: Remover temporalmente el paquete
   # sudo pacman -R plasma-browser-integration
   ```

2. **Deshabilitar GTK theme en Qt apps** (si aplica):
   ```bash
   # Verificar variables de entorno
   echo $QT_QPA_PLATFORMTHEME

   # Si muestra "gtk2" o "gtk3", temporalmente deshabilitarlo:
   unset QT_QPA_PLATFORMTHEME

   # Luego lanzar Chrome/Chromium desde esa terminal
   chromium http://localhost:4200
   ```

### 3. Configuración de Compositor

El compositor de KDE puede afectar el rendering:

1. **System Settings** → Display and Monitor → Compositor
2. Asegúrate que esté en "OpenGL 3.1" o "OpenGL 2.0"
3. **NO uses** "XRender" si tienes problemas de rendering

### 4. Variables de Entorno de KDE

Verifica tus variables de entorno:

```bash
# Ver todas las variables relacionadas con theming
env | grep -E 'QT_|GTK_|PLASMA|KDE_'
```

**Variables que podrían causar problemas**:
- `GTK_THEME` - Si está set, puede afectar apps web
- `QT_STYLE_OVERRIDE` - Puede forzar estilos Qt
- `PLASMA_USE_QT_SCALING` - Puede afectar scaling

**Lanzar Chrome sin variables de entorno de KDE**:
```bash
env -u GTK_THEME -u QT_STYLE_OVERRIDE -u PLASMA_USE_QT_SCALING chromium http://localhost:4200
```

## 🧪 Tests de Verificación

### Test 1: Modo Incógnito
Abre la app en modo incógnito para descartar extensiones:
```bash
chromium --incognito http://localhost:4200
```

### Test 2: Con todas las extensiones deshabilitadas
```bash
chromium --disable-extensions http://localhost:4200
```

### Test 3: Sin aceleración de hardware
```bash
chromium --disable-gpu http://localhost:4200
```

### Test 4: Con perfil limpio
```bash
# Crear perfil temporal
chromium --user-data-dir=/tmp/clean-chrome-profile http://localhost:4200
```

### Test 5: Sin integración de sistema
```bash
# Combinación de flags para testing puro
chromium \
  --disable-extensions \
  --disable-features=WebUIDarkMode,AutoDarkMode \
  --user-data-dir=/tmp/clean-chrome-profile \
  http://localhost:4200
```

## 📊 Verificación de Estilos en DevTools

1. **Abrir DevTools** (F12)
2. **Seleccionar un elemento** (Ctrl+Shift+C)
3. **Ver estilos aplicados** en la pestaña "Styles"

**Lo que debes ver**:
- ✅ Estilos de `global.scss`
- ✅ Estilos de componentes específicos
- ✅ Variables CSS de Ionic (con prefijo `--ion-`)

**Lo que NO debes ver**:
- ❌ Estilos con `user agent stylesheet` aplicando temas
- ❌ Estilos de extensiones (check si hay `-webkit-` o `-moz-` que no sean nativos)
- ❌ Estilos de KDE/Plasma (usualmente tienen prefijos específicos)

## 🐛 Debugging: Verificar qué está afectando los estilos

### 1. Inspeccionar elemento en modo claro
```bash
# En DevTools Console
document.body.classList
// Debería mostrar solo las clases de Ionic
```

### 2. Inspeccionar elemento en modo oscuro
```bash
# Cambiar a modo oscuro en la app
# Luego en DevTools Console
document.body.classList
// Debería incluir "dark-theme" o "ion-palette-dark"
```

### 3. Verificar variables CSS
```bash
# En DevTools Console
getComputedStyle(document.documentElement).getPropertyValue('--ion-background-color')
// Modo claro: debe ser "#f5f7f8" o similar
// Modo oscuro: debe ser "#121212"
```

### 4. Verificar meta tag
```bash
# En DevTools Console
document.querySelector('meta[name="color-scheme"]').getAttribute('content')
// Debe retornar: "light"
```

## ✅ Checklist Final

Marca cada item después de verificarlo:

### En la App
- [ ] Meta tag `color-scheme` está en "light"
- [ ] No hay media queries `@media (prefers-color-scheme)` activos en CSS
- [ ] La app usa class-based theming (`.dark-theme`)

### En Chrome/Chromium
- [ ] No hay extensiones de temas activas
- [ ] Rendering panel: "No emulation" en prefers-color-scheme
- [ ] Chrome theme es "Default"
- [ ] No hay flags de dark mode forzado
- [ ] No hay archivo chromium-flags.conf con flags problemáticos

### En KDE Plasma
- [ ] Plasma Browser Integration deshabilitado (si está instalado)
- [ ] Variables GTK_THEME y QT_STYLE_OVERRIDE no afectan
- [ ] Compositor en OpenGL 3.1/2.0

### Tests
- [ ] App funciona correctamente en modo incógnito
- [ ] App funciona con `--disable-extensions`
- [ ] App funciona con perfil limpio
- [ ] Modo claro se ve correcto
- [ ] Modo oscuro se ve correcto
- [ ] Cambio entre modos funciona correctamente

## 🎯 Resultado Esperado

Después de aplicar todos estos cambios y verificaciones:

1. **Modo Claro**:
   - Fondo: Blanco/gris muy claro (#f5f7f8)
   - Texto: Negro/gris oscuro
   - Sin influencia de tema del sistema

2. **Modo Oscuro**:
   - Fondo: Negro profundo (#121212)
   - Texto: Blanco brillante (#f5f5f5)
   - Cards: Gris oscuro (#1e1e1e)
   - Sin influencia de tema del sistema

3. **El cambio de tema del sistema NO debe afectar la app**
4. **Solo el botón de tema en Profile debe controlar el aspecto**

## 🚀 Comando de Desarrollo Aislado

Para desarrollo sin interferencias:

```bash
#!/bin/bash
# Guardar como: run-diabetactic-isolated.sh

# Matar procesos previos
pkill -f "chromium.*4200"
pkill -f "chrome.*4200"

# Lanzar dev server en background si no está corriendo
if ! lsof -Pi :4200 -sTCP:LISTEN -t >/dev/null ; then
    echo "Starting dev server..."
    cd /home/julito/TPP/diabetactic-extServices-20251103-061913/diabetactic
    npm start &
    sleep 5
fi

# Lanzar Chromium con configuración limpia
chromium \
  --new-window \
  --disable-features=WebUIDarkMode,AutoDarkMode \
  --disable-extensions \
  --user-data-dir=/tmp/diabetactic-chrome-profile \
  http://localhost:4200

# Cleanup
rm -rf /tmp/diabetactic-chrome-profile
```

Hacer ejecutable:
```bash
chmod +x run-diabetactic-isolated.sh
./run-diabetactic-isolated.sh
```

---

**Última actualización**: 2025-11-09
**Autor**: Claude Code
**Versión**: 1.0
