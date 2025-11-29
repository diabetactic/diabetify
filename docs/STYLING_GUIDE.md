# Guía de Estilos - Diabetactic

## Stack de Estilos

- **Tailwind CSS v4**: Framework utility-first
- **Ionic 8**: Componentes optimizados para móvil
- **DaisyUI**: Componentes pre-estilizados

## Sistema de Diseño

Los tokens de diseño están definidos en `src/global.scss`:

```css
@theme {
  --color-primary-500: #25aff4;
  --color-primary: var(--color-primary-500);
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
}
```

## Patrones Recomendados

### Usar Clases de Tailwind

```html
<!-- Correcto -->
<div class="bg-primary-500 rounded-lg p-4 text-white">
  <!-- Evitar -->
  <div style="background: #25aff4"></div>
</div>
```

### Modo Oscuro

```html
<div class="bg-white text-black dark:bg-gray-800 dark:text-white"></div>
```

### Diseño Responsivo

```html
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"></div>
```

## Sistema de Espaciado

| Clase           | Valor | Uso                |
| --------------- | ----- | ------------------ |
| `gap-1` / `p-1` | 4px   | Espaciado mínimo   |
| `gap-2` / `p-2` | 8px   | Espaciado ajustado |
| `gap-4` / `p-4` | 16px  | Espaciado estándar |
| `gap-6` / `p-6` | 24px  | Espaciado cómodo   |
| `gap-8` / `p-8` | 32px  | Espaciado amplio   |

## CSS Personalizado

Solo usar para:

1. Animaciones complejas
2. Interacciones CSS-only
3. Fixes específicos de navegador

Reglas:

- Archivo SCSS < 50 líneas
- Sin `!important`
- Máximo 2 niveles de anidamiento

## Patrones Comunes

### Tarjeta

```html
<ion-card class="m-0 rounded-2xl bg-white p-4 shadow-lg dark:bg-gray-800">
  <h3 class="mb-2 text-lg font-bold text-gray-900 dark:text-white">Título</h3>
  <p class="text-sm text-gray-600 dark:text-gray-300">Contenido</p>
</ion-card>
```

### Botón

```html
<button
  class="bg-primary hover:bg-primary-600 rounded-lg px-6 py-3 font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
>
  Guardar
</button>
```

### Grid

```html
<div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
  <div class="rounded-lg bg-white p-6 dark:bg-gray-800">Item 1</div>
  <div class="rounded-lg bg-white p-6 dark:bg-gray-800">Item 2</div>
</div>
```

## Verificación

Antes de commit:

```bash
npm run build        # Build exitoso
npm start            # Sin warnings de CSS en consola
```

Checklist:

- [ ] Sin mensajes de error en consola
- [ ] Modo oscuro funciona correctamente
- [ ] Layouts responsivos verificados
- [ ] Sin `!important` en estilos
