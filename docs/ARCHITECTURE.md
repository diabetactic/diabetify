# Arquitectura - Diabetactic

## Patrón API Gateway

Toda la comunicación con el backend se realiza a través del servicio API Gateway.

### Servicio Gateway

- **Ubicación**: `src/app/core/services/api-gateway.service.ts`
- **URL Base**: `environment.backendServices.apiGateway.baseUrl`

**Responsabilidades**:
- Enrutamiento centralizado de requests
- Inyección automática de tokens de autenticación
- Transformación de respuestas
- Estandarización de errores
- Estrategia de caché
- Reintentos con backoff exponencial

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
- **TidepoolSyncService**: Sincronización con Tidepool

## Flujo de Datos

```
Acción del Usuario
  ↓
Componente
  ↓
Servicio (Lógica de Negocio)
  ↓
ApiGatewayService → Microservicios Backend
  ↓                    ↓
DatabaseService    TidepoolAuthService → API Tidepool
  ↓
IndexedDB
```

## Estrategia Offline-First

1. **Lectura**: Verificar caché en IndexedDB primero
2. **Red**: Obtener de API si no hay caché o está obsoleto
3. **Actualización**: Almacenar respuesta en caché
4. **Sincronización**: Sync en background cuando hay conexión

## Testing

- **Tests Unitarios**: Jasmine/Karma para servicios y componentes
- **Tests E2E**: Playwright para flujos de usuario
- **Tests de Integración**: Verificar interacciones entre servicios

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
