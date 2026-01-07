# Guia de Testing - Diabetactic

Referencia rapida para escribir tests en este proyecto.

---

## Arquitectura de Tests

Este proyecto sigue el patron **Testing Trophy**:

| Nivel       | Framework  | Ubicacion                    | Proporcion |
| ----------- | ---------- | ---------------------------- | ---------- |
| Unit        | Vitest     | `*.spec.ts` junto al codigo  | 70%        |
| Integration | Vitest     | `src/app/tests/integration/` | 25%        |
| E2E         | Playwright | `playwright/tests/`          | 5%         |

### Estadisticas Actuales

- **82 archivos de test** pasando
- **2401 tests unitarios** ejecutandose en ~45s
- **14 tests E2E** para flujos criticos

---

## Quick Start

### Ejecutar Tests

```bash
# Todos los tests unitarios
pnpm test

# Modo watch (para TDD)
pnpm run test:watch

# Archivo especifico
pnpm exec vitest run --testPathPattern="profile.service"

# Con coverage
pnpm run test:coverage

# Tests E2E
pnpm run test:e2e

# Tests de integracion
pnpm exec vitest run --config vitest.integration.config.ts
```

### Estructura de Archivos

```text
src/app/
├── core/
│   ├── services/
│   │   ├── my.service.ts
│   │   └── my.service.spec.ts  <- Aqui
│   └── guards/
│       ├── auth.guard.ts
│       └── auth.guard.spec.ts  <- Aqui
├── features/
│   └── dashboard/
│       ├── dashboard.page.ts
│       └── dashboard.page.spec.ts  <- Aqui
└── tests/
    └── integration/              <- Tests de integracion
        ├── auth-flow.integration.spec.ts
        └── readings-sync.integration.spec.ts
```

---

## Patron de Test Unitario

### Template Basico (Vitest)

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

Los mocks de Capacitor estan centralizados en `src/test-setup/index.ts`.

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

## Validacion de Formularios

### Ejemplo: Limites de Glucosa

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

### Archivos Criticos

| Archivo                            | Proposito                                              |
| ---------------------------------- | ------------------------------------------------------ |
| `e2e-flow.spec.ts`                 | Flujo usuario completo: Login -> Dashboard -> Lecturas |
| `appointment-full-flow.spec.ts`    | Maquina de estados de citas                            |
| `sync-proof-comprehensive.spec.ts` | Sincronizacion offline/online                          |
| `docker-backend-e2e.spec.ts`       | Integracion con backend real                           |

### Ejecutar E2E

```bash
# Con UI interactiva
pnpm exec playwright test --ui

# En modo headless
pnpm exec playwright test

# Solo tests de appointments
pnpm exec playwright test appointment
```

---

## Best Practices

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
// Primera linea de cada spec.ts
import '../../test-setup';
```

### 3. Evitar detectChanges() con ion-input

```typescript
// Si el componente usa ion-input con formControlName:
fixture = TestBed.createComponent(MyPage);
component = fixture.componentInstance;
// NO llamar fixture.detectChanges() aqui
// En su lugar, llamar ngOnInit() manualmente si necesario
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

### 6. E2E Docker: flujo y debug rapido

```bash
# E2E en Docker (build + run + cleanup)
pnpm -s run test:e2e:docker

# Filtrar por suite
pnpm -s run test:e2e:docker -- --grep "Bolus Calculator"
```

Artefactos utiles:

- Reporte HTML: `playwright-report/index.html`
- Traces / screenshots: `playwright/artifacts/`

Nota: si los artefactos quedan con owner `root` (por Docker), corregir con:

```bash
sudo chown -R "$USER":"$USER" playwright-report playwright/artifacts
```

---

## Recursos

- **Configuracion Vitest**: `vitest.config.ts`
- **Setup global**: `src/test-setup/index.ts`
- **Mocks Capacitor**: `src/test-setup/capacitor-mocks.ts`
- **Tests E2E**: `playwright/tests/`

**Ultima actualizacion**: Diciembre 2025
