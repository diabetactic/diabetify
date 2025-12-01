# Guía de Testing - Diabetactic

## Stack de Testing

- **Tests Unitarios e Integración**: Jest + jest-preset-angular (TestBed sobre jsdom)
- **Tests E2E**: Playwright
- **Tests de Accesibilidad**: Playwright + axe-core
- **Testing Móvil**: Capacitor + ADB

## Comandos Rápidos

```bash
# Tests Unitarios (Jest)
npm test                        # Run all unit tests
npm run test:unit               # Alias for npm test
npm run test:watch              # Watch mode for TDD
npm run test:coverage           # Generate coverage report

# Tests de Integración (Jest)
npm run test:integration        # Integration suite (src/app/tests/integration)

# Tests E2E (Playwright)
npm run test:e2e                # Headless mode
npm run test:e2e:headed         # With visible browser

# Tests de Accesibilidad (Playwright + axe)
npm run test:a11y               # Full accessibility audit
npm run test:a11y:headed        # Accessibility with visible browser
npm run test:ui-quality         # UI quality checks only

# Testing Móvil
npm run test:mobile             # Build + E2E tests
npm run mobile:run              # Run on Android device
```

## Tests Unitarios (Jest)

### Framework Setup

Diabetactic uses **Jest** with a **Jasmine compatibility layer** for easier migration and flexibility. This means you can use:

- **Jest patterns** (recommended): `jest.fn()`, `jest.spyOn()`, `mockResolvedValue()`, `mockRejectedValue()`
- **Jasmine patterns** (legacy support): `jasmine.createSpyObj()`, `spyOn().and.returnValue()`, `expectAsync()`

All Capacitor plugins are pre-mocked in `setup-jest.ts`, so you don't need to mock them manually in your tests.

### Estructura de Test

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should handle async operations', async () => {
    const mockData = { id: 1, name: 'Test' };

    // Jest style (recommended)
    const promise = service.getData();
    httpMock.expectOne('/api/data').flush(mockData);

    await expect(promise).resolves.toEqual(mockData);
  });
});
```

### Writing Component Tests

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent], // Standalone components
      schemas: [CUSTOM_ELEMENTS_SCHEMA], // Required for Ionic components
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### Buenas Prácticas

1. **Aislamiento**: Cada test debe ser independiente
2. **Mocking**: Simular dependencias externas (Capacitor plugins ya están mockeados)
3. **Cobertura**: Apuntar a 80%+ de cobertura (85% objetivo general)
4. **Velocidad**: Tests en menos de 5s total
5. **Descriptivo**: Nombres de tests claros y específicos
6. **CUSTOM_ELEMENTS_SCHEMA**: Siempre incluir en tests de componentes que usan Ionic

### Patrones Comunes

```typescript
// Mock de respuestas HTTP
httpMock.expectOne('/api/endpoint').flush(mockData);

// Test de operaciones async (Jest style - recommended)
await expect(service.method()).resolves.toEqual(expectedValue);
await expect(service.method()).rejects.toThrow('Error message');

// Test de operaciones async (Jasmine style - legacy)
await expectAsync(service.method()).toBeResolved();
await expectAsync(service.method()).toBeRejectedWithError('Error message');

// Test de manejo de errores
httpMock.expectOne('/api/endpoint').error(new ErrorEvent('Network error'));

// Mocking services con Jasmine
const mockService = jasmine.createSpyObj('ServiceName', ['method1', 'method2']);
mockService.method1.and.returnValue('mocked value');

// Mocking services con Jest (recommended)
const mockService = {
  method1: jest.fn().mockReturnValue('mocked value'),
  method2: jest.fn().mockResolvedValue({ data: 'async' }),
};

// Spy on existing methods
const spy = jest.spyOn(service, 'method').mockReturnValue('mocked');
// Or with Jasmine syntax
spyOn(service, 'method').and.returnValue('mocked');
```

## Tests de Integración (Jest)

Integration tests verify that multiple components work together correctly. They're located in `src/app/tests/integration/`.

```bash
npm run test:integration        # Run integration tests
```

Integration tests use the same Jest setup as unit tests but focus on testing component interactions, service integration, and data flow.

## Tests E2E (Playwright)

### Configuración Playwright

- URL Base: `http://localhost:4200`
- Directorio: `playwright/tests/`
- Timeout: 30s por test
- Screenshots automáticos en falla
- Video en reintento
- Soporte para múltiples navegadores (Chromium, Firefox, WebKit)

### Comandos E2E

```bash
npm run test:e2e                # Run headless
npm run test:e2e:headed         # Run with visible browser
npx playwright test --debug     # Debug mode
npx playwright test tests/login.spec.ts  # Run specific test
npx playwright show-report      # View last test report
```

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

test('validación de formulario', async ({ page }) => {
  await page.goto('/login');

  // Submit without filling fields
  await page.click('button[type="submit"]');

  // Check for validation errors
  await expect(page.locator('.error-message')).toBeVisible();
});
```

### Patrón Page Object

```typescript
// playwright/pages/login.page.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

// Usage in test
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';

test('login flow', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password123');
  await expect(page).toHaveURL('/dashboard');
});
```

## Tests de Accesibilidad

Diabetactic includes automated accessibility testing using Playwright and axe-core.

```bash
npm run test:a11y               # Full accessibility audit
npm run test:a11y:headed        # Run with visible browser
npm run test:ui-quality         # UI quality checks only
```

### What's Tested

- WCAG 2.1 Level AA compliance
- Color contrast ratios
- ARIA attributes and roles
- Keyboard navigation
- Form labels and accessibility
- Heading hierarchy
- Alt text for images
- Focus management

### Writing Accessibility Tests

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('dashboard should be accessible', async ({ page }) => {
  await page.goto('/dashboard');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Theming & Animations Testing

This app has a richer theming system than simple light/dark and also centralizes animations. Tests should validate **our contracts** (ThemeService state, CSS classes, configuration) rather than Ionic internals.

### Theming (ThemeService, palettes, high contrast)

- Arquitectura rápida:
  - `ThemeService` gestiona:
    - `themeMode`: `'light' | 'dark' | 'auto'` (usa `prefers-color-scheme` cuando es `auto`).
    - `colorPalette`: varias paletas (`default`, `candy`, `nature`, `ocean`, etc.).
    - `highContrastMode`: modo de alto contraste.
  - Aplica:
    - Clases `dark` / `light` en `<html>` y `<body>`.
    - Clase `ion-palette-dark` en `<html>` para el sistema de paletas de Ionic.
    - Atributo `data-theme` en `<html>` (`dark` o `diabetactic` para DaisyUI/Tailwind).
    - Variables CSS como `--ion-color-primary`, `--ion-color-secondary` y tokens de contraste.

- Patrones de test recomendados:
  - Tests unitarios de `ThemeService`:
    - Stub de `ProfileService` que devuelve distintas preferencias de tema/paleta/alto contraste.
    - `Renderer2` espía (via `rendererFactory`) para verificar:
      - Clases añadidas/eliminadas (`dark`, `light`, `ion-palette-dark`, `palette-*`, `high-contrast`).
    - Verificar que se actualizan variables CSS clave en `document.documentElement.style`.
  - Evitar tests que dependan fuertemente del DOM real:
    - Prefiere comprobar llamadas a `renderer.addClass/removeClass` y cambios de variables, no estilos calculados.
  - Para pruebas más integradas (1–2 tests máximo):
    - Montar una página simple (por ejemplo `SettingsPage` o `AdvancedPage`) que use `ThemeService`.
    - Simular un cambio de tema/paleta a través del UI.
    - Verificar que `<html>` y `<body>` reciben las clases esperadas y que un componente clave reacciona (por ejemplo, `ion-card` cambia de color de fondo en modo oscuro).

### CSS Shadow Parts (Ionic)

- Uso actual:
  - `src/global.css` usa `::part(...)` para `ion-datetime`, `ion-datetime-button`, `ion-toolbar ion-button`, etc.
  - SCSS local como `language-switcher.component.scss` usa `&::part(icon)` / `&::part(text)` para ajustes finos.
- Consejos:
  - No tests de detalles internos de Ionic:
    - No dependa de la estructura interna del shadow DOM; confíe en la API pública de Ionic.
  - En su lugar:
    - Testee que se aplican clases/estados que **nosotros** controlamos (por ejemplo, que el botón de toolbar tenga la clase apropiada o el atributo `color` correcto).
    - Testee la semántica visible: textos, estados `today`, estados de selección, accesibilidad; y deje que Ionic se encargue del renderizado interno.

### Animaciones (CSS utilities vs Ionic createAnimation)

- Estado actual:
  - Animaciones compartidas se definen en `src/global.css`:
    - Clases utilitarias: `.animate-fade-in`, `.animate-fade-in-down`, `.animate-fade-in-up`, `.animate-slide-up`, `.animate-slide-in-up`, `.animate-pulse-glow`, `.animate-shake`.
    - `@keyframes` correspondientes para cada efecto.
  - No se está usando `createAnimation` ni `AnimationController` de Ionic por ahora.

- Cómo testear animaciones:
  - No pruebes el keyframe ni el timing exacto.
  - En su lugar, en tus tests:
    - Verifica que, al entrar en cierto estado (por ejemplo, mostrar un banner de error), el elemento recibe la clase de animación adecuada:
      - `expect(element.classList.contains('animate-shake')).toBe(true);`
    - Esto mantiene los tests resistentes a cambios de implementación en los keyframes.

- Cuándo considerar `createAnimation` (futuro):
  - Para secuencias más complejas:
    - Transiciones de navegación personalizadas.
    - Animaciones coordinadas entre varios elementos o gestos.
  - En caso de usarlo:
    - Encapsula la lógica de animación en un servicio/helper y haz tests unitarios verificando que se llama con los elementos y opciones correctas.

### Rendimiento y estructura de tests (Ionic + Angular)

- Ejecutar rápido:
  - Usa Jest sobre archivos específicos mientras desarrollas:
    - `npx jest src/app/settings/advanced/advanced.page.spec.ts --runInBand`
  - Mantén `--runInBand` para tests Angular/JSDOM (más estable y predecible que múltiples workers).
- Componentes standalone:
  - Para componentes/páginas standalone, en tests:
    - Usa `imports: [MyPage]` en lugar de `declarations`.
    - Mantén `schemas: [CUSTOM_ELEMENTS_SCHEMA]` cuando haya muchos componentes Ionic.
- Tests de integración con backend:
  - Suites que dependen de servicios externos deben ser **opt‑in**:
    - Gatearlas con una env var (`BACKEND_E2E=true`) o usar `describe.skip` por defecto.
    - Esto evita esperas largas en `waitForBackendServices` durante el desarrollo normal o en CI rápido.

````

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
````

## Datos de Test

### Mock Data

Ubicación: `src/assets/mocks/`

- `glucose-readings.json`
- `user-profiles.json`
- `appointments.json`

### Entornos de Test

```typescript
// src/environments/environment.testing.ts
export const environment = {
  production: false,
  useMockData: true,
  apiUrl: 'http://localhost:3000/api',
};
```

## Cómo Escribir Nuevos Tests

### 1. Tests Unitarios (Services)

```typescript
// src/app/core/services/my-service.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MyService } from './my-service.service';

describe('MyService', () => {
  let service: MyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MyService],
    });

    service = TestBed.inject(MyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding HTTP requests
  });

  it('should fetch data successfully', async () => {
    const mockData = { id: 1, value: 'test' };

    const promise = service.fetchData();
    httpMock.expectOne('/api/data').flush(mockData);

    await expect(promise).resolves.toEqual(mockData);
  });

  it('should handle errors', async () => {
    const promise = service.fetchData();
    httpMock.expectOne('/api/data').error(new ErrorEvent('Network error'));

    await expect(promise).rejects.toThrow();
  });
});
```

### 2. Tests de Componentes

```typescript
// src/app/pages/my-page/my-page.page.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MyPagePage } from './my-page.page';
import { MyService } from '../../core/services/my-service.service';

describe('MyPagePage', () => {
  let component: MyPagePage;
  let fixture: ComponentFixture<MyPagePage>;
  let mockService: jasmine.SpyObj<MyService>;

  beforeEach(async () => {
    // Create mock service
    mockService = jasmine.createSpyObj('MyService', ['getData', 'saveData']);
    mockService.getData.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      imports: [MyPagePage], // Standalone component
      providers: [{ provide: MyService, useValue: mockService }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA], // Required for Ionic
    }).compileComponents();

    fixture = TestBed.createComponent(MyPagePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load data on init', async () => {
    const mockData = [{ id: 1, name: 'Test' }];
    mockService.getData.and.returnValue(Promise.resolve(mockData));

    await component.ngOnInit();

    expect(mockService.getData).toHaveBeenCalled();
    expect(component.data).toEqual(mockData);
  });
});
```

### 3. Tests E2E

```typescript
// playwright/tests/new-feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('New Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup - navigate to page
    await page.goto('/feature');
  });

  test('should display feature correctly', async ({ page }) => {
    // Arrange
    const heading = page.locator('h1');

    // Act & Assert
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Feature Title');
  });

  test('should interact with feature', async ({ page }) => {
    // Arrange
    const button = page.locator('button.action');
    const result = page.locator('.result');

    // Act
    await button.click();

    // Assert
    await expect(result).toBeVisible();
    await expect(result).toContainText('Success');
  });
});
```

### 4. Tests de Accesibilidad

```typescript
// playwright/tests/accessibility/new-page-a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('new page should be accessible', async ({ page }) => {
  await page.goto('/new-page');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Debugging

### Tests Unitarios (Jest)

```bash
# Run specific test file
npm test -- auth.service.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="should login"

# Run single test file with detailed output
npm test -- --runInBand --verbose auth.service.spec.ts

# Watch mode (interactive)
npm run test:watch

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Tests E2E (Playwright)

```bash
# Run with visible browser
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/login.spec.ts

# Debug mode (step through tests)
npx playwright test --debug

# Debug specific test
npx playwright test tests/login.spec.ts --debug

# Run in headed mode with slower execution
npx playwright test --headed --slow-mo=1000

# View test report
npx playwright show-report
```

### Tips de Debugging

1. **Use console.log** in tests to inspect values
2. **Use debugger** statement to pause execution
3. **Check test output** for detailed error messages
4. **Use --verbose** flag for more information
5. **Isolate failing tests** with `.only()` or `fit()`
6. **Check mocks** - ensure they're configured correctly
7. **Verify imports** - standalone components need explicit imports

## Requisitos de Cobertura

- **Servicios**: 90% mínimo
- **Componentes**: 80% mínimo
- **General**: 85% objetivo

Verificar cobertura:

```bash
npm run test:coverage           # Generate coverage report
open coverage/lcov-report/index.html  # View in browser (macOS/Linux)
# Or on Windows: start coverage/lcov-report/index.html
```

Coverage reports show:

- Line coverage
- Branch coverage
- Function coverage
- Uncovered lines highlighted in red

## Problemas Comunes

### Errores de Timeout

```typescript
// Increase timeout for specific test (Jest)
test('slow operation', async () => {
  // Test code
}, 10000); // 10 second timeout

// For all tests in a file
jest.setTimeout(10000);
```

**Common causes:**

- Promises sin resolver - ensure all async operations complete
- HTTP calls no mockeados - verify all HTTP requests are mocked
- Infinite loops - check for logic errors

### Tests Inestables (Flaky Tests)

**Best practices:**

- Avoid hardcoded waits (`setTimeout`, `sleep`)
- Use `waitFor` utilities for async operations
- Ensure proper test isolation (clean up in `afterEach`)
- Mock time-dependent functions
- Use deterministic test data

```typescript
// Bad - hardcoded wait
await new Promise(resolve => setTimeout(resolve, 1000));

// Good - wait for condition
await waitFor(() => expect(element).toBeVisible());
```

### Capacitor Plugin Errors

All Capacitor plugins are already mocked in `setup-jest.ts`. If you get errors:

1. Check if the plugin is in the mock list
2. Verify you're not trying to import from `@capacitor/core` directly
3. Use the mocked plugin methods in your tests

```typescript
// Mock is already configured, just use the service
const result = await Preferences.get({ key: 'test' });
expect(result).toEqual({ value: null }); // Default mock value
```

### Angular TestBed Issues

**Common issues:**

- Missing CUSTOM_ELEMENTS_SCHEMA for Ionic components
- Standalone components not imported correctly
- Missing providers for dependencies

```typescript
// Correct setup for Ionic component test
await TestBed.configureTestingModule({
  imports: [MyComponent], // Standalone component
  providers: [{ provide: MyService, useValue: mockService }],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Required!
}).compileComponents();
```

### Memory Leaks

```typescript
describe('MyComponent', () => {
  let subscriptions: Subscription;

  beforeEach(() => {
    subscriptions = new Subscription();
  });

  afterEach(() => {
    // Clean up subscriptions
    subscriptions.unsubscribe();

    // Clear timers
    jest.clearAllTimers();

    // Clear mocks
    jest.clearAllMocks();
  });

  it('should handle subscription', () => {
    const sub = service.getData().subscribe();
    subscriptions.add(sub);
  });
});
```

## Continuous Integration

Tests run automatically on:

- Pre-commit hooks (unit tests for changed files)
- Pull requests (full test suite)
- Main branch pushes (full suite + coverage)

### Running Full Test Suite Locally

```bash
# Run all tests
npm run quality                 # Lint + unit tests
npm run test:coverage           # Unit tests with coverage
npm run test:integration        # Integration tests
npm run test:e2e                # E2E tests
npm run test:a11y               # Accessibility tests

# Complete check before PR
npm run lint && npm run test:coverage && npm run test:e2e
```

## Test File Structure

```
diabetactic/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   └── services/
│   │   │       ├── my-service.service.ts
│   │   │       └── my-service.service.spec.ts    # Unit test
│   │   ├── pages/
│   │   │   └── my-page/
│   │   │       ├── my-page.page.ts
│   │   │       └── my-page.page.spec.ts          # Component test
│   │   └── tests/
│   │       └── integration/
│   │           └── my-integration.spec.ts        # Integration test
├── playwright/
│   ├── tests/
│   │   ├── login.spec.ts                         # E2E test
│   │   └── accessibility/
│   │       └── accessibility-audit.spec.ts       # A11y test
│   └── pages/
│       └── login.page.ts                         # Page Object
├── setup-jest.ts                                 # Jest configuration
├── jest.config.js                                # Jest config
└── playwright.config.ts                          # Playwright config
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Angular Testing Guide](https://angular.dev/guide/testing)
- [Ionic Testing Guide](https://ionicframework.com/docs/angular/testing)
- [axe-core Accessibility Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
