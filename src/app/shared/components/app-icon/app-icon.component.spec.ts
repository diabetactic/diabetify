import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppIconComponent } from './app-icon.component';
import { appIcons } from '../../icons/lucide-icons';
import { ICON_TEST_IMPORTS } from '../../../tests/helpers/icon-test.helper';

describe('AppIconComponent', () => {
  let component: AppIconComponent;
  let fixture: ComponentFixture<AppIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppIconComponent, ...ICON_TEST_IMPORTS],
    }).compileComponents();

    fixture = TestBed.createComponent(AppIconComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Icon Mappings Validation', () => {
    const toKebabCase = (name: string): string =>
      name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .replace(/([a-zA-Z])(\d)/g, '$1-$2')
        .toLowerCase();

    const registeredLucideIcons = new Set(Object.keys(appIcons).map(toKebabCase));

    let iconMappings: Record<string, string>;

    beforeEach(() => {
      iconMappings = (component as any).iconMappings;
    });

    it('should have all mapped Lucide icons registered in appIcons', () => {
      const missingIcons: string[] = [];
      const mappedLucideNames = new Set(Object.values(iconMappings));

      mappedLucideNames.forEach(lucideName => {
        if (!registeredLucideIcons.has(lucideName)) {
          missingIcons.push(lucideName);
        }
      });

      expect(missingIcons).toEqual([]);
    });

    it('should have valid mappings for all commonly used Ionicons', () => {
      const requiredMappings = [
        'stats-chart-outline',
        'stats-chart',
        'calculator-outline',
        'settings-outline',
        'person-outline',
        'home-outline',
        'calendar-outline',
        'document-text-outline',
        'alert-circle-outline',
        'warning-outline',
        'checkmark-circle',
        'close',
        'refresh-outline',
        'trash-outline',
        'add-outline',
        'medical-outline',
        'water-outline',
        'restaurant-outline',
      ];

      const missingMappings = requiredMappings.filter(icon => !iconMappings[icon]);

      expect(missingMappings).toEqual([]);
    });

    it('should map icons to valid Lucide icon names', () => {
      const invalidMappings: Array<{ source: string; target: string }> = [];

      Object.entries(iconMappings).forEach(([ionicon, lucideIcon]) => {
        if (!registeredLucideIcons.has(lucideIcon)) {
          invalidMappings.push({ source: ionicon, target: lucideIcon });
        }
      });

      expect(invalidMappings).toEqual([]);
    });
  });

  describe('Icon Size Mapping', () => {
    it.each([
      ['xs', 16],
      ['sm', 20],
      ['md', 24],
      ['lg', 32],
      ['xl', 48],
    ] as const)('should map size "%s" to %d pixels', (size, expectedPixels) => {
      component.size = size;
      expect(component.computedSize).toBe(expectedPixels);
    });
  });

  describe('Icon Name Mapping', () => {
    it('should return mapped name for known Ionicons', () => {
      component.name = 'stats-chart-outline';
      expect(component.mappedName).toBe('line-chart');
    });

    it('should return original name for unknown icons (passthrough)', () => {
      component.name = 'some-custom-icon';
      expect(component.mappedName).toBe('some-custom-icon');
    });

    it('should handle Material Symbols mappings', () => {
      component.name = 'arrow_back';
      expect(component.mappedName).toBe('arrow-left');
    });
  });

  describe('CSS Classes', () => {
    it('should compute correct size classes', () => {
      component.size = 'md';
      expect(component.computedClasses).toContain('w-6');
      expect(component.computedClasses).toContain('h-6');
    });

    it('should include custom classes', () => {
      component.size = 'md';
      component.class = 'text-primary my-custom-class';
      expect(component.computedClasses).toContain('text-primary');
      expect(component.computedClasses).toContain('my-custom-class');
    });
  });
});

describe('Template Icon Coverage', () => {
  const iconsUsedInTemplates = [
    'activity',
    'add',
    'add-circle-outline',
    'alert-circle',
    'alert-circle-outline',
    'alert-triangle',
    'arrow-back',
    'arrow-back-outline',
    'arrow-left',
    'arrow-up',
    'barcode',
    'bug',
    'bulb-outline',
    'calculator-outline',
    'calendar',
    'calendar-check',
    'calendar-outline',
    'calendar-plus',
    'camera',
    'check',
    'checkmark',
    'checkmark-circle',
    'checkmark-outline',
    'chevron-back',
    'chevron-down',
    'chevron-forward',
    'chevron-forward-outline',
    'chevron-right',
    'circular',
    'clipboard-check',
    'clipboard-list',
    'clock',
    'close',
    'close-circle',
    'close-outline',
    'cloud-offline',
    'cloud-upload-outline',
    'contrast-outline',
    'create-outline',
    'crescent',
    'document-text-outline',
    'download-outline',
    'droplet',
    'file-plus',
    'file-text',
    'filter-outline',
    'help-circle-outline',
    'history',
    'home-outline',
    'information-circle',
    'information-circle-outline',
    'language-outline',
    'loader',
    'loader-circle',
    'lock',
    'lock-closed-outline',
    'log-out-outline',
    'medical',
    'medical-outline',
    'medkit-outline',
    'message-square',
    'minus',
    'notifications',
    'notifications-outline',
    'nuclear-outline',
    'paper-plane-outline',
    'person',
    'person-outline',
    'pill',
    'plus',
    'refresh',
    'refresh-cw',
    'refresh-outline',
    'reload',
    'restaurant-outline',
    'ribbon-outline',
    'save-outline',
    'send',
    'settings-outline',
    'shield-checkmark',
    'smartphone',
    'stats-chart-outline',
    'stethoscope',
    'sync-outline',
    'syringe',
    'trash',
    'trash-2',
    'trash-outline',
    'trophy',
    'trophy-outline',
    'user-plus',
    'warning-outline',
    'water',
    'water-outline',
    'wifi',
    'x',
  ];

  let component: AppIconComponent;
  let iconMappings: Record<string, string>;

  const toKebabCase = (name: string): string =>
    name
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .replace(/([a-zA-Z])(\d)/g, '$1-$2')
      .toLowerCase();

  const registeredLucideIcons = new Set(Object.keys(appIcons).map(toKebabCase));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppIconComponent, ...ICON_TEST_IMPORTS],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppIconComponent);
    component = fixture.componentInstance;
    iconMappings = (component as any).iconMappings;
  });

  it('should have mappings or direct support for all icons used in templates', () => {
    const unsupportedIcons: string[] = [];

    iconsUsedInTemplates.forEach(iconName => {
      const mappedName = iconMappings[iconName] || iconName;
      if (!registeredLucideIcons.has(mappedName)) {
        unsupportedIcons.push(`"${iconName}" -> "${mappedName}"`);
      }
    });

    expect(unsupportedIcons).toEqual([]);
  });
});
