#!/usr/bin/env node
/**
 * WCAG Contrast Ratio Calculator
 * Checks dark mode contrast ratios against WCAG AA standards
 */

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Calculate relative luminance
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio
function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) return 0;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Apply opacity to a color
function applyOpacity(hexBg, hexFg, opacity) {
  const bg = hexToRgb(hexBg);
  const fg = hexToRgb(hexFg);

  if (!bg || !fg) return hexFg;

  // Alpha blend formula
  const r = Math.round(fg.r * opacity + bg.r * (1 - opacity));
  const g = Math.round(fg.g * opacity + bg.g * (1 - opacity));
  const b = Math.round(fg.b * opacity + bg.b * (1 - opacity));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

console.log('🔍 WCAG Contrast Ratio Analysis - Dark Mode\n');
console.log('WCAG AA Requirements:');
console.log('  - Normal text (< 18pt): 4.5:1 minimum');
console.log('  - Large text (≥ 18pt): 3:1 minimum');
console.log('  - UI components: 3:1 minimum\n');
console.log('═'.repeat(70));

const darkBg = '#101c22'; // --color-base-100
const darkCardBg = '#1e293b'; // --color-base-200
const darkTabBar = '#1a1a2e'; // tab bar dark bg
const whiteText = '#ffffff';
const whiteBg = '#ffffff';

const tests = [
  // === NEW: Check hardcoded colors ===
  {
    name: 'Tab unselected (gray-500) on dark tab bar',
    fg: '#6b7280',
    bg: darkTabBar,
    usage: 'Unselected tab icons/labels (tabs.page.scss:25)',
    minRatio: 3.0,
  },
  {
    name: 'Tab selected (purple) on dark tab bar',
    fg: '#8b5cf6',
    bg: darkTabBar,
    usage: 'Selected tab icons/labels (tabs.page.scss:26)',
    minRatio: 3.0,
  },
  {
    name: 'Register link (cyan-700) on white bg',
    fg: '#0e7490',
    bg: whiteBg,
    usage: 'Register link (welcome.page.scss:156) LIGHT MODE',
    minRatio: 4.5,
  },
  {
    name: 'Register link (cyan-500) on dark bg',
    fg: '#06b6d4',
    bg: darkBg,
    usage: 'Register link (welcome.page.scss:172) DARK MODE',
    minRatio: 4.5,
  },
  {
    name: 'Text muted (gray-400)',
    fg: '#9ca3af',
    bg: darkBg,
    usage: 'Secondary text, icons',
    minRatio: 4.5,
  },
  {
    name: 'Text muted on card',
    fg: '#9ca3af',
    bg: darkCardBg,
    usage: 'Card secondary text',
    minRatio: 4.5,
  },
  {
    name: 'Text secondary (light blue-gray)',
    fg: '#cbd5f5',
    bg: darkBg,
    usage: 'Secondary descriptive text',
    minRatio: 4.5,
  },
  {
    name: 'White with 60% opacity on card',
    fg: applyOpacity(darkCardBg, whiteText, 0.6),
    bg: darkCardBg,
    usage: 'Label paragraphs (dashboard)',
    minRatio: 4.5,
  },
  {
    name: 'White with 70% opacity on card',
    fg: applyOpacity(darkCardBg, whiteText, 0.7),
    bg: darkCardBg,
    usage: 'Card content text (appointments)',
    minRatio: 4.5,
  },
  {
    name: 'White with 75% opacity on card',
    fg: applyOpacity(darkCardBg, whiteText, 0.75),
    bg: darkCardBg,
    usage: 'Card subtitles',
    minRatio: 4.5,
  },
  {
    name: 'Primary (blue-400) on dark bg',
    fg: '#60a5fa',
    bg: darkBg,
    usage: 'Primary color elements',
    minRatio: 3.0,
  },
  {
    name: 'Primary (blue-400) on black contrast',
    fg: '#60a5fa',
    bg: '#000000',
    usage: 'Primary buttons (contrast text)',
    minRatio: 4.5,
  },
  {
    name: 'Secondary (teal-400) on dark bg',
    fg: '#2dd4bf',
    bg: darkBg,
    usage: 'Secondary color elements',
    minRatio: 3.0,
  },
  {
    name: 'Warning (orange) on dark bg',
    fg: '#f59e0b',
    bg: darkBg,
    usage: 'Warning badges, icons',
    minRatio: 3.0,
  },
];

const issues = [];

tests.forEach(test => {
  const ratio = getContrastRatio(test.fg, test.bg);
  const passes = ratio >= test.minRatio;
  const status = passes ? '✅ PASS' : '❌ FAIL';

  console.log(`\n${status} ${test.name}`);
  console.log(`  Foreground: ${test.fg}`);
  console.log(`  Background: ${test.bg}`);
  console.log(`  Contrast: ${ratio.toFixed(2)}:1 (minimum: ${test.minRatio}:1)`);
  console.log(`  Usage: ${test.usage}`);

  if (!passes) {
    issues.push({
      ...test,
      actualRatio: ratio.toFixed(2),
    });
  }
});

console.log('\n' + '═'.repeat(70));
console.log(`\n📊 Results: ${tests.length - issues.length}/${tests.length} passed`);

if (issues.length > 0) {
  console.log('\n🔧 Issues Found:\n');
  issues.forEach((issue, i) => {
    console.log(`${i + 1}. ${issue.name}`);
    console.log(`   Current: ${issue.actualRatio}:1 (needs ${issue.minRatio}:1)`);
    console.log(`   Location: ${issue.usage}`);
    console.log('');
  });

  console.log('Recommended fixes:');
  console.log('  - Increase opacity for text with alpha (60% → 80%, 70% → 85%, 75% → 90%)');
  console.log('  - Use lighter gray shades for muted text (#b0b8c1 or higher)');
  console.log('  - Ensure all text meets 4.5:1 for AA compliance\n');
}

process.exit(issues.length > 0 ? 1 : 0);
