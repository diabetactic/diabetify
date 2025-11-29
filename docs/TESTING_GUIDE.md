# Guía de Testing - Diabetactic

## Stack de Testing

- **Tests Unitarios e Integración**: Jest + jest-preset-angular (TestBed sobre jsdom)
- **Tests E2E**: Playwright
- **Testing Móvil**: Capacitor + ADB

## Comandos Rápidos

```bash
# Tests Unitarios (Jest)
npm test                        # Modo watch
npm run test:coverage           # Con reporte de cobertura

# Tests de Integración (Jest)
npm run test:integration        # Suite de integración (src/app/tests/integration)

# Tests E2E
npm run test:e2e                # Headless
npm run test:e2e:headed         # Con navegador visible

# Testing Móvil
npm run cap:run:android         # Ejecutar en dispositivo
```

## Tests Unitarios (Jest)

### Estructura de Test

```typescript
describe('NombreServicio', () => {
  let service: NombreServicio;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NombreServicio],
    });

    service = TestBed.inject(NombreServicio);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería ser creado', () => {
    expect(service).toBeTruthy();
  });
});
```

### Buenas Prácticas

1. **Aislamiento**: Cada test debe ser independiente
2. **Mocking**: Simular dependencias externas
3. **Cobertura**: Apuntar a 80%+ de cobertura
4. **Velocidad**: Tests en menos de 5s total
5. **Descriptivo**: Nombres de tests claros

### Patrones Comunes

```typescript
// Mock de respuestas HTTP
httpMock.expectOne('/api/endpoint').flush(mockData);

// Test de operaciones async
await expectAsync(service.method()).toBeResolved();

// Test de manejo de errores
httpMock.expectOne('/api/endpoint').error(new ErrorEvent('Error de red'));
```

## Tests E2E

### Configuración Playwright

- URL Base: `http://localhost:4200`
- Directorio: `playwright/tests/`
- Timeout: 30s por test
- Screenshots en falla
- Video en reintento

### Escribiendo Tests E2E

```typescript
import { test, expect } from '@playwright/test';

test('usuario puede iniciar sesión', async ({ page }) => {
  await page.goto('/');

  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Bienvenido');
});
```

### Patrón Page Object

```typescript
// playwright/pages/login.page.ts
export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}
```

## Testing Móvil

### Android con ADB

```bash
# Listar dispositivos
adb devices

# Instalar APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Capturar screenshot
adb exec-out screencap -p > screenshot.png

# Ver logs
adb logcat | grep diabetactic
```

## Datos de Test

### Mock Data

Ubicación: `src/assets/mocks/`

- `glucose-readings.json`
- `user-profiles.json`
- `appointments.json`

### Entornos de Test

```typescript
// src/environments/environment.test.ts
export const environment = {
  production: false,
  useMockData: true,
  apiUrl: 'http://localhost:3000/api',
};
```

## Debugging

### Tests Unitarios (Jest)

```bash
# Ejecutar archivo específico
npm test -- --runInBand --testPathPattern='auth.service.spec.ts'

# Modo watch interactivo
npm test -- --watch
```

### Tests E2E

```bash
# Con navegador visible
npm run test:e2e:headed

# Test específico
npx playwright test tests/login.spec.ts

# Modo debug
npx playwright test --debug
```

## Requisitos de Cobertura

- **Servicios**: 90% mínimo
- **Componentes**: 80% mínimo
- **General**: 85% objetivo

Verificar cobertura:

```bash
npm run test:coverage
open coverage/index.html
```

## Problemas Comunes

### Errores de Timeout

- Aumentar timeout: `jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000`
- Verificar promises sin resolver
- Mockear llamadas HTTP lentas

### Tests Inestables

- Evitar waits hardcodeados
- Usar `waitForAsync()` para operaciones async
- Asegurar aislamiento de tests

### Memory Leaks

- Limpiar suscripciones en `afterEach()`
- Destruir componentes correctamente
- Limpiar timers e intervals
