/**
 * Theme Persistence Integration Tests
 *
 * Tests the complete theme management flow across services:
 * 1. ThemeService - Theme mode, palette, and contrast management
 * 2. ProfileService - Preferences persistence
 * 3. DOM - Class and CSS variable application
 *
 * Flow: Load Theme -> Apply to DOM -> Persist to Profile -> Verify
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { RendererFactory2, Renderer2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { ThemeService, COLOR_PALETTES } from '@core/services/theme.service';
import { ProfileService } from '@core/services/profile.service';
import { LoggerService } from '@core/services/logger.service';
import { ThemeMode, ColorPalette, DEFAULT_USER_PREFERENCES } from '@core/models/user-profile.model';

describe('Theme Persistence Integration Tests', () => {
  let themeService: ThemeService;
  let mockProfileService: {
    profile$: BehaviorSubject<unknown>;
    getProfile: Mock;
    updatePreferences: Mock;
  };
  let mockLogger: { info: Mock; warn: Mock; error: Mock; debug: Mock };
  let mockRenderer: Renderer2;
  let mockRendererFactory: { createRenderer: Mock };

  // Helper to create mock profile
  const createMockProfile = (preferences?: Partial<typeof DEFAULT_USER_PREFERENCES>) => ({
    id: 'test-user',
    name: 'Test User',
    preferences: {
      ...DEFAULT_USER_PREFERENCES,
      ...preferences,
    },
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create renderer mock
    mockRenderer = {
      addClass: vi.fn(),
      removeClass: vi.fn(),
      setStyle: vi.fn(),
    } as unknown as Renderer2;

    mockRendererFactory = {
      createRenderer: vi.fn().mockReturnValue(mockRenderer),
    };

    // Create ProfileService mock
    mockProfileService = {
      profile$: new BehaviorSubject(createMockProfile()),
      getProfile: vi.fn().mockResolvedValue(createMockProfile()),
      updatePreferences: vi.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: RendererFactory2, useValue: mockRendererFactory },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    themeService = TestBed.inject(ThemeService);

    // Wait for async initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Theme Mode Management', () => {
    it('should load theme from profile on initialization', async () => {
      const profile = createMockProfile({ themeMode: 'dark' });
      mockProfileService.getProfile.mockResolvedValue(profile);

      // Re-create service to trigger initialization
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThemeService,
          { provide: RendererFactory2, useValue: mockRendererFactory },
          { provide: ProfileService, useValue: mockProfileService },
          { provide: LoggerService, useValue: mockLogger },
        ],
      });

      const newService = TestBed.inject(ThemeService);
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(newService.getCurrentThemeMode()).toBe('dark');
    });

    it('should persist theme mode to profile when changed', async () => {
      await themeService.setThemeMode('dark');

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        themeMode: 'dark',
      });
    });

    it('should emit theme mode changes via observable', async () => {
      let emittedMode: ThemeMode | null = null;
      const subscription = themeService.themeMode$.subscribe(mode => {
        emittedMode = mode;
      });

      await themeService.setThemeMode('dark');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(emittedMode).toBe('dark');
      subscription.unsubscribe();
    });

    it('should toggle between light and dark modes', async () => {
      // Start with light
      await themeService.setThemeMode('light');
      expect(themeService.getCurrentThemeMode()).toBe('light');

      // Toggle to dark
      await themeService.toggleTheme();
      expect(themeService.getCurrentThemeMode()).toBe('dark');

      // Toggle back to light
      await themeService.toggleTheme();
      expect(themeService.getCurrentThemeMode()).toBe('light');
    });
  });

  describe('DOM Class Application', () => {
    it('should add dark class to body when dark mode is set', async () => {
      await themeService.setThemeMode('dark');

      expect(mockRenderer.addClass).toHaveBeenCalledWith(
        expect.anything(),
        'dark'
      );
    });

    it('should add light class to body when light mode is set', async () => {
      await themeService.setThemeMode('light');

      expect(mockRenderer.addClass).toHaveBeenCalledWith(
        expect.anything(),
        'light'
      );
    });

    it('should set data-theme attribute for DaisyUI', async () => {
      await themeService.setThemeMode('dark');

      // Check that data-theme was set on documentElement
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should update isDark$ observable when theme changes', async () => {
      let isDark = false;
      const subscription = themeService.isDark$.subscribe(dark => {
        isDark = dark;
      });

      await themeService.setThemeMode('dark');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(isDark).toBe(true);

      await themeService.setThemeMode('light');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(isDark).toBe(false);
      subscription.unsubscribe();
    });
  });

  describe('Color Palette Management', () => {
    it('should persist color palette to profile when changed', async () => {
      await themeService.setColorPalette('candy');

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        colorPalette: 'candy',
      });
    });

    it('should emit palette changes via observable', async () => {
      let emittedPalette: ColorPalette | null = null;
      const subscription = themeService.colorPalette$.subscribe(palette => {
        emittedPalette = palette;
      });

      await themeService.setColorPalette('nature');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(emittedPalette).toBe('nature');
      subscription.unsubscribe();
    });

    it('should return available color palettes', () => {
      const palettes = themeService.getAvailablePalettes();

      expect(palettes).toEqual(COLOR_PALETTES);
      expect(palettes.length).toBe(4);
      expect(palettes.some(p => p.id === 'default')).toBe(true);
      expect(palettes.some(p => p.id === 'candy')).toBe(true);
    });

    it('should add palette class to body', async () => {
      await themeService.setColorPalette('ocean');

      expect(mockRenderer.addClass).toHaveBeenCalledWith(
        expect.anything(),
        'palette-ocean'
      );
    });
  });

  describe('High Contrast Mode', () => {
    it('should toggle high contrast mode and persist to profile', async () => {
      expect(themeService.isHighContrastEnabled()).toBe(false);

      await themeService.toggleHighContrast();

      expect(themeService.isHighContrastEnabled()).toBe(true);
      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        highContrastMode: true,
      });
    });

    it('should add high-contrast class when enabled', async () => {
      await themeService.toggleHighContrast();

      expect(mockRenderer.addClass).toHaveBeenCalledWith(
        expect.anything(),
        'high-contrast'
      );
    });

    it('should emit high contrast changes via observable', async () => {
      let highContrast = false;
      const subscription = themeService.highContrast$.subscribe(enabled => {
        highContrast = enabled;
      });

      await themeService.toggleHighContrast();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(highContrast).toBe(true);
      subscription.unsubscribe();
    });
  });

  describe('CSS Custom Properties', () => {
    it('should update --ion-color-primary when palette changes', async () => {
      await themeService.setColorPalette('candy');

      // Candy palette primary is #E91E63
      const primaryColor = document.documentElement.style.getPropertyValue('--ion-color-primary');
      expect(primaryColor).toBe('#E91E63');
    });

    it('should update contrast multiplier when high contrast enabled', async () => {
      await themeService.toggleHighContrast();

      const multiplier = document.documentElement.style.getPropertyValue('--contrast-multiplier');
      expect(multiplier).toBe('1.5');
    });
  });

  describe('Material Theme Application', () => {
    it('should apply complete theme programmatically', () => {
      themeService.applyMaterialTheme('nature', 'dark', true);

      expect(themeService.getCurrentPalette()).toBe('nature');
      expect(themeService.getCurrentThemeMode()).toBe('dark');
      expect(themeService.isHighContrastEnabled()).toBe(true);
    });
  });
});
