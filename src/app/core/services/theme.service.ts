/**
 * Enhanced Theme Service for Diabetactic
 * Manages Material Design theming with child-friendly color palettes
 */

import { Injectable, Renderer2, RendererFactory2, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ColorPalette, ThemeMode } from '@models/user-profile.model';
import { ProfileService } from '@services/profile.service';
import { LoggerService } from '@services/logger.service';

/**
 * Color palette definitions
 */
export interface PaletteDefinition {
  id: ColorPalette;
  name: string;
  description: string;
  primary: string;
  accent: string;
  emoji: string;
}

/**
 * Available color palettes
 */
export const COLOR_PALETTES: PaletteDefinition[] = [
  {
    id: 'default',
    name: 'Ocean Blue',
    description: 'Calm and professional',
    primary: '#2196F3',
    accent: '#FF9800',
    emoji: '🌊',
  },
  {
    id: 'candy',
    name: 'Sweet Candy',
    description: 'Fun and playful',
    primary: '#E91E63',
    accent: '#9C27B0',
    emoji: '🍬',
  },
  {
    id: 'nature',
    name: 'Forest Green',
    description: 'Fresh and natural',
    primary: '#4CAF50',
    accent: '#8D6E63',
    emoji: '🌿',
  },
  {
    id: 'ocean',
    name: 'Sea Breeze',
    description: 'Cool and refreshing',
    primary: '#00BCD4',
    accent: '#FF5722',
    emoji: '🐬',
  },
];

@Injectable({
  providedIn: 'root',
})
export class ThemeService implements OnDestroy {
  private readonly LEGACY_THEME_KEY = 'diabetactic-theme';
  private renderer: Renderer2;
  private mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;
  private mediaQuery: MediaQueryList | null = null;

  private _themeMode$ = new BehaviorSubject<ThemeMode>('auto');
  private _colorPalette$ = new BehaviorSubject<ColorPalette>('default');
  private _highContrast$ = new BehaviorSubject<boolean>(false);
  private _isDark$ = new BehaviorSubject<boolean>(false);

  public readonly themeMode$ = this._themeMode$.asObservable();
  public readonly colorPalette$ = this._colorPalette$.asObservable();
  public readonly highContrast$ = this._highContrast$.asObservable();
  public readonly isDark$ = this._isDark$.asObservable();

  constructor(
    private rendererFactory: RendererFactory2,
    private profileService: ProfileService,
    private logger: LoggerService
  ) {
    this.logger.info('Init', 'ThemeService initialized');
    this.renderer = this.rendererFactory.createRenderer(null, null);
    this.initialize();
  }

  /**
   * Initialize theme service
   */
  private async initialize(): Promise<void> {
    // Load theme from profile or use defaults
    const profile = await this.profileService.getProfile();

    if (profile?.preferences) {
      this._themeMode$.next(profile.preferences.themeMode);
      this._colorPalette$.next(profile.preferences.colorPalette);
      this._highContrast$.next(profile.preferences.highContrastMode);
    } else {
      // Check legacy localStorage
      this.migrateLegacyTheme();
    }

    // Apply initial theme
    this.applyTheme();

    this.setupSystemThemeListener();
  }

  /**
   * Migrate from legacy localStorage theme
   */
  private migrateLegacyTheme(): void {
    const legacyTheme = localStorage.getItem(this.LEGACY_THEME_KEY);
    if (legacyTheme) {
      const isDark = legacyTheme === 'dark';
      this._themeMode$.next(isDark ? 'dark' : 'light');
      localStorage.removeItem(this.LEGACY_THEME_KEY);
    }
  }

  /**
   * Clean up subscriptions and listeners when service is destroyed
   * Prevents memory leaks from BehaviorSubjects and event listeners
   */
  ngOnDestroy(): void {
    // Remove media query listener to prevent memory leak
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
    }

    // Complete all BehaviorSubjects
    this._themeMode$.complete();
    this._colorPalette$.complete();
    this._highContrast$.complete();
    this._isDark$.complete();

    this.logger.debug('UI', 'ThemeService destroyed, resources cleaned up');
  }

  /**
   * Setup listener for system theme changes
   */
  private setupSystemThemeListener(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      if (this.mediaQuery.addEventListener) {
        this.mediaQueryListener = () => {
          if (this._themeMode$.value === 'auto') {
            this.applyTheme();
          }
        };
        this.mediaQuery.addEventListener('change', this.mediaQueryListener);
      }
    }
  }

  /**
   * Get system theme preference
   */
  private getSystemThemePreference(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }

  /**
   * Determine if dark theme should be applied based on mode
   */
  private shouldUseDarkTheme(): boolean {
    const mode = this._themeMode$.value;

    switch (mode) {
      case 'dark':
        return true;
      case 'light':
        return false;
      case 'auto':
        return this.getSystemThemePreference();
      default:
        return false;
    }
  }

  /**
   * Apply current theme to document
   */
  private applyTheme(): void {
    const isDark = this.shouldUseDarkTheme();
    const palette = this._colorPalette$.value;
    const highContrast = this._highContrast$.value;

    this._isDark$.next(isDark);

    const body = document.body;
    const html = document.documentElement;

    // Remove all theme classes from both body and html
    this.removeThemeClasses(body);
    this.removeThemeClasses(html);

    // Add theme mode class to both body and html for proper Ionic styling
    const themeClass = isDark ? 'dark' : 'light';
    this.renderer.addClass(body, themeClass);
    this.renderer.addClass(html, themeClass);

    // Set DaisyUI data-theme attribute for DaisyUI components
    const daisyTheme = isDark ? 'dark' : 'diabetactic';
    document.documentElement.setAttribute('data-theme', daisyTheme);

    // Add 'ion-palette-dark' class for Ionic dark mode (required for Ionic components)
    if (isDark) {
      this.renderer.addClass(html, 'ion-palette-dark');
    } else {
      this.renderer.removeClass(html, 'ion-palette-dark');
    }

    // Add palette class
    this.renderer.addClass(body, `palette-${palette}`);

    // Add high contrast if enabled
    if (highContrast) {
      this.renderer.addClass(body, 'high-contrast');
    }

    // Update CSS custom properties
    this.updateCSSProperties(palette, isDark, highContrast);

    this.logger.debug('UI', 'Theme applied', { isDark, palette, highContrast, daisyTheme });
  }

  /**
   * Remove all theme-related classes
   */
  private removeThemeClasses(element: HTMLElement): void {
    const classesToRemove = [
      'dark',
      'light',
      'high-contrast',
      ...COLOR_PALETTES.map(p => `palette-${p.id}`),
    ];

    classesToRemove.forEach(className => {
      this.renderer.removeClass(element, className);
    });
  }

  /**
   * Update CSS custom properties
   */
  private updateCSSProperties(
    palette: ColorPalette,
    _isDark: boolean,
    highContrast: boolean
  ): void {
    const paletteConfig = COLOR_PALETTES.find(p => p.id === palette);
    if (!paletteConfig) return;

    const root = document.documentElement;

    // Set primary and accent colors
    root.style.setProperty('--ion-color-primary', paletteConfig.primary);
    root.style.setProperty('--ion-color-secondary', paletteConfig.accent);

    // Set high contrast adjustments
    if (highContrast) {
      root.style.setProperty('--contrast-multiplier', '1.5');
      root.style.setProperty('--border-width', '2px');
    } else {
      root.style.setProperty('--contrast-multiplier', '1');
      root.style.setProperty('--border-width', '1px');
    }
  }

  // === Public API ===

  /**
   * Set theme mode (with synchronization fix)
   */
  async setThemeMode(mode: ThemeMode): Promise<void> {
    this.logger.info('UI', 'Theme mode changed', { mode });
    this._themeMode$.next(mode);
    this.applyTheme();

    // Save to profile
    await this.profileService.updatePreferences({ themeMode: mode });

    // Ensure observable emits the new value for UI synchronization
    // This fixes the theme switcher text not updating
    setTimeout(() => this._themeMode$.next(mode), 0);
  }

  /**
   * Set color palette
   */
  async setColorPalette(palette: ColorPalette): Promise<void> {
    this.logger.info('UI', 'Color palette changed', { palette });
    this._colorPalette$.next(palette);
    this.applyTheme();

    // Save to profile
    await this.profileService.updatePreferences({ colorPalette: palette });
  }

  /**
   * Toggle high contrast mode
   */
  async toggleHighContrast(): Promise<void> {
    const newValue = !this._highContrast$.value;
    this.logger.info('UI', 'High contrast toggled', { enabled: newValue });
    this._highContrast$.next(newValue);
    this.applyTheme();

    // Save to profile
    await this.profileService.updatePreferences({ highContrastMode: newValue });
  }

  /**
   * Toggle between light and dark (with synchronization fix)
   */
  async toggleTheme(): Promise<void> {
    const currentMode = this._themeMode$.value;
    const newMode: ThemeMode = currentMode === 'dark' ? 'light' : 'dark';
    this.logger.info('UI', 'Theme toggled', { from: currentMode, to: newMode });
    await this.setThemeMode(newMode);

    // Force UI update for theme switcher text synchronization
    this._isDark$.next(this.shouldUseDarkTheme());
  }

  /**
   * Get available palettes
   */
  getAvailablePalettes(): PaletteDefinition[] {
    return COLOR_PALETTES;
  }

  /**
   * Get current theme mode
   */
  getCurrentThemeMode(): ThemeMode {
    return this._themeMode$.value;
  }

  /**
   * Get current palette
   */
  getCurrentPalette(): ColorPalette {
    return this._colorPalette$.value;
  }

  /**
   * Check if high contrast is enabled
   */
  isHighContrastEnabled(): boolean {
    return this._highContrast$.value;
  }

  /**
   * Check if dark theme is currently active
   */
  isDarkTheme(): boolean {
    return this._isDark$.value;
  }

  /**
   * Apply Material Design theme programmatically
   */
  applyMaterialTheme(palette: ColorPalette, mode: ThemeMode, highContrast = false): void {
    this._colorPalette$.next(palette);
    this._themeMode$.next(mode);
    this._highContrast$.next(highContrast);
    this.applyTheme();
  }
}
