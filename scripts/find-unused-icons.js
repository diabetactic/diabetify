#!/usr/bin/env node

/**
 * Find unused Lucide icons in the codebase
 * Compares icons defined in lucide-icons.ts vs. actually used in templates
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read all icon names used in templates
const findUsedIcons = () => {
  const output = execSync(
    `find src/app -name "*.html" -type f -exec grep -h 'name="' {} \\; | grep -o 'name="[^"]*"' | sed 's/name="\\([^"]*\\)"/\\1/' | sort -u`,
    { cwd: path.resolve(__dirname, '..') }
  ).toString();

  return output.split('\n').filter(Boolean);
};

// Read all icon names defined in lucide-icons.ts
const findDefinedIcons = () => {
  const iconsFile = path.resolve(__dirname, '../src/app/shared/icons/lucide-icons.ts');
  const content = fs.readFileSync(iconsFile, 'utf8');

  // Extract icon names from the appIcons object
  const iconPattern = /^\s+(\w+),?$/gm;
  const matches = content.matchAll(iconPattern);
  const icons = [];

  for (const match of matches) {
    icons.push(match[1]);
  }

  return icons;
};

// Convert icon names to kebab-case
const toKebabCase = str => {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
};

// Main analysis
const usedIcons = findUsedIcons();
const definedIcons = findDefinedIcons();
const definedKebab = definedIcons.map(toKebabCase);

console.log('\n=== ICON USAGE ANALYSIS ===\n');
console.log(`Total defined icons: ${definedIcons.length}`);
console.log(`Total unique icons in templates: ${usedIcons.length}`);

// Find unused icons
const unusedIcons = definedIcons.filter((icon, idx) => {
  const kebab = definedKebab[idx];
  return !usedIcons.includes(kebab);
});

if (unusedIcons.length > 0) {
  console.log(`\n❌ UNUSED ICONS (${unusedIcons.length}):\n`);
  unusedIcons.forEach(icon => {
    console.log(`  - ${icon} (${toKebabCase(icon)})`);
  });
  console.log(`\n💡 Removing these icons could save bundle size.`);
} else {
  console.log('\n✅ All defined icons are used!');
}

// Find icons used but not defined (potential missing icons)
const missingIcons = usedIcons.filter(icon => !definedKebab.includes(icon));
if (missingIcons.length > 0) {
  console.log(`\n⚠️  ICONS USED BUT NOT IN LUCIDE (${missingIcons.length}):\n`);
  missingIcons.forEach(icon => {
    console.log(`  - ${icon}`);
  });
  console.log('\n(These are likely Ionicons or other icon systems)');
}

console.log('\n');
