# Arquitectura - Diabetactic

## Visión General

Diabetactic es un sistema distribuido compuesto por:

- **diabetify** (este repositorio): App móvil Ionic/Angular
- **Backend microservicios**: api-gateway, glucoserver, appointments, login

Ver [README del monorepo](../../README.md) para la estructura completa.

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

- **Tests Unitarios**: Jest con jest-preset-angular para servicios y componentes
- **Tests E2E**: Playwright para flujos de usuario
- **Tests de Integración**: Jest para verificar interacciones entre servicios
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
