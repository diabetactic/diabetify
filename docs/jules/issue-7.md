# Remediation Plan: Issue #7 - CSS Import Order Warning in `global.css`

## 1. Summary

**Severity**: **Low**

The build process is generating a warning: `src/global.css:15 - @import rules should come before other CSS`. This indicates that the `@tailwind` directives (which are processed like `@import` statements) in the main global stylesheet are placed after other CSS rules. According to the CSS specification, `@import` rules must precede all other types of rules, and violating this can lead to unpredictable styling behavior and precedence issues.

## 2. Root Cause Analysis

The file `src/global.css` (or a similar global stylesheet) has its contents ordered incorrectly. A developer likely added custom global styles above the standard Tailwind CSS `@tailwind` directives, which are responsible for injecting Tailwind's base, components, and utilities styles.

**Example of Incorrect Order (`src/global.css`)**:
```css
/* Custom global styles */
body {
  font-family: 'Roboto', sans-serif;
}

/* Tailwind imports */
@tailwind base;
@tailwind components;
@tailwind utilities;
```
This is incorrect because the `body` rule comes before the `@tailwind` imports.

## 3. Remediation Steps

This is a straightforward fix that involves reordering the lines in the global CSS file.

### Step 1: Locate and Edit the File

Identify the global stylesheet that is the source of the warning. The warning message itself points to `src/global.css`.

**File to Edit**: `src/global.css`

### Step 2: Reorder the CSS Rules

Move all `@tailwind` (or any other `@import`) statements to the very top of the file, before any other CSS rules.

**Actions**:
1.  Open `src/global.css`.
2.  Cut the `@tailwind base;`, `@tailwind components;`, and `@tailwind utilities;` lines.
3.  Paste them at the very top of the file. Any custom global styles should come *after* these imports.

**Corrected File (`src/global.css`)**:
```css
/* Tailwind imports MUST come first */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom global styles can go here */
body {
  font-family: 'Roboto', sans-serif;
}

.custom-global-class {
  /* ... */
}
```

### Step 3: Re-build and Verify

After making the change, run the build process again to ensure the warning is gone.

**Actions**:
1.  **Run Production Build**:
    ```bash
    pnpm run build:prod
    ```
2.  **Check for Warnings**: Confirm that the build output is now clean and the CSS import order warning has been resolved.
3.  **Perform a Quick UI Check**: Load the application and perform a brief visual check to ensure that moving the imports did not negatively affect the global styles. The change should be safe, but a quick verification is always good practice.

## 4. Recommended Priority

**Low**. This is a minor technical debt item that is very easy to fix. It should be addressed to maintain a clean build process and prevent potential future styling conflicts. Because it is a "quick win," it can be fixed at any time, perhaps even in the same commit as another related change.
