#!/usr/bin/env node
/**
 * Script to add test-setup.ts import to all test files
 * for Vitest Angular TestBed initialization
 */

import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import { relative, dirname } from 'path';

const TEST_SETUP_PATH = 'src/test-setup.ts';
const IMPORT_COMMENT = '// Initialize TestBed environment for Vitest';

// Find all test files
const testFiles = globSync('src/**/*.spec.ts');

let updated = 0;
let skipped = 0;
let errors = 0;

for (const testFile of testFiles) {
  try {
    const content = readFileSync(testFile, 'utf8');

    // Skip if already has the import
    if (content.includes('test-setup') || content.includes(IMPORT_COMMENT)) {
      skipped++;
      continue;
    }

    // Calculate relative path from test file to test-setup.ts
    const testDir = dirname(testFile);
    let relativePath = relative(testDir, 'src/test-setup');

    // Ensure path starts with ./ or ../
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }

    // Create the import statement
    const importStatement = `${IMPORT_COMMENT}\nimport '${relativePath}';\n\n`;

    // Find where to insert the import (after any leading comments/docstrings)
    let insertPosition = 0;
    const lines = content.split('\n');

    // Skip leading comments and empty lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '' || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
        // Check if we're in a block comment
        if (line.startsWith('/*') && !line.includes('*/')) {
          // Find end of block comment
          while (i < lines.length && !lines[i].includes('*/')) {
            i++;
          }
        }
        continue;
      }
      // Found first non-comment line
      insertPosition = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
      break;
    }

    // Insert the import
    const newContent =
      content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);

    writeFileSync(testFile, newContent);
    updated++;
    console.log(`✓ ${testFile}`);
  } catch (err) {
    console.error(`✗ ${testFile}: ${err.message}`);
    errors++;
  }
}

console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
