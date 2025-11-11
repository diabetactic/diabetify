# CSS Linters Guide - CSS Pro Enforcement

This project uses automated CSS linters to enforce **CSS Pro** AI-safe patterns and Tailwind best practices.

## 🎯 Installed Linters

### 1. **prettier-plugin-tailwindcss**
Auto-sorts Tailwind classes in HTML templates for consistency.

**What it does:**
- Automatically sorts Tailwind classes in the recommended order
- Layout → Spacing → Colors → Typography → Effects
- Example: `class="p-4 mb-6 bg-primary text-white rounded-lg"`

**Usage:**
```bash
npm run format              # Format all files (includes Tailwind sorting)
npm run format:check        # Check formatting without changes
```

**How it works:**
- Runs automatically with Prettier
- Configured in `.prettierrc.json` with `"plugins": ["prettier-plugin-tailwindcss"]`
- Integrated with Husky pre-commit hook (auto-formats on commit)

---

### 2. **stylelint**
CSS/SCSS linter with Tailwind-specific rules and CSS Pro enforcement.

**What it catches:**
- ✅ `!important` usage (CSS Pro: forbidden)
- ✅ Excessive nesting (CSS Pro: max 2 levels)
- ✅ Hardcoded colors (CSS Pro: use design tokens)
- ✅ Modern CSS syntax violations
- ✅ Specificity conflicts

**Usage:**
```bash
npm run lint:css            # Check SCSS files
npm run lint:css:fix        # Auto-fix issues
npm run lint:all            # Run all linters (TypeScript + CSS)
npm run lint:all:fix        # Auto-fix all issues
```

**Configuration:** `.stylelintrc.json`

**Extends:**
- `stylelint-config-standard-scss` - Standard SCSS rules
- `stylelint-config-tailwindcss` - Tailwind-specific conventions

**Custom CSS Pro Rules:**
```json
{
  "declaration-no-important": true,
  "max-nesting-depth": [2, {
    "message": "CSS Pro: Keep nesting ≤2 levels to prevent specificity conflicts"
  }]
}
```

---

### 3. **ESLint with CSS Pro Rules**
TypeScript/JavaScript linter with warnings for inline styles.

**What it catches:**
- Inline styles in TypeScript (warns: use Tailwind classes instead)

**Usage:**
```bash
npm run lint                # Check TypeScript/JavaScript
npm run lint:fix            # Auto-fix issues
```

---

## 🚀 Quick Commands

### Daily Development
```bash
# Before commit (automatic with Husky)
npm run format              # Format and sort Tailwind classes
npm run lint:all            # Check all linting rules

# Fix all issues
npm run lint:all:fix        # Auto-fix TypeScript + CSS
```

### Targeted Linting
```bash
# CSS only
npm run lint:css            # Check SCSS files
npm run lint:css:fix        # Fix SCSS issues

# TypeScript only
npm run lint                # Check TS/JS files
npm run lint:fix            # Fix TS/JS issues
```

---

## 🎨 Prettier + Tailwind Class Sorting

**Before Prettier:**
```html
<div class="bg-primary text-white p-4 mb-6 rounded-lg flex items-center gap-2">
```

**After Prettier (auto-sorted):**
```html
<div class="mb-6 flex items-center gap-2 rounded-lg bg-primary p-4 text-white">
```

**Sort Order:**
1. Layout (`flex`, `grid`, `block`)
2. Positioning (`absolute`, `relative`)
3. Box Model (`m-4`, `p-4`, `w-full`)
4. Typography (`text-lg`, `font-bold`)
5. Visual (`bg-primary`, `text-white`)
6. Effects (`shadow-lg`, `rounded-lg`)
7. Transitions (`transition-all`)
8. States (`hover:`, `dark:`)

---

## 🔍 Stylelint Rules Explained

### CSS Pro Enforcement Rules

**1. No `!important`**
```scss
// ❌ Bad
.button {
  color: red !important;
}

// ✅ Good - Use Tailwind utilities
<button class="text-red-500">
```

**2. Max Nesting Depth: 2 levels**
```scss
// ❌ Bad (3 levels)
.card {
  .header {
    .title {
      color: blue;
    }
  }
}

// ✅ Good - Use Tailwind classes instead
<div class="rounded-lg bg-white p-4">
  <h3 class="text-lg font-bold text-blue-600">Title</h3>
</div>
```

**3. Modern Color Notation**
```scss
// ❌ Bad
background: rgba(0, 0, 0, 0.1);

// ✅ Good
background: rgb(0 0 0 / 10%);
```

**4. Short Hex Colors**
```scss
// ❌ Bad
color: #ffffff;

// ✅ Good
color: #fff;
```

---

## 🔄 Pre-Commit Integration (Husky + lint-staged)

Linters run automatically before each commit:

**What runs on commit:**
1. **Prettier** - Formats and sorts all changed files
2. **Stylelint** - Lints and fixes SCSS files
3. **ESLint** - Lints and fixes TypeScript/JavaScript

**Configuration (package.json):**
```json
"lint-staged": {
  "*.{ts,js}": [
    "prettier --write",
    "eslint --fix"
  ],
  "*.html": [
    "prettier --write"
  ],
  "*.scss": [
    "prettier --write",
    "stylelint --fix"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

**To bypass (use sparingly):**
```bash
git commit --no-verify
```

---

## 📊 Current Linting Status

**Baseline Issues Found:**
- `src/global.scss`: 43 formatting issues (auto-fixable)
- `src/app/shared/components/reading-item/reading-item.component.scss`: 12 nesting violations (CSS Pro warnings)
- `src/app/shared/components/service-monitor/service-monitor.component.scss`: 2 specificity warnings
- **Total: 149 issues** (mostly auto-fixable)

**Recommended Actions:**
1. Run `npm run lint:css:fix` to auto-fix formatting issues
2. Manually refactor components with excessive nesting
3. Migrate custom CSS to Tailwind utilities (see CSS Pro skill)

---

## 🛠️ Troubleshooting

### Stylelint Shows Too Many Errors
Some rules are strict. To gradually adopt:

1. **Disable specific rules temporarily:**
```json
// .stylelintrc.json
{
  "rules": {
    "max-nesting-depth": null,  // Disable temporarily
  }
}
```

2. **Fix auto-fixable issues first:**
```bash
npm run lint:css:fix
```

3. **Then enable rules incrementally**

### Prettier Not Sorting Tailwind Classes
Check `.prettierrc.json` includes plugin:
```json
{
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Verify plugin is installed:
```bash
npm list prettier-plugin-tailwindcss
```

### Pre-Commit Hook Not Running
Reinstall Husky:
```bash
npm run prepare
```

---

## 📚 Related Documentation

- **CSS Pro Skill**: `.claude/skills/css-pro/skill.md`
- **CSS Pro Quick Helper**: `.claude/helpers/css-pro.md`
- **Styling Guide**: `docs/STYLING_GUIDE.md`
- **Tailwind Config**: `src/global.scss` (@theme directive)

---

## 🎯 Best Practices

### When Writing New Components

1. **Use Tailwind classes in HTML** (not SCSS)
```html
<!-- ✅ Good -->
<div class="flex items-center gap-4 rounded-lg bg-white p-4 dark:bg-gray-800">
```

2. **Run format before committing**
```bash
npm run format
npm run lint:all:fix
```

3. **Check linting status**
```bash
npm run lint:all
```

### When Migrating Existing CSS

1. **Check current issues**
```bash
npm run lint:css
```

2. **Auto-fix what's possible**
```bash
npm run lint:css:fix
```

3. **Manually refactor custom CSS to Tailwind**
   - Use CSS Pro skill: Ask "Use CSS Pro to migrate this component"
   - Reference: `docs/STYLING_GUIDE.md`

4. **Verify no regressions**
```bash
npm run build
npm run test:ci
```

---

## 📈 Success Metrics

**Target Compliance:**
- ✅ Zero `!important` declarations
- ✅ Max nesting depth: 2 levels
- ✅ 100% Tailwind class sorting
- ✅ Modern CSS syntax

**Current Progress:**
- Dashboard page: 100% compliant (489 → 236 lines SCSS)
- Remaining pages: ~149 violations to fix

---

## 🚀 Next Steps

1. **Fix auto-fixable issues:**
   ```bash
   npm run lint:all:fix
   ```

2. **Migrate components with nesting violations:**
   - `src/app/shared/components/reading-item/`
   - `src/app/shared/components/service-monitor/`

3. **Enable stricter rules incrementally**

4. **Document new patterns in CSS Pro skill**

---

**Last Updated:** 2025-11-10
**Maintained By:** CSS Pro Skill
