/**
 * Unit tests for application configuration
 * Tests config interface, injection token, and default values
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { APP_CONFIG, AppConfig, defaultAppConfig } from './app-config';

describe('AppConfig', () => {
  describe('defaultAppConfig constant', () => {
    it('should have valid product name', () => {
      expect(defaultAppConfig.productName).toBe('Diabetactic');
    });

    it('should have valid brand short name', () => {
      expect(defaultAppConfig.brandShort).toBe('Diabetactic');
    });

    it('should have valid legal entity', () => {
      expect(defaultAppConfig.legalEntity).toBe('Diabetactic Health Inc.');
    });

    it('should have valid support email', () => {
      expect(defaultAppConfig.supportEmail).toBe('soporte@diabetactic.com');
      expect(defaultAppConfig.supportEmail).toContain('@');
    });

    it('should have valid primary color', () => {
      expect(defaultAppConfig.primaryColor).toBe('#3880ff');
      expect(defaultAppConfig.primaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should have valid logo path', () => {
      expect(defaultAppConfig.logoPath).toBe('assets/img/logo.svg');
      expect(defaultAppConfig.logoPath).toContain('assets/');
    });

    it('should have Spanish as default locale', () => {
      expect(defaultAppConfig.defaultLocale).toBe('es');
    });

    it('should have valid available locales', () => {
      expect(defaultAppConfig.availableLocales).toEqual(['es', 'en']);
      expect(defaultAppConfig.availableLocales.length).toBeGreaterThan(0);
    });

    it('should include default locale in available locales', () => {
      expect(defaultAppConfig.availableLocales).toContain(defaultAppConfig.defaultLocale);
    });
  });

  describe('AppConfig interface', () => {
    it('should accept valid config', () => {
      const config: AppConfig = {
        productName: 'Test Product',
        brandShort: 'Test',
        legalEntity: 'Test Corp',
        supportEmail: 'support@test.com',
        primaryColor: '#000000',
        logoPath: 'assets/logo.png',
        defaultLocale: 'en',
        availableLocales: ['en', 'es'],
      };
      expect(config.productName).toBe('Test Product');
      expect(config.defaultLocale).toBe('en');
    });

    it('should accept Spanish locale', () => {
      const config: AppConfig = {
        productName: 'Test',
        brandShort: 'Test',
        legalEntity: 'Test Corp',
        supportEmail: 'support@test.com',
        primaryColor: '#000000',
        logoPath: 'assets/logo.png',
        defaultLocale: 'es',
        availableLocales: ['es'],
      };
      expect(config.defaultLocale).toBe('es');
    });

    it('should accept multiple available locales', () => {
      const config: AppConfig = {
        productName: 'Test',
        brandShort: 'Test',
        legalEntity: 'Test Corp',
        supportEmail: 'support@test.com',
        primaryColor: '#000000',
        logoPath: 'assets/logo.png',
        defaultLocale: 'en',
        availableLocales: ['en', 'es', 'fr', 'de'],
      };
      expect(config.availableLocales.length).toBe(4);
    });
  });

  describe('APP_CONFIG injection token', () => {
    it('should be defined', () => {
      expect(APP_CONFIG).toBeDefined();
    });

    it('should have correct description', () => {
      expect(APP_CONFIG.toString()).toContain('app.config');
    });
  });

  describe('Configuration validity', () => {
    it('should have all required fields', () => {
      const requiredFields: (keyof AppConfig)[] = [
        'productName',
        'brandShort',
        'legalEntity',
        'supportEmail',
        'primaryColor',
        'logoPath',
        'defaultLocale',
        'availableLocales',
      ];
      requiredFields.forEach(field => {
        expect(defaultAppConfig[field]).toBeDefined();
      });
    });

    it('should have non-empty string values', () => {
      expect(defaultAppConfig.productName).toBeTruthy();
      expect(defaultAppConfig.brandShort).toBeTruthy();
      expect(defaultAppConfig.legalEntity).toBeTruthy();
      expect(defaultAppConfig.supportEmail).toBeTruthy();
    });

    it('should have valid color format', () => {
      const hexColorRegex = /^#[0-9a-f]{6}$/i;
      expect(defaultAppConfig.primaryColor).toMatch(hexColorRegex);
    });

    it('should have valid email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(defaultAppConfig.supportEmail).toMatch(emailRegex);
    });

    it('should have valid logo path format', () => {
      expect(defaultAppConfig.logoPath).toMatch(/^assets\//);
      expect(defaultAppConfig.logoPath).toMatch(/\.(svg|png|jpg|jpeg)$/i);
    });

    it('should have valid locale values', () => {
      const validLocales = ['es', 'en'];
      expect(validLocales).toContain(defaultAppConfig.defaultLocale);
      defaultAppConfig.availableLocales.forEach(locale => {
        expect(typeof locale).toBe('string');
        expect(locale.length).toBeGreaterThan(0);
      });
    });
  });
});
