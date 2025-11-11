import { InjectionToken } from '@angular/core';

/**
 * Application configuration interface for branding and localization
 */
export interface AppConfig {
  /** Full product name (e.g., 'Diabetactic') */
  productName: string;

  /** Short brand name for compact displays */
  brandShort: string;

  /** Legal entity name for copyright notices */
  legalEntity: string;

  /** Support email address */
  supportEmail: string;

  /** Primary brand color (hex) */
  primaryColor: string;

  /** Logo path */
  logoPath: string;

  /** Default locale (es or en) */
  defaultLocale: 'es' | 'en';

  /** Available locales */
  availableLocales: string[];
}

/**
 * Injection token for application configuration
 */
export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');

/**
 * Default application configuration
 */
export const defaultAppConfig: AppConfig = {
  productName: 'Diabetactic',
  brandShort: 'Diabetactic',
  legalEntity: 'Diabetactic Health Inc.',
  supportEmail: 'soporte@diabetactic.com',
  primaryColor: '#3880ff',
  logoPath: 'assets/img/logo.svg',
  defaultLocale: 'es',
  availableLocales: ['es', 'en'],
};
