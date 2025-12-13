# Despliegue y Configuración

## 1. Requisitos del Sistema

### 1.1 Servidor Backend

| Componente        | Requisito             |
| ----------------- | --------------------- |
| Sistema operativo | Linux (Ubuntu 20.04+) |
| Base de datos     | PostgreSQL 14+        |
| Runtime           | Python 3.11+          |
| Memoria           | 2 GB RAM mínimo       |

### 1.2 Dispositivos Cliente

| Plataforma | Requisito                           |
| ---------- | ----------------------------------- |
| Android    | Versión 8.0 (API 26) o superior     |
| Web        | Chrome 90+, Firefox 88+, Safari 14+ |

---

## 2. Arquitectura de Despliegue

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   App Móvil     │────▶│   API Gateway   │────▶│   Base de       │
│   (Capacitor)   │     │   (FastAPI)     │     │   Datos         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   IndexedDB     │     │   Tidepool      │
│   (Offline)     │     │   OAuth         │
└─────────────────┘     └─────────────────┘
```

---

## 3. Modos de Backend

La aplicación soporta tres modos de operación:

| Modo    | Variable    | Uso                       |
| ------- | ----------- | ------------------------- |
| `mock`  | `ENV=mock`  | Desarrollo sin backend    |
| `local` | `ENV=local` | Backend en localhost:8000 |
| `cloud` | `ENV=cloud` | API en producción         |

---

## 4. Instalación del APK

### 4.1 Generar APK de Debug

```bash
# Instalar dependencias
pnpm install

# Compilar y generar APK
pnpm run mobile:build

# Ubicación del APK
android/app/build/outputs/apk/debug/app-debug.apk
```

### 4.2 Instalación en Dispositivo

```bash
# Conectar dispositivo con USB debugging habilitado
adb devices

# Instalar APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Configuración del Hospital

### 5.1 Variables de Entorno

```env
# API Backend
API_BASE_URL=https://api.hospital.example.com

# Tidepool (Producción)
TIDEPOOL_CLIENT_ID=diabetactic-hospital
TIDEPOOL_REDIRECT_URI=io.diabetactic.app://callback
```

### 5.2 Personalización

La aplicación permite personalizar:

- Logo del hospital (assets/images/)
- Colores del tema (tailwind.config.js)
- Textos de bienvenida (assets/i18n/)

---

## 6. Seguridad

### 6.1 Almacenamiento de Datos

| Dato                | Ubicación             | Cifrado            |
| ------------------- | --------------------- | ------------------ |
| Tokens de sesión    | SecureStorage         | AES-256            |
| Lecturas de glucosa | IndexedDB             | No (datos locales) |
| Preferencias        | Capacitor Preferences | No                 |

### 6.2 Comunicación

- Todas las comunicaciones con el backend usan HTTPS
- Tokens JWT con expiración de 24 horas
- Refresh tokens almacenados en SecureStorage

---

## 7. Monitoreo

### 7.1 Logs de Aplicación

```bash
# Ver logs en Android
adb logcat | grep -i diabetactic
```

### 7.2 Métricas Recomendadas

- Tasa de sincronización exitosa
- Tiempo de respuesta del backend
- Errores de autenticación
- Uso de almacenamiento offline

---

## 8. Actualización

### 8.1 Actualización del APK

1. Generar nueva versión del APK
2. Distribuir mediante:
   - Google Play Store (producción)
   - APK directo (pruebas internas)

### 8.2 Actualización del Backend

El backend se actualiza de forma independiente sin requerir actualización del cliente.

---

## 9. Soporte

Para soporte técnico contactar al equipo de desarrollo.
