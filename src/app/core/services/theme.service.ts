/**
 * Enhanced Theme Service for Diabetify
 * Manages Material Design theming with child-friendly color palettes
 */

import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ColorPalette, ThemeMode } from '../models';
import { ProfileService } from './profile.service';

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
export class ThemeService {
  private readonly LEGACY_THEME_KEY = 'diabetify-theme';
  private renderer: Renderer2;

  // Theme state observables
  private _themeMode$ = new BehaviorSubject<ThemeMode>('light');
  private _colorPalette$ = new BehaviorSubject<ColorPalette>('default');
  private _highContrast$ = new BehaviorSubject<boolean>(false);
  private _isDark$ = new BehaviorSubject<boolean>(false);

  public readonly themeMode$ = this._themeMode$.asObservable();
  public readonly colorPalette$ = this._colorPalette$.asObservable();
  public readonly highContrast$ = this._highContrast$.asObservable();
  public readonly isDark$ = this._isDark$.asObservable();

  constructor(
    private rendererFactory: RendererFactory2,
    private profileService: ProfileService
  ) {
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

    // Listen for system theme changes
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
   * Setup listener for system theme changes
   */
  private setupSystemThemeListener(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', () => {
          if (this._themeMode$.value === 'auto') {
            this.applyTheme();
          }
        });
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
   * Determine if dark theme should be applied
   */
  private shouldUseDarkTheme(): boolean {
    const mode = this._themeMode$.value;

    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return this.getSystemThemePreference();
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

    // Remove all theme classes
    this.removeThemeClasses(body);

    // Add theme mode class
    this.renderer.addClass(body, isDark ? 'dark-theme' : 'light-theme');

    // Add palette class
    this.renderer.addClass(body, `palette-${palette}`);

    // Add high contrast if enabled
    if (highContrast) {
      this.renderer.addClass(body, 'high-contrast');
    }

    // Update CSS custom properties
    this.updateCSSProperties(palette, isDark, highContrast);
  }

  /**
   * Remove all theme-related classes
   */
  private removeThemeClasses(element: HTMLElement): void {
    const classesToRemove = [
      'dark-theme',
      'light-theme',
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
  private updateCSSProperties(palette: ColorPalette, isDark: boolean, highContrast: boolean): void {
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
   * Set theme mode
   */
  async setThemeMode(mode: ThemeMode): Promise<void> {
    this._themeMode$.next(mode);
    this.applyTheme();

    // Save to profile
    await this.profileService.updatePreferences({ themeMode: mode });
  }

  /**
   * Set color palette
   */
  async setColorPalette(palette: ColorPalette): Promise<void> {
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
    this._highContrast$.next(newValue);
    this.applyTheme();

    // Save to profile
    await this.profileService.updatePreferences({ highContrastMode: newValue });
  }

  /**
   * Toggle between light and dark
   */
  async toggleTheme(): Promise<void> {
    const currentMode = this._themeMode$.value;
    const newMode: ThemeMode = currentMode === 'dark' ? 'light' : 'dark';
    await this.setThemeMode(newMode);
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
  applyMaterialTheme(palette: ColorPalette, mode: ThemeMode, highContrast: boolean = false): void {
    this._colorPalette$.next(palette);
    this._themeMode$.next(mode);
    this._highContrast$.next(highContrast);
    this.applyTheme();
  }
}
