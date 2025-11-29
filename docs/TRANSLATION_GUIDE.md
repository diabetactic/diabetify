# Guía de Traducciones - Diabetactic

## Idiomas Soportados

- **Inglés (en)** - Idioma base
- **Español (es)** - Traducción completa

La aplicación detecta automáticamente el idioma del dispositivo.

## Archivos de Traducción

Ubicación: `src/assets/i18n/`

```
i18n/
├── en.json    # Traducciones en inglés
└── es.json    # Traducciones en español
```

## Agregar Traducciones

### 1. Agregar Claves

**Inglés** (`assets/i18n/en.json`):

```json
{
  "COMMON": {
    "SAVE": "Save",
    "CANCEL": "Cancel"
  },
  "DASHBOARD": {
    "TITLE": "Dashboard",
    "WELCOME": "Welcome, {{name}}"
  }
}
```

**Español** (`assets/i18n/es.json`):

```json
{
  "COMMON": {
    "SAVE": "Guardar",
    "CANCEL": "Cancelar"
  },
  "DASHBOARD": {
    "TITLE": "Panel",
    "WELCOME": "Bienvenido, {{name}}"
  }
}
```

### 2. Usar en Templates

```html
<!-- Traducción simple -->
<h1>{{ 'DASHBOARD.TITLE' | translate }}</h1>

<!-- Con parámetros -->
<p>{{ 'DASHBOARD.WELCOME' | translate: {name: userName} }}</p>

<!-- En atributos -->
<button [attr.aria-label]="'COMMON.SAVE' | translate">{{ 'COMMON.SAVE' | translate }}</button>
```

### 3. Usar en TypeScript

```typescript
import { TranslateService } from '@ngx-translate/core';

constructor(private translate: TranslateService) {}

// Obtener traducción
const title = this.translate.instant('DASHBOARD.TITLE');

// Con parámetros
const welcome = this.translate.instant('DASHBOARD.WELCOME', {
  name: 'Juan'
});
```

## Convención de Nombres

```
SECCION.SUBSECCION.CLAVE
```

Ejemplos:

- `AUTH.LOGIN.TITLE`
- `ERRORS.NETWORK.MESSAGE`
- `VALIDATION.REQUIRED.FIELD`

## Verificar Traducciones

```bash
npm run i18n:missing
```

Este script verifica:

- Claves en templates que no están en archivos JSON
- Diferencias entre en.json y es.json

## Buenas Prácticas

### No Hardcodear Texto

```html
<!-- Incorrecto -->
<button>Save</button>

<!-- Correcto -->
<button>{{ 'COMMON.SAVE' | translate }}</button>
```

### Usar Claves Significativas

```json
// Incorrecto
"TEXT1": "Save"

// Correcto
"COMMON": {
  "SAVE": "Save"
}
```

### Agrupar Claves Relacionadas

```json
{
  "AUTH": {
    "LOGIN": { ... },
    "REGISTER": { ... }
  },
  "DASHBOARD": { ... },
  "PROFILE": { ... }
}
```

### Mantener Sincronizado

Siempre actualizar ambos archivos de idioma juntos.

## Agregar Nuevo Idioma

1. Crear archivo: `src/assets/i18n/fr.json`
2. Copiar base: `cp src/assets/i18n/en.json src/assets/i18n/fr.json`
3. Actualizar servicio:
   ```typescript
   private readonly supportedLanguages = ['en', 'es', 'fr'];
   ```
4. Traducir contenido
5. Verificar: `npm run i18n:missing`

## Estado Actual

- Inglés: 100%
- Español: 100%
