# Guía de Configuración de Modos de Backend

Diabetactic soporta tres modos de backend para adaptarse a diferentes escenarios de desarrollo y despliegue. Esta guía explica cómo cambiar entre ellos y verificar qué modo está activo.

---

## Resumen de Modos de Backend

La aplicación soporta tres modos de backend:

1. **`mock`** - Adaptador mock en memoria, no requiere backend
2. **`local`** - Backend Docker local en localhost:8000
3. **`cloud`** (alias: `heroku`) - API Gateway de Heroku (producción)

### Cuándo Usar Cada Modo

**Modo Mock** (`mock`)

- Usar para: Desarrollo rápido, trabajo offline, pruebas unitarias
- Backend: No requerido (datos en memoria)
- Datos: Temporales, se reinician al cerrar la aplicación
- Tidepool: Integración mock (sin conexión real a Tidepool)

**Modo Local** (`local`)

- Usar para: Desarrollo full-stack, pruebas con Docker Compose
- Backend: Docker Compose con extServices corriendo en localhost:8000
- Datos: Persisten en PostgreSQL local
- Tidepool: Puede conectar a la API real de Tidepool (opcional)

**Modo Cloud** (`cloud` o `heroku`)

- Usar para: Pruebas de integración, validación de producción
- Backend: API Gateway de Heroku en https://diabetactic-api-gateway-37949d6f182f.herokuapp.com
- Datos: Persisten en PostgreSQL de Heroku
- Tidepool: Integración completa con la API de Tidepool

---

## Cambiar Entre Modos

### Usando Scripts npm (Recomendado)

La forma más fácil de cambiar de modo es usando los scripts npm proporcionados:

```bash
# Modo mock - datos en memoria, no requiere backend
npm run start:mock

# Modo local - backend Docker en localhost:8000
npm run start:local

# Modo cloud - API de producción de Heroku
npm run start:cloud
```

### Usando Variable ENV

También puedes usar la variable `ENV` directamente:

```bash
# Modo mock
ENV=mock npm start

# Modo local
ENV=local npm start

# Modo cloud (ambos funcionan)
ENV=cloud npm start
ENV=heroku npm start
```

### Modo Por Defecto

Si no se especifica la variable `ENV`:

```bash
npm start  # Por defecto usa modo 'mock'
```

El valor por defecto está configurado en `scripts/start-with-env.mjs` (línea 20):

```javascript
const envMode = (process.env.ENV || 'mock').toLowerCase();
```

---

## Detalles de Configuración

### Archivo de Configuración de Entorno

El modo de backend se configura principalmente en `src/environments/environment.ts`:

```typescript
const DEV_BACKEND_MODE: BackendMode = 'cloud';
```

Sin embargo, este valor hardcodeado es **sobrescrito** por la variable `ENV` cuando se usa `npm start`.

### Cómo Funciona la Variable ENV

El script `scripts/start-with-env.mjs`:

1. Lee la variable de entorno `ENV`
2. La mapea a la URL apropiada del API Gateway:
   - `mock` → Sin URL (cadena vacía)
   - `local` → `http://localhost:8000`
   - `cloud`/`heroku` → `https://diabetactic-api-gateway-37949d6f182f.herokuapp.com`
3. Establece la variable de entorno `API_GATEWAY_URL`
4. Inicia el servidor de desarrollo Angular con la configuración correcta

### URLs Específicas por Plataforma

La aplicación maneja las diferencias de plataforma automáticamente:

**Desarrollo Web (Navegador)**

- `mock` → Sin backend
- `local` → `http://localhost:8000`
- `cloud` → `/api` (usa proxy.conf.json para evitar CORS)

**Android Nativo**

- `mock` → Sin backend
- `local` → `http://10.0.2.2:8000` (localhost del emulador Android)
- `cloud` → URL directa de Heroku

**iOS Nativo**

- `mock` → Sin backend
- `local` → `http://localhost:8000`
- `cloud` → URL directa de Heroku

---

## Verificar el Modo de Backend Activo

### Logs de Consola

Cuando la aplicación inicia, verifica la salida de la terminal:

```bash
[dev] ENV=mock → API_GATEWAY_URL=(mock mode) (ng serve --configuration mock --proxy-config proxy.conf.json)
```

Esto muestra:

- Modo ENV actual
- URL del API Gateway (o "mock mode" si usa mock)
- Configuración de Angular que se está usando

### DevTools del Navegador

Abre la consola del navegador y busca los logs del entorno. La aplicación registra la configuración al inicio.

También puedes inspeccionar el objeto environment:

```javascript
// En la consola del navegador
import { environment } from './environments/environment';
console.log('Modo Backend:', environment.backendMode);
console.log('URL API Gateway:', environment.backendServices.apiGateway.baseUrl);
```

### Pestaña de Red

Observa la pestaña Network en DevTools del navegador:

- **Modo mock**: Sin peticiones HTTP a servicios backend
- **Modo local**: Peticiones a `localhost:8000` o `/api` (proxy a localhost)
- **Modo cloud**: Peticiones a `/api` (proxy a Heroku) o URL directa de Heroku

---

## Builds de Producción

Los builds de producción siempre usan el backend cloud/Heroku:

```bash
# Build de producción
npm run build:prod  # Siempre usa modo cloud

# Builds móviles (siempre producción)
npm run mobile:sync
npm run mobile:build
```

La producción se configura en `src/environments/environment.prod.ts` con `production: true` y URLs del backend cloud.

---

## Configuración de Pruebas

### Pruebas Unitarias

Las pruebas unitarias (Jest) siempre deben usar modo mock para evitar llamar a APIs reales. Esto se configura en el entorno de pruebas.

```bash
npm test              # Usa modo mock
npm run test:watch    # Usa modo mock
npm run test:coverage # Usa modo mock
```

### Pruebas de Integración

Las pruebas de integración pueden usar cualquier modo de backend:

```bash
# Pruebas de integración contra backend cloud
ENV=cloud npm run test:integration

# Pruebas de integración contra backend local
ENV=local npm run test:integration
```

### Pruebas E2E

Las pruebas E2E (Playwright) se pueden configurar para usar cualquier backend:

```bash
# E2E con backend mock
ENV=mock npm run test:e2e

# E2E con backend local (Docker debe estar corriendo)
ENV=local npm run test:e2e

# E2E con backend cloud
ENV=cloud npm run test:e2e
```

---

## Escenarios Comunes

### Escenario 1: Desarrollo Offline

**Objetivo**: Desarrollar sin internet ni backend

**Solución**:

```bash
npm run start:mock
```

Todos los datos están en memoria. Los cambios se pierden al refrescar.

### Escenario 2: Desarrollo Full-Stack

**Objetivo**: Probar frontend + backend juntos localmente

**Prerrequisitos**: Docker Compose corriendo con extServices

**Solución**:

```bash
# Terminal 1: Iniciar backend Docker
cd ../extServices
docker-compose up

# Terminal 2: Iniciar frontend en modo local
npm run start:local
```

### Escenario 3: Pruebas Contra API de Producción

**Objetivo**: Validar integración con Heroku antes de desplegar

**Solución**:

```bash
npm run start:cloud
```

**Advertencia**: Esto usa datos reales de producción. Ten cuidado con las cuentas de prueba.

### Escenario 4: Desarrollo Móvil

**Objetivo**: Compilar y probar la aplicación móvil

**Solución**:

```bash
# Compilar app web + sincronizar con Capacitor
npm run mobile:sync

# Abrir en Android Studio
npm run android:open

# O compilación rápida + instalación
cd android && ./quick-build.sh
```

Los builds móviles siempre usan el entorno de producción (modo cloud).

---

## Resolución de Problemas

### Problema: "No se puede conectar al backend"

**Síntomas**: Errores de red, "Error al cargar lecturas"

**Soluciones**:

1. **Modo mock**: Debería funcionar offline. Si falla, revisa la consola del navegador.

2. **Modo local**:
   - Verifica que el backend Docker está corriendo: `docker ps`
   - Comprueba la salud del backend: `curl http://localhost:8000/health`
   - Para emulador Android: Asegúrate de que la app usa `http://10.0.2.2:8000`

3. **Modo cloud**:
   - Verifica la conexión a internet
   - Comprueba que la API de Heroku está funcionando: `curl https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/health`
   - Verifica si hay ventanas de mantenimiento de Heroku

### Problema: "Modo de backend incorrecto activo"

**Síntomas**: Esperaba mock pero está usando API real (o viceversa)

**Soluciones**:

1. Verifica la salida de la terminal al iniciar el servidor de desarrollo
2. Verifica la variable `ENV`: `echo $ENV`
3. Mata y reinicia el servidor de desarrollo
4. Limpia la caché del navegador y refresca

### Problema: "La variable ENV no funciona"

**Síntomas**: Estableces `ENV=mock` pero sigue usando backend cloud

**Soluciones**:

1. Usa scripts npm en su lugar: `npm run start:mock`
2. Verifica la sintaxis del shell:
   - Bash/Zsh: `ENV=mock npm start`
   - Windows CMD: `set ENV=mock && npm start`
   - Windows PowerShell: `$env:ENV="mock"; npm start`
3. Verifica que `scripts/start-with-env.mjs` está siendo ejecutado

---

## Configuración Avanzada

### Sobrescribir URLs de API

Puedes sobrescribir las URLs por defecto usando variables de entorno:

```bash
# URL personalizada de backend local
LOCAL_API_GATEWAY_URL=http://192.168.1.100:8000 npm run start:local

# URL personalizada de Heroku (diferente despliegue)
HEROKU_API_BASE_URL=https://my-custom-api.herokuapp.com npm run start:cloud

# Modo mock con URL personalizada (inusual)
MOCK_API_GATEWAY_URL=http://localhost:3000 npm run start:mock
```

### Crear Configuraciones Personalizadas

Puedes agregar nuevas configuraciones de Angular en `angular.json`:

```json
"configurations": {
  "staging": {
    "fileReplacements": [{
      "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.staging.ts"
    }]
  }
}
```

Luego crea `src/environments/environment.staging.ts` con configuraciones específicas de staging.

---

## Resumen

### Referencia Rápida

| Modo  | Comando               | Backend        | Persistencia de Datos | Tidepool |
| ----- | --------------------- | -------------- | --------------------- | -------- |
| Mock  | `npm run start:mock`  | Ninguno        | No (en memoria)       | Mock     |
| Local | `npm run start:local` | localhost:8000 | Sí (BD local)         | Opcional |
| Cloud | `npm run start:cloud` | Heroku         | Sí (BD cloud)         | Sí       |

### Mejores Prácticas

1. **Usa scripts npm** en lugar de variables ENV directas (más claro, agnóstico de plataforma)
2. **Comienza con modo mock** para desarrollo rápido
3. **Prueba con modo local** antes de subir cambios de backend
4. **Valida con modo cloud** antes de desplegar a producción
5. **Nunca hagas commit de URLs hardcodeadas** - usa configuración de entorno
6. **Verifica los logs de consola** para confirmar el modo activo
7. **Usa modo mock para pruebas unitarias** para evitar dependencias externas

---

**Documentación Relacionada**:

- [Desarrollo Android](ANDROID_DEVELOPMENT.md) - Configuración de desarrollo móvil
- [Guía de Usuario](USER_GUIDE.md) - Uso de la aplicación para usuarios finales
- [CLAUDE.md](../CLAUDE.md) - Documentación completa del proyecto
