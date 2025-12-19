/**
 * Translation Language Integration Tests
 *
 * Tests the complete translation management flow across services:
 * 1. TranslationService - Language switching and formatting
 * 2. Capacitor Preferences - Language persistence
 * 3. Capacitor Device - Device language detection
 * 4. DOM - HTML lang/dir attributes
 *
 * Flow: Detect Language -> Apply -> Persist -> Format dates/numbers
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { TranslationService, Language, LanguageConfig } from '@core/services/translation.service';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

// Note: Capacitor plugins are already mocked in test-setup/index.ts

describe('Translation Language Integration Tests', () => {
  let translationService: TranslationService;
  let mockTranslateService: {
    addLangs: Mock;
    setDefaultLang: Mock;
    use: Mock;
    instant: Mock;
    get: Mock;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset Preferences mock
    const preferencesStorage = new Map<string, string>();
    (Preferences.get as Mock).mockImplementation(async ({ key }) => ({
      value: preferencesStorage.get(key) ?? null,
    }));
    (Preferences.set as Mock).mockImplementation(async ({ key, value }) => {
      preferencesStorage.set(key, value);
    });
    (Preferences.remove as Mock).mockImplementation(async ({ key }) => {
      preferencesStorage.delete(key);
    });

    // Mock Device language
    (Device.getLanguageCode as Mock).mockResolvedValue({ value: 'es-MX' });

    // Create TranslateService mock
    mockTranslateService = {
      addLangs: vi.fn(),
      setDefaultLang: vi.fn(),
      use: vi.fn().mockReturnValue(of('es')),
      instant: vi.fn().mockImplementation(key => key),
      get: vi.fn().mockReturnValue(of('translated text')),
    };

    TestBed.configureTestingModule({
      providers: [
        TranslationService,
        { provide: TranslateService, useValue: mockTranslateService },
      ],
    });

    translationService = TestBed.inject(TranslationService);

    // Wait for async initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Language Initialization', () => {
    it('should configure TranslateService with available languages', () => {
      expect(mockTranslateService.addLangs).toHaveBeenCalledWith(['en', 'es']);
    });

    it('should set Spanish as default language', () => {
      expect(mockTranslateService.setDefaultLang).toHaveBeenCalledWith(Language.ES);
    });

    it('should initialize with device language if no stored preference', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      // Device returns es-MX which maps to ES
      expect(translationService.getCurrentLanguage()).toBe(Language.ES);
    });

    it('should load stored language preference on init', async () => {
      // Pre-store English preference
      (Preferences.get as Mock).mockResolvedValue({ value: 'en' });

      // Re-create service
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          TranslationService,
          { provide: TranslateService, useValue: mockTranslateService },
        ],
      });

      const newService = TestBed.inject(TranslationService);
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockTranslateService.use).toHaveBeenCalledWith('en');
    });
  });

  describe('Language Switching', () => {
    it('should set language and persist to Preferences', async () => {
      await translationService.setLanguage(Language.EN);

      expect(mockTranslateService.use).toHaveBeenCalledWith(Language.EN);
      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'diabetactic_language',
        value: Language.EN,
      });
    });

    it('should update HTML lang attribute', async () => {
      await translationService.setLanguage(Language.EN);

      expect(document.documentElement.lang).toBe(Language.EN);
    });

    it('should update HTML dir attribute', async () => {
      await translationService.setLanguage(Language.EN);

      expect(document.documentElement.dir).toBe('ltr');
    });

    it('should reject unsupported languages', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await translationService.setLanguage('fr' as Language);

      expect(consoleSpy).toHaveBeenCalledWith('Unsupported language: fr');
      expect(mockTranslateService.use).not.toHaveBeenCalledWith('fr');
      consoleSpy.mockRestore();
    });

    it('should emit current language changes via observable', async () => {
      let emittedLang: Language | null = null;
      const subscription = translationService.currentLanguage$.subscribe(lang => {
        emittedLang = lang;
      });

      await translationService.setLanguage(Language.EN);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(emittedLang).toBe(Language.EN);
      subscription.unsubscribe();
    });
  });

  describe('Language Toggle', () => {
    it('should toggle from Spanish to English', async () => {
      await translationService.setLanguage(Language.ES);
      await translationService.toggleLanguage();

      expect(translationService.getCurrentLanguage()).toBe(Language.EN);
    });

    it('should toggle from English to Spanish', async () => {
      await translationService.setLanguage(Language.EN);
      await translationService.toggleLanguage();

      expect(translationService.getCurrentLanguage()).toBe(Language.ES);
    });
  });

  describe('Device Language Detection', () => {
    it('should detect and set device language', async () => {
      (Device.getLanguageCode as Mock).mockResolvedValue({ value: 'en-US' });

      await translationService.resetToDeviceLanguage();

      expect(translationService.getCurrentLanguage()).toBe(Language.EN);
    });

    it('should map Spanish variants to ES', async () => {
      (Device.getLanguageCode as Mock).mockResolvedValue({ value: 'es-AR' });

      await translationService.resetToDeviceLanguage();

      expect(translationService.getCurrentLanguage()).toBe(Language.ES);
    });

    it('should fall back to browser language on Device error', async () => {
      (Device.getLanguageCode as Mock).mockRejectedValue(new Error('Plugin not available'));

      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true,
      });

      await translationService.resetToDeviceLanguage();

      expect(translationService.getCurrentLanguage()).toBe(Language.EN);
    });
  });

  describe('Clear Language Preference', () => {
    it('should remove stored preference', async () => {
      await translationService.clearLanguagePreference();

      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'diabetactic_language' });
    });

    it('should reset to device language after clearing', async () => {
      (Device.getLanguageCode as Mock).mockResolvedValue({ value: 'en-US' });

      await translationService.clearLanguagePreference();

      expect(translationService.getCurrentLanguage()).toBe(Language.EN);
    });
  });

  describe('Language Configuration', () => {
    it('should return current language configuration', async () => {
      await translationService.setLanguage(Language.ES);

      const config = translationService.getCurrentConfig();

      expect(config.code).toBe(Language.ES);
      expect(config.name).toBe('Spanish');
      expect(config.nativeName).toBe('Español');
      expect(config.direction).toBe('ltr');
    });

    it('should emit config changes via observable', async () => {
      let emittedConfig: LanguageConfig | undefined;
      const subscription = translationService.currentConfig$.subscribe(config => {
        emittedConfig = config;
      });

      await translationService.setLanguage(Language.EN);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(emittedConfig?.code).toBe(Language.EN);
      expect(emittedConfig?.name).toBe('English');
      subscription.unsubscribe();
    });

    it('should return all available languages', () => {
      const languages = translationService.getAvailableLanguages();

      expect(languages).toHaveLength(2);
      expect(languages.some(l => l.code === Language.EN)).toBe(true);
      expect(languages.some(l => l.code === Language.ES)).toBe(true);
    });

    it('should check if language is supported', () => {
      expect(translationService.isLanguageSupported('en')).toBe(true);
      expect(translationService.isLanguageSupported('es')).toBe(true);
      expect(translationService.isLanguageSupported('fr')).toBe(false);
    });
  });

  describe('Date Formatting', () => {
    it('should format date in English format (MM/DD/YYYY)', async () => {
      await translationService.setLanguage(Language.EN);

      const date = new Date('2024-01-15T12:00:00Z');
      const formatted = translationService.formatDate(date);

      expect(formatted).toBe('01/15/2024');
    });

    it('should format date in Spanish format (DD/MM/YYYY)', async () => {
      await translationService.setLanguage(Language.ES);

      const date = new Date('2024-01-15T12:00:00Z');
      const formatted = translationService.formatDate(date);

      expect(formatted).toBe('15/01/2024');
    });
  });

  describe('Time Formatting', () => {
    it('should format time in 12-hour format for English', async () => {
      await translationService.setLanguage(Language.EN);

      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = translationService.formatTime(date);

      // Accepts local timezone variations
      expect(formatted).toMatch(/\d{1,2}:30 (AM|PM)/);
    });

    it('should format time in 24-hour format for Spanish', async () => {
      await translationService.setLanguage(Language.ES);

      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = translationService.formatTime(date);

      expect(formatted).toMatch(/\d{2}:30/);
      expect(formatted).not.toContain('AM');
      expect(formatted).not.toContain('PM');
    });
  });

  describe('Number Formatting', () => {
    it('should format number with English separators (1,234.56)', async () => {
      await translationService.setLanguage(Language.EN);

      const formatted = translationService.formatNumber(1234.56);

      expect(formatted).toBe('1,234.56');
    });

    it('should format number with Spanish separators (1.234,56)', async () => {
      await translationService.setLanguage(Language.ES);

      const formatted = translationService.formatNumber(1234.56);

      expect(formatted).toBe('1.234,56');
    });
  });

  describe('Glucose Formatting', () => {
    it('should format glucose value with unit', () => {
      const formatted = translationService.formatGlucose(120);

      expect(formatted).toContain('120');
      expect(formatted).toContain('mg/dL');
    });

    it('should convert mg/dL to mmol/L', () => {
      // 180 mg/dL = 10.0 mmol/L
      const formatted = translationService.formatGlucose(180, 'mg/dL', 'mmol/L');

      expect(formatted).toContain('mmol/L');
      expect(formatted).toMatch(/10[.,]\d/);
    });

    it('should convert mmol/L to mg/dL', () => {
      // 5.5 mmol/L = 99 mg/dL
      const formatted = translationService.formatGlucose(5.5, 'mmol/L', 'mg/dL');

      expect(formatted).toContain('mg/dL');
      expect(formatted).toMatch(/99/);
    });
  });

  describe('Glucose Status Labels', () => {
    beforeEach(() => {
      mockTranslateService.instant.mockImplementation(key => key);
    });

    it('should return veryLow for values < 54 mg/dL', () => {
      const label = translationService.getGlucoseStatusLabel(50, 'mg/dL');
      expect(label).toBe('glucose.status.veryLow');
    });

    it('should return low for values 54-69 mg/dL', () => {
      const label = translationService.getGlucoseStatusLabel(65, 'mg/dL');
      expect(label).toBe('glucose.status.low');
    });

    it('should return normal for values 70-180 mg/dL', () => {
      const label = translationService.getGlucoseStatusLabel(120, 'mg/dL');
      expect(label).toBe('glucose.status.normal');
    });

    it('should return high for values 181-250 mg/dL', () => {
      const label = translationService.getGlucoseStatusLabel(200, 'mg/dL');
      expect(label).toBe('glucose.status.high');
    });

    it('should return veryHigh for values > 250 mg/dL', () => {
      const label = translationService.getGlucoseStatusLabel(300, 'mg/dL');
      expect(label).toBe('glucose.status.veryHigh');
    });
  });

  describe('Translation Retrieval', () => {
    it('should get instant translation', () => {
      mockTranslateService.instant.mockReturnValue('translated text');

      const result = translationService.instant('test.key');

      expect(mockTranslateService.instant).toHaveBeenCalledWith('test.key', undefined);
      expect(result).toBe('translated text');
    });

    it('should get translation observable', () =>
      new Promise<void>(resolve => {
        translationService.get('test.key').subscribe(translation => {
          expect(mockTranslateService.get).toHaveBeenCalledWith('test.key', undefined);
          expect(translation).toBe('translated text');
          resolve();
        });
      }));

    it('should get multiple translations', () =>
      new Promise<void>(resolve => {
        const keys = ['key1', 'key2'];
        mockTranslateService.get.mockReturnValue(of({ key1: 'value1', key2: 'value2' }));

        translationService.getMultiple(keys).subscribe(translations => {
          expect(mockTranslateService.get).toHaveBeenCalledWith(keys, undefined);
          expect(translations).toEqual({ key1: 'value1', key2: 'value2' });
          resolve();
        });
      }));
  });
});
