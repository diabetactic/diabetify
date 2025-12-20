#!/usr/bin/env node

/**
 * Script to detect hardcoded strings in Angular templates
 * Looks for text content that is not wrapped with the translate pipe
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Patterns to search for HTML templates
const TEMPLATE_PATTERNS = [
  'src/**/*.html',
  '!src/index.html', // Exclude index.html
  '!src/**/*.spec.html', // Exclude test templates
  '!node_modules/**',
  '!www/**',
  '!dist/**',
];

// Regex patterns for detecting hardcoded strings
const HARDCODED_PATTERNS = [
  // Text content between tags that doesn't have translate pipe
  />([A-Za-z][^<>]*[A-Za-z])</g,
  // Placeholder attributes without translate
  /placeholder="([^"]+)"/g,
  // Title attributes without translate
  /title="([^"]+)"/g,
  // Alt attributes without translate
  /alt="([^"]+)"/g,
  // Aria-label attributes without translate
  /aria-label="([^"]+)"/g,
];

// Whitelist of acceptable hardcoded strings
const WHITELIST = [
  // Single characters
  /^[A-Z]$/,
  /^[a-z]$/,
  /^[0-9]$/,
  // Common symbols
  /^[+\-*/=<>!@#$%^&*()_]+$/,
  // URLs
  /^https?:\/\//,
  // File paths
  /^\/[a-zA-Z]/,
  // Angular directives
  /^\*ng/,
  /^ng-/,
  // Ionic components
  /^ion-/,
  // Common technical terms that might not need translation
  /^(true|false|null|undefined)$/i,
  // Numbers and units
  /^[0-9]+(\.[0-9]+)?(%|px|em|rem|vh|vw)?$/,
  // Interpolations
  /\{\{.*\}\}/,
  // Medical units (mg/dL, mmol/L, etc.)
  /^(mg|mmol|g|ml|L|dL|kg|lb|cm|in|%)\/[a-zA-Z]+$/,
];

// Concrete allowlist of Material Icons used in the project
// Add new icons here when they are added to templates
const MATERIAL_ICONS_ALLOWLIST = new Set(['error_outline', 'medical_information']);

function isWhitelisted(str) {
  const trimmed = str.trim();
  // Check Material Icons allowlist first
  if (MATERIAL_ICONS_ALLOWLIST.has(trimmed)) {
    return true;
  }
  return WHITELIST.some(pattern => pattern.test(trimmed));
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    // Skip lines with translate pipe
    if (line.includes('| translate')) {
      return;
    }

    // Skip lines that are comments
    if (line.trim().startsWith('<!--') || line.trim().endsWith('-->')) {
      return;
    }

    HARDCODED_PATTERNS.forEach(pattern => {
      // Use the pattern directly instead of creating a new RegExp
      // This preserves the global flag and avoids potential ReDoS
      pattern.lastIndex = 0; // Reset regex state for each line
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const hardcodedText = match[1];

        // Skip if whitelisted
        if (isWhitelisted(hardcodedText)) {
          continue;
        }

        // Skip if it contains interpolation
        if (hardcodedText.includes('{{') || hardcodedText.includes('}}')) {
          continue;
        }

        // Skip if it's part of a TypeScript expression
        if (
          hardcodedText.includes('?.') ||
          hardcodedText.includes('||') ||
          hardcodedText.includes('&&')
        ) {
          continue;
        }

        issues.push({
          file: path.relative(ROOT_DIR, filePath),
          line: lineIndex + 1,
          text: hardcodedText,
          context: line.trim(),
        });
      }
    });
  });

  return issues;
}

function main() {
  console.log('🔍 Checking for hardcoded strings in templates...\n');

  const files = glob.sync(TEMPLATE_PATTERNS[0], {
    ignore: TEMPLATE_PATTERNS.filter(p => p.startsWith('!')).map(p => p.substring(1)),
    cwd: ROOT_DIR,
  });

  let totalIssues = 0;
  const allIssues = [];

  files.forEach(file => {
    const filePath = path.join(ROOT_DIR, file);
    const issues = checkFile(filePath);

    if (issues.length > 0) {
      allIssues.push({ file, issues });
      totalIssues += issues.length;
    }
  });

  if (totalIssues === 0) {
    console.log('✅ No hardcoded strings found!');
    process.exit(0);
  } else {
    console.log(`⚠️  Found ${totalIssues} potential hardcoded strings:\n`);

    allIssues.forEach(({ file, issues }) => {
      console.log(`\n📄 ${file}:`);
      issues.forEach(issue => {
        console.log(`  Line ${issue.line}: "${issue.text}"`);
        console.log(
          `    Context: ${issue.context.substring(0, 80)}${issue.context.length > 80 ? '...' : ''}`
        );
      });
    });

    console.log('\n💡 Tip: Wrap these strings with the translate pipe:');
    console.log('   {{ "your.translation.key" | translate }}\n');

    process.exit(1);
  }
}

// Run the script
try {
  main();
} catch (error) {
  console.error('❌ Error running i18n checker:', error.message);
  process.exit(1);
}
