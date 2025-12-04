# Manual de TI - Diabetactic

Manual para el equipo de TI del hospital. Cubre instalación, despliegue y resolución de problemas.

## Requisitos del Sistema

### Entorno de Desarrollo

| Componente     | Versión   |
| -------------- | --------- |
| Node.js        | 20+       |
| npm            | 10+       |
| Java JDK       | 21        |
| Android Studio | Latest    |
| Android SDK    | API 22-34 |

### Dispositivos Android

- Android 5.1+ (API 22+)
- WebView Chromium 90+
- 50MB almacenamiento mínimo

## Instalación

```bash
# Clonar e instalar
git clone https://github.com/diabetactic/diabetactic-app.git
cd diabetactic-app
npm install

# Opcional: usar mise para versiones
mise install
mise use java@21 node@20

# Verificar
npm test
npm run lint
```

### Variables de Entorno Android

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export JAVA_HOME=/path/to/jdk-21
```

## Modos de Backend

| Modo  | Comando               | Uso                        |
| ----- | --------------------- | -------------------------- |
| mock  | `npm run start:mock`  | Desarrollo sin backend     |
| local | `npm run start:local` | Docker local (puerto 8000) |
| cloud | `npm run start:cloud` | API Heroku (producción)    |

### URLs por Plataforma

| Modo  | Web                   | Android                                                    |
| ----- | --------------------- | ---------------------------------------------------------- |
| local | http://localhost:8000 | http://10.0.2.2:8000                                       |
| cloud | /api (proxy)          | https://diabetactic-api-gateway-37949d6f182f.herokuapp.com |

## Compilación Android

### APK Debug

```bash
npm run mobile:build        # Todo en uno
npm run android:install     # Instalar en dispositivo
```

### APK Release

```bash
npm run mobile:build:release
# Salida: android/app/build/outputs/apk/release/app-release.apk
```

## Comandos Principales

```bash
# Desarrollo
npm start                   # Servidor dev (mock)
npm run build:prod          # Build producción

# Testing
npm test                    # Tests unitarios
npm run test:e2e            # Tests E2E
npm run lint                # Verificar código

# Android
npm run mobile:sync         # Sync a Android
npm run android:logs        # Ver logs dispositivo
npm run android:devices     # Listar dispositivos
```

## Resolución de Problemas

### Error de conexión al backend

```bash
# Verificar modo activo (ver consola F12)
# Cambiar modo:
npm run start:mock    # Sin backend
npm run start:cloud   # Heroku

# Verificar backend:
curl https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/health
```

### Fallo de build Gradle

```bash
# Verificar Java
java -version   # Debe ser 21

# Limpiar y reconstruir
npm run clean:all
npm run mobile:build
```

### App crashea en Android

```bash
npm run android:logs   # Ver errores

# Problemas comunes:
# - WebView desactualizado: actualizar desde Play Store
# - Permisos: revisar AndroidManifest.xml
# - Sync faltante: npm run cap:sync
```

### npm install falla

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## Logs

### Web (Navegador)

```
F12 > Console > Filtrar: "diabetactic"
```

### Android

```bash
npm run android:logs
# o: adb logcat | grep diabetactic
```

## Seguridad

- **PHI**: Logger redacta datos sensibles automáticamente
- **Credenciales**: Almacenadas en Android Keystore
- **HTTPS**: Obligatorio en producción
- **Tokens**: Expiran por inactividad

## Backup

### Archivos críticos (NO commitear keystores)

- `android/keystore.jks` - Guardar en lugar seguro
- `android/key.properties`
- `src/environments/environment.prod.ts`

### Backup de datos Android

```bash
adb backup -f diabetactic-backup.ab io.diabetactic.app
adb restore diabetactic-backup.ab
```

## Versionado

En `android/app/build.gradle`:

```groovy
versionCode 1        // Incrementar cada release
versionName "1.0.0"  // Semántico
```

## Mantenimiento

| Frecuencia | Tarea                              |
| ---------- | ---------------------------------- |
| Diario     | Revisar logs de error              |
| Semanal    | Verificar actualizaciones npm      |
| Mensual    | Parches de seguridad               |
| Trimestral | Actualizar Angular/Ionic/Capacitor |

## Documentación Relacionada

- [Configuración Android Studio](./ANDROID_STUDIO_SETUP.md)
- [Firma de APK](./APP_SIGNING_GUIDE.md)
- [Compatibilidad Android](./ANDROID_COMPATIBILITY.md)
- [Guía de Testing](./TESTING_GUIDE.md)
