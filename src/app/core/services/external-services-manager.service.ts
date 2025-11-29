/**
 * External Services Manager
 *
 * Centralized manager for all external service integrations.
 * Provides unified interface, health checks, circuit breaker pattern,
 * and coordinated error handling across all external services.
 */

import { Injectable, Injector, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  timer,
  of,
  combineLatest,
  throwError,
  firstValueFrom,
} from 'rxjs';
import { map, switchMap, catchError, timeout, retry, tap, filter } from 'rxjs/operators';
import { Network } from '@capacitor/network';

import { environment } from '../../../environments/environment';

/**
 * External service types
 */
export enum ExternalService {
  TIDEPOOL = 'TIDEPOOL',
  GLUCOSERVER = 'GLUCOSERVER',
  APPOINTMENTS = 'APPOINTMENTS',
  LOCAL_AUTH = 'LOCAL_AUTH',
}

/**
 * Service health status
 */
export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  CHECKING = 'CHECKING',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Service health check result
 */
export interface ServiceHealthCheck {
  service: ExternalService;
  status: HealthStatus;
  responseTime?: number;
  lastChecked: Date;
  message?: string;
  details?: any;
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  service: ExternalService;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  name: string;
  baseUrl: string;
  healthEndpoint?: string;
  timeout: number;
  retryAttempts: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  cacheDuration?: number;
  offlineSupport: boolean;
}

/**
 * External services state
 */
export interface ExternalServicesState {
  isOnline: boolean;
  services: Map<ExternalService, ServiceHealthCheck>;
  circuitBreakers: Map<ExternalService, CircuitBreakerState>;
  lastFullCheck?: Date;
  overallHealth: HealthStatus;
}

@Injectable({
  providedIn: 'root',
})
export class ExternalServicesManager implements OnDestroy {
  private readonly SERVICE_CONFIGS: Map<ExternalService, ServiceConfig> =
    this.buildServiceConfigs();

  private state$ = new BehaviorSubject<ExternalServicesState>({
    isOnline: true,
    services: new Map(),
    circuitBreakers: new Map(),
    overallHealth: HealthStatus.UNKNOWN,
  });

  public readonly state: Observable<ExternalServicesState> = this.state$.asObservable();

  private healthCheckInterval?: any;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly QUICK_CHECK_INTERVAL = 10000; // 10 seconds for degraded services

  // Service response cache
  private responseCache = new Map<string, { data: any; timestamp: number }>();

  constructor(
    private http: HttpClient,
    private injector: Injector
  ) {
    this.initialize();
  }

  /**
   * Initialize the service manager
   */
  private async initialize(): Promise<void> {
    // Set up network monitoring
    await this.setupNetworkMonitoring();

    // Initialize circuit breakers
    this.initializeCircuitBreakers();

    // DISABLED: Health checks cause 404 errors for /api/health endpoint
    // Services are monitored via actual API calls instead
    // await this.performHealthCheck();
    // this.startHealthCheckInterval();

    // Set up service-specific monitoring
    this.setupServiceMonitoring();
  }

  /**
   * Set up network connectivity monitoring
   */
  private async setupNetworkMonitoring(): Promise<void> {
    // Get initial network status
    const status = await Network.getStatus();
    this.updateState({ isOnline: status.connected });

    // Listen for network changes
    Network.addListener('networkStatusChange', status => {
      this.updateState({ isOnline: status.connected });

      if (status.connected) {
        // Network restored, check all services
        this.performHealthCheck();
      } else {
        // Network lost, mark all services as unhealthy
        this.markAllServicesUnhealthy('Network connection lost');
      }
    });
  }

  /**
   * Initialize circuit breakers for all services
   */
  private initializeCircuitBreakers(): void {
    const circuitBreakers = new Map<ExternalService, CircuitBreakerState>();

    for (const service of Object.values(ExternalService)) {
      circuitBreakers.set(service as ExternalService, {
        service: service as ExternalService,
        state: 'CLOSED',
        failureCount: 0,
      });
    }

    this.updateState({ circuitBreakers });
  }

  /**
   * Set up service-specific monitoring
   * Note: Direct service monitoring removed to prevent circular dependencies.
   * Services should report their own errors via the recordServiceError method
   * or use a shared event bus pattern.
   */
  private setupServiceMonitoring(): void {
    // Monitoring removed to prevent circular dependencies
    // Services will report errors through the public API methods
    console.debug(
      'ExternalServicesManager: Service monitoring disabled to prevent circular dependencies'
    );
  }

  /**
   * Perform health check for all services
   */
  public async performHealthCheck(): Promise<Map<ExternalService, ServiceHealthCheck>> {
    const healthChecks = new Map<ExternalService, ServiceHealthCheck>();

    // Check each service in parallel
    const checks = Array.from(this.SERVICE_CONFIGS.entries()).map(async ([service, config]) => {
      const health = await this.checkServiceHealth(service, config);
      healthChecks.set(service, health);
    });

    await Promise.allSettled(checks);

    // Update state with new health checks
    const overallHealth = this.calculateOverallHealth(healthChecks);
    this.updateState({
      services: healthChecks,
      overallHealth,
      lastFullCheck: new Date(),
    });

    return healthChecks;
  }

  /**
   * Check health of a specific service
   */
  private async checkServiceHealth(
    service: ExternalService,
    config: ServiceConfig
  ): Promise<ServiceHealthCheck> {
    const startTime = Date.now();

    try {
      // Check circuit breaker state
      const circuitBreaker = this.state$.value.circuitBreakers.get(service);
      if (circuitBreaker?.state === 'OPEN') {
        const now = Date.now();
        if (circuitBreaker.nextAttemptTime && now < circuitBreaker.nextAttemptTime.getTime()) {
          return {
            service,
            status: HealthStatus.UNHEALTHY,
            lastChecked: new Date(),
            message: 'Circuit breaker open',
          };
        }
        // Try half-open state
        this.updateCircuitBreaker(service, { state: 'HALF_OPEN' });
      }

      // Perform actual health check
      if (config.healthEndpoint) {
        await firstValueFrom(
          this.http.get(`${config.baseUrl}${config.healthEndpoint}`).pipe(timeout(5000), retry(1))
        );
      } else {
        // If no health endpoint, try a simple HEAD request
        await firstValueFrom(this.http.head(config.baseUrl).pipe(timeout(5000), retry(1)));
      }

      const responseTime = Date.now() - startTime;

      // Reset circuit breaker on success
      this.updateCircuitBreaker(service, {
        state: 'CLOSED',
        failureCount: 0,
      });

      return {
        service,
        status: HealthStatus.HEALTHY,
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Update circuit breaker
      this.handleCircuitBreakerFailure(service);

      return {
        service,
        status: HealthStatus.UNHEALTHY,
        responseTime,
        lastChecked: new Date(),
        message: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  /**
   * Handle circuit breaker failure
   */
  private handleCircuitBreakerFailure(service: ExternalService): void {
    const circuitBreaker = this.state$.value.circuitBreakers.get(service);
    const config = this.SERVICE_CONFIGS.get(service);

    if (!circuitBreaker || !config) return;

    const newFailureCount = circuitBreaker.failureCount + 1;

    if (newFailureCount >= config.circuitBreakerThreshold) {
      // Open circuit breaker
      this.updateCircuitBreaker(service, {
        state: 'OPEN',
        failureCount: newFailureCount,
        lastFailureTime: new Date(),
        nextAttemptTime: new Date(Date.now() + config.circuitBreakerTimeout),
      });
    } else {
      // Increment failure count
      this.updateCircuitBreaker(service, {
        failureCount: newFailureCount,
        lastFailureTime: new Date(),
      });
    }
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(
    service: ExternalService,
    updates: Partial<CircuitBreakerState>
  ): void {
    const circuitBreakers = new Map(this.state$.value.circuitBreakers);
    const current = circuitBreakers.get(service);

    if (current) {
      circuitBreakers.set(service, { ...current, ...updates });
      this.updateState({ circuitBreakers });
    }
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(services: Map<ExternalService, ServiceHealthCheck>): HealthStatus {
    const statuses = Array.from(services.values()).map(s => s.status);

    if (statuses.every(s => s === HealthStatus.HEALTHY)) {
      return HealthStatus.HEALTHY;
    }

    if (statuses.some(s => s === HealthStatus.HEALTHY)) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.UNHEALTHY;
  }

  /**
   * Start periodic health check interval
   */
  private startHealthCheckInterval(): void {
    this.healthCheckInterval = timer(
      this.HEALTH_CHECK_INTERVAL,
      this.HEALTH_CHECK_INTERVAL
    ).subscribe(() => {
      this.performHealthCheck();
    });
  }

  /**
   * Stop health check interval
   */
  private stopHealthCheckInterval(): void {
    if (this.healthCheckInterval) {
      this.healthCheckInterval.unsubscribe();
    }
  }

  /**
   * Mark all services as unhealthy
   */
  private markAllServicesUnhealthy(reason: string): void {
    const services = new Map<ExternalService, ServiceHealthCheck>();

    for (const service of Object.values(ExternalService)) {
      services.set(service as ExternalService, {
        service: service as ExternalService,
        status: HealthStatus.UNHEALTHY,
        lastChecked: new Date(),
        message: reason,
      });
    }

    this.updateState({
      services,
      overallHealth: HealthStatus.UNHEALTHY,
    });
  }

  /**
   * Record service error for monitoring
   */
  private recordServiceError(service: ExternalService, error: string): void {
    console.error(`[${service}] Error:`, error);

    // If the service does not expose a real health endpoint, don't track
    // health status or circuit breaker state. This avoids showing
    // "UNHEALTHY" for backends that don't implement health checks.
    const config = this.SERVICE_CONFIGS.get(service);
    if (!config?.healthEndpoint) {
      return;
    }

    // Update service health status
    const services = new Map(this.state$.value.services);
    const current = services.get(service) || {
      service,
      status: HealthStatus.UNHEALTHY,
      lastChecked: new Date(),
    };

    services.set(service, {
      ...current,
      status: HealthStatus.UNHEALTHY,
      message: error,
      lastChecked: new Date(),
    });

    const overallHealth = this.calculateOverallHealth(services);
    this.updateState({ services, overallHealth });

    // Handle circuit breaker
    this.handleCircuitBreakerFailure(service);
  }

  /**
   * Check if a service is available
   *
   * Service is available if:
   * 1. Online: Either network is online, OR service supports offline mode
   * 2. Circuit breaker is not OPEN
   * 3. Health status is HEALTHY, DEGRADED, or UNKNOWN (no health check performed yet)
   */
  public isServiceAvailable(service: ExternalService): boolean {
    if (!this.state$.value.isOnline) {
      const config = this.SERVICE_CONFIGS.get(service);
      return config?.offlineSupport || false;
    }

    const circuitBreaker = this.state$.value.circuitBreakers.get(service);
    if (circuitBreaker?.state === 'OPEN') {
      return false;
    }

    const health = this.state$.value.services.get(service);
    // Service is available if health check passed OR if no health check has been performed yet
    // This allows services to work when health checks are disabled (to avoid CORS issues)
    return (
      !health ||
      health.status === HealthStatus.HEALTHY ||
      health.status === HealthStatus.DEGRADED ||
      health.status === HealthStatus.UNKNOWN
    );
  }

  /**
   * Execute request with circuit breaker and caching
   */
  public async executeRequest<T>(
    service: ExternalService,
    request: () => Promise<T>,
    options?: {
      cacheKey?: string;
      forceRefresh?: boolean;
      fallback?: () => T;
    }
  ): Promise<T> {
    // Check service availability
    if (!this.isServiceAvailable(service)) {
      if (options?.fallback) {
        return options.fallback();
      }
      throw new Error(`Service ${service} is not available`);
    }

    // Check cache if applicable
    if (options?.cacheKey && !options.forceRefresh) {
      const cached = this.getFromCache(options.cacheKey, service);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      // Execute request
      const result = await request();

      // Cache result if applicable
      if (options?.cacheKey) {
        this.addToCache(options.cacheKey, result, service);
      }

      // Reset circuit breaker on success
      this.updateCircuitBreaker(service, {
        state: 'CLOSED',
        failureCount: 0,
      });

      return result;
    } catch (error) {
      // Record error
      this.recordServiceError(service, error instanceof Error ? error.message : 'Request failed');

      // Try fallback
      if (options?.fallback) {
        return options.fallback();
      }

      throw error;
    }
  }

  /**
   * Get data from cache
   */
  private getFromCache(key: string, service: ExternalService): any | null {
    const cached = this.responseCache.get(`${service}:${key}`);

    if (!cached) {
      return null;
    }

    const config = this.SERVICE_CONFIGS.get(service);
    const cacheDuration = config?.cacheDuration || 0;

    if (cacheDuration === 0) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > cacheDuration) {
      // Cache expired
      this.responseCache.delete(`${service}:${key}`);
      return null;
    }

    return cached.data;
  }

  /**
   * Add data to cache
   */
  private addToCache(key: string, data: any, service: ExternalService): void {
    const config = this.SERVICE_CONFIGS.get(service);
    const cacheDuration = config?.cacheDuration || 0;

    if (cacheDuration === 0) {
      return;
    }

    this.responseCache.set(`${service}:${key}`, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache for a service
   */
  public clearCache(service?: ExternalService): void {
    if (service) {
      // Clear specific service cache
      const keysToDelete: string[] = [];
      for (const key of this.responseCache.keys()) {
        if (key.startsWith(`${service}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.responseCache.delete(key));
    } else {
      // Clear all cache
      this.responseCache.clear();
    }
  }

  /**
   * Get service configuration
   */
  public getServiceConfig(service: ExternalService): ServiceConfig | undefined {
    return this.SERVICE_CONFIGS.get(service);
  }

  /**
   * Get service health
   */
  public getServiceHealth(service: ExternalService): ServiceHealthCheck | undefined {
    return this.state$.value.services.get(service);
  }

  /**
   * Get circuit breaker state
   */
  public getCircuitBreakerState(service: ExternalService): CircuitBreakerState | undefined {
    return this.state$.value.circuitBreakers.get(service);
  }

  /**
   * Manually reset circuit breaker
   */
  public resetCircuitBreaker(service: ExternalService): void {
    this.updateCircuitBreaker(service, {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: undefined,
      nextAttemptTime: undefined,
    });
  }

  /**
   * Force health check for specific service
   */
  public async checkService(service: ExternalService): Promise<ServiceHealthCheck> {
    const config = this.SERVICE_CONFIGS.get(service);
    if (!config) {
      throw new Error(`Unknown service: ${service}`);
    }

    const health = await this.checkServiceHealth(service, config);

    // Update state
    const services = new Map(this.state$.value.services);
    services.set(service, health);
    const overallHealth = this.calculateOverallHealth(services);
    this.updateState({ services, overallHealth });

    return health;
  }

  /**
   * Build service configuration map based on environment settings
   */
  private buildServiceConfigs(): Map<ExternalService, ServiceConfig> {
    const configs = new Map<ExternalService, ServiceConfig>();

    if (environment.features?.useTidepoolIntegration !== false && environment.tidepool?.baseUrl) {
      configs.set(ExternalService.TIDEPOOL, {
        name: 'Tidepool API',
        baseUrl: environment.tidepool.baseUrl,
        healthEndpoint: '/v1/status',
        timeout: environment.tidepool.requestTimeout ?? 30000,
        retryAttempts: environment.tidepool.maxRetries ?? 3,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 60000,
        cacheDuration: 300000, // 5 minutes
        offlineSupport: true,
      });
    }

    const backend = environment.backendServices;
    const gatewayBase = this.resolveServiceBase(
      backend?.apiGateway?.baseUrl,
      backend?.apiGateway?.apiPath
    );

    if (backend?.glucoserver) {
      const glucoserverBase =
        this.resolveServiceBase(backend.glucoserver.baseUrl, backend.glucoserver.apiPath) ||
        gatewayBase;

      if (glucoserverBase) {
        configs.set(ExternalService.GLUCOSERVER, {
          name: 'Glucoserver',
          baseUrl: glucoserverBase,
          timeout: backend.glucoserver.requestTimeout ?? 30000,
          retryAttempts: 2,
          circuitBreakerThreshold: 3,
          circuitBreakerTimeout: 30000,
          cacheDuration: 60000, // 1 minute
          offlineSupport: true,
        });
      }
    }

    if (backend?.appointments) {
      const appointmentsBase =
        this.resolveServiceBase(backend.appointments.baseUrl, backend.appointments.apiPath) ||
        gatewayBase;

      if (appointmentsBase) {
        configs.set(ExternalService.APPOINTMENTS, {
          name: 'Appointments Service',
          baseUrl: appointmentsBase,
          timeout: backend.appointments.requestTimeout ?? 30000,
          retryAttempts: 2,
          circuitBreakerThreshold: 3,
          circuitBreakerTimeout: 30000,
          cacheDuration: 120000, // 2 minutes
          offlineSupport: false,
        });
      }
    }

    if (backend?.auth) {
      const authBase =
        this.resolveServiceBase(backend.auth.baseUrl, backend.auth.apiPath) || gatewayBase;

      if (authBase) {
        configs.set(ExternalService.LOCAL_AUTH, {
          name: 'Authentication Service',
          baseUrl: authBase,
          timeout: backend.auth.requestTimeout ?? 15000,
          retryAttempts: 1,
          circuitBreakerThreshold: 3,
          circuitBreakerTimeout: 30000,
          cacheDuration: 0,
          offlineSupport: false,
        });
      }
    }

    return configs;
  }

  /**
   * Normalize service base URL with optional API path
   */
  private resolveServiceBase(baseUrl?: string, apiPath?: string): string | null {
    if (!baseUrl || baseUrl.trim() === '') {
      return null;
    }

    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    if (!apiPath || apiPath.trim() === '') {
      return normalizedBase;
    }

    const normalizedPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;

    return `${normalizedBase}${normalizedPath}`;
  }

  /**
   * Update service state
   */
  private updateState(partial: Partial<ExternalServicesState>): void {
    this.state$.next({
      ...this.state$.value,
      ...partial,
    });
  }

  /**
   * Cleanup on service destruction
   */
  public ngOnDestroy(): void {
    this.stopHealthCheckInterval();
  }
}
