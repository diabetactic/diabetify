/**
 * Environment Configuration Service
 *
 * Centralizes access to environment configuration throughout the app.
 * Provides an injectable, testable wrapper around the static environment object.
 *
 * Benefits:
 * - Injectable dependency (easier testing, mocking)
 * - Type-safe configuration access
 * - Single source of truth for environment config
 * - APP_INITIALIZER support for future async config loading
 * - Prepares for runtime config (JSON files) in Phase 3
 */

import { Injectable, InjectionToken } from '@angular/core';
import { environment, BackendMode } from '../../../environments/environment';
import { Capacitor } from '@capacitor/core';

/**
 * Configuration for Tidepool integration
 */
export interface TidepoolConfig {
  baseUrl: string;
  authUrl: string;
  dataUrl: string;
  uploadUrl: string;
  clientId: string;
  redirectUri: string;
  scopes: string;
  requestTimeout: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  enableConsole: boolean;
  enableApiLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Backend service endpoint configuration
 */
export interface ServiceEndpointConfig {
  baseUrl: string;
  apiPath: string;
  requestTimeout: number;
}

/**
 * Backend services configuration
 */
export interface BackendServicesConfig {
  apiGateway: ServiceEndpointConfig;
  glucoserver: ServiceEndpointConfig;
  appointments: ServiceEndpointConfig;
  auth: ServiceEndpointConfig;
}

/**
 * Feature flags configuration
 */
export interface FeaturesConfig {
  offlineMode: boolean;
  analyticsEnabled: boolean;
  crashReporting: boolean;
  useLocalBackend: boolean;
  useTidepoolIntegration: boolean;
  useTidepoolMock: boolean;
  devTools: boolean;
  showEnvBadge: boolean;
}

/**
 * Complete environment configuration interface
 */
export interface EnvironmentConfig {
  production: boolean;
  backendMode: BackendMode;
  tidepool: TidepoolConfig;
  logging: LoggingConfig;
  backendServices: BackendServicesConfig;
  features: FeaturesConfig;
}

/**
 * Injection token for environment configuration (for use with @Inject)
 */
export const ENVIRONMENT_CONFIG = new InjectionToken<EnvironmentConfig>('environment.config');

@Injectable({ providedIn: 'root' })
export class EnvironmentConfigService {
  private _initialized = false;

  /**
   * Is the service initialized?
   * Always true after APP_INITIALIZER runs.
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  // ===== Core Configuration =====

  /**
   * Is this a production build?
   */
  get production(): boolean {
    return environment.production;
  }

  /**
   * Current backend mode: 'mock', 'local', or 'cloud'
   */
  get backendMode(): BackendMode {
    return environment.backendMode;
  }

  // ===== Tidepool Configuration =====

  /**
   * Tidepool integration configuration
   */
  get tidepool(): Readonly<TidepoolConfig> {
    return environment.tidepool;
  }

  // ===== Logging Configuration =====

  /**
   * Logging configuration
   */
  get logging(): Readonly<LoggingConfig> {
    return environment.logging;
  }

  // ===== Backend Services =====

  /**
   * Backend services configuration
   */
  get backendServices(): Readonly<BackendServicesConfig> {
    return environment.backendServices;
  }

  /**
   * Get the API Gateway base URL for the current platform
   * Handles Android emulator (10.0.2.2) vs web (/api proxy)
   */
  get apiGatewayBaseUrl(): string {
    return environment.backendServices.apiGateway.baseUrl;
  }

  // ===== Feature Flags =====

  /**
   * Feature flags configuration
   */
  get features(): Readonly<FeaturesConfig> {
    return environment.features;
  }

  /**
   * Is offline mode enabled?
   */
  get offlineModeEnabled(): boolean {
    return environment.features.offlineMode;
  }

  /**
   * Are dev tools enabled?
   */
  get devToolsEnabled(): boolean {
    return environment.features.devTools;
  }

  /**
   * Is running in mock mode?
   */
  get isMockMode(): boolean {
    return environment.backendMode === 'mock';
  }

  /**
   * Is running in local mode?
   */
  get isLocalMode(): boolean {
    return environment.backendMode === 'local';
  }

  /**
   * Is running in cloud mode?
   */
  get isCloudMode(): boolean {
    return environment.backendMode === 'cloud';
  }

  // ===== Platform Detection =====

  /**
   * Is running on a native platform (iOS/Android)?
   */
  get isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Get current platform: 'ios', 'android', or 'web'
   */
  get platform(): 'ios' | 'android' | 'web' {
    return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
  }

  // ===== Initialization =====

  /**
   * Initialize the configuration service.
   * Called by APP_INITIALIZER before app bootstrap.
   *
   * Currently synchronous (reads static environment).
   * Can be extended for async config loading in the future.
   */
  initialize(): Promise<void> {
    // Validate critical configuration
    this.validateConfiguration();

    this._initialized = true;
    return Promise.resolve();
  }

  /**
   * Get the complete environment configuration snapshot
   */
  getFullConfig(): Readonly<EnvironmentConfig> {
    return {
      production: this.production,
      backendMode: this.backendMode,
      tidepool: this.tidepool,
      logging: this.logging,
      backendServices: this.backendServices,
      features: this.features,
    };
  }

  /**
   * Validate configuration on initialization
   */
  private validateConfiguration(): void {
    // Ensure backend mode is valid
    const validModes: BackendMode[] = ['mock', 'local', 'cloud'];
    if (!validModes.includes(this.backendMode)) {
      console.error(`[EnvironmentConfig] Invalid backendMode: ${this.backendMode}. Using 'cloud'.`);
    }

    // Warn if production build with devTools enabled
    if (this.production && this.devToolsEnabled) {
      console.warn('[EnvironmentConfig] devTools enabled in production build');
    }
  }
}

/**
 * APP_INITIALIZER factory function
 * Ensures configuration is loaded before app bootstraps
 */
export function initializeEnvironmentConfig(
  configService: EnvironmentConfigService
): () => Promise<void> {
  return () => configService.initialize();
}
