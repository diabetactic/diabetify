# Open Dependabot Pull Requests

**Last Updated:** December 24, 2025
**Total Open PRs:** 10

## Summary

All 10 pull requests were created on **December 22, 2025** and are currently **OPEN**.

## Pull Request Details

### 1. PR #111 - @analogjs/vitest-angular
- **Package:** `@analogjs/vitest-angular` (dev dependency)
- **Version Change:** 2.1.3 → 2.2.0
- **Type:** Minor version update
- **Key Changes:**
  - Reset TestBed between tests
  - Added support for browser mode preview
  - Improved dev/build performance with caches and plugin optimizations
  - Support for Vite 8.x releases
- **Status:** Open
- **Created:** 2025-12-22
- **Comments:** 2

### 2. PR #110 - stylelint-config-standard-scss
- **Package:** `stylelint-config-standard-scss` (dev dependency)
- **Version Change:** 13.1.0 → 16.0.0
- **Type:** Major version update
- **Key Changes:**
  - Updated to stylelint-config-recommended-scss@16.0.0
  - Updated to stylelint-config-standard@39.0.0
  - Requires stylelint >= 16.23.1
  - **Breaking:** Removed support for older stylelint versions
- **Status:** Open
- **Created:** 2025-12-22
- **Comments:** 2

### 3. PR #109 - @capgo/capacitor-native-biometric
- **Package:** `@capgo/capacitor-native-biometric` (production dependency)
- **Version Change:** 8.0.1 → 8.0.3
- **Type:** Patch version update
- **Key Changes:**
  - Updated formatting tooling to use prettier-pretty-check
  - Added homepage field to package.json
  - Updated development dependencies
- **Status:** Open
- **Created:** 2025-12-22
- **Comments:** 2

### 4. PR #108 - typescript-eslint
- **Package:** `typescript-eslint` (dev dependency)
- **Version Change:** 8.49.0 → 8.50.1
- **Type:** Minor version update
- **Key Changes:**
  - Fixed method-signature-style to ignore methods that return `this`
  - Corrected handling of undefined vs. void in no-unnecessary-type-assertion
  - Added new rule: no-useless-default-assignment
- **Status:** Open
- **Created:** 2025-12-22
- **Comments:** 2

### 5. PR #107 - @tailwindcss/forms
- **Package:** `@tailwindcss/forms` (dev dependency)
- **Version Change:** 0.5.10 → 0.5.11
- **Type:** Patch version update
- **Key Changes:**
  - Limited attribute rules to input and select elements
  - Bug fix for more specific element targeting
- **Status:** Open
- **Created:** 2025-12-22
- **Comments:** 2

### 6. PR #106 - daisyui
- **Package:** `daisyui` (dev dependency)
- **Version Change:** 5.5.13 → 5.5.14
- **Type:** Patch version update
- **Key Changes:**
  - Fixed z-index of focused join items
- **Status:** Open
- **Created:** 2025-12-22
- **Comments:** 2

### 7. PR #105 - stylelint-config-tailwindcss
- **Package:** `stylelint-config-tailwindcss` (dev dependency)
- **Version Change:** 0.0.7 → 1.0.0
- **Type:** Major version update
- **Key Changes:**
  - Support for Tailwind CSS v4
  - **Breaking:** First stable release (1.0.0)
- **Status:** Open
- **Created:** 2025-12-22
- **Comments:** 2

### 8. PR #104 - knip
- **Package:** `knip` (dev dependency)
- **Version Change:** 5.73.4 → 5.76.3
- **Type:** Minor version update
- **Key Changes:**
  - Config default to packageManager if present in PackageJSON
  - Improved bunx handler
  - Improved bun/node test runner handling
  - Performance optimizations for skipping unnecessary work
  - Improved script handling
- **Status:** Open
- **Created:** 2025-12-22
- **Comments:** 2
- **Last Updated:** 2025-12-24

### 9. PR #103 - @evilmartians/lefthook
- **Package:** `@evilmartians/lefthook` (dev dependency)
- **Version Change:** 2.0.11 → 2.0.12
- **Type:** Patch version update
- **Key Changes:**
  - Ability to show diff when failing on changes
  - Made short status parser more robust
- **Status:** Open
- **Created:** 2025-12-22
- **Comments:** 2

### 10. PR #102 - Angular Group (12 packages)
- **Type:** Angular framework and tooling updates
- **Status:** Open
- **Created:** 2025-12-22
- **Comments:** 2

**Packages updated:**

1. `@angular/animations`: 21.0.5 → 21.0.6
2. `@angular/common`: 21.0.5 → 21.0.6
3. `@angular/core`: 21.0.5 → 21.0.6
4. `@angular/forms`: 21.0.5 → 21.0.6
5. `@angular/localize`: 21.0.5 → 21.0.6
6. `@angular/platform-browser`: 21.0.5 → 21.0.6
7. `@angular/router`: 21.0.5 → 21.0.6
8. `@angular-devkit/build-angular`: 21.0.3 → 21.0.4
9. `@angular/cli`: 21.0.3 → 21.0.4
10. `@angular/compiler`: 21.0.5 → 21.0.6
11. `@angular/compiler-cli`: 21.0.5 → 21.0.6
12. `@angular/language-service`: 21.0.5 → 21.0.6

**Key Changes:**
- Fixed better errors for potential circular references
- Fixed ResponseInit type for RESPONSE_INIT token
- Signal Forms improvements (experimental)
- Language service crash fixes
- Build Angular SSR improvements
- Better VS Code integration

## Recommendations

### High Priority (Should merge soon)

1. **PR #102 - Angular Updates** - Patch version updates with bug fixes
2. **PR #109 - @capgo/capacitor-native-biometric** - Patch update for production dependency
3. **PR #107 - @tailwindcss/forms** - Bug fix for attribute rules
4. **PR #106 - daisyui** - Bug fix for z-index issues

### Medium Priority

5. **PR #111 - @analogjs/vitest-angular** - Testing improvements
6. **PR #108 - typescript-eslint** - Linting improvements
7. **PR #103 - @evilmartians/lefthook** - Git hooks improvements
8. **PR #104 - knip** - Dependency analysis improvements

### Review Carefully (Breaking Changes)

9. **PR #110 - stylelint-config-standard-scss** - Major version update (v13 → v16)
   - ⚠️ Requires stylelint >= 16.23.1
   - Test thoroughly before merging

10. **PR #105 - stylelint-config-tailwindcss** - Major version update (v0 → v1)
    - ⚠️ First stable release with Tailwind CSS v4 support
    - Test thoroughly before merging

## Merge Strategy

1. **Test individually** - Each PR should be tested separately to identify any breaking changes
2. **Start with patches** - Merge patch version updates first (#102, #103, #106, #107, #109)
3. **Then minors** - Merge minor version updates (#104, #108, #111)
4. **Finally majors** - Carefully review and test major updates (#105, #110) last

## CI Status

All PRs show:
- ✅ 2 comments each (likely automated Dependabot messages)
- 🔄 Draft: false
- 🔓 Not locked

To check CI status for each PR, visit:
- https://github.com/diabetactic/diabetify/pull/[PR_NUMBER]
