#!/usr/bin/env node

/**
 * Generate optimized lucide-icons.ts with only used icons
 */

// Only the 62 icons actually used (out of 292)
const usedLucideIcons = [
  'ChevronRight',
  'ChevronDown',
  'Plus',
  'Bug',
  'Check',
  'CheckCircle',
  'Calendar',
  'Clock',
  'RefreshCw',
  'AlertCircle',
  'AlertTriangle',
  'X',
  'LoaderCircle',
  'Loader',
  'Lock',
  'ArrowUp',
  'ArrowLeft',
  'Wifi',
  'FileText',
  'Droplet',
  'ClipboardList',
  'CalendarPlus',
  'CalendarCheck',
  'Send',
  'MessageSquare',
  'Pill',
  'Minus',
  'Activity',
  'Syringe',
  'FilePlus',
  'UserPlus',
];

const code = `/**
 * Global Lucide Icons Registry - OPTIMIZED
 *
 * This file exports only the Lucide icons actually used in templates.
 * OPTIMIZED: Reduced from 292 to ${usedLucideIcons.length} icons (~${Math.round(((292 - usedLucideIcons.length) / 292) * 100)}% reduction)
 */

import {
${usedLucideIcons.map(icon => `  ${icon},`).join('\n')}
} from 'lucide-angular';

/**
 * Collection of application icons (only used icons)
 * Usage: LucideAngularModule.pick(appIcons)
 */
export const appIcons = {
${usedLucideIcons.map(icon => `  ${icon},`).join('\n')}
};

/**
 * Icon name mappings from Ionicons to Lucide
 * Use this for reference when migrating templates
 */
export const iconMappings = {
  'chevron-forward': 'chevron-right',
  'chevron-forward-outline': 'chevron-right',
  'chevron-down': 'chevron-down',
  bug: 'bug',
  checkmark: 'check',
  'checkmark-circle': 'check-circle',
  'calendar-outline': 'calendar',
  'time-outline': 'clock',
  'sync-outline': 'refresh-cw',
  'alert-circle-outline': 'alert-circle',
  warning: 'alert-triangle',
  close: 'x',
} as const;
`;

console.log(code);
