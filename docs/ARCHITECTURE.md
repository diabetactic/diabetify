# Arquitectura - Diabetify

## Visión General

Diabetify es una aplicación móvil Ionic/Angular que se comunica con un backend de microservicios a través de un API Gateway centralizado.

El backend (en repositorios separados) expone servicios para autenticación, lecturas de glucosa y citas médicas.

## Patrón API Gateway

Toda la comunicación con el backend se realiza a través del servicio API Gateway.

### Servicio Gateway (Frontend)

- **Ubicación**: `src/app/core/services/api-gateway.service.ts`
- **URL Base**: `environment.backendServices.apiGateway.baseUrl`

**Responsabilidades**:

- Enrutamiento centralizado de requests
- Inyección automática de tokens de autenticación
- Transformación de respuestas
- Estandarización de errores
- Estrategia de caché
- Reintentos con backoff exponencial

### Backend Microservicios

| Servicio         | Puerto | Endpoints                   |
| ---------------- | ------ | --------------------------- |
| **api-gateway**  | 8000   | Punto de entrada único      |
| **glucoserver**  | -      | `/glucose/*` - lecturas     |
| **appointments** | -      | `/appointments/*` - citas   |
| **login**        | -      | `/users/*`, `/token` - auth |

### Excepciones Aprobadas

Los siguientes servicios pueden hacer llamadas HTTP directas:

1. **TidepoolAuthService** - Proveedor OAuth externo
2. **ExternalServicesManagerService** - Solo para health checks

## Arquitectura de Servicios

### Capa de Autenticación

- **UnifiedAuthService**: Coordina todos los flujos de autenticación
- **TidepoolAuthService**: Maneja OAuth2/PKCE de Tidepool
- **LocalAuthService**: Gestiona autenticación con backend local

### Capa de Datos

- **DatabaseService**: Gestión de Dexie/IndexedDB
- **ReadingsService**: Lecturas de glucosa con caché
- **AppointmentService**: Citas médicas
- **ProfileService**: Gestión de perfil de usuario

### Capa de Integración

- **ApiGatewayService**: Comunicación centralizada con backend
- **ExternalServicesManagerService**: Monitoreo de salud de servicios
- **TidepoolAuthService**: Autenticación con Tidepool (auth-only, sin sync de datos)

## Flujo de Datos

```
Acción del Usuario
  ↓
Componente
  ↓
Servicio (Lógica de Negocio)
  ↓
ApiGatewayService → Microservicios Backend
  ↓
DatabaseService
  ↓
IndexedDB

Nota: Tidepool se usa solo para autenticación (obtener userId).
Los datos de glucosa provienen del backend Diabetactic.
```

## Estrategia Offline-First

1. **Lectura**: Verificar caché en IndexedDB primero
2. **Red**: Obtener de API si no hay caché o está obsoleto
3. **Actualización**: Almacenar respuesta en caché
4. **Sincronización**: Sync en background cuando hay conexión

## Testing

- **Tests Unitarios**: Vitest 4.0 para servicios y componentes
- **Tests E2E**: Playwright para flujos de usuario
- **Tests de Integración**: Vitest para verificar interacciones entre servicios
- **Tests Mobile**: Maestro para pruebas E2E en dispositivos Android

## Seguridad

- OAuth2/PKCE para Tidepool
- Tokens JWT para servicios backend
- Manejo de refresh de tokens
- Almacenamiento seguro con Capacitor Preferences

## Rendimiento

- Caché en IndexedDB
- Debouncing de requests
- Lazy loading de rutas
- Optimización de imágenes
- Objetivo de bundle: <2MB inicial

## Integración Tidepool (Auth-Only)

Tidepool se usa **solo para autenticación** - obtener ID de usuario. Los datos de glucosa provienen del backend Diabetactic.

### Flujo OAuth2/PKCE

1. Usuario toca "Conectar con Tidepool"
2. App abre página de login de Tidepool en navegador in-app
3. Usuario inicia sesión con credenciales Tidepool
4. Tidepool redirige con código de autorización
5. App intercambia código por tokens y extrae userId

### Configuración

```typescript
// src/environments/environment.ts
tidepool: {
  baseUrl: 'https://api.tidepool.org',
  authUrl: 'https://api.tidepool.org/auth',
  clientId: 'diabetactic-mobile-dev',
  redirectUri: 'diabetactic://oauth/callback',
  scopes: 'profile:read',
}
```

### URI de Redirección (Android)

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="diabetactic" android:host="oauth" android:path="/callback" />
</intent-filter>
```

### Archivos Relacionados

- `src/app/core/services/tidepool-auth.service.ts` - Autenticación OAuth
- `src/app/core/config/oauth.config.ts` - Configuración OAuth
- `src/app/core/utils/pkce.utils.ts` - Utilidades PKCE
