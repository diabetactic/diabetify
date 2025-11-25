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
<div class="bg-primary-500 text-white p-4 rounded-lg">

<!-- Evitar -->
<div style="background: #25aff4">
```

### Modo Oscuro

```html
<div class="bg-white dark:bg-gray-800 text-black dark:text-white">
```

### Diseño Responsivo

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

## Sistema de Espaciado

| Clase | Valor | Uso |
|-------|-------|-----|
| `gap-1` / `p-1` | 4px | Espaciado mínimo |
| `gap-2` / `p-2` | 8px | Espaciado ajustado |
| `gap-4` / `p-4` | 16px | Espaciado estándar |
| `gap-6` / `p-6` | 24px | Espaciado cómodo |
| `gap-8` / `p-8` | 32px | Espaciado amplio |

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
<ion-card class="m-0 rounded-2xl shadow-lg p-4 bg-white dark:bg-gray-800">
  <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Título</h3>
  <p class="text-sm text-gray-600 dark:text-gray-300">Contenido</p>
</ion-card>
```

### Botón

```html
<button class="px-6 py-3 rounded-lg font-medium transition-all
               bg-primary hover:bg-primary-600 text-white
               disabled:opacity-50 disabled:cursor-not-allowed">
  Guardar
</button>
```

### Grid

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
  <div class="bg-white dark:bg-gray-800 rounded-lg p-6">Item 1</div>
  <div class="bg-white dark:bg-gray-800 rounded-lg p-6">Item 2</div>
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
