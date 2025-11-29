#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Recursively find all HTML files
function findHtmlFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // Skip node_modules and other non-source directories
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'www') {
        results = results.concat(findHtmlFiles(filePath));
      }
    } else if (file.endsWith('.html')) {
      results.push(filePath);
    }
  }

  return results;
}

// Find all HTML files in the src directory
const srcDir = path.resolve(__dirname, '..', 'src');
const htmlFiles = findHtmlFiles(srcDir);

console.log(`Found ${htmlFiles.length} HTML files to process`);

let totalReplacements = 0;

// Process each file
htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let fileReplacements = 0;

  // 1. Replace ion-icons with app-icon (most common pattern)
  content = content.replace(
    /<ion-icon([^>]*?)name="([^"]+)"([^>]*?)><\/ion-icon>/g,
    (match, before, iconName, after) => {
      fileReplacements++;
      // Remove slot attribute from before and after since we'll handle positioning differently
      before = before.replace(/\s*slot="[^"]*"/g, '');
      after = after.replace(/\s*slot="[^"]*"/g, '');

      // Remove color attribute since we'll use Tailwind classes
      const colorMatch = (before + after).match(/color="([^"]*)"/);
      const colorClass = colorMatch ? ` text-${colorMatch[1]}` : '';
      before = before.replace(/\s*color="[^"]*"/g, '');
      after = after.replace(/\s*color="[^"]*"/g, '');

      // Check if there are existing classes
      const classMatch = (before + after).match(/class="([^"]*)"/);
      const existingClasses = classMatch ? classMatch[1] : '';
      before = before.replace(/\s*class="[^"]*"/g, '');
      after = after.replace(/\s*class="[^"]*"/g, '');

      // Combine classes
      const finalClasses = `${existingClasses}${colorClass}`.trim();
      const classAttr = finalClasses ? ` class="${finalClasses}"` : '';

      return `<app-icon${before} name="${iconName}"${after}${classAttr}></app-icon>`;
    }
  );

  // 2. Replace ion-spinner with app-icon loader
  content = content.replace(
    /<ion-spinner([^>]*?)name="([^"]+)"([^>]*?)><\/ion-spinner>/g,
    (match, before, spinnerType, after) => {
      fileReplacements++;
      // Map spinner types to appropriate Lucide loader icon
      const iconName =
        spinnerType === 'circular' || spinnerType === 'circles' ? 'loader-circle' : 'loader';

      // Extract classes if any
      const classMatch = (before + after).match(/class="([^"]*)"/);
      const existingClasses = classMatch ? classMatch[1] : '';
      before = before.replace(/\s*class="[^"]*"/g, '');
      after = after.replace(/\s*class="[^"]*"/g, '');

      // Add animate-spin class
      const finalClasses = `${existingClasses} animate-spin`.trim();

      return `<app-icon${before} name="${iconName}"${after} class="${finalClasses}"></app-icon>`;
    }
  );

  // 3. Replace Material Symbols
  content = content.replace(
    /<span class="material-symbols-outlined"[^>]*>([^<]+)<\/span>/g,
    (match, iconName) => {
      fileReplacements++;
      // Trim and clean the icon name
      iconName = iconName.trim();
      return `<app-icon name="${iconName}"></app-icon>`;
    }
  );

  // 4. Fix ion-button with icons (add flex classes for proper alignment)
  content = content.replace(
    /(<ion-button[^>]*>)\s*(<app-icon[^>]*><\/app-icon>)/g,
    (match, button, icon) => {
      // Check if button already has flex classes
      if (!button.includes('flex') && !button.includes('inline-flex')) {
        // Add flex classes to ion-button
        if (button.includes('class="')) {
          button = button.replace(/class="([^"]*)"/, 'class="$1 inline-flex items-center gap-2"');
        } else {
          button = button.replace(/>$/, ' class="inline-flex items-center gap-2">');
        }
      }
      return button + '\n    ' + icon;
    }
  );

  // 5. Fix ion-item with icons (similar to buttons)
  content = content.replace(
    /(<ion-item[^>]*>)\s*(<app-icon[^>]*><\/app-icon>)/g,
    (match, item, icon) => {
      // Check if item already has flex classes
      if (!item.includes('flex') && !item.includes('inline-flex')) {
        // Add flex classes to ion-item
        if (item.includes('class="')) {
          item = item.replace(/class="([^"]*)"/, 'class="$1 flex items-center gap-2"');
        } else {
          item = item.replace(/>$/, ' class="flex items-center gap-2">');
        }
      }
      return item + '\n    ' + icon;
    }
  );

  // 6. Fix standalone icon-only buttons
  content = content.replace(
    /(<ion-button[^>]*fill="clear"[^>]*>)\s*(<app-icon[^>]*><\/app-icon>)\s*(<\/ion-button>)/g,
    (match, openTag, icon, closeTag) => {
      // For icon-only buttons, ensure proper sizing
      if (!icon.includes('class="')) {
        icon = icon.replace('></app-icon>', ' class="w-6 h-6"></app-icon>');
      } else if (!icon.includes('w-') && !icon.includes('h-')) {
        icon = icon.replace(/class="([^"]*)"/, 'class="$1 w-6 h-6"');
      }
      return openTag + '\n    ' + icon + '\n  ' + closeTag;
    }
  );

  // Only write if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ ${path.relative(process.cwd(), file)}: ${fileReplacements} replacements`);
    totalReplacements += fileReplacements;
  }
});

console.log(`\nTotal replacements: ${totalReplacements}`);
console.log('\nNext steps:');
console.log('1. Add AppIconComponent import to all components using icons');
console.log('2. Run tests to verify everything works');
console.log('3. Remove ionicons from package.json');
