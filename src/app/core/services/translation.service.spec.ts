import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { TranslationService, Language, LanguageConfig } from '@services/translation.service';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

// Mock Capacitor plugins
jest.mock('@capacitor/device');
jest.mock('@capacitor/preferences');

describe('TranslationService', () => {
  let service: TranslationService;
  let translateService: jest.Mocked<TranslateService>;

  beforeEach(() => {
    const translateServiceMock = {
      addLangs: jest.fn(),
      setDefaultLang: jest.fn(),
      use: jest.fn().mockReturnValue(of('es')),
      instant: jest.fn(),
      get: jest.fn().mockReturnValue(of('translated text')),
    };

    (Preferences.get as jest.Mock).mockResolvedValue({ value: null });
    (Preferences.set as jest.Mock).mockResolvedValue(undefined);
    (Preferences.remove as jest.Mock).mockResolvedValue(undefined);
    (Device.getLanguageCode as jest.Mock).mockResolvedValue({ value: 'es-MX' });

    TestBed.configureTestingModule({
      providers: [
        TranslationService,
        { provide: TranslateService, useValue: translateServiceMock },
      ],
    });

    service = TestBed.inject(TranslationService);
    translateService = TestBed.inject(TranslateService) as jest.Mocked<TranslateService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should configure TranslateService with available languages', () => {
      expect(translateService.addLangs).toHaveBeenCalledWith(['en', 'es']);
    });

    it('should set default language to Spanish', () => {
      expect(translateService.setDefaultLang).toHaveBeenCalledWith(Language.ES);
    });

    it('should initialize with default language when no stored preference', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      const currentLang = service.getCurrentLanguage();
      expect(currentLang).toBe(Language.ES);
    });

    it('should load stored language preference on init', async () => {
      (Preferences.get as jest.Mock).mockResolvedValue({ value: 'en' });

      // Create service to trigger init
      new TranslationService(translateService);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(translateService.use).toHaveBeenCalledWith('en');
    });
  });

  describe('setLanguage', () => {
    it('should set language and update state', async () => {
      await service.setLanguage(Language.EN);

      expect(translateService.use).toHaveBeenCalledWith(Language.EN);
      expect(service.getCurrentLanguage()).toBe(Language.EN);
    });

    it('should store language preference', async () => {
      await service.setLanguage(Language.EN);

      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'diabetactic_language',
        value: Language.EN,
      });
    });

    it('should update HTML lang attribute', async () => {
      await service.setLanguage(Language.EN);

      expect(document.documentElement.lang).toBe(Language.EN);
    });

    it('should update HTML dir attribute', async () => {
      await service.setLanguage(Language.EN);

      expect(document.documentElement.dir).toBe('ltr');
    });

    it('should not set unsupported language', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.setLanguage('fr' as Language);

      expect(consoleSpy).toHaveBeenCalledWith('Unsupported language: fr');
      expect(translateService.use).not.toHaveBeenCalledWith('fr');
      consoleSpy.mockRestore();
    });

    it('should set loading state during language change', async () => {
      let loadingState = false;

      service.state.subscribe(state => {
        if (state.isLoading) {
          loadingState = true;
        }
      });

      await service.setLanguage(Language.EN);

      expect(loadingState).toBe(true);
    });
  });

  describe('getCurrentLanguage', () => {
    it('should return current language', () => {
      const lang = service.getCurrentLanguage();
      expect(lang).toBe(Language.ES);
    });
  });

  describe('getCurrentConfig', () => {
    it('should return current language configuration', () => {
      const config = service.getCurrentConfig();

      expect(config.code).toBe(Language.ES);
      expect(config.name).toBe('Spanish');
      expect(config.nativeName).toBe('Español');
    });

    it('should return correct config after language change', async () => {
      await service.setLanguage(Language.EN);

      const config = service.getCurrentConfig();
      expect(config.code).toBe(Language.EN);
      expect(config.name).toBe('English');
    });
  });

  describe('getAvailableLanguages', () => {
    it('should return all available languages', () => {
      const languages = service.getAvailableLanguages();

      expect(languages).toHaveLength(2);
      expect(languages.some(l => l.code === Language.EN)).toBe(true);
      expect(languages.some(l => l.code === Language.ES)).toBe(true);
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(service.isLanguageSupported('en')).toBe(true);
      expect(service.isLanguageSupported('es')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(service.isLanguageSupported('fr')).toBe(false);
      expect(service.isLanguageSupported('de')).toBe(false);
    });
  });

  describe('instant translation', () => {
    it('should get instant translation', () => {
      translateService.instant.mockReturnValue('translated text');

      const result = service.instant('test.key');

      expect(translateService.instant).toHaveBeenCalledWith('test.key', undefined);
      expect(result).toBe('translated text');
    });

    it('should get instant translation with parameters', () => {
      const params = { name: 'John' };
      translateService.instant.mockReturnValue('Hello John');

      const result = service.instant('greeting', params);

      expect(translateService.instant).toHaveBeenCalledWith('greeting', params);
      expect(result).toBe('Hello John');
    });
  });

  describe('observable translation', () => {
    it('should get translation observable', done => {
      service.get('test.key').subscribe(translation => {
        expect(translateService.get).toHaveBeenCalledWith('test.key', undefined);
        expect(translation).toBe('translated text');
        done();
      });
    });

    it('should get translation with parameters', done => {
      const params = { count: 5 };

      service.get('items.count', params).subscribe(() => {
        expect(translateService.get).toHaveBeenCalledWith('items.count', params);
        done();
      });
    });

    it('should get multiple translations', done => {
      const keys = ['key1', 'key2'];
      translateService.get.mockReturnValue(of({ key1: 'value1', key2: 'value2' }));

      service.getMultiple(keys).subscribe(translations => {
        expect(translateService.get).toHaveBeenCalledWith(keys, undefined);
        expect(translations).toEqual({ key1: 'value1', key2: 'value2' });
        done();
      });
    });
  });

  describe('formatDate', () => {
    it('should format date in English format (MM/DD/YYYY)', async () => {
      await service.setLanguage(Language.EN);

      const date = new Date('2024-01-15T12:00:00Z');
      const formatted = service.formatDate(date);

      expect(formatted).toBe('01/15/2024');
    });

    it('should format date in Spanish format (DD/MM/YYYY)', async () => {
      await service.setLanguage(Language.ES);

      const date = new Date('2024-01-15T12:00:00Z');
      const formatted = service.formatDate(date);

      expect(formatted).toBe('15/01/2024');
    });

    it('should handle date strings', async () => {
      const formatted = service.formatDate('2024-03-20T12:00:00Z');
      expect(formatted).toMatch(/\d{2}\/\d{2}\/2024/);
    });
  });

  describe('formatTime', () => {
    it('should format time in 12-hour format for English', async () => {
      await service.setLanguage(Language.EN);

      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = service.formatTime(date);

      expect(formatted).toMatch(/\d{1,2}:30 (AM|PM)/);
    });

    it('should format time in 24-hour format for Spanish', async () => {
      await service.setLanguage(Language.ES);

      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = service.formatTime(date);

      expect(formatted).toMatch(/\d{2}:30/);
      expect(formatted).not.toContain('AM');
      expect(formatted).not.toContain('PM');
    });
  });

  describe('formatNumber', () => {
    it('should format number with English separators', async () => {
      await service.setLanguage(Language.EN);

      const formatted = service.formatNumber(1234.56);

      expect(formatted).toBe('1,234.56');
    });

    it('should format number with Spanish separators', async () => {
      await service.setLanguage(Language.ES);

      const formatted = service.formatNumber(1234.56);

      expect(formatted).toBe('1.234,56');
    });

    it('should support custom decimal places', async () => {
      await service.setLanguage(Language.EN);

      const formatted = service.formatNumber(1234.567, 1);

      expect(formatted).toBe('1,234.6');
    });
  });

  describe('formatGlucose', () => {
    it('should format glucose value with default unit', async () => {
      const formatted = service.formatGlucose(120);

      expect(formatted).toContain('120');
      expect(formatted).toContain('mg/dL');
    });

    it('should convert mg/dL to mmol/L', async () => {
      const formatted = service.formatGlucose(180, 'mg/dL', 'mmol/L');

      expect(formatted).toContain('mmol/L');
      // 180 mg/dL ≈ 10.0 mmol/L (with either . or , depending on language)
      expect(formatted).toMatch(/10[.,]\d/);
    });

    it('should convert mmol/L to mg/dL', async () => {
      const formatted = service.formatGlucose(5.5, 'mmol/L', 'mg/dL');

      expect(formatted).toContain('mg/dL');
      // 5.5 mmol/L ≈ 99 mg/dL
      expect(formatted).toMatch(/99/);
    });

    it('should use different decimal places for different units', async () => {
      const mgdl = service.formatGlucose(120, 'mg/dL', 'mg/dL');
      const mmol = service.formatGlucose(120, 'mg/dL', 'mmol/L');

      // mg/dL should have 0 decimals - no decimal separator
      expect(mgdl).not.toContain('.');
      expect(mgdl).not.toContain(',');
      // mmol/L should have 1 decimal - with either . or , depending on language
      expect(mmol).toMatch(/\d+[.,]\d/);
    });
  });

  describe('getGlucoseStatusLabel', () => {
    beforeEach(() => {
      translateService.instant.mockImplementation(key => key);
    });

    it('should return very low for values < 54 mg/dL', () => {
      const label = service.getGlucoseStatusLabel(50, 'mg/dL');
      expect(label).toBe('glucose.status.veryLow');
    });

    it('should return low for values 54-69 mg/dL', () => {
      const label = service.getGlucoseStatusLabel(65, 'mg/dL');
      expect(label).toBe('glucose.status.low');
    });

    it('should return normal for values 70-180 mg/dL', () => {
      const label = service.getGlucoseStatusLabel(120, 'mg/dL');
      expect(label).toBe('glucose.status.normal');
    });

    it('should return high for values 181-250 mg/dL', () => {
      const label = service.getGlucoseStatusLabel(200, 'mg/dL');
      expect(label).toBe('glucose.status.high');
    });

    it('should return very high for values > 250 mg/dL', () => {
      const label = service.getGlucoseStatusLabel(300, 'mg/dL');
      expect(label).toBe('glucose.status.veryHigh');
    });

    it('should convert mmol/L to mg/dL before checking', () => {
      // 3.0 mmol/L ≈ 54 mg/dL (very low threshold)
      const label = service.getGlucoseStatusLabel(2.8, 'mmol/L');
      expect(label).toBe('glucose.status.veryLow');
    });
  });

  describe('toggleLanguage', () => {
    it('should toggle from Spanish to English', async () => {
      await service.setLanguage(Language.ES);
      await service.toggleLanguage();

      expect(service.getCurrentLanguage()).toBe(Language.EN);
    });

    it('should toggle from English to Spanish', async () => {
      await service.setLanguage(Language.EN);
      await service.toggleLanguage();

      expect(service.getCurrentLanguage()).toBe(Language.ES);
    });
  });

  describe('resetToDeviceLanguage', () => {
    it('should detect and set device language', async () => {
      (Device.getLanguageCode as jest.Mock).mockResolvedValue({ value: 'en-US' });

      await service.resetToDeviceLanguage();

      expect(service.getCurrentLanguage()).toBe(Language.EN);
    });

    it('should map Spanish variants to ES', async () => {
      (Device.getLanguageCode as jest.Mock).mockResolvedValue({ value: 'es-MX' });

      await service.resetToDeviceLanguage();

      expect(service.getCurrentLanguage()).toBe(Language.ES);
    });

    it('should fall back to browser language on error', async () => {
      (Device.getLanguageCode as jest.Mock).mockRejectedValue(new Error('Failed'));

      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        writable: true,
      });

      await service.resetToDeviceLanguage();

      expect(service.getCurrentLanguage()).toBe(Language.EN);
    });
  });

  describe('clearLanguagePreference', () => {
    it('should remove stored preference', async () => {
      await service.clearLanguagePreference();

      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'diabetactic_language' });
    });

    it('should reset to device language after clearing', async () => {
      (Device.getLanguageCode as jest.Mock).mockResolvedValue({ value: 'en-US' });

      await service.clearLanguagePreference();

      expect(service.getCurrentLanguage()).toBe(Language.EN);
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (Preferences.remove as jest.Mock).mockRejectedValue(new Error('Failed'));

      await service.clearLanguagePreference();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('observables', () => {
    it('should emit current language changes', async () => {
      // Wait for initial setup
      await new Promise(resolve => setTimeout(resolve, 100));

      let emittedLang: Language | null = null;

      const sub = service.currentLanguage$.subscribe(lang => {
        emittedLang = lang;
      });

      await service.setLanguage(Language.EN);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(emittedLang).toBe(Language.EN);
      sub.unsubscribe();
    });

    it('should emit current config changes', async () => {
      // Wait for initial setup
      await new Promise(resolve => setTimeout(resolve, 100));

      let emittedConfig: LanguageConfig | undefined;

      const sub = service.currentConfig$.subscribe(config => {
        emittedConfig = config;
      });

      await service.setLanguage(Language.EN);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(emittedConfig?.code).toBe(Language.EN);
      sub.unsubscribe();
    });
  });
});
