# Guía de Testing - Diabetify

Referencia rápida para escribir tests en este proyecto.

---

## Arquitectura de Tests

Este proyecto sigue el patrón **Testing Trophy**:

| Nivel       | Framework  | Ubicación                    | Proporción |
| ----------- | ---------- | ---------------------------- | ---------- |
| Unit        | Vitest     | `*.spec.ts` junto al código  | 70%        |
| Integration | Vitest+MSW | `src/app/tests/integration/` | 25%        |
| E2E         | Playwright | `playwright/tests/`          | 5%         |

### Estadísticas Actuales

- **111 archivos de test** pasando
- **2391 tests unitarios** ejecutándose en ~27s
- **11 archivos E2E** con tests funcionales, visuales y de humo
- **194 tests de integración** con MSW (Mock Service Worker)

---

## Quick Start

### Ejecutar Tests

```bash
# Todos los tests unitarios
pnpm test

# Modo watch (para TDD)
pnpm run test:watch

# Archivo específico
pnpm test -- src/app/core/services/profile.service.spec.ts --run

# Con coverage
pnpm run test:coverage

# Tests E2E (requiere build previo)
pnpm run test:e2e:mock      # Con MSW (sin backend)
pnpm run test:e2e:docker    # Con backend Docker real

# Tests de integración
pnpm test -- src/app/tests/integration/ --run
```

### Estructura de Archivos

```text
src/app/
├── core/
│   ├── services/
│   │   ├── my.service.ts
│   │   └── my.service.spec.ts  <- Aquí
│   └── guards/
│       ├── auth.guard.ts
│       └── auth.guard.spec.ts  <- Aquí
├── dashboard/
│   ├── dashboard.page.ts
│   └── dashboard.page.spec.ts  <- Aquí
└── tests/
    ├── integration/              <- Tests de integración (Vitest)
    │   ├── auth/
    │   ├── readings/
    │   └── appointments/
    └── integration-msw/          <- Tests con MSW handlers
        └── sync-conflicts.integration.spec.ts

playwright/tests/
├── functional/                   <- Flujos de usuario
├── visual/                       <- Regresión visual
└── smoke/                        <- Tests de humo rápidos
```

---

## Patrón de Test Unitario

### Template Básico (Vitest)

```typescript
// IMPORTANTE: Importar test-setup primero
import '../../test-setup';

import { TestBed } from '@angular/core/testing';
import { MyService } from './my.service';
import { vi } from 'vitest';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyService, { provide: HttpClient, useValue: { get: vi.fn() } }],
    });

    service = TestBed.inject(MyService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('getData', () => {
    it('should return data from API', async () => {
      // Arrange - Act - Assert pattern
      const result = await service.getData();
      expect(result).toBeDefined();
    });
  });
});
```

### Mocks de Capacitor

Los mocks de Capacitor están centralizados en `src/test-setup/index.ts`.

```typescript
// NO HACER - esto sobreescribe los mocks centralizados:
// vi.mock('@capacitor/network');

// HACER - importar y usar el mock existente:
import { Network } from '@capacitor/network';
import type { Mock } from 'vitest';

// En el test:
(Network.getStatus as Mock).mockResolvedValue({ connected: true });
```

---

## Tests de Componentes Ionic

### Template con CUSTOM_ELEMENTS_SCHEMA

```typescript
import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { MyPage } from './my.page';

describe('MyPage', () => {
  let component: MyPage;
  let fixture: ComponentFixture<MyPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyPage, IonicModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(MyPage);
    component = fixture.componentInstance;
    // Evitar detectChanges() si causa problemas con ControlValueAccessor
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

---

## Tests de Integración con MSW

Los tests de integración usan [MSW (Mock Service Worker)](https://mswjs.io/) para interceptar llamadas HTTP.

### Ubicación de Handlers

```text
src/mocks/
├── handlers/
│   ├── auth.handlers.ts      # Login, tokens
│   ├── readings.handlers.ts  # CRUD lecturas
│   └── appointments.handlers.ts
├── server.ts                 # Configuración MSW
└── browser.ts                # Para desarrollo
```

### Ejemplo de Test de Integración

```typescript
import '../../../test-setup';
import { TestBed } from '@angular/core/testing';
import { server, resetMockState } from '@mocks/server';
import { http, HttpResponse } from 'msw';

describe('Auth Flow Integration', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => {
    server.resetHandlers();
    resetMockState();
  });
  afterAll(() => server.close());

  it('should handle login with valid credentials', async () => {
    // El handler de MSW responde automáticamente
    const result = await authService.login('user', 'pass');
    expect(result.token).toBeDefined();
  });

  it('should handle network errors gracefully', async () => {
    // Override handler para simular error
    server.use(http.post('*/token', () => HttpResponse.error()));

    await expect(authService.login('user', 'pass')).rejects.toThrow();
  });
});
```

---

## Validación de Formularios

### Ejemplo: Límites de Glucosa

```typescript
describe('Form Validation', () => {
  beforeEach(() => {
    component.ngOnInit(); // Inicializar el formulario
  });

  describe('mg/dL unit', () => {
    beforeEach(() => {
      component.currentUnit = 'mg/dL';
      component.updateValidatorsForUnit('mg/dL');
    });

    it('should reject glucose below minimum (19)', () => {
      component.readingForm.controls.value.setValue(19);
      expect(component.readingForm.controls.value.errors?.['min']).toBeTruthy();
    });

    it('should accept glucose at minimum boundary (20)', () => {
      component.readingForm.controls.value.setValue(20);
      expect(component.readingForm.controls.value.errors?.['min']).toBeFalsy();
    });
  });
});
```

---

## Tests E2E (Playwright)

### Estructura de Tests E2E

| Carpeta       | Propósito                        |
| ------------- | -------------------------------- |
| `functional/` | Flujos de usuario completos      |
| `visual/`     | Regresión visual con screenshots |
| `smoke/`      | Tests rápidos de sanidad         |

### Archivos Críticos

| Archivo                               | Propósito                                    |
| ------------------------------------- | -------------------------------------------- |
| `e2e-flow.spec.ts`                    | Flujo completo: Login → Dashboard → Lecturas |
| `appointments.functional.spec.ts`     | Estados de citas médicas                     |
| `bolus-calculator.functional.spec.ts` | Calculadora de insulina                      |
| `visual/*.spec.ts`                    | Snapshots visuales de cada página            |

### Ejecutar E2E

```bash
# Con UI interactiva
pnpm exec playwright test --ui

# En modo headless
pnpm exec playwright test

# Solo tests funcionales
pnpm exec playwright test playwright/tests/functional/

# Solo tests visuales
pnpm exec playwright test playwright/tests/visual/

# Actualizar snapshots visuales
pnpm run test:e2e:docker -- --update-snapshots
```

### Page Object Model

Los tests E2E usan el patrón Page Object:

```typescript
// playwright/pages/dashboard.page.ts
export class DashboardPage extends BasePage {
  readonly addReadingButton = this.page.locator('[data-testid="add-reading-btn"]');

  async addReading(value: number) {
    await this.addReadingButton.click();
    // ...
  }
}

// En el test:
const dashboard = new DashboardPage(page);
await dashboard.addReading(120);
```

---

## Testing OnPush Components

### Patrón: Componentes con ChangeDetectionStrategy.OnPush

Componentes con OnPush requieren triggear detección de cambios manual después de operaciones async.

```typescript
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class DashboardPage {
  constructor(private cdr: ChangeDetectorRef) {}

  async loadData() {
    this.data = await this.service.getData();
    this.cdr.markForCheck(); // REQUERIDO para OnPush
  }
}
```

### Testing OnPush Components

**Reglas Clave:**

1. **Esperar operaciones async** antes de hacer asserts
2. **Limpiar mocks después de ngOnInit** si testeás subscripciones
3. **Verificar comportamiento, no conteo de llamadas** cuando el timing es incierto

```typescript
it('should recalculate statistics when readings change', async () => {
  component.ngOnInit();
  await new Promise(resolve => setTimeout(resolve, 0)); // Esperar ngOnInit
  component['isLoading'] = false;
  mockReadingsService.getStatistics.mockClear(); // Reset después de init

  mockReadingsService.readings$.next([newReading]);
  await new Promise(resolve => setTimeout(resolve, 0)); // Esperar subscripción

  expect(mockReadingsService.getStatistics).toHaveBeenCalled();
  expect(component.statistics).toEqual(mockStatistics); // Verificar resultado
});
```

---

## Patrones Avanzados de Mocking

### Problema: DI Token Mismatch con Ionic Controllers

**Síntoma:** El mock está definido pero nunca se llama en tests.

**Causa:** `IonicModule.forRoot()` provee sus propias instancias de controllers que sobreescriben los providers de test.

**Solución:** Override directo de la propiedad del componente:

```typescript
// INCORRECTO: Este mock no se usará
beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [IonicModule.forRoot()], // Provee ToastController
    providers: [
      { provide: ToastController, useValue: mockToastController }, // ¡Ignorado!
    ],
  });
});

it('should show toast', async () => {
  await component.onSync();
  expect(mockToastController.create).toHaveBeenCalled(); // Falla - 0 llamadas
});

// CORRECTO: Override directo de la propiedad
it('should show toast', async () => {
  const mockToast = { present: vi.fn().mockResolvedValue(undefined) };
  const createSpy = vi.fn().mockResolvedValue(mockToast);
  (component as any).toastController = { create: createSpy }; // Override directo

  await component.onSync();

  expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }));
  expect(mockToast.present).toHaveBeenCalled();
});
```

### Alternativa: Usar TestBed.inject() con spyOn

```typescript
it('should show toast', async () => {
  const toastController = TestBed.inject(ToastController);
  const createSpy = vi.spyOn(toastController, 'create').mockResolvedValue({
    present: vi.fn().mockResolvedValue(undefined),
  } as any);

  await component.onSync();

  expect(createSpy).toHaveBeenCalled();
});
```

---

## Mejores Prácticas

### 1. Usar vi.fn() (NO jest.fn())

```typescript
// CORRECTO (Vitest)
const mockFn = vi.fn().mockReturnValue('test');
vi.spyOn(service, 'method');

// INCORRECTO (Jest - no usar)
// const mockFn = jest.fn();
```

### 2. Importar test-setup

```typescript
// Primera línea de cada spec.ts
import '../../test-setup';
```

### 3. Evitar detectChanges() con ion-input

```typescript
// Si el componente usa ion-input con formControlName:
fixture = TestBed.createComponent(MyPage);
component = fixture.componentInstance;
// NO llamar fixture.detectChanges() aquí
// En su lugar, llamar ngOnInit() manualmente si es necesario
```

### 4. Usar Mock tipado

```typescript
import type { Mock } from 'vitest';

// Tipar el mock
const mockService = {
  getData: vi.fn(),
} as unknown as Mock<MyService>;
```

### 5. Playwright: `isVisible({ timeout })` no espera

En Playwright, `locator.isVisible({ timeout })` **no espera**; el `timeout` se ignora. Para esperar, usar:

- `await locator.waitFor({ state: 'visible', timeout: 3000 })`
- o `expect(locator).toBeVisible({ timeout: 3000 })`

### 6. E2E Docker: flujo y debug rápido

```bash
# E2E en Docker (build + run + cleanup)
pnpm run test:e2e:docker

# Filtrar por suite
pnpm run test:e2e:docker -- --grep "Bolus Calculator"
```

Artefactos útiles:

- Reporte HTML: `playwright-report/index.html`
- Traces / screenshots: `playwright/artifacts/`

Nota: si los artefactos quedan con owner `root` (por Docker), corregir con:

```bash
sudo chown -R "$USER":"$USER" playwright-report playwright/artifacts
```

---

## Recursos

- **Configuración Vitest**: `vitest.config.ts`
- **Setup global**: `src/test-setup/index.ts`
- **Mocks Capacitor**: `src/test-setup/mocks/`
- **MSW Handlers**: `src/mocks/handlers/`
- **Tests E2E**: `playwright/tests/`
- **Page Objects**: `playwright/pages/`

**Última actualización**: Enero 2026
