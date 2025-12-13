# Guía de Desarrollo Android - Diabetactic

## Tabla de Contenidos

1. [Inicio Rápido](#inicio-rápido)
2. [Configuración de Android Studio](#configuración-de-android-studio)
3. [Compilación y Despliegue](#compilación-y-despliegue)
4. [Compatibilidad y Versiones SDK](#compatibilidad-y-versiones-sdk)
5. [Firma de la App](#firma-de-la-app)
6. [Resolución de Problemas](#resolución-de-problemas)

---

## Inicio Rápido

### Prerrequisitos

| Componente     | Versión                |
| -------------- | ---------------------- |
| Java JDK       | 21                     |
| Android Studio | Ladybug 2024.2.1+      |
| Android SDK    | API 22-34              |
| Gradle         | 8.x (wrapper incluido) |

```bash
# Verificar configuración
java -version          # Debe mostrar Java 21
echo $ANDROID_HOME     # Debe apuntar al SDK
adb devices            # Listar dispositivos
```

### Compilar e Instalar (Un Comando)

```bash
# Opción recomendada: Scripts npm
npm run mobile:install    # Build + sync + install

# Con logs
npm run mobile:run        # Build + install + logcat
```

### Compilación Manual

```bash
# Paso a paso
npm run build:prod        # 1. Build web
npx cap sync android      # 2. Sync Capacitor
cd android && ./gradlew assembleDebug installDebug  # 3. Build + install
```

---

## Configuración de Android Studio

### Primera Configuración

1. Abrir carpeta `android/` en Android Studio
2. **Confiar en Scripts Gradle** - Clic en "Confiar en el Proyecto"
3. Esperar sincronización de Gradle (2-5 minutos)
4. Aceptar licencias y descargar componentes faltantes si se solicita

### Variables de Entorno

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export JAVA_HOME=/path/to/jdk-21

# Agregar a ~/.bashrc o ~/.zshrc
```

### Configuración de AVD (Emulador)

```bash
# Descargar imagen del sistema
sdkmanager "system-images;android-34;google_apis;x86_64"

# Crear AVD
avdmanager create avd \
  -n Test_API34 \
  -k "system-images;android-34;google_apis;x86_64" \
  -d "pixel_6"

# Iniciar emulador
emulator -avd Test_API34
```

**Configuración Recomendada**:

- Dispositivo: Pixel 6
- RAM: 2048 MB
- Almacenamiento: 2048 MB
- Gráficos: Hardware - GLES 2.0

### Atajos Útiles

| Acción             | Linux/Win        | Mac           |
| ------------------ | ---------------- | ------------- |
| Compilar Proyecto  | Ctrl + F9        | ⌘ + F9        |
| Ejecutar           | Shift + F10      | ⌃ + R         |
| Depurar            | Shift + F9       | ⌃ + D         |
| Logcat             | Alt + 6          | ⌘ + 6         |
| Sincronizar Gradle | Ctrl + Shift + O | ⌘ + Shift + O |

---

## Compilación y Despliegue

### Scripts npm Disponibles

```bash
# Compilación
npm run mobile:sync       # Build prod + sync Capacitor
npm run mobile:build      # Sync + APK debug
npm run mobile:build:release  # APK release (requiere firma)

# Instalación
npm run mobile:install    # Build + install en dispositivo
npm run mobile:run        # Install + ver logs

# Limpieza
npm run mobile:clean      # Limpiar caché de build
npm run mobile:rebuild    # Clean + rebuild completo

# Android específico
npm run android:open      # Abrir Android Studio
npm run android:logs      # Ver logcat filtrado
npm run android:devices   # Listar dispositivos
```

### Tareas de Gradle

```bash
cd android/

./gradlew tasks           # Listar todas las tareas
./gradlew assembleDebug   # Compilar APK debug
./gradlew assembleRelease # Compilar APK release
./gradlew installDebug    # Instalar en dispositivo
./gradlew clean           # Limpiar artefactos
./gradlew dependencies    # Ver árbol de dependencias
```

**Ubicación de APKs**:

- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

### Ver Logs

```bash
# Logs filtrados de la app
adb logcat | grep -i diabetactic

# Logs de WebView (console.log de Angular)
adb logcat | grep -i chromium

# Logs de Capacitor
adb logcat | grep -i capacitor

# Limpiar buffer de logs
adb logcat -c
```

### Depurar WebView

1. Abrir app en dispositivo
2. En Chrome de escritorio: `chrome://inspect`
3. Encontrar dispositivo y hacer clic en "inspect"
4. DevTools completo con consola, red, etc.

---

## Compatibilidad y Versiones SDK

### Configuración Actual

```groovy
// android/variables.gradle
ext {
    minSdkVersion = 22      // Android 5.1 (Lollipop)
    compileSdkVersion = 34  // Android 14
    targetSdkVersion = 34   // Android 14
}
```

### Cobertura de Mercado (~99.5%)

| Versión Android | API   | Cuota | Prioridad de Prueba |
| --------------- | ----- | ----- | ------------------- |
| 14              | 34    | ~15%  | Crítica             |
| 13              | 33    | ~20%  | Crítica             |
| 12              | 31-32 | ~25%  | Alta                |
| 11              | 30    | ~15%  | Alta                |
| 10              | 29    | ~12%  | Media               |
| 9 (Pie)         | 28    | ~8%   | Media               |
| 8 (Oreo)        | 26-27 | ~3%   | Baja                |
| 7 (Nougat)      | 24-25 | ~1.5% | Baja                |
| 5.1-6           | 22-23 | ~1%   | Muy Baja            |

### Requisito de WebView

**Mínimo**: Chromium 90+ (abril 2021)

```bash
# Verificar versión de WebView
adb shell dumpsys webview | grep -i version
```

- Android 10+: Auto-actualiza via Play Store
- Android 7-9: Verificar que auto-actualización está habilitada
- Android 5-6: Puede requerir actualización manual

### Problemas Conocidos por Versión

| Android | Problema                            | Solución                              |
| ------- | ----------------------------------- | ------------------------------------- |
| 14      | Permiso de notificaciones requerido | App lo solicita en primer inicio      |
| 13      | Permisos granulares                 | Capacitor lo maneja                   |
| 12      | API de splash screen                | Plugin Capacitor actualizado          |
| 9       | Cleartext bloqueado                 | `cleartext: true` en capacitor.config |
| 8       | Canales de notificación             | Capacitor crea canales                |
| 5.1-6   | WebView antiguo                     | Actualizar a Chromium 90+             |

### Notas por Fabricante

- **Samsung**: Excelente compatibilidad. Deshabilitar optimización de batería.
- **Xiaomi**: Habilitar "Autoinicio" y deshabilitar "Ahorro de batería".
- **Huawei (sin Play)**: Instalar APK manualmente, verificar WebView.
- **OnePlus**: Bloquear app en recientes para evitar cierre.

---

## Firma de la App

### Tipos de Firma

| Tipo    | Uso                   | Keystore                    |
| ------- | --------------------- | --------------------------- |
| Debug   | Desarrollo            | `~/.android/debug.keystore` |
| Release | Producción/Play Store | Keystore personalizado      |

### Firma Debug (Automática)

```bash
# Ya configurado - solo compilar
./gradlew assembleDebug
```

### Generar Keystore de Producción

```bash
# Crear directorio seguro
mkdir -p ~/keystores && chmod 700 ~/keystores

# Generar keystore
keytool -genkeypair \
  -v \
  -keystore ~/keystores/diabetactic-release.jks \
  -alias diabetactic-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Verificar
keytool -list -v -keystore ~/keystores/diabetactic-release.jks
```

### Configurar Firma Release

Crear `android/keystore.properties` (NO hacer commit):

```properties
storeFile=/home/usuario/keystores/diabetactic-release.jks
storePassword=TU_CONTRASEÑA
keyAlias=diabetactic-key
keyPassword=TU_CONTRASEÑA
```

El `build.gradle` ya está configurado para leer este archivo.

### Compilar Release Firmado

```bash
cd android
./gradlew clean assembleRelease

# Verificar firma
jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk
```

### Seguridad del Keystore

**HACER**:

- Respaldar keystore en múltiples ubicaciones seguras
- Usar gestor de contraseñas
- Restringir permisos: `chmod 600 keystore.jks`

**NO HACER**:

- Hacer commit al repositorio
- Enviar por email
- Compartir contraseñas en texto plano

⚠️ **Si pierdes el keystore, no podrás actualizar la app en dispositivos existentes.**

---

## Resolución de Problemas

### Gradle Sync Falla

```bash
cd android
./gradlew clean
rm -rf .gradle/ build/ app/build/
# Archivo > Sincronizar Proyecto en Android Studio
```

### Java Version Incorrecta

```bash
java -version  # Debe ser 21

# Con mise
mise install java@21
mise use java@21

# Manual
export JAVA_HOME=/path/to/jdk-21
```

### SDK No Encontrado

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Emulador No Inicia

```bash
emulator -list-avds
emulator -avd NombreAVD -memory 2048
# O limpiar datos
emulator -avd NombreAVD -wipe-data
```

### "NET::ERR_CLEARTEXT_NOT_PERMITTED" (Android 9+)

Verificar en `capacitor.config.ts`:

```typescript
server: {
  cleartext: true,
  androidScheme: 'https',
}
```

### Discrepancia de Firma al Actualizar

Causa: APK firmado con clave diferente a instalación original.

Solución: Usar mismo keystore, o usuario debe desinstalar y reinstalar.

### Comandos de Diagnóstico

```bash
# Versión Android del dispositivo
adb shell getprop ro.build.version.release

# Nivel API
adb shell getprop ro.build.version.sdk

# Versión WebView
adb shell dumpsys webview | grep -i version

# Memoria de la app
adb shell dumpsys meminfo io.diabetactic.app

# Permisos
adb shell dumpsys package io.diabetactic.app | grep permission
```

---

## Estructura del Proyecto

```
android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/io/ionic/starter/
│   │   ├── res/                    # Recursos (iconos, strings)
│   │   └── assets/public/          # App web (desde npm build)
│   └── build.gradle                # Config nivel app
├── build.gradle                    # Config nivel proyecto
├── gradle.properties
├── keystore.properties             # NO hacer commit
└── variables.gradle                # Versiones SDK
```

---

## Modo Backend para Builds Móviles

Los builds móviles siempre usan configuración de **producción** (backend cloud/Heroku).

```typescript
// src/environments/environment.prod.ts
backendMode: 'cloud',
apiGateway: {
  baseUrl: 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com'
}
```

Para desarrollo web con diferentes backends, ver [Guía de Modos de Backend](BACKEND_MODE_GUIDE.md).

---

## Build de Producción (Release)

### Generar Keystore de Producción

```bash
# Crear directorio seguro
mkdir -p ~/keystores && chmod 700 ~/keystores

# Generar keystore
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore ~/keystores/diabetactic-release.jks \
  -alias diabetactic-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Verificar
keytool -list -v -keystore ~/keystores/diabetactic-release.jks
```

### Configurar Firma Release

Crear `android/keystore.properties` (NO hacer commit):

```properties
storeFile=../android/release-keystore.jks
storePassword=TU_CONTRASEÑA
keyAlias=diabetactic-release
keyPassword=TU_CONTRASEÑA
```

### Compilar APK/AAB Firmado

```bash
cd android

# APK release
./gradlew assembleRelease

# AAB para Play Store (recomendado)
./gradlew bundleRelease
```

**Ubicación de salida**:

- APK: `app/build/outputs/apk/release/app-release.apk`
- AAB: `app/build/outputs/bundle/release/app-release.aab`

### Verificar Build

```bash
# Instalar y probar
adb install app/build/outputs/apk/release/app-release.apk

# Verificar firma
jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk
```

### Características de Seguridad (Release)

- **Ofuscación**: ProGuard/R8 ofusca nombres de clases y métodos
- **Shrinking**: Elimina recursos no utilizados
- **HTTPS only**: Tráfico cleartext deshabilitado en producción
- **Keystore seguro**: Credenciales nunca en control de versiones

### Troubleshooting Release

| Problema                  | Solución                                  |
| ------------------------- | ----------------------------------------- |
| "keystore not found"      | Verificar path en keystore.properties     |
| ProGuard elimina clases   | Agregar reglas keep en proguard-rules.pro |
| "Cleartext not permitted" | Esperado en release, usar HTTPS           |
| App crashea post-ProGuard | Agregar keep rules para reflection        |

⚠️ **IMPORTANTE**: Respaldar keystore en múltiples ubicaciones seguras. Si se pierde, no podrás actualizar la app.
