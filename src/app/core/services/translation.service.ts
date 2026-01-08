/**
 * Translation Service
 *
 * Manages application language settings with automatic device language detection.
 * Supports English and Spanish with real-time language switching.
 */

import { Injectable, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoggerService } from '@services/logger.service';

/**
 * Supported languages
 */
export enum Language {
  EN = 'en',
  ES = 'es',
}

/**
 * Language configuration
 */
export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
  glucoseUnit: 'mg/dL' | 'mmol/L';
}

/**
 * Translation state
 */
export interface TranslationState {
  currentLanguage: Language;
  availableLanguages: LanguageConfig[];
  isLoading: boolean;
  deviceLanguage?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TranslationService implements OnDestroy {
  // Language configurations
  private readonly LANGUAGES: Map<Language, LanguageConfig> = new Map([
    [
      Language.EN,
      {
        code: Language.EN,
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        numberFormat: {
          decimal: '.',
          thousands: ',',
        },
        glucoseUnit: 'mg/dL',
      },
    ],
    [
      Language.ES,
      {
        code: Language.ES,
        name: 'Spanish',
        nativeName: 'Español',
        direction: 'ltr',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        numberFormat: {
          decimal: ',',
          thousands: '.',
        },
        glucoseUnit: 'mg/dL',
      },
    ],
  ]);

  // Default language
  private readonly DEFAULT_LANGUAGE = Language.ES;

  // Storage key for language preference
  private readonly LANGUAGE_KEY = 'diabetactic_language';

  // Translation state
  private state$ = new BehaviorSubject<TranslationState>({
    currentLanguage: this.DEFAULT_LANGUAGE,
    availableLanguages: Array.from(this.LANGUAGES.values()),
    isLoading: false,
  });

  public readonly state: Observable<TranslationState> = this.state$.asObservable();

  // Current language observable
  public readonly currentLanguage$: Observable<Language> = this.state$.pipe(
    map(state => state.currentLanguage)
  );

  // Current language config observable
  public readonly currentConfig$: Observable<LanguageConfig> = this.state$.pipe(
    map(state => {
      // DEFAULT_LANGUAGE is guaranteed to exist in LANGUAGES Map
      const defaultConfig = this.LANGUAGES.get(this.DEFAULT_LANGUAGE);
      if (!defaultConfig) {
        throw new Error('Default language configuration is missing');
      }
      return this.LANGUAGES.get(state.currentLanguage) ?? defaultConfig;
    })
  );

  private initPromise: Promise<void> | null = null;

  constructor(
    private translate: TranslateService,
    private logger: LoggerService
  ) {
    // Defer initialization to be called via APP_INITIALIZER
  }

  /**
   * Public initializer to be called by APP_INITIALIZER.
   * Ensures initialization runs only once.
   */
  public init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    return this.initPromise;
  }

  /**
   * Clean up subscriptions when service is destroyed
   * Prevents memory leaks from uncompleted BehaviorSubject
   */
  ngOnDestroy(): void {
    this.state$.complete();
  }

  /**
   * Initialize translation service
   */
  private async initialize(): Promise<void> {
    // Set available languages
    this.translate.addLangs(Array.from(this.LANGUAGES.keys()));

    // Set default language
    this.translate.setDefaultLang(this.DEFAULT_LANGUAGE);

    // Detect and set initial language
    const language = await this.detectInitialLanguage();
    await this.setLanguage(language);
  }

  /**
   * Detect initial language based on device settings or stored preference
   */
  private async detectInitialLanguage(): Promise<Language> {
    try {
      // First check stored preference
      const stored = await this.getStoredLanguage();
      if (stored) {
        this.logger.debug('Translation', `Using stored language preference: ${stored}`);
        return stored;
      }

      // If no stored preference, use DEFAULT_LANGUAGE (Spanish)
      // User can manually change language later via language switcher
      this.logger.debug(
        'Translation',
        `No stored preference, using default language: ${this.DEFAULT_LANGUAGE}`
      );
      return this.DEFAULT_LANGUAGE;
    } catch (error) {
      this.logger.error('Translation', 'Error detecting initial language', error);
      return this.DEFAULT_LANGUAGE;
    }
  }

  /**
   * Detect device language
   */
  private async detectDeviceLanguage(): Promise<string> {
    try {
      const info = await Device.getLanguageCode();
      const langCode = info.value.toLowerCase();

      // Store device language in state
      this.updateState({ deviceLanguage: langCode });

      return langCode;
    } catch (error) {
      this.logger.error('Translation', 'Error detecting device language', error);

      // Fallback to browser language
      const browserLang = navigator.language || navigator.languages[0];
      return browserLang.toLowerCase();
    }
  }

  /**
   * Map device language code to supported language
   */
  private static mapDeviceLanguage(deviceLang: string): Language {
    // Extract primary language code (e.g., 'es-MX' -> 'es')
    const primaryLang = deviceLang.split('-')[0].toLowerCase();

    // Check if we support this language
    if (primaryLang === 'es') {
      return Language.ES;
    } else if (primaryLang === 'en') {
      return Language.EN;
    }

    // Check for Spanish variants
    const spanishVariants = ['es', 'spa', 'español'];
    if (spanishVariants.some(variant => deviceLang.includes(variant))) {
      return Language.ES;
    }

    // Default to English for all other languages
    return Language.EN;
  }

  /**
   * Get stored language preference
   */
  private async getStoredLanguage(): Promise<Language | null> {
    try {
      const { value } = await Preferences.get({ key: this.LANGUAGE_KEY });
      if (value && Object.values(Language).includes(value as Language)) {
        return value as Language;
      }
      return null;
    } catch (error) {
      this.logger.error('Translation', 'Error getting stored language', error);
      return null;
    }
  }

  /**
   * Store language preference
   */
  private async storeLanguage(language: Language): Promise<void> {
    try {
      await Preferences.set({
        key: this.LANGUAGE_KEY,
        value: language,
      });
    } catch (error) {
      this.logger.error('Translation', 'Error storing language preference', error);
    }
  }

  /**
   * Set application language
   */
  public async setLanguage(language: Language): Promise<void> {
    if (!this.LANGUAGES.has(language)) {
      this.logger.warn('Translation', `Unsupported language: ${language}`);
      return;
    }

    // Update state to loading
    this.updateState({ isLoading: true });

    try {
      // Set language in translate service
      await firstValueFrom(this.translate.use(language));

      // Store language preference
      await this.storeLanguage(language);

      // Update HTML lang attribute
      document.documentElement.lang = language;

      // Update state
      this.updateState({
        currentLanguage: language,
        isLoading: false,
      });

      // Update text direction if needed
      // Language existence already validated on line 253
      const config = this.LANGUAGES.get(language);
      if (config) {
        document.documentElement.dir = config.direction;
      }

      this.logger.info('Translation', `Language changed to: ${language}`);
    } catch (error) {
      this.logger.error('Translation', 'Error setting language', error);
      this.updateState({ isLoading: false });
    }
  }

  /**
   * Get current language
   */
  public getCurrentLanguage(): Language {
    return this.state$.value.currentLanguage;
  }

  /**
   * Get current language configuration
   */
  public getCurrentConfig(): LanguageConfig {
    // Current language is always valid as it's initialized with DEFAULT_LANGUAGE
    const config = this.LANGUAGES.get(this.state$.value.currentLanguage);
    if (!config) {
      // Fallback to default language if somehow current language is invalid
      const defaultConfig = this.LANGUAGES.get(this.DEFAULT_LANGUAGE);
      if (!defaultConfig) {
        throw new Error('Default language configuration is missing');
      }
      return defaultConfig;
    }
    return config;
  }

  /**
   * Get available languages
   */
  public getAvailableLanguages(): LanguageConfig[] {
    return Array.from(this.LANGUAGES.values());
  }

  /**
   * Check if a language is supported
   */
  public isLanguageSupported(language: string): boolean {
    return Object.values(Language).includes(language as Language);
  }

  /**
   * Get translation for a key
   */
  public instant(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  /**
   * Get translation observable for a key
   */
  public get(key: string, params?: Record<string, unknown>): Observable<string> {
    return this.translate.get(key, params);
  }

  /**
   * Get multiple translations
   */
  public getMultiple(
    keys: string[],
    params?: Record<string, unknown>
  ): Observable<{ [key: string]: string }> {
    return this.translate.get(keys, params);
  }

  /**
   * Format date according to current language
   */
  public formatDate(date: Date | string): string {
    const config = this.getCurrentConfig();
    const dateObject = new Date(date);

    if (config.dateFormat === 'MM/DD/YYYY') {
      return `${(dateObject.getMonth() + 1).toString().padStart(2, '0')}/${dateObject.getDate().toString().padStart(2, '0')}/${dateObject.getFullYear()}`;
    } else {
      return `${dateObject.getDate().toString().padStart(2, '0')}/${(dateObject.getMonth() + 1).toString().padStart(2, '0')}/${dateObject.getFullYear()}`;
    }
  }

  /**
   * Format time according to current language
   */
  public formatTime(date: Date | string): string {
    const config = this.getCurrentConfig();
    const dateObject = new Date(date);

    if (config.timeFormat === '12h') {
      const hours = dateObject.getHours() % 12 || 12;
      const minutes = dateObject.getMinutes().toString().padStart(2, '0');
      const ampm = dateObject.getHours() >= 12 ? 'PM' : 'AM';
      return `${hours}:${minutes} ${ampm}`;
    } else {
      return `${dateObject.getHours().toString().padStart(2, '0')}:${dateObject.getMinutes().toString().padStart(2, '0')}`;
    }
  }

  /**
   * Format number according to current language
   */
  public formatNumber(value: number, decimals = 2): string {
    const config = this.getCurrentConfig();
    const parts = value.toFixed(decimals).split('.');

    // Format thousands
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.numberFormat.thousands);

    // Join with appropriate decimal separator
    return parts.join(config.numberFormat.decimal);
  }

  /**
   * Format glucose value according to current language and unit preference
   */
  public formatGlucose(
    value: number,
    unit?: 'mg/dL' | 'mmol/L',
    displayUnitOverride?: 'mg/dL' | 'mmol/L'
  ): string {
    const config = this.getCurrentConfig();
    const displayUnit = displayUnitOverride || config.glucoseUnit;
    const sourceUnit = unit || displayUnit;

    let displayValue = value;
    if (sourceUnit === 'mg/dL' && displayUnit === 'mmol/L') {
      displayValue = value / 18.0182; // Convert mg/dL to mmol/L
    } else if (sourceUnit === 'mmol/L' && displayUnit === 'mg/dL') {
      displayValue = value * 18.0182; // Convert mmol/L to mg/dL
    }

    const decimals = displayUnit === 'mmol/L' ? 1 : 0;
    return `${this.formatNumber(displayValue, decimals)} ${displayUnit}`;
  }

  /**
   * Get glucose status label
   */
  public getGlucoseStatusLabel(value: number, unit: 'mg/dL' | 'mmol/L' = 'mg/dL'): string {
    // Convert to mg/dL if needed
    const mgdlValue = unit === 'mmol/L' ? value * 18.0182 : value;

    if (mgdlValue < 54) {
      return this.instant('glucose.status.veryLow');
    } else if (mgdlValue < 70) {
      return this.instant('glucose.status.low');
    } else if (mgdlValue <= 180) {
      return this.instant('glucose.status.normal');
    } else if (mgdlValue <= 250) {
      return this.instant('glucose.status.high');
    } else {
      return this.instant('glucose.status.veryHigh');
    }
  }

  /**
   * Toggle between languages
   */
  public async toggleLanguage(): Promise<void> {
    const current = this.getCurrentLanguage();
    const next = current === Language.EN ? Language.ES : Language.EN;
    await this.setLanguage(next);
  }

  /**
   * Reset to device language
   */
  public async resetToDeviceLanguage(): Promise<void> {
    const deviceLang = await this.detectDeviceLanguage();
    const mappedLang = TranslationService.mapDeviceLanguage(deviceLang);
    await this.setLanguage(mappedLang);
  }

  /**
   * Clear stored language preference
   */
  public async clearLanguagePreference(): Promise<void> {
    try {
      await Preferences.remove({ key: this.LANGUAGE_KEY });
      await this.resetToDeviceLanguage();
    } catch (error) {
      this.logger.error('Translation', 'Error clearing language preference', error);
    }
  }

  /**
   * Update state
   */
  private updateState(partial: Partial<TranslationState>): void {
    this.state$.next({
      ...this.state$.value,
      ...partial,
    });
  }
}
