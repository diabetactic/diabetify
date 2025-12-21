// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { TranslationService, Language, LanguageConfig } from '@services/translation.service';
import { LoggerService } from '@services/logger.service';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import type { Mock } from 'vitest';

describe('TranslationService', () => {
  let service: TranslationService;
  let translateService: Mock<TranslateService>;
  let mockLogger: Mock<LoggerService>;

  beforeEach(() => {
    const translateServiceMock = {
      addLangs: vi.fn(),
      setDefaultLang: vi.fn(),
      use: vi.fn().mockReturnValue(of('es')),
      instant: vi.fn(),
      get: vi.fn().mockReturnValue(of('translated text')),
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Mock<LoggerService>;

    (Preferences.get as Mock).mockResolvedValue({ value: null });
    (Preferences.set as Mock).mockResolvedValue(undefined);
    (Preferences.remove as Mock).mockResolvedValue(undefined);
    (Device.getLanguageCode as Mock).mockResolvedValue({ value: 'es-MX' });

    TestBed.configureTestingModule({
      providers: [
        TranslationService,
        { provide: TranslateService, useValue: translateServiceMock },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(TranslationService);
    translateService = TestBed.inject(TranslateService) as Mock<TranslateService>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should configure TranslateService correctly', async () => {
      expect(translateService.addLangs).toHaveBeenCalledWith(['en', 'es']);
      expect(translateService.setDefaultLang).toHaveBeenCalledWith(Language.ES);

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(service.getCurrentLanguage()).toBe(Language.ES);
    });

    it('should load stored language preference on init', async () => {
      (Preferences.get as Mock).mockResolvedValue({ value: 'en' });
      new TranslationService(translateService, mockLogger);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(translateService.use).toHaveBeenCalledWith('en');
    });
  });

  describe('setLanguage', () => {
    it('should set language, store preference, and update HTML attributes', async () => {
      await service.setLanguage(Language.EN);

      expect(translateService.use).toHaveBeenCalledWith(Language.EN);
      expect(service.getCurrentLanguage()).toBe(Language.EN);
      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'diabetactic_language',
        value: Language.EN,
      });
      expect(document.documentElement.lang).toBe(Language.EN);
      expect(document.documentElement.dir).toBe('ltr');
    });

    it('should reject unsupported languages and set loading state during change', async () => {
      let loadingState = false;

      service.state.subscribe(state => {
        if (state.isLoading) loadingState = true;
      });

      await service.setLanguage('fr' as Language);
      expect(mockLogger.warn).toHaveBeenCalledWith('Translation', 'Unsupported language: fr');
      expect(translateService.use).not.toHaveBeenCalledWith('fr');

      await service.setLanguage(Language.EN);
      expect(loadingState).toBe(true);
    });
  });

  describe('getCurrentConfig and getAvailableLanguages', () => {
    it('should return correct config and update after language change', async () => {
      let config = service.getCurrentConfig();
      expect(config.code).toBe(Language.ES);
      expect(config.name).toBe('Spanish');
      expect(config.nativeName).toBe('Español');

      await service.setLanguage(Language.EN);
      config = service.getCurrentConfig();
      expect(config.code).toBe(Language.EN);
      expect(config.name).toBe('English');
    });

    it('should return all available languages', () => {
      const languages = service.getAvailableLanguages();
      expect(languages).toHaveLength(2);
      expect(languages.some(l => l.code === Language.EN)).toBe(true);
      expect(languages.some(l => l.code === Language.ES)).toBe(true);
    });
  });

  describe('isLanguageSupported', () => {
    it('should validate language support correctly', () => {
      expect(service.isLanguageSupported('en')).toBe(true);
      expect(service.isLanguageSupported('es')).toBe(true);
      expect(service.isLanguageSupported('fr')).toBe(false);
      expect(service.isLanguageSupported('de')).toBe(false);
    });
  });

  describe('translations', () => {
    it('should get instant translations with and without params', () => {
      translateService.instant.mockReturnValue('translated');
      expect(service.instant('test.key')).toBe('translated');
      expect(translateService.instant).toHaveBeenCalledWith('test.key', undefined);

      translateService.instant.mockReturnValue('Hello John');
      expect(service.instant('greeting', { name: 'John' })).toBe('Hello John');
      expect(translateService.instant).toHaveBeenCalledWith('greeting', { name: 'John' });
    });

    it('should get observable translations', () =>
      new Promise<void>(resolve => {
        service.get('test.key').subscribe(translation => {
          expect(translation).toBe('translated text');
          resolve();
        });
      }));

    it('should get multiple translations', () =>
      new Promise<void>(resolve => {
        translateService.get.mockReturnValue(of({ key1: 'value1', key2: 'value2' }));

        service.getMultiple(['key1', 'key2']).subscribe(translations => {
          expect(translations).toEqual({ key1: 'value1', key2: 'value2' });
          resolve();
        });
      }));
  });

  describe('formatDate and formatTime', () => {
    it('should format date according to language', async () => {
      const date = new Date('2024-01-15T12:00:00Z');

      await service.setLanguage(Language.EN);
      expect(service.formatDate(date)).toBe('01/15/2024');

      await service.setLanguage(Language.ES);
      expect(service.formatDate(date)).toBe('15/01/2024');

      expect(service.formatDate('2024-03-20T12:00:00Z')).toMatch(/\d{2}\/\d{2}\/2024/);
    });

    it('should format time according to language (12h vs 24h)', async () => {
      const date = new Date('2024-01-15T14:30:00Z');

      await service.setLanguage(Language.EN);
      expect(service.formatTime(date)).toMatch(/\d{1,2}:30 (AM|PM)/);

      await service.setLanguage(Language.ES);
      const esTime = service.formatTime(date);
      expect(esTime).toMatch(/\d{2}:30/);
      expect(esTime).not.toContain('AM');
      expect(esTime).not.toContain('PM');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with correct separators', async () => {
      await service.setLanguage(Language.EN);
      expect(service.formatNumber(1234.56)).toBe('1,234.56');
      expect(service.formatNumber(1234.567, 1)).toBe('1,234.6');

      await service.setLanguage(Language.ES);
      expect(service.formatNumber(1234.56)).toBe('1.234,56');
    });
  });

  describe('formatGlucose', () => {
    it('should format glucose with unit conversion', async () => {
      // Default mg/dL
      const mgdl = service.formatGlucose(120);
      expect(mgdl).toContain('120');
      expect(mgdl).toContain('mg/dL');

      // mg/dL to mmol/L (180 mg/dL ≈ 10.0 mmol/L)
      const mmol = service.formatGlucose(180, 'mg/dL', 'mmol/L');
      expect(mmol).toContain('mmol/L');
      expect(mmol).toMatch(/10[.,]\d/);

      // mmol/L to mg/dL (5.5 mmol/L ≈ 99 mg/dL)
      const converted = service.formatGlucose(5.5, 'mmol/L', 'mg/dL');
      expect(converted).toContain('mg/dL');
      expect(converted).toMatch(/99/);
    });

    it('should use correct decimal places per unit', async () => {
      const mgdl = service.formatGlucose(120, 'mg/dL', 'mg/dL');
      const mmol = service.formatGlucose(120, 'mg/dL', 'mmol/L');

      // mg/dL: no decimal
      expect(mgdl).not.toContain('.');
      expect(mgdl).not.toContain(',');

      // mmol/L: 1 decimal
      expect(mmol).toMatch(/\d+[.,]\d/);
    });
  });

  describe('getGlucoseStatusLabel', () => {
    beforeEach(() => {
      translateService.instant.mockImplementation(key => key);
    });

    it('should return correct status labels for glucose ranges', () => {
      const testCases = [
        { value: 50, unit: 'mg/dL', expected: 'glucose.status.veryLow' },
        { value: 65, unit: 'mg/dL', expected: 'glucose.status.low' },
        { value: 120, unit: 'mg/dL', expected: 'glucose.status.normal' },
        { value: 200, unit: 'mg/dL', expected: 'glucose.status.high' },
        { value: 300, unit: 'mg/dL', expected: 'glucose.status.veryHigh' },
        { value: 2.8, unit: 'mmol/L', expected: 'glucose.status.veryLow' }, // ≈50 mg/dL
      ];

      testCases.forEach(({ value, unit, expected }) => {
        const label = service.getGlucoseStatusLabel(value, unit as 'mg/dL' | 'mmol/L');
        expect(label, `${value} ${unit}`).toBe(expected);
      });
    });
  });

  describe('toggleLanguage', () => {
    it('should toggle between languages', async () => {
      await service.setLanguage(Language.ES);
      await service.toggleLanguage();
      expect(service.getCurrentLanguage()).toBe(Language.EN);

      await service.toggleLanguage();
      expect(service.getCurrentLanguage()).toBe(Language.ES);
    });
  });

  describe('resetToDeviceLanguage', () => {
    it('should detect and set device language with fallback', async () => {
      (Device.getLanguageCode as Mock).mockResolvedValue({ value: 'en-US' });
      await service.resetToDeviceLanguage();
      expect(service.getCurrentLanguage()).toBe(Language.EN);

      (Device.getLanguageCode as Mock).mockResolvedValue({ value: 'es-MX' });
      await service.resetToDeviceLanguage();
      expect(service.getCurrentLanguage()).toBe(Language.ES);

      // Fallback to browser language on error
      (Device.getLanguageCode as Mock).mockRejectedValue(new Error('Failed'));
      Object.defineProperty(navigator, 'language', { value: 'en-US', writable: true });
      await service.resetToDeviceLanguage();
      expect(service.getCurrentLanguage()).toBe(Language.EN);
    });
  });

  describe('clearLanguagePreference', () => {
    it('should remove preference and reset to device language', async () => {
      (Device.getLanguageCode as Mock).mockResolvedValue({ value: 'en-US' });

      await service.clearLanguagePreference();

      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'diabetactic_language' });
      expect(service.getCurrentLanguage()).toBe(Language.EN);
    });

    it('should handle errors gracefully', async () => {
      (Preferences.remove as Mock).mockRejectedValue(new Error('Failed'));

      await service.clearLanguagePreference();

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('observables', () => {
    it('should emit language and config changes', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      let emittedLang: Language | null = null;
      let emittedConfig: LanguageConfig | undefined;

      const langSub = service.currentLanguage$.subscribe(lang => {
        emittedLang = lang;
      });
      const configSub = service.currentConfig$.subscribe(config => {
        emittedConfig = config;
      });

      await service.setLanguage(Language.EN);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(emittedLang).toBe(Language.EN);
      expect(emittedConfig?.code).toBe(Language.EN);

      langSub.unsubscribe();
      configSub.unsubscribe();
    });
  });
});
