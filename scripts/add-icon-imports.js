#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files that were modified (from the migration output)
const modifiedFiles = [
  'src/app/add-reading/add-reading.page.html',
  'src/app/appointments/appointment-create/appointment-create.page.html',
  'src/app/appointments/appointment-detail/appointment-detail.page.html',
  'src/app/appointments/appointments.page.html',
  'src/app/dashboard/dashboard-detail/dashboard-detail.page.html',
  'src/app/dashboard/dashboard.html',
  'src/app/login/login.page.html',
  'src/app/profile/profile.html',
  'src/app/readings/readings.html',
  'src/app/settings/advanced/advanced.page.html',
  'src/app/settings/settings.page.html',
  'src/app/shared/components/debug-panel/debug-panel.component.html',
  'src/app/shared/components/language-switcher/language-switcher.component.html',
  'src/app/shared/components/service-monitor/service-monitor.component.html',
  'src/app/shared/components/ui-badge/ui-badge.component.html',
];

// Map HTML files to their corresponding TypeScript files
const htmlToTs = {
  'add-reading.page.html': 'add-reading.page.ts',
  'appointment-create.page.html': 'appointment-create.page.ts',
  'appointment-detail.page.html': 'appointment-detail.page.ts',
  'appointments.page.html': 'appointments.page.ts',
  'dashboard-detail.page.html': 'dashboard-detail.page.ts',
  'dashboard.html': 'dashboard.page.ts',
  'login.page.html': 'login.page.ts',
  'profile.html': 'profile.page.ts',
  'readings.html': 'readings.page.ts',
  'advanced.page.html': 'advanced.page.ts',
  'settings.page.html': 'settings.page.ts',
  'debug-panel.component.html': 'debug-panel.component.ts',
  'language-switcher.component.html': 'language-switcher.component.ts',
  'service-monitor.component.html': 'service-monitor.component.ts',
  'ui-badge.component.html': 'ui-badge.component.ts',
};

let updatedCount = 0;

modifiedFiles.forEach(htmlFile => {
  const htmlFileName = path.basename(htmlFile);
  const tsFileName = htmlToTs[htmlFileName];

  if (!tsFileName) {
    console.log(`⚠️  No TypeScript mapping for ${htmlFileName}`);
    return;
  }

  const tsFilePath = path.join(path.dirname(htmlFile), tsFileName);
  const fullTsPath = path.resolve(__dirname, '..', tsFilePath);

  if (!fs.existsSync(fullTsPath)) {
    console.log(`⚠️  TypeScript file not found: ${tsFilePath}`);
    return;
  }

  let content = fs.readFileSync(fullTsPath, 'utf8');
  let originalContent = content;

  // Check if AppIconComponent is already imported
  if (content.includes('AppIconComponent')) {
    console.log(`✓ ${tsFilePath}: Already has AppIconComponent`);
    return;
  }

  // Add AppIconComponent import
  const appIconImport = "import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';";
  const appIconImportAlt = "import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';";
  const appIconImportAlt2 = "import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';";

  // Determine the correct import path based on the file location
  let importPath;
  if (tsFilePath.includes('shared/components')) {
    importPath = "import { AppIconComponent } from '../app-icon/app-icon.component';";
  } else if (tsFilePath.includes('settings/advanced')) {
    importPath = "import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';";
  } else if (tsFilePath.includes('dashboard/dashboard-detail')) {
    importPath = "import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';";
  } else if (tsFilePath.includes('appointments/appointment-')) {
    importPath = "import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';";
  } else {
    importPath = "import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';";
  }

  // Add the import at the top of the imports section
  if (content.includes('import {')) {
    // Find the last import statement
    const importRegex = /^import .* from .*$/gm;
    let lastImportMatch;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportMatch = match;
    }

    if (lastImportMatch) {
      const insertPosition = lastImportMatch.index + lastImportMatch[0].length;
      content = content.slice(0, insertPosition) + '\n' + importPath + content.slice(insertPosition);
    }
  } else {
    // No imports found, add at the beginning of the file
    content = importPath + '\n\n' + content;
  }

  // Add AppIconComponent to the imports array in @Component decorator
  const componentRegex = /@Component\s*\(\s*\{([^}]+)\}\s*\)/s;
  const componentMatch = content.match(componentRegex);

  if (componentMatch) {
    let componentConfig = componentMatch[1];

    // Check if there's an imports array
    if (componentConfig.includes('imports:')) {
      // Add AppIconComponent to existing imports array
      componentConfig = componentConfig.replace(
        /imports\s*:\s*\[([^\]]*)\]/s,
        (match, importsContent) => {
          // Check if imports array is empty or has content
          const trimmedImports = importsContent.trim();
          if (trimmedImports) {
            return `imports: [${importsContent}, AppIconComponent]`;
          } else {
            return `imports: [AppIconComponent]`;
          }
        }
      );
    } else {
      // Add imports array with AppIconComponent
      // Find where to insert it (after selector, templateUrl, etc.)
      const templateUrlMatch = componentConfig.match(/templateUrl\s*:\s*['"][^'"]+['"]/);
      if (templateUrlMatch) {
        const insertPos = templateUrlMatch.index + templateUrlMatch[0].length;
        componentConfig = componentConfig.slice(0, insertPos) + ',\n  imports: [AppIconComponent]' + componentConfig.slice(insertPos);
      }
    }

    content = content.replace(componentRegex, `@Component({${componentConfig}})`);
  }

  // Only write if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(fullTsPath, content, 'utf8');
    console.log(`✓ ${tsFilePath}: Added AppIconComponent import`);
    updatedCount++;
  } else {
    console.log(`⚠️  ${tsFilePath}: No changes made (might need manual review)`);
  }
});

console.log(`\n✅ Updated ${updatedCount} TypeScript files with AppIconComponent imports`);