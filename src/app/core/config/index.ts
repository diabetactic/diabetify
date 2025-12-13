/**
 * Barrel export for core configuration
 * Centralizes config exports for cleaner imports throughout the app
 *
 * Usage:
 * import { APP_CONFIG, defaultAppConfig } from '@app/core/config';
 * import { EnvironmentConfigService } from '@app/core/config';
 */

// Application configuration (branding, localization)
export * from './app-config';

// Environment configuration (backend mode, feature flags, API URLs)
export * from './environment-config.service';

// OAuth configuration
export * from './oauth.config';
