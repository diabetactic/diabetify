# CSS Pro Helper - Quick Reference

Use this when working with Tailwind CSS v4 and styling. This ensures AI-safe patterns.

## Quick Command

When you need CSS Pro expertise, read this file:
```
Read: .claude/helpers/css-pro.md
```

## Core Patterns (Always Use)

### 1. Tailwind Classes Only (Never Custom CSS)
```html
<!-- ✅ CORRECT -->
<div class="flex flex-col gap-4 p-4 bg-white dark:bg-gray-800">

<!-- ❌ WRONG -->
<div class="my-custom-class">
```

### 2. Dark Mode with `dark:` Prefix
```html
<!-- ✅ CORRECT -->
<div class="bg-white dark:bg-gray-800 text-black dark:text-white">

<!-- ❌ WRONG (SCSS) -->
@media (prefers-color-scheme: dark) { }
```

### 3. Responsive with Breakpoints
```html
<!-- ✅ CORRECT -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

<!-- ❌ WRONG (SCSS) -->
@media (min-width: 768px) { }
```

### 4. Component States (TypeScript Getter)
```typescript
// ✅ CORRECT
get buttonClasses(): string {
  const base = 'px-4 py-2 rounded-lg transition-all';
  const variant = this.isLoading ? 'bg-gray-400' : 'bg-primary';
  return `${base} ${variant}`;
}
```

## Anti-Patterns (Never Use)

| Anti-Pattern | Fix |
|--------------|-----|
| `!important` | Use specificity or `!` prefix |
| `color: #25aff4` | `class="text-primary"` |
| `padding: 13px` | `class="p-3"` (12px) |
| `.custom-flex` | `class="flex justify-center"` |
| `@media (min-width: 768px)` | `class="md:grid-cols-2"` |

## Component Templates

### Button
```html
<button class="px-4 py-2 rounded-lg font-medium transition-all
               bg-primary hover:bg-primary-600 text-white shadow-md
               disabled:opacity-50 disabled:cursor-not-allowed">
  Click Me
</button>
```

### Card
```html
<ion-card class="m-0 rounded-2xl shadow-lg p-4
                 bg-white dark:bg-gray-800">
  <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Title</h3>
  <p class="text-sm text-gray-600 dark:text-gray-300">Content</p>
</ion-card>
```

### Badge
```html
<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
             bg-success/10 text-success border border-success/20">
  Active
</span>
```

## Migration Checklist

- [ ] Replace layout CSS with Tailwind grid/flex
- [ ] Replace colors with design tokens
- [ ] Replace spacing with 4px scale
- [ ] Replace @media with md: prefix
- [ ] Replace dark mode with dark: prefix
- [ ] Keep only animations in SCSS
- [ ] Keep only Ionic properties in SCSS

## Allowed SCSS Exceptions

1. **Animations** (< 50 lines)
2. **Ionic properties** (shadow DOM)
3. **Host wrappers** (:host)

## Reference

- Full guide: `.claude/skills/css-pro/skill.md`
- Project guide: `docs/STYLING_GUIDE.md`
- Examples: `output/css-pro/reference/`
