# Referencia Completa de Scripts NPM

Todos los comandos se ejecutan desde la raíz del proyecto. **¡No es necesario hacer cd a la carpeta android!**

Este proyecto tiene más de 60 scripts npm organizados en categorías para desarrollo, pruebas, compilación y despliegue.

## 🚀 Servidor de Desarrollo (4 scripts)

Inicia el servidor de desarrollo Ionic con diferentes configuraciones de backend.

| Comando               | Qué hace                                    | Modo Backend           | Puerto |
| --------------------- | ------------------------------------------- | ---------------------- | ------ |
| `npm start`           | Inicia servidor de desarrollo (detecta ENV) | Por defecto: mock      | 8100   |
| `npm run start:mock`  | Inicia con backend mock                     | Mock (seguro)          | 8100   |
| `npm run start:local` | Inicia con backend Docker local             | Local (localhost:8000) | 8100   |
| `npm run start:cloud` | Inicia con backend Heroku                   | Cloud (API producción) | 8100   |

**Cómo funciona**: Usa `scripts/start-with-env.mjs` para detectar la variable ENV y configurar el entorno.

**Más usado**: `npm run start:mock` para desarrollo

**Cuándo usar cada uno**:

- `start:mock` - Por defecto para desarrollo de UI, no necesita backend
- `start:local` - Pruebas contra servicios Docker locales
- `start:cloud` - Pruebas contra la API de producción de Heroku

---

## 📦 Scripts de Compilación Web (5 scripts)

Compila la aplicación web Angular/Ionic para despliegue en navegador.

| Comando                 | Qué hace                                   | Optimización | AOT | Dir Salida |
| ----------------------- | ------------------------------------------ | ------------ | --- | ---------- |
| `npm run build`         | Compilación de desarrollo estándar         | No           | No  | `www/`     |
| `npm run build:dev`     | Compilación desarrollo (alias de build)    | No           | No  | `www/`     |
| `npm run build:prod`    | Compilación producción (AOT, tree-shaking) | Sí           | Sí  | `www/`     |
| `npm run build:mock`    | Compilación con config entorno mock        | No           | No  | `www/`     |
| `npm run build:heroku`  | Compilación con config entorno Heroku      | No           | No  | `www/`     |
| `npm run build:analyze` | Compilación con análisis de bundle webpack | No           | No  | `www/`     |

**Más usado**: `npm run build:prod` antes de desplegar o compilar app móvil

**AOT (Compilación Ahead-of-Time)**: Compila las plantillas Angular durante la compilación en lugar de en tiempo de ejecución.

**Cuándo usar**:

- `build:prod` - **Siempre usar antes de builds móviles** o despliegue a producción
- `build:analyze` - Investigar tamaño del bundle y oportunidades de optimización (ejecutar `npx webpack-bundle-analyzer dist/stats.json` después)
- `build:mock` - Probar backend mock en build de producción
- `build:heroku` - Desplegar a Heroku con config de backend cloud

---

## 📱 Scripts de Compilación Móvil (7 scripts)

Compila la aplicación móvil Capacitor para despliegue en Android.

### Comandos Rápidos (Más Usados)

| Comando                  | Qué hace                                    | Tiempo  | Componentes                   |
| ------------------------ | ------------------------------------------- | ------- | ----------------------------- |
| `npm run mobile:run`     | **Compilar, instalar, mostrar logs**        | ~2 min  | Web + APK + Instalar + Logcat |
| `npm run mobile:install` | Compilar web + Android + instalar en device | ~90 seg | Web + APK + Instalar          |
| `npm run mobile:build`   | Compilar web + APK Android (sin instalar)   | ~60 seg | Web + APK                     |
| `npm run deploy:local`   | Alias para mobile:install                   | ~90 seg | Web + APK + Instalar          |

**Empieza aquí**: `npm run mobile:run` - Hace todo y muestra logs

### Todos los Comandos Móviles

| Comando                        | Qué hace                                    | Pasos Ejecutados                             |
| ------------------------------ | ------------------------------------------- | -------------------------------------------- |
| `npm run mobile:sync`          | Compilar web (prod) + sincronizar Capacitor | `build:prod` → `cap sync`                    |
| `npm run mobile:build`         | Compilación completa: web + APK debug       | `mobile:sync` → `gradlew assembleDebug`      |
| `npm run mobile:build:release` | Compilar APK release (necesita firma)       | `mobile:sync` → `gradlew assembleRelease`    |
| `npm run mobile:install`       | Compilar + instalar en device/emulador      | `mobile:build` → `gradlew installDebug`      |
| `npm run mobile:run`           | Compilar + instalar + mostrar logs          | `mobile:install` → `adb logcat` (filtrado)   |
| `npm run mobile:clean`         | Limpiar build Android + artefactos web      | Elimina `android/build`, `www/`, `.angular/` |
| `npm run mobile:rebuild`       | Limpiar + recompilar todo                   | `mobile:clean` → `mobile:build`              |

**Cuándo usar**:

- `mobile:run` - Desarrollo móvil diario (ciclo completo)
- `mobile:build` - Solo necesitas el archivo APK
- `mobile:sync` - Actualización de plugins Capacitor o solo código web
- `mobile:clean` - Artefactos de compilación causando problemas
- `mobile:rebuild` - Opción nuclear cuando todo está roto

---

## 🤖 Scripts Específicos de Android (8 scripts)

Trabaja con Android Studio, Gradle, ADB y emuladores directamente.

| Comando                         | Qué hace                                    | Usar cuando                                |
| ------------------------------- | ------------------------------------------- | ------------------------------------------ |
| `npm run android:open`          | Abrir proyecto en Android Studio            | Necesitas editar código nativo Android     |
| `npm run android:build`         | Compilar solo APK debug (sin build web)     | Probar cambios nativos sin recompilar web  |
| `npm run android:build:release` | Compilar APK release (solo Gradle)          | Crear build de producción firmado          |
| `npm run android:install`       | Instalar APK debug existente en device      | APK ya compilado, solo necesitas instalar  |
| `npm run android:uninstall`     | Eliminar app del dispositivo                | Instalación limpia o probar estado inicial |
| `npm run android:logs`          | Mostrar salida logcat filtrada              | Depurar problemas de la app en dispositivo |
| `npm run android:clear-logs`    | Limpiar buffer de logcat                    | Limpiar antes de capturar nuevos logs      |
| `npm run android:devices`       | Listar dispositivos y emuladores conectados | Verificar conexión del dispositivo         |
| `npm run android:emulator`      | Iniciar emulador (Medium_Phone_API_36.1)    | Lanzar emulador sin Android Studio         |

**Filtrado de logs**: `android:logs` filtra solo las palabras clave "diabetactic", "chromium" y "capacitor".

**Usar cuando**: Ya compilaste la app web y solo necesitas cambios específicos de Android

**Los comandos se ejecutan desde**: directorio `android/` (usando `cd android && ...`)

---

## 🎯 Scripts de Despliegue (3 scripts)

Despliega APK a dispositivos o prepara para distribución.

| Comando                 | Qué hace                                | Pasos Ejecutados                  | Salida                                              |
| ----------------------- | --------------------------------------- | --------------------------------- | --------------------------------------------------- |
| `npm run deploy:local`  | Compilar e instalar en device conectado | `mobile:install`                  | Instalado en dispositivo                            |
| `npm run deploy:device` | Compilar y reinstalar forzado con ADB   | `mobile:build` → `adb install -r` | Instalado en dispositivo (forzado)                  |
| `npm run deploy:apk`    | Compilar APK y mostrar ruta del archivo | `mobile:build` → echo ruta        | `android/app/build/outputs/apk/debug/app-debug.apk` |

**Ruta del APK**: `android/app/build/outputs/apk/debug/app-debug.apk`

**Para compartir APK**: Ejecuta `npm run deploy:apk` y luego copia desde la ruta de arriba

**Diferencia**:

- `deploy:local` - Usa la tarea `installDebug` de Gradle
- `deploy:device` - Usa `adb install -r` (flag de reinstalación forzada)
- `deploy:apk` - Solo compila, no instala

---

## 🧪 Scripts de Pruebas (10 scripts)

Ejecuta pruebas unitarias, E2E, de integración y auditorías de accesibilidad.

### Pruebas Unitarias (Jest)

| Comando                 | Qué hace                           | Framework | Modo Watch | Reporte Cobertura |
| ----------------------- | ---------------------------------- | --------- | ---------- | ----------------- |
| `npm test`              | Ejecutar todas las pruebas unit.   | Jest      | No         | No                |
| `npm run test:unit`     | Ejecutar pruebas unitarias (alias) | Jest      | No         | No                |
| `npm run test:watch`    | Ejecutar pruebas en modo watch     | Jest      | Sí         | No                |
| `npm run test:coverage` | Ejecutar pruebas con cobertura     | Jest      | No         | Sí                |

**Ubicación pruebas**: archivos `*.spec.ts` junto al código fuente

**Framework**: Jest con capa de compatibilidad Jasmine

**Config**: `jest.config.js`, setup en `setup-jest.ts`

### Pruebas E2E (Playwright)

| Comando                    | Qué hace                            | Navegador Visible | Tipo           |
| -------------------------- | ----------------------------------- | ----------------- | -------------- |
| `npm run test:e2e`         | Ejecutar todas las pruebas E2E      | No (headless)     | Suite completa |
| `npm run test:e2e:headed`  | Ejecutar E2E con navegador visible  | Sí                | Suite completa |
| `npm run test:a11y`        | Ejecutar pruebas de accesibilidad   | No (headless)     | Accesibilidad  |
| `npm run test:a11y:headed` | Accesibilidad con navegador visible | Sí                | Accesibilidad  |
| `npm run test:ui-quality`  | Ejecutar solo pruebas de calidad UI | No (headless)     | Calidad UI     |
| `npm run test:mobile`      | Compilar app móvil + pruebas E2E    | No (headless)     | E2E Móvil      |

**Ubicación pruebas**: `playwright/tests/`

**Config**: `playwright.config.ts`

**Accesibilidad**: Usa `@axe-core/playwright` para pruebas de conformidad WCAG

### Pruebas de Integración

| Comando                    | Qué hace                 | Framework | Ejecuta en Serie |
| -------------------------- | ------------------------ | --------- | ---------------- |
| `npm run test:integration` | Ejecutar pruebas integr. | Jest      | Sí (serial)      |

**Config**: `jest.integration.config.js`

**Ejecución serial**: Las pruebas se ejecutan una a la vez (`--runInBand`) para evitar conflictos

**Pasa sin pruebas**: Flag `--passWithNoTests` permite que CI pase si no hay pruebas de integración aún

**Más usados**:

- Desarrollo: `npm run test:watch` (pruebas unitarias)
- Depuración: `npm run test:e2e:headed` (ver navegador)
- CI/CD: `npm test` (todas las pruebas unitarias)
- Pruebas móviles: `npm run test:mobile` (ciclo completo)
- Accesibilidad: `npm run test:a11y` (conformidad WCAG)

---

## 🔍 Scripts de Calidad de Código (5 scripts)

Lint, formato y validación de calidad de código.

| Comando               | Qué hace                       | Herramientas  | Auto-fix | Salir con Error |
| --------------------- | ------------------------------ | ------------- | -------- | --------------- |
| `npm run lint`        | Verificar código TypeScript/JS | ESLint        | No       | Sí              |
| `npm run lint:fix`    | Corregir problemas TypeScript  | ESLint        | Sí       | Sí              |
| `npm run lint:styles` | Verificar estilos SCSS/CSS     | Stylelint     | No       | Sí              |
| `npm run format`      | Formatear todos los archivos   | Prettier      | Sí       | No              |
| `npm run quality`     | Ejecutar lint + todas pruebas  | ESLint + Jest | No       | Sí              |

**Config ESLint**: Usa reglas Angular ESLint, TypeScript, reglas de importación

**Config Stylelint**: Estándares SCSS, compatibilidad Tailwind, verificación de características de navegador

**Config Prettier**: Incluye `prettier-plugin-tailwindcss` para ordenar clases

**Lint-staged**: Se ejecuta automáticamente en pre-commit via Husky (ver `package.json` → `lint-staged`)

**Antes de commit**: `npm run quality` (ejecuta tanto linting como pruebas)

**Archivos verificados**:

- `lint`: Todos los archivos `.ts` y `.js`
- `lint:styles`: Todos los archivos `.scss` y `.css` en `src/`
- `format`: Todos los archivos (`.ts`, `.js`, `.html`, `.scss`, `.json`, `.md`)

---

## 🛠️ Scripts de Utilidades (5 scripts)

Scripts de mantenimiento, limpieza y configuración.

| Comando              | Qué hace                          | Elimina                                                   | Reinstala   |
| -------------------- | --------------------------------- | --------------------------------------------------------- | ----------- |
| `npm run clean`      | Limpiar node modules y reinstalar | `node_modules/`, `package-lock.json`, `www/`, `.angular/` | npm install |
| `npm run clean:all`  | Limpiar todo (node + Android)     | Igual que `clean` + artefactos build Android              | npm install |
| `npm run i18n:check` | Verificar claves de traducción    | -                                                         | -           |
| `npm run cap:sync`   | Sincronizar plugins Capacitor     | -                                                         | -           |
| `npm run cap:update` | Actualizar dependencias Capacitor | -                                                         | -           |

**Cuándo usar**:

- `clean` - Node modules corruptos o necesitas instalación limpia
- `clean:all` - Todo está roto, opción nuclear
- `i18n:check` - Después de agregar nuevas claves de traducción
- `cap:sync` - Después de instalar/eliminar plugins Capacitor
- `cap:update` - Actualizar a versión más nueva de Capacitor

**i18n:check**: Ejecuta `scripts/check-i18n-missing.js` para comparar `en.json` y `es.json`

**cap:sync**: Copia assets web a proyectos nativos y actualiza dependencias nativas

---

## ⚙️ Scripts de Setup (2 scripts)

Scripts de ciclo de vida automáticos para inicialización del proyecto.

| Comando       | Qué hace                        | Cuándo se ejecuta        | Auto/Manual |
| ------------- | ------------------------------- | ------------------------ | ----------- |
| `prepare`     | Inicializar hooks git de Husky  | Después de `npm install` | Auto        |
| `postinstall` | Sync Capacitor si existe `www/` | Después de `npm install` | Auto        |

**Prepare**: Configura Husky para hooks git (linting/formato pre-commit)

**Postinstall**: Ejecuta condicionalmente `cap sync` si la app web ha sido compilada (directorio `www/` existe)

**Nunca llamar directamente**: Se ejecutan automáticamente como hooks de ciclo de vida npm

---

## 📊 Resumen de Categorías de Scripts

Total de scripts: **Más de 60 scripts** organizados en **9 categorías**

| Categoría              | Cantidad | Propósito                                    |
| ---------------------- | -------- | -------------------------------------------- |
| Servidor de Desarrollo | 4        | Iniciar servidor dev con diferentes backends |
| Compilación Web        | 6        | Compilar app Angular/Ionic para navegador    |
| Compilación Móvil      | 7        | Compilar app Android con Capacitor           |
| Específico Android     | 9        | Trabajar con Android Studio, Gradle, ADB     |
| Despliegue             | 3        | Desplegar APK a dispositivos                 |
| Pruebas                | 10       | Unitarias, E2E, integración, accesibilidad   |
| Calidad de Código      | 5        | Lint, formato, validar código                |
| Utilidades             | 5        | Mantenimiento, limpieza, i18n                |
| Setup                  | 2        | Hooks de ciclo de vida automáticos           |

**Más separadores de comentarios**: Package.json incluye `// === CATEGORÍA ===` para organización

---

## 📋 Flujos de Trabajo Comunes

### Primera Configuración

```bash
npm install               # Instalar dependencias (ejecuta hooks prepare + postinstall)
npm run mobile:build      # Primera compilación toma ~3-5 min
```

### Desarrollo Diario (Web)

```bash
npm run start:mock        # Iniciar servidor dev (más común)
# o
npm run start:local       # Probar con backend Docker local
# o
npm run start:cloud       # Probar con API de producción Heroku

# Hacer cambios, el navegador se recarga automáticamente
```

### Desarrollo Diario (Móvil)

```bash
# Opción 1: Desarrollar primero en navegador (iteración más rápida)
npm run start:mock        # Desarrollar en navegador con hot-reload
# Una vez listo para probar en móvil:
npm run mobile:run        # Compilar + instalar + logs

# Opción 2: Desarrollo móvil directo
npm run mobile:install    # Compilar e instalar
npm run android:logs      # Ver logs en terminal separada
```

### Antes de Commit

```bash
npm run format            # Formatear todos los archivos con Prettier
npm run lint:fix          # Auto-corregir problemas de ESLint
npm run quality           # Ejecutar lint + todas las pruebas (verificación final)
```

**Hooks git**: Hook pre-commit ejecuta automáticamente lint-staged (formato + linting)

### Desplegar a Dispositivo

```bash
# Más común: Compilar + instalar + ver logs
npm run mobile:run

# Alternativa: Compilar + reinstalación forzada
npm run deploy:device

# Solo obtener archivo APK
npm run deploy:apk
```

### Compartir APK con Alguien

```bash
npm run deploy:apk
# Copiar desde: android/app/build/outputs/apk/debug/app-debug.apk
# Enviar el archivo APK por email, almacenamiento en la nube, etc.
```

### Pruebas

```bash
# Pruebas unitarias (desarrollo)
npm run test:watch        # Modo watch para TDD

# Pruebas unitarias (CI/CD)
npm test                  # Ejecutar todas las pruebas una vez
npm run test:coverage     # Con reporte de cobertura

# Pruebas E2E (navegador)
npm run test:e2e          # Headless
npm run test:e2e:headed   # Navegador visible para depuración

# Pruebas de accesibilidad
npm run test:a11y         # Auditoría de conformidad WCAG
npm run test:ui-quality   # Verificaciones de calidad UI

# E2E móvil
npm run test:mobile       # Compilar móvil + ejecutar E2E

# Pruebas de integración
npm run test:integration  # Ejecutar suite de integración
```

### Compilación Limpia (Algo Está Roto)

```bash
# Limpiar solo móvil
npm run mobile:rebuild    # Limpiar Android + recompilar

# Limpiar todo
npm run clean:all         # Limpiar node_modules + Android
# Luego recompilar:
npm run mobile:build
```

### Actualizar Después de Cambiar Plugins Capacitor

```bash
# Después de instalar nuevo plugin (ej: npm install @capacitor/camera)
npm run cap:sync          # Sincronizar a proyectos nativos
npm run mobile:build      # Recompilar app móvil
```

### Optimizar Tamaño del Bundle

```bash
npm run build:analyze     # Compilar con estadísticas
npx webpack-bundle-analyzer dist/stats.json
# Analizar composición del bundle e identificar dependencias grandes
```

### Trabajar con Android Studio

```bash
# Abrir en Android Studio
npm run android:open

# Hacer cambios nativos, luego:
npm run android:build     # Compilar solo APK (sin recompilar web)
npm run android:install   # Instalar en dispositivo

# O recompilación completa si hay cambios web también:
npm run mobile:build
```

### Depurar Problemas Móviles

```bash
# Terminal 1: Ver logs
npm run android:logs

# Terminal 2: Hacer cambios y recompilar
npm run mobile:install

# O combinado:
npm run mobile:run        # Compilar + instalar + logs
```

### Gestionar Dispositivos y Emuladores

```bash
# Verificar dispositivos conectados
npm run android:devices

# Iniciar emulador
npm run android:emulator  # Lanza Medium_Phone_API_36.1

# Limpiar logcat antes de depurar
npm run android:clear-logs
```

### Gestión de Traducciones

```bash
# Después de agregar nuevas claves i18n
npm run i18n:check        # Verificar traducciones faltantes
# Actualizar manualmente src/assets/i18n/en.json y es.json
```

---

## 🎨 Variables de Entorno

Controla el modo backend para el servidor de desarrollo y compilaciones.

### Variable ENV

Establecer antes de ejecutar comandos de inicio:

```bash
ENV=mock npm start      # Backend mock (por defecto, sin llamadas API)
ENV=local npm start     # Docker local en localhost:8000
ENV=cloud npm start     # API de producción Heroku (api-gateway.heroku.com)
```

O usar atajos dedicados:

```bash
npm run start:mock      # Igual que ENV=mock npm start
npm run start:local     # Igual que ENV=local npm start
npm run start:cloud     # Igual que ENV=cloud npm start
```

### Cómo Funciona

El script `scripts/start-with-env.mjs`:

1. Lee la variable `ENV`
2. Actualiza `src/environments/environment.ts` con el `DEV_BACKEND_MODE` correcto
3. Inicia el servidor de desarrollo Angular

**Por defecto**: Si `ENV` no está establecido, usa modo `mock`

**Verificar modo actual**: Busca "🚀 App Configuration" en la consola del navegador

---

## ⚡ Tabla de Referencia Rápida

| Quiero...                          | Comando                              | Categoría         |
| ---------------------------------- | ------------------------------------ | ----------------- |
| **Iniciar servidor dev**           | `npm run start:mock`                 | Desarrollo        |
| **Compilar para navegador**        | `npm run build:prod`                 | Compilación Web   |
| **Compilar app móvil**             | `npm run mobile:build`               | Compilación Móvil |
| **Instalar en dispositivo**        | `npm run mobile:install`             | Compilación Móvil |
| **Compilar + instalar + ver logs** | `npm run mobile:run`                 | Compilación Móvil |
| **Solo compilar APK**              | `npm run deploy:apk`                 | Despliegue        |
| **Compartir APK**                  | `npm run deploy:apk`                 | Despliegue        |
| **Ejecutar pruebas unitarias**     | `npm test`                           | Pruebas           |
| **Ejecutar pruebas en modo watch** | `npm run test:watch`                 | Pruebas           |
| **Ejecutar pruebas E2E**           | `npm run test:e2e`                   | Pruebas           |
| **Verificar accesibilidad (WCAG)** | `npm run test:a11y`                  | Pruebas           |
| **Corregir estilo de código**      | `npm run lint:fix && npm run format` | Calidad Código    |
| **Ejecutar todas las verificac.**  | `npm run quality`                    | Calidad Código    |
| **Limpiar node modules**           | `npm run clean`                      | Utilidades        |
| **Limpiar todo**                   | `npm run clean:all`                  | Utilidades        |
| **Sincronizar Capacitor**          | `npm run cap:sync`                   | Utilidades        |
| **Verificar traducciones**         | `npm run i18n:check`                 | Utilidades        |
| **Abrir Android Studio**           | `npm run android:open`               | Android           |
| **Ver logs móviles**               | `npm run android:logs`               | Android           |
| **Iniciar emulador**               | `npm run android:emulator`           | Android           |
| **Verificar dispositivos**         | `npm run android:devices`            | Android           |
| **Analizar tamaño bundle**         | `npm run build:analyze`              | Compilación Web   |

---

## 💡 Consejos Pro

### Flujo de Trabajo de Desarrollo

1. **Comando más común**: `npm run mobile:run`
   - Compila app web (producción), APK Android, instala, muestra logs filtrados
   - Perfecto para desarrollo móvil diario
   - Un solo comando hace todo

2. **Ciclo de iteración más rápido**:
   - Desarrollar en navegador: `npm run start:mock` (hot-reload instantáneo)
   - Probar en móvil ocasionalmente: `npm run mobile:run`
   - El navegador es 10x más rápido para trabajo de UI

3. **Checklist antes de commit**:
   ```bash
   npm run format      # Formatear código
   npm run lint:fix    # Corregir problemas de linting
   npm run quality     # Ejecutar lint + pruebas
   ```
   Hooks git ejecutarán lint-staged automáticamente al hacer commit

### Ubicación de Archivos

4. **Ubicación del APK**:
   - Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Release: `android/app/build/outputs/apk/release/app-release.apk`
   - Después de cualquier comando `mobile:build`, `android:build` o deploy

5. **Salida de compilación web**: directorio `www/`
   - Generado por `npm run build` o `ng build`
   - Requerido antes de `cap sync` o compilaciones móviles

6. **Reportes de cobertura de pruebas**: directorio `coverage/`
   - Generado por `npm run test:coverage`
   - Abrir `coverage/lcov-report/index.html` en navegador

### Logs y Depuración

7. **Los logs están filtrados**:
   - `mobile:run` y `android:logs` usan `grep -i 'diabetactic\|chromium\|capacitor'`
   - Filtra el ruido del sistema Android
   - Solo muestra logs relevantes de la app

8. **Visibilidad del modo backend**:
   - Verifica la consola del navegador: "🚀 App Configuration"
   - Muestra: Modo Backend, URL API Gateway, estado Producción
   - Ayuda a verificar el entorno correcto

9. **Consejos de depuración en consola**:
   - Ver `docs/CONSOLE_LOG_TIPS.md` para patrones de depuración
   - Usar console.table() para datos estructurados
   - Usar console.group() para logs anidados

### Organización del Proyecto

10. **No es necesario hacer cd**:
    - Todos los comandos funcionan desde la raíz del proyecto
    - Los scripts manejan cambios de directorio internamente
    - Simplifica el flujo de trabajo y automatización

11. **Organización de scripts en package.json**:
    - Organizado con comentarios `// === CATEGORÍA ===`
    - Fácil encontrar scripts relacionados
    - Agrupación lógica por propósito

12. **Flujo de trabajo con múltiples terminales**:
    - Terminal 1: `npm run start:mock` (servidor dev)
    - Terminal 2: `npm run test:watch` (pruebas)
    - Terminal 3: `npm run android:logs` (logs móviles cuando se necesiten)

### Rendimiento

13. **Tiempos de compilación**:
    - `build:dev`: ~10-20 segundos (sin optimización)
    - `build:prod`: ~30-60 segundos (AOT + optimización)
    - `mobile:build`: ~60-90 segundos (web + Android)
    - `mobile:run`: ~90-120 segundos (ciclo completo)

14. **Compilaciones incrementales**:
    - `android:build` solo recompila código nativo (~30 seg)
    - `mobile:sync` solo sincroniza assets web (~10 seg)
    - Usar cuando sabes qué cambió

15. **Análisis de bundle**:
    - `npm run build:analyze` crea `dist/stats.json`
    - Ejecutar `npx webpack-bundle-analyzer dist/stats.json`
    - Desglose visual del tamaño del bundle por módulo

---

## 🆘 Resolución de Problemas

### Problemas de Compilación

| Problema                             | Solución                                       | Explicación                                 |
| ------------------------------------ | ---------------------------------------------- | ------------------------------------------- |
| Compilación falla con errores Gradle | `npm run mobile:clean && npm run mobile:build` | Limpiar caché y artefactos de build Android |
| Compilación falla con errores npm    | `npm run clean && npm run mobile:build`        | Limpiar node_modules y reinstalar           |
| Todo está roto                       | `npm run clean:all && npm run mobile:build`    | Opción nuclear: limpiar todo y recompilar   |
| Cambios web no en móvil              | `npm run mobile:sync`                          | Re-sincronizar assets web a Capacitor       |
| Plugin Capacitor no funciona         | `npm run cap:sync && npm run mobile:build`     | Sincronizar plugin a proyectos nativos      |
| Errores de compilación Angular       | `rm -rf .angular www && npm run build:prod`    | Limpiar caché Angular y recompilar          |

### Problemas de Dispositivo y Emulador

| Problema                  | Solución                                              | Explicación                                     |
| ------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| Dispositivo no encontrado | `npm run android:devices`                             | Verificar debug USB habilitado y cable funciona |
| Emulador no inicia        | `npm run android:emulator`                            | Lanzar emulador por defecto                     |
| App no se instala         | `npm run android:uninstall && npm run mobile:install` | Eliminar versión vieja y reinstalar             |
| Múltiples dispositivos    | `adb devices` luego `adb -s <device-id> install ...`  | Usar ID de dispositivo específico               |

### Problemas de Logs y Depuración

| Problema                  | Solución                                             | Explicación                                      |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| Logs no aparecen          | `npm run android:clear-logs && npm run android:logs` | Limpiar buffer logcat y reiniciar logging        |
| Demasiado ruido en logs   | `npm run android:logs`                               | Usar logs filtrados (solo diabetactic/capacitor) |
| Necesito logs sin filtrar | `adb logcat`                                         | Ver todos los logs del sistema                   |
| App crashea al iniciar    | `npm run android:logs` luego buscar stack traces     | Buscar excepciones Java o errores JS             |

### Problemas de Pruebas

| Problema                            | Solución                                              | Explicación                                      |
| ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| Pruebas fallan tras actualizar deps | `rm -rf node_modules && npm install && npm test`      | Reinstalar dependencias                          |
| Problemas de caché Jest             | `npx jest --clearCache && npm test`                   | Limpiar caché de Jest                            |
| Pruebas E2E timeout                 | `npm run test:e2e:headed`                             | Ejecutar con navegador visible para ver qué pasa |
| Pruebas accesibilidad fallan        | Revisar violaciones axe en `playwright/test-results/` | Verificar problemas de conformidad WCAG          |

### Problemas de Calidad de Código

| Problema                        | Solución                                                                       | Explicación                              |
| ------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| Errores linting bloquean commit | `npm run lint:fix && npm run format`                                           | Auto-corregir la mayoría de problemas    |
| Errores Stylelint               | `npm run lint:styles` luego corregir manualmente                               | Problemas CSS/SCSS necesitan revisión    |
| Hook pre-commit falla           | Corregir problemas de linting o usar `git commit --no-verify` (no recomendado) | Hooks git aseguran estándares de calidad |

### Problemas de Entorno y Configuración

| Problema                 | Solución                                                    | Explicación                              |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------------- |
| Modo backend incorrecto  | Verificar consola navegador: "🚀 App Configuration"         | Verificar DEV_BACKEND_MODE es correcto   |
| Variable ENV no funciona | Usar `npm run start:mock` en lugar de `ENV=mock npm start`  | Scripts wrapper más confiables           |
| Traducciones faltantes   | `npm run i18n:check` luego actualizar `en.json` y `es.json` | Verificar claves de traducción faltantes |

### Problemas de Rendimiento

| Problema             | Solución                                                                     | Explicación                                 |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------- |
| Compilaciones lentas | Usar compilaciones incrementales: `android:build` en lugar de `mobile:build` | Saltar recompilación web si no es necesario |
| Bundle muy grande    | `npm run build:analyze` luego optimizar imports                              | Identificar dependencias grandes            |
| Servidor dev lento   | Limpiar caché `.angular`: `rm -rf .angular`                                  | Corrupción de caché de build Angular        |

### Resolución de Problemas Avanzada

| Problema                        | Solución                                                      | Explicación                                   |
| ------------------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| Android Studio no abre proyecto | `npm run android:open` o abrir manualmente carpeta `android/` | Abrir como proyecto Android, no script Gradle |
| Problemas daemon Gradle         | `cd android && ./gradlew --stop && cd ..`                     | Detener daemon Gradle y reintentar            |
| ADB no encontrado               | Agregar platform-tools del Android SDK al PATH                | Ver `docs/ANDROID_STUDIO_SETUP.md`            |
| Puerto 8100 ya en uso           | `lsof -ti:8100 \| xargs kill -9` luego `npm start`            | Matar proceso usando puerto 8100              |

**Cuando todo lo demás falla**:

1. `npm run clean:all` - Limpiar todo
2. `rm -rf .angular www node_modules package-lock.json`
3. `npm install`
4. `npm run mobile:build`
5. Revisar `docs/` para guías de configuración específicas

---

## 📚 Documentación Relacionada

Para información más detallada sobre temas específicos:

| Archivo de Documentación  | Descripción                                      |
| ------------------------- | ------------------------------------------------ |
| `ANDROID_STUDIO_SETUP.md` | Guía completa de setup Android Studio, Java, SDK |
| `BACKEND_MODE_GUIDE.md`   | Configuración modos backend (mock/local/cloud)   |
| `CONSOLE_LOG_TIPS.md`     | Patrones y consejos de depuración en consola     |
| `PATTERN_DESIGNS.md`      | Patrones de arquitectura y decisiones de diseño  |
| `CLAUDE.md`               | Resumen del proyecto y guía para Claude Code     |
| `README.md`               | Introducción del proyecto y primeros pasos       |

**Estructura del proyecto**:

- `src/` - Código fuente de la aplicación Angular/Ionic
- `android/` - Proyecto Android nativo (Capacitor)
- `playwright/` - Pruebas E2E y auditorías de accesibilidad
- `scripts/` - Scripts de compilación y utilidades
- `docs/` - Archivos de documentación

**Archivos de configuración**:

- `package.json` - Dependencias y scripts npm
- `angular.json` - Configuración Angular CLI
- `capacitor.config.ts` - Configuración de Capacitor
- `jest.config.js` - Configuración de pruebas unitarias Jest
- `playwright.config.ts` - Configuración de pruebas E2E Playwright
- `tailwind.config.js` - Configuración de Tailwind CSS
- `tsconfig.json` - Configuración de TypeScript

---

## 📝 Resumen

Este proyecto usa **más de 60 scripts npm** organizados en **9 categorías** para gestionar:

1. **Desarrollo** - Servidor dev con backends mock/local/cloud
2. **Compilación Web** - Builds Angular/Ionic con varias optimizaciones
3. **Compilación Móvil** - Builds e instalación Android con Capacitor
4. **Android** - Desarrollo Android nativo con Gradle y ADB
5. **Despliegue** - Distribución de APK e instalación en dispositivos
6. **Pruebas** - Unitarias (Jest), E2E (Playwright), integración, accesibilidad
7. **Calidad** - ESLint, Stylelint, Prettier, verificaciones combinadas
8. **Utilidades** - Limpieza, sync Capacitor, verificación traducciones
9. **Setup** - Hooks git automáticos e inicialización Capacitor

**Comandos más usados**:

- `npm run start:mock` - Desarrollo web diario
- `npm run mobile:run` - Desarrollo móvil diario
- `npm run test:watch` - Pruebas unitarias TDD
- `npm run quality` - Verificación de calidad pre-commit
- `npm run deploy:apk` - Compilar APK para compartir

**Características principales**:

- Todos los comandos se ejecutan desde la raíz del proyecto (sin `cd` necesario)
- Logs filtrados para depuración móvil (solo diabetactic/capacitor)
- Múltiples modos de backend para diferentes entornos
- Suite de pruebas completa (unitarias, E2E, integración, accesibilidad)
- Verificaciones automáticas de calidad de código con hooks git
- Compilaciones incrementales para iteración más rápida

Para desarrollo diario, empieza con `npm run start:mock` para web o `npm run mobile:run` para móvil. Todo lo demás se construye sobre estas bases.
