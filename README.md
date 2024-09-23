## Guía de Configuración y Uso

### Prerrequisitos

Antes de comenzar, asegúrate de tener instalado lo siguiente:

1. **Node.js** (versión 20): [Descargar Node.js](https://nodejs.org/)
2. **Ionic CLI**: Instálalo globalmente con el siguiente comando:
   ```bash
   npm install -g @ionic/cli
   ```
3. **Android Studio** (para desarrollo en Android): [Descargar Android Studio](https://developer.android.com/studio)
4. **Xcode** (para desarrollo en iOS, solo en macOS): Disponible en la App Store de macOS.

### Configuración del Proyecto

1. **Clonar el repositorio**:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   ```
2. **Instalar dependencias**:
   ```bash
   cd diabetify
   npm install
   ```

### Ejecución en el Navegador

Para ejecutar la aplicación en un servidor local de desarrollo:

```bash
npm start
```

Esto iniciará la aplicación en `http://localhost:8100/`.

### Desarrollo para Android

#### Configuración de Android Studio

1. **Instalar Android Studio**.
2. **Configura las variables de entorno** (solo en Windows):
  - Añade `ANDROID_HOME` a tus variables de entorno, apuntando al directorio del SDK de Android.
   - Añade `%ANDROID_HOME%\platform-tools` a tu variable `PATH`.
3. **Crea un dispositivo virtual (emulador)**:
  - Abre Android Studio.
  - Ve a **AVD/Device Manager**.
  - Crea un nuevo dispositivo siguiendo las instrucciones.

#### Ejecutar en un Emulador Android

```bash
npm run prepare:android
```

Este script realiza:

- Compila la aplicación.
- Sincroniza con Capacitor.
- Ejecuta la aplicación en el emulador(va a dejar elegir el dispositivo a usar para correr).

#### Ejecutar en un Dispositivo Android Físico

1. Ir a Android Studio, a la parte de Device Manager.
2. Buscar el boton de "Pair device using WiFi" y seguir los pasos.
3. Luego, una vez este conectado, el dispositivo deberia aparecer en la lista de dispositivos disponibles.

### Desarrollo para iOS (solo en macOS)

#### Configuración de Xcode

1. **Instala Xcode** desde la App Store.
2. **Acepta los acuerdos de licencia**:
   ```bash
   sudo xcodebuild -license accept
   ```
3. **Instala CocoaPods** si no lo tienes:
   ```bash
   sudo gem install cocoapods
   ```

#### Ejecutar en un Simulador iOS

```bash
npm run prepare:ios
```

Esto abrirá Xcode. Desde allí, selecciona un simulador y ejecuta la aplicación.

### Construir la Aplicación para Producción

#### Android

```bash
npm run build:android
```

El APK o AAB generado se encontrará en `android/app/build/outputs/`.

#### iOS

```bash
npm run build:ios
```

Luego, desde Xcode, puedes archivar y exportar la aplicación para distribución.

### Otros Comandos Útiles

- **Linting**:
  ```bash
  npm run lint
  ```
- **Pruebas Unitarias**:
  ```bash
  npm test
  ```
