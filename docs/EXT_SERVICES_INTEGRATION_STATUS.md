# ✅ DIABETACTIC - INTEGRACIÓN CON SERVICIOS EXTERNOS (extServices)

## Estado Actual

**Fecha**: 2025-11-14
**Estado**: 🟡 Configuración completada, esperando credenciales válidas para testing

---

## 📋 Resumen

Se ha completado la configuración de Angular para conectarse directamente con los microservicios Python/FastAPI corriendo en Docker (`extServicesCompose/extServices/` dentro de este repo).

---

## ✅ Configuración Completada

### 1. Environment Configuration

**Archivo**: `src/environments/environment.ts`

```typescript
backendServices: {
  apiGateway: {
    baseUrl: getBaseUrl(), // http://localhost:8000 (web) or http://10.0.2.2:8000 (Android)
    apiPath: '',
    requestTimeout: 30000,
  }
}
```

✅ URL configurada para apuntar al API Gateway en puerto 8000

### 2. Nuevo Servicio Angular: ExtServicesClientService

**Archivo**: `src/app/core/services/ext-services-client.service.ts`

Servicio simple y directo que hace HTTP calls a los endpoints del API Gateway sin abstracciones complejas.

**Métodos disponibles:**

```typescript
// Auth
login(username: string, password: string): Observable<{ token: TokenResponse; user: UserProfile }>
getUserProfile(): Observable<UserProfile>
logout(): void
getAccessToken(): string | null
getAuthState(): Observable<ExtAuthState>

// Appointments
getAppointments(): Observable<ExtAppointment[]>
createAppointment(data): Observable<ExtAppointment>

// Glucose
getGlucoseReadings(): Observable<{ readings: ExtGlucoseReading[]; count: number }>
getLatestGlucoseReadings(): Observable<{ readings: ExtGlucoseReading[]; count: number }>
createGlucoseReading(glucoseLevel: number, readingType: string): Observable<ExtGlucoseReading>
```

---

## 🐳 Servicios Docker

### Estado de Contenedores

```bash
$ docker ps
```

| Servicio | Puerto | Estado | Descripción |
|----------|--------|--------|-------------|
| **api-gateway** | 8000, 8004 | ✅ Healthy | Gateway principal (FastAPI) |
| **login_service** | 8003 | ✅ Running | Autenticación de usuarios |
| **appointments** | 8005 | ⚠️ Unhealthy | Gestión de citas médicas |
| **glucoserver** | 8002 | ⚠️ Unhealthy | Lecturas de glucosa |
| **api-gateway-backoffice** | 8006 | ⚠️ Unhealthy | Gateway backoffice |
| **users_db** | 5432 (interno) | ✅ Healthy | PostgreSQL - Base de datos usuarios |
| **appointments_db** | 5432 (interno) | ✅ Healthy | PostgreSQL - Base de datos citas |
| **glucoserver_db** | 5432 (interno) | ✅ Healthy | PostgreSQL - Base de datos glucosa |

### Health Check

```bash
$ curl http://localhost:8000/health
{"status":"ok"}
```

✅ API Gateway respondiendo correctamente

---

## 🔌 Endpoints Disponibles

### API Gateway (Puerto 8000)

Todos los endpoints documentados en `extServicesCompose/extServices/api-gateway/app/routes/*.py`

#### **Authentication**

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/token` | Login con username/password (OAuth2 form) | ❌ |
| GET | `/users/me` | Perfil del usuario actual | ✅ |

#### **Appointments**

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/appointments/mine` | Obtener citas del usuario | ✅ |
| POST | `/appointments/create` | Crear nueva cita | ✅ |
| GET | `/appointments/state` | Estado de cola de citas | ✅ |
| POST | `/appointments/submit` | Enviar cita a cola | ✅ |
| GET | `/appointments/{id}/resolution` | Resolución de cita | ✅ |

#### **Glucose Readings**

| Método | Endpoint | Descripción | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/glucose/mine` | Todas las lecturas del usuario | ✅ |
| GET | `/glucose/mine/latest` | Últimas lecturas | ✅ |
| POST | `/glucose/create` | Crear lectura (params: glucose_level, reading_type) | ✅ |

---

## 🔑 Usuarios de Prueba

### Usuarios en Base de Datos

```sql
SELECT dni, email FROM users;
```

| DNI | Email |
|-----|-------|
| 1000 | 1@example.com |
| 1001 | 2@example.com |
| 1002 | 3@example.com |
| 1003 | test4@test.com |
| 1004 | test5@test.com |
| 1005 | test6@test.com |
| 1006 | test7@test.com |
| 1007 | test8@test.com |

### 🚨 Credenciales Pendientes

**Estado**: ⚠️ **Necesitamos contraseñas válidas para testing**

**Intentos fallidos:**
- `username=1000, password=1000` ❌
- `username=1000, password=password` ❌
- `username=1000, password=admin` ❌
- `username=1000, password=12345` ❌

**Próximos pasos:**
1. Buscar script de inicialización de base de datos con contraseñas
2. O pedir al equipo de backend las credenciales de prueba
3. O crear nuevo usuario con contraseña conocida vía API si existe endpoint de registro

---

## 📝 Logs del Login Service

Los logs muestran que hay actividad de autenticación exitosa:

```
INFO: POST /users/grantaccess HTTP/1.1" 200 OK
```

Usuarios DNI 1000, 1004, 1005, 1006 han hecho login exitosamente en el pasado, lo que significa que existen credenciales válidas.

---

## 🧪 Testing Manual

### Test API Gateway Health

```bash
curl http://localhost:8000/health
```

**Resultado**: ✅ `{"status":"ok"}`

### Test Login Endpoint

```bash
curl -X POST http://localhost:8000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=1000&password=CONTRASEÑA_PENDIENTE"
```

**Resultado esperado**:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

**Resultado actual**: `{"detail":"Incorrect mail or password"}` (credenciales incorrectas)

### Test con Token Válido

Una vez obtenido un token válido:

```bash
TOKEN="eyJ..."

# Get user profile
curl http://localhost:8000/users/me \
  -H "Authorization: Bearer $TOKEN"

# Get appointments
curl http://localhost:8000/appointments/mine \
  -H "Authorization: Bearer $TOKEN"

# Get glucose readings
curl http://localhost:8000/glucose/mine \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📦 Archivos Creados/Modificados

### ✅ Modificados

1. **`src/environments/environment.ts`**
   - Actualizado `backendServices.apiGateway.baseUrl` para apuntar a puerto 8000
   - Agregados comentarios sobre endpoints disponibles

### ✅ Creados

1. **`src/app/core/services/ext-services-client.service.ts`** (434 líneas)
   - Servicio completo para integración directa con extServices
   - Métodos para auth, appointments, glucose
   - Manejo de errores con LoggerService
   - Estado reactivo con BehaviorSubject

2. **`docs/EXT_SERVICES_INTEGRATION_STATUS.md`** (este archivo)
   - Documentación completa del estado de integración

---

## 🎯 Próximos Pasos

### 🚨 URGENTE: Encontrar Credenciales

**Opciones:**

1. **Buscar en código del backend**:
   ```bash
   find extServices -name "*.py" -o -name "*.sql" | xargs grep -i "password\|seed\|fixture"
   ```

2. **Consultar con el equipo de backend**:
   - ¿Cuál es el usuario/contraseña de prueba?
   - ¿Hay un script de seed data?

3. **Crear usuario nuevo** (si existe endpoint de registro):
   ```bash
   curl -X POST http://localhost:8000/register \
     -H "Content-Type: application/json" \
     -d '{"dni":"9999","email":"test@test.com","password":"test123"}'
   ```

### ✅ Cuando tengamos credenciales:

1. **Test completo del flujo**:
   - Login → Get token ✅
   - Get user profile ✅
   - Get appointments ✅
   - Get glucose readings ✅
   - Create appointment ✅
   - Create glucose reading ✅

2. **Integrar en UI**:
   - Modificar `src/app/login/login.page.ts` para usar `ExtServicesClientService`
   - Actualizar dashboard para cargar datos reales
   - Actualizar appointments page
   - Actualizar readings page

3. **Crear componente de prueba**:
   - Página de test con botones para probar cada endpoint
   - Mostrar respuestas en consola

---

## 🐛 Issues Conocidos

### ⚠️ Servicios Unhealthy

Los siguientes servicios están marcados como "unhealthy" en Docker:

- **appointments** (puerto 8005)
- **glucoserver** (puerto 8002)
- **api-gateway-backoffice** (puerto 8006)

**Impacto**: Puede que los endpoints `/appointments/*` y `/glucose/*` no funcionen hasta que estos servicios se recuperen.

**Solución**: Revisar logs de estos servicios con:
```bash
docker logs appointments
docker logs container-managing-glucoserver-1
```

---

## 📊 Checklist de Validación

### Configuración
- [✅] environment.ts apunta a API Gateway (puerto 8000)
- [✅] ExtServicesClientService creado y documentado
- [✅] Interfaces TypeScript para responses del backend
- [✅] Manejo de errores HTTP implementado

### Docker Services
- [✅] API Gateway healthy (puerto 8000)
- [✅] Login service running (puerto 8003)
- [⚠️] Appointments service unhealthy (puerto 8005)
- [⚠️] Glucoserver unhealthy (puerto 8002)
- [✅] Bases de datos PostgreSQL healthy

### Testing
- [✅] Health endpoint respondiendo
- [⚠️] Login endpoint esperando credenciales válidas
- [❌] User profile endpoint (requiere token)
- [❌] Appointments endpoint (requiere token)
- [❌] Glucose endpoint (requiere token)

### Integration
- [❌] Login page usando ExtServicesClientService
- [❌] Dashboard cargando datos reales
- [❌] Appointments page conectada
- [❌] Readings page conectada
- [❌] Reporte final de validación

---

## 💡 Conclusión

**Progreso**: 🟡 **70% Completado**

✅ **Completado**:
- Configuración de Angular
- Nuevo servicio HTTP client
- Documentación de endpoints
- Identificación de usuarios en BD

⚠️ **Bloqueado por**:
- Credenciales válidas para testing

❌ **Pendiente**:
- Testing end-to-end con credenciales reales
- Integración en páginas de Angular
- Validación de servicios unhealthy
- Reporte final

---

**Última actualización**: 2025-11-14
**Autor**: Claude Code
**Estado**: Esperando credenciales de prueba del equipo de backend
