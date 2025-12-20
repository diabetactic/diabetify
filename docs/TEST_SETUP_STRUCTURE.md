# Test Setup Modular Structure

## Overview

La configuración de tests de Vitest ha sido modularizada en `src/test-setup/` para mejorar la mantenibilidad y separación de responsabilidades.

## Estructura de Archivos

```
src/
├── setup-polyfills.ts           # Wrapper delgado que re-exporta polyfills
├── setup-vitest.ts              # Wrapper delgado que re-exporta test-setup/
├── test-setup/
│   ├── index.ts                 # Punto de entrada principal (contiene TODOS los vi.mock())
│   ├── polyfills.ts             # Polyfills de browser APIs para jsdom
│   ├── mocks/
│   │   ├── capacitor.mock.ts    # Documentación de mocks de Capacitor (no ejecutables)
│   │   ├── ionic.mock.ts        # Documentación de mocks de Ionic (no ejecutables)
│   │   └── angular.mock.ts      # Helpers de Angular TestBed y compatibilidad Jasmine
│   └── helpers/
│       └── async.helper.ts      # Utilidades para tests asíncronos
```

## Archivos Principales

### `src/test-setup/index.ts`

**Punto de entrada principal.** Este archivo es CRÍTICO porque:

1. **Contiene TODOS los `vi.mock()` calls directamente**
   - Vitest solo hace hoist de `vi.mock()` dentro del mismo archivo
   - Los mocks en archivos importados NO funcionan debido a limitaciones de hoisting
   - Por eso todos los mocks están en este archivo, no en `mocks/*.mock.ts`

2. **Orden de inicialización:**

   ```typescript
   // 1. Establecer override de URL base API
   globalThis.__DIABETACTIC_API_BASE_URL = 'http://localhost:8000';

   // 2. TODOS los vi.mock() calls (se hacen hoist al inicio)
   vi.mock('@ionic/angular', ...);
   vi.mock('@capacitor/core', ...);
   // etc.

   // 3. Imports de polyfills
   import './polyfills';

   // 4. Imports de helpers
   import { initializeTestBed, ... } from './mocks/angular.mock';

   // 5. Configuración global (TestBed, jasmine, jest, expect)
   ```

### `src/test-setup/polyfills.ts`

Polyfills de APIs del browser que jsdom no soporta pero que Ionic/Angular requieren:

- `document.adoptedStyleSheets` (requerido por Ionic Core)
- `CSSStyleSheet.replaceSync` y `.replace`
- `window.matchMedia`
- `ResizeObserver`
- `IntersectionObserver`
- `structuredClone` (para IndexedDB)

### `src/test-setup/mocks/`

**IMPORTANTE**: Los archivos en `mocks/` son solo DOCUMENTACIÓN. Los mocks reales están en `index.ts`.

#### `capacitor.mock.ts`

Documentación de todos los mocks de plugins de Capacitor:

- `@capacitor/core` (Capacitor API principal)
- `@capacitor/preferences`, `@capacitor/device`, `@capacitor/network`
- `@capacitor/keyboard`, `@capacitor/haptics`, `@capacitor/status-bar`
- `@capacitor/splash-screen`, `@capacitor/browser`, `@capacitor/app`
- `@aparajita/capacitor-secure-storage`
- `@capacitor/local-notifications`
- `@capawesome-team/capacitor-biometrics`

#### `ionic.mock.ts`

Documentación de mocks de Ionic/Stencil:

- `@stencil/core` y sus internal modules
- `@ionic/core` y subpaths (`/components`, `/loader`)
- `@ionic/angular` (controllers, directives, components)

#### `angular.mock.ts`

Helpers ejecutables (no son vi.mock):

- `initializeTestBed()` - Inicializa Angular TestBed
- `createLocalStorageMock()` - Mock de localStorage
- `MockIonicValueAccessor` - ControlValueAccessor para componentes Ionic
- `jasmineCompatibility` - createSpyObj, createSpy, etc.
- `jasmineMatchers` - toBeTrue, toBeFalse, etc.
- `expectAsync` - Para assertions async estilo Jasmine
- `createSpyOn()` - spyOn global estilo Jasmine

### `src/test-setup/helpers/async.helper.ts`

Utilidades para tests asíncronos:

- `flushPromises()` - Fuerza resolución de promesas pendientes
- `waitFor()` - Espera a que una condición sea verdadera con timeout

## Configuración en vitest.config.ts

```typescript
setupFiles: [
  'src/setup-polyfills.ts',           // Polyfills PRIMERO
  '@analogjs/vitest-angular/setup-zone', // Zone.js de Angular
  'src/test-setup/index.ts',          // Mocks + TestBed + Jasmine
],
```

## ¿Por qué todos los mocks están en index.ts?

**Problema**: Vitest hace hoist de `vi.mock()` solo dentro del archivo donde se llama.

```typescript
// ❌ NO FUNCIONA - mock en archivo separado
// mocks/ionic.mock.ts
vi.mock('@ionic/core', () => ({ ... }));

// index.ts
import './mocks/ionic.mock'; // El mock NO se aplica

// ✅ FUNCIONA - mock en el mismo archivo
// index.ts
vi.mock('@ionic/core', () => ({ ... }));
import './polyfills';
```

## Clave del Éxito: Mock de @ionic/angular

El problema original era que `@ionic/angular` importaba `@ionic/core/loader` como directorio, lo cual Node ESM no soporta. La solución fue mockear `@ionic/angular` completo ANTES que se importe:

```typescript
vi.mock('@ionic/angular', async () => {
  // Importar Angular real para usar decoradores
  const { NgModule, Injectable, Component } = await vi.importActual('@angular/core');

  // Retornar mocks de todos los exports de @ionic/angular
  return {
    IonicModule,
    Platform: MockPlatform,
    // ... todos los controllers y components
  };
});
```

Esto previene que @ionic/angular intente importar @ionic/core/loader.

## Compatibilidad Jasmine/Jest

El sistema provee compatibilidad completa con Jasmine y Jest:

### Globales

- `jasmine.createSpyObj()`, `jasmine.createSpy()`
- `jest.fn()`, `jest.spyOn()` (alias a vi.fn(), vi.spyOn())
- `spyOn()` global con interfaz `.and`
- `expectAsync()` para assertions async

### Matchers

- `expect().toBeTrue()`, `expect().toBeFalse()`
- `expect().toHaveBeenCalledBefore()`

### Spy Interface

Los mocks creados soportan AMBAS interfaces:

```typescript
const spy = jasmine.createSpy();

// Interfaz Jasmine
spy.and.returnValue(42);
spy.calls.mostRecent();

// Interfaz Vitest
spy.mockReturnValue(42);
expect(spy).toHaveBeenCalled();
```

## Migración desde setup-vitest.ts antiguo

El archivo `src/setup-vitest.ts` original (773 líneas) ha sido reducido a un wrapper de 7 líneas que re-exporta desde `src/test-setup/`.

Cambios:

1. ✅ Todos los mocks movidos a `src/test-setup/index.ts`
2. ✅ Polyfills extraídos a `src/test-setup/polyfills.ts`
3. ✅ Helpers de Angular/Jasmine a `src/test-setup/mocks/angular.mock.ts`
4. ✅ `src/test-setup.ts` (977 líneas, duplicado) eliminado
5. ✅ Tests verificados y funcionando

## Troubleshooting

### Error: "Directory import not supported"

**Síntoma**: `Error: Directory import '/node_modules/@ionic/core/loader' is not supported`

**Causa**: `@ionic/angular` intenta importar directorio sin index.js explícito

**Solución**: El mock de `@ionic/angular` en `index.ts` previene este import

### Error: "vi.mock is not hoisted"

**Síntoma**: Mock no se aplica, se importa el módulo real

**Causa**: `vi.mock()` está en archivo importado, no en el archivo de setup

**Solución**: Mover vi.mock() a `src/test-setup/index.ts` directamente

### Error: "TestBed already initialized"

**Síntoma**: TestBed se queja de inicialización múltiple

**Causa**: Múltiples archivos de setup llaman initTestEnvironment()

**Solución**: Solo `index.ts` llama `initializeTestBed()` con try/catch

## Mejoras Futuras

1. **Mocks/**: Convertir a TypeScript types/interfaces que documenten los mocks
2. **Helpers/**: Añadir más utilidades (waitForAsync, tick, flush, etc.)
3. **Setup por tipo**: Separar setup para unit tests vs integration tests
4. **Performance**: Investigar lazy loading de mocks pesados
