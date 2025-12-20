import { inject, Injectable } from '@angular/core';
import { fakerES as faker } from '@faker-js/faker';
import { DemoDataService } from '@services/demo-data.service';
import { LoggerService } from '@services/logger.service';
import { MockAdapterConfig } from '@core/config/mock-adapter-config';
import { LocalGlucoseReading, GlucoseStatistics } from '@models/glucose-reading.model';
import { UserProfile, AccountState } from '@models/user-profile.model';
import { PaginatedReadings } from '@services/readings.service';
import { environment } from '@env/environment';

/**
 * Mock Adapter Service
 *
 * Provides a reversible toggle between real and mock backend services.
 * This layer allows easy switching between production APIs and demo data
 * for testing, development, and offline scenarios.
 *
 * REVERSION INSTRUCTIONS:
 * To remove this adapter and restore original behavior:
 * 1. Delete this file: src/app/core/services/mock-adapter.service.ts
 * 2. Delete config: src/app/core/config/mock-adapter-config.ts
 * 3. Remove any service imports of MockAdapterService
 * 4. Restore original service implementations
 */
@Injectable({
  providedIn: 'root',
})
/**
 * Mock Adapter Service
 *
 * Provides a reversible toggle between real and mock backend services.
 * This layer allows easy switching between production APIs and demo data
 * for testing, development, and offline scenarios.
 *
 * Pattern: Adapter / Interceptor
 * Behavior:
 * - Intercepts calls from ApiGatewayService when mock mode is enabled.
 * - Simulates network latency via `delay()`.
 * - Persists state in `localStorage` to simulate a persistent database across reloads.
 * - Generates initial seed data using `DemoDataService` (Faker).
 *
 * REVERSION INSTRUCTIONS:
 * To remove this adapter and restore original behavior:
 * 1. Delete this file: src/app/core/services/mock-adapter.service.ts
 * 2. Delete config: src/app/core/config/mock-adapter-config.ts
 * 3. Remove any service imports of MockAdapterService
 * 4. Restore original service implementations
 */
export class MockAdapterService {
  private readonly STORAGE_KEY = 'diabetactic_use_mock_backend';
  private readonly READINGS_STORAGE_KEY = 'diabetactic_mock_readings';
  private readonly APPOINTMENTS_STORAGE_KEY = 'diabetactic_mock_appointments';
  private readonly PROFILE_STORAGE_KEY = 'diabetactic_mock_profile';
  private readonly NETWORK_DELAY = 300; // Simulate 300ms network delay

  private config: MockAdapterConfig;
  private logger = inject(LoggerService);

  /** Helper seguro para acceder a localStorage en entornos de prueba */
  private get storage(): Storage | null {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  }

  constructor(private demoDataService: DemoDataService) {
    // Faker locale configured via import

    // Load configuration from localStorage or use defaults
    // In TEST mode, enable mocks by default
    this.config = this.loadConfig();

    // Auto-enable mocks in TEST or explicit mock backend mode
    if (
      ((environment as { TEST?: boolean }).TEST ||
        (environment as { backendMode?: string }).backendMode === 'mock') &&
      !this.config.enabled
    ) {
      this.config.enabled = true;
      this.saveConfig();
    }

    // Initialize demo data if not present
    this.initializeMockData();
  }

  /**
   * Initialize mock data in localStorage if not present.
   * Generates random readings, appointments, and a user profile using Faker.
   */
  private async initializeMockData(): Promise<void> {
    // Cache storage reference to avoid getter being called multiple times during async operations
    const localStorage = this.storage;
    if (!localStorage) return;

    if (!localStorage.getItem(this.READINGS_STORAGE_KEY)) {
      const readings = await this.demoDataService.generateGlucoseReadings(30);
      localStorage.setItem(this.READINGS_STORAGE_KEY, JSON.stringify(readings));
    }

    if (!localStorage.getItem(this.APPOINTMENTS_STORAGE_KEY)) {
      const appointments = await this.demoDataService.generateAppointments(5);
      localStorage.setItem(this.APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
    }

    if (!localStorage.getItem(this.PROFILE_STORAGE_KEY)) {
      const profile = this.demoDataService.generateUserProfile();
      localStorage.setItem(this.PROFILE_STORAGE_KEY, JSON.stringify(profile));
    }
  }

  /**
   * Simulate network delay for mock operations.
   * @param value - The value to resolve after the delay.
   * @returns Promise resolving to the value.
   */
  private delay<T>(value: T): Promise<T> {
    return new Promise(resolve => setTimeout(() => resolve(value), this.NETWORK_DELAY));
  }

  /**
   * Enable or disable mock backend globally.
   * Persists the preference.
   * @param enabled - True to enable mocks.
   */
  useMockBackend(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  /**
   * Check if mock backend is currently enabled globally.
   */
  isMockEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable/disable mock for a specific service family.
   * @param service - Service identifier ('appointments' | 'glucoserver' | 'auth').
   * @param enabled - True to enable.
   */
  setServiceMockEnabled(service: 'appointments' | 'glucoserver' | 'auth', enabled: boolean): void {
    this.config.services[service] = enabled;
    this.saveConfig();
  }

  /**
   * Check if mock is enabled for a specific service.
   * Returns true only if BOTH global mocks are enabled AND the specific service is enabled.
   */
  isServiceMockEnabled(service: 'appointments' | 'glucoserver' | 'auth'): boolean {
    return this.config.enabled && this.config.services[service];
  }

  /**
   * Get current configuration object.
   */
  getConfig(): MockAdapterConfig {
    return { ...this.config };
  }

  /**
   * Reset to default configuration based on environment.
   */
  resetConfig(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig();
  }

  // ==================== MOCK IMPLEMENTATIONS ====================

  /**
   * Mock: Get all glucose readings (paginated).
   * Reads from localStorage, sorts by date descending, and applies pagination.
   *
   * @param offset - Pagination offset.
   * @param limit - Max items to return.
   * @returns Promise<PaginatedReadings>
   */
  async mockGetAllReadings(offset = 0, limit = 100): Promise<PaginatedReadings> {
    const stored = this.storage?.getItem(this.READINGS_STORAGE_KEY);
    const allReadings: LocalGlucoseReading[] = stored ? JSON.parse(stored) : [];
    const paginatedReadings = allReadings
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(offset, offset + limit);

    return this.delay({
      readings: paginatedReadings,
      total: allReadings.length,
      offset,
      limit,
      hasMore: offset + limit < allReadings.length,
    });
  }

  /**
   * Mock: Add a glucose reading.
   * Generates a local ID, marks as unsynced, saves to localStorage.
   *
   * @param reading - Reading data without ID.
   * @returns Promise<LocalGlucoseReading> - The created reading with ID.
   */
  async mockAddReading(reading: Omit<LocalGlucoseReading, 'id'>): Promise<LocalGlucoseReading> {
    const stored = this.storage?.getItem(this.READINGS_STORAGE_KEY);
    const allReadings: LocalGlucoseReading[] = stored ? JSON.parse(stored) : [];

    const newReading: LocalGlucoseReading = {
      ...reading,
      id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      synced: false,
      isLocalOnly: true,
      localStoredAt: new Date().toISOString(),
    } as LocalGlucoseReading;

    allReadings.push(newReading);
    this.storage?.setItem(this.READINGS_STORAGE_KEY, JSON.stringify(allReadings));

    return this.delay(newReading);
  }

  /**
   * Mock: Update a glucose reading.
   * Finds reading by ID in localStorage and updates it.
   */
  async mockUpdateReading(
    id: string,
    updates: Partial<LocalGlucoseReading>
  ): Promise<LocalGlucoseReading> {
    const stored = this.storage?.getItem(this.READINGS_STORAGE_KEY);
    const allReadings: LocalGlucoseReading[] = stored ? JSON.parse(stored) : [];

    const index = allReadings.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Reading not found: ${id}`);
    }

    allReadings[index] = { ...allReadings[index], ...updates };
    this.storage?.setItem(this.READINGS_STORAGE_KEY, JSON.stringify(allReadings));

    return this.delay(allReadings[index]);
  }

  /**
   * Mock: Delete a glucose reading.
   * Removes reading from localStorage.
   */
  async mockDeleteReading(id: string): Promise<void> {
    const stored = this.storage?.getItem(this.READINGS_STORAGE_KEY);
    const allReadings: LocalGlucoseReading[] = stored ? JSON.parse(stored) : [];

    const filtered = allReadings.filter(r => r.id !== id);
    this.storage?.setItem(this.READINGS_STORAGE_KEY, JSON.stringify(filtered));

    return this.delay(undefined);
  }

  /**
   * Mock: Get reading by ID.
   */
  async mockGetReadingById(id: string): Promise<LocalGlucoseReading> {
    const stored = this.storage?.getItem(this.READINGS_STORAGE_KEY);
    const allReadings: LocalGlucoseReading[] = stored ? JSON.parse(stored) : [];

    const reading = allReadings.find(r => r.id === id);
    if (!reading) {
      throw new Error(`Reading not found: ${id}`);
    }

    return this.delay(reading);
  }

  /**
   * Mock: Sync readings to server.
   * Simulates a sync process by marking all unsynced items in localStorage as synced.
   * Adds artificial delay.
   */
  async mockSyncReadings(): Promise<{ synced: number; failed: number }> {
    const stored = this.storage?.getItem(this.READINGS_STORAGE_KEY);
    const allReadings: LocalGlucoseReading[] = stored ? JSON.parse(stored) : [];

    // Mark all unsynced readings as synced
    let syncedCount = 0;
    const updated = allReadings.map(r => {
      if (!r.synced) {
        syncedCount++;
        return { ...r, synced: true, isLocalOnly: false };
      }
      return r;
    });

    this.storage?.setItem(this.READINGS_STORAGE_KEY, JSON.stringify(updated));

    // Simulate longer sync delay
    return new Promise(resolve =>
      setTimeout(
        () =>
          resolve({
            synced: syncedCount,
            failed: 0,
          }),
        800
      )
    );
  }

  /**
   * Mock: Authenticate user.
   * Validates against hardcoded demo credentials.
   * Returns a mock JWT token and user profile.
   */
  async mockLogin(
    emailOrDni: string,
    password: string
  ): Promise<{ token: string; user: UserProfile }> {
    // Demo account credentials: demo@diabetactic.com / demo123 OR 1000 / demo123
    const validCredentials =
      (emailOrDni === 'demo@diabetactic.com' || emailOrDni === '1000') && password === 'demo123';

    if (validCredentials) {
      const stored = this.storage?.getItem(this.PROFILE_STORAGE_KEY);
      const profile: UserProfile = stored
        ? JSON.parse(stored)
        : this.demoDataService.generateUserProfile();

      const token = `mock_token_${Date.now()}`;
      this.storage?.setItem('diabetactic_mock_token', token);

      return this.delay({
        token,
        user: profile,
      });
    }

    // Simulate delay before error
    await this.delay(null);
    throw new Error('Invalid credentials');
  }

  /**
   * Mock: Register user.
   * Creates a new profile in localStorage with default preferences.
   */
  async mockRegister(userData: {
    dni: string;
    password: string;
    name: string;
    email: string;
  }): Promise<{ token: string; user: UserProfile }> {
    const profile: UserProfile = {
      id: Date.now().toString(),
      name: userData.name,
      age: 25,
      accountState: 'active' as AccountState,
      diabetesType: 'type1',
      diagnosisDate: new Date().toISOString().split('T')[0],
      tidepoolConnection: {
        connected: false,
      },
      preferences: {
        glucoseUnit: 'mg/dL',
        colorPalette: 'default',
        themeMode: 'auto',
        highContrastMode: false,
        targetRange: {
          min: 70,
          max: 180,
          unit: 'mg/dL',
          label: 'Default',
        },
        notificationsEnabled: true,
        soundEnabled: true,
        showTrendArrows: true,
        autoSync: true,
        syncInterval: 15,
        language: 'en',
        dateFormat: '12h' as '12h' | '24h',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      token: `mock_token_${Date.now()}`,
      user: profile,
    };
  }

  /**
   * Mock: Logout user.
   * Removes mock token.
   */
  async mockLogout(): Promise<void> {
    this.storage?.removeItem('diabetactic_mock_token');
    return this.delay(undefined);
  }

  /**
   * Mock: Get current user profile.
   * Uses stored profile or generates a new one via Faker if missing.
   */
  async mockGetProfile(): Promise<UserProfile> {
    const stored = this.storage?.getItem(this.PROFILE_STORAGE_KEY);
    if (stored) {
      return this.delay(JSON.parse(stored));
    }

    // Generate realistic profile with faker
    const profile: UserProfile = {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      age: faker.number.int({ min: 18, max: 80 }),
      accountState: 'active' as AccountState,
      dateOfBirth: faker.date
        .birthdate({ min: 18, max: 80, mode: 'age' })
        .toISOString()
        .split('T')[0],
      diabetesType: faker.helpers.arrayElement(['type1', 'type2'] as const),
      diagnosisDate: faker.date.past({ years: 10 }).toISOString().split('T')[0],
      tidepoolConnection: {
        connected: false,
      },
      preferences: {
        glucoseUnit: 'mg/dL',
        colorPalette: 'default',
        themeMode: 'light', // Default to light
        highContrastMode: false,
        targetRange: {
          min: 70,
          max: 180,
          unit: 'mg/dL',
          label: 'Default',
        },
        notificationsEnabled: true,
        soundEnabled: true,
        showTrendArrows: true,
        autoSync: false,
        syncInterval: 15,
        language: 'es',
        dateFormat: '24h',
      },
      createdAt: faker.date.past({ years: 2 }).toISOString(),
      updatedAt: new Date().toISOString(),
      healthcareProvider: {
        name: `Dr. ${faker.person.fullName()}`,
        phone: faker.phone.number(),
        email: faker.internet.email(),
      },
      emergencyContact: {
        name: faker.person.fullName(),
        relationship: faker.helpers.arrayElement([
          'Esposo/a',
          'Hijo/a',
          'Padre/Madre',
          'Hermano/a',
        ]),
        phone: faker.phone.number(),
      },
      hasCompletedOnboarding: true,
    } as UserProfile;

    this.storage?.setItem(this.PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return this.delay(profile);
  }

  /**
   * Mock: Update user profile.
   * Merges updates into stored profile.
   */
  async mockUpdateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const stored = this.storage?.getItem(this.PROFILE_STORAGE_KEY);
    const existing: UserProfile = stored
      ? JSON.parse(stored)
      : this.demoDataService.generateUserProfile();

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.storage?.setItem(this.PROFILE_STORAGE_KEY, JSON.stringify(updated));

    return this.delay(updated);
  }

  /**
   * Mock: Verify token.
   * Simply checks for 'mock_token_' prefix.
   */
  async mockVerifyToken(token: string): Promise<boolean> {
    // In mock mode, always accept tokens starting with 'mock_token_'
    return token.startsWith('mock_token_');
  }

  /**
   * Mock: Refresh auth token.
   * Issues a new token if old one is valid.
   */
  async mockRefreshToken(oldToken: string): Promise<string> {
    if (await this.mockVerifyToken(oldToken)) {
      const newToken = `mock_token_${Date.now()}`;
      this.storage?.setItem('diabetactic_mock_token', newToken);
      return this.delay(newToken);
    }
    throw new Error('Invalid token');
  }

  /**
   * Mock: Get glucose statistics.
   * Calculates simple stats (average, in-range) from local storage readings.
   * @param days - Lookback window in days.
   */
  async mockGetStatistics(days: number = 30): Promise<GlucoseStatistics> {
    const stored = this.storage?.getItem(this.READINGS_STORAGE_KEY);
    const allReadings: LocalGlucoseReading[] = stored ? JSON.parse(stored) : [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentReadings = allReadings.filter(r => new Date(r.time) >= cutoffDate);

    if (recentReadings.length === 0) {
      return this.delay({
        average: 0,
        median: 0,
        standardDeviation: 0,
        coefficientOfVariation: 0,
        timeInRange: 0,
        timeAboveRange: 0,
        timeBelowRange: 0,
        totalReadings: 0,
      });
    }

    const values = recentReadings.map(r => r.value);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = Math.round(sum / values.length);

    // Calculate median
    const sortedValues = [...values].sort((a, b) => a - b);
    const median =
      sortedValues.length % 2 === 0
        ? Math.round(
            (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
          )
        : sortedValues[Math.floor(sortedValues.length / 2)];

    // Calculate standard deviation
    const squaredDiffs = values.map(v => Math.pow(v - average, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const standardDeviation = Math.round(Math.sqrt(avgSquaredDiff));

    // Coefficient of variation
    const coefficientOfVariation =
      average > 0 ? Math.round((standardDeviation / average) * 100) : 0;

    const inRange = recentReadings.filter(r => r.value >= 70 && r.value <= 180).length;
    const above = recentReadings.filter(r => r.value > 180).length;
    const below = recentReadings.filter(r => r.value < 70).length;

    return this.delay({
      average,
      median,
      standardDeviation,
      coefficientOfVariation,
      timeInRange: Math.round((inRange / recentReadings.length) * 100),
      timeAboveRange: Math.round((above / recentReadings.length) * 100),
      timeBelowRange: Math.round((below / recentReadings.length) * 100),
      totalReadings: recentReadings.length,
    });
  }

  // ==================== ACHIEVEMENTS MOCK METHODS ====================

  /**
   * Mock: Get streak data for gamification
   * Returns simulated streak data based on stored readings
   */
  async mockGetStreakData(): Promise<{
    streak: number;
    max_streak: number;
    four_times_today: number;
    streak_last_date: string;
  }> {
    await this.delay(undefined);

    // Calculate streak from readings
    const stored = this.storage?.getItem(this.READINGS_STORAGE_KEY);
    const allReadings: LocalGlucoseReading[] = stored ? JSON.parse(stored) : [];

    // Simple streak calculation based on readings per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count readings today (for four_times_today)
    const todayReadings = allReadings.filter(r => {
      const readingDate = new Date(r.time);
      readingDate.setHours(0, 0, 0, 0);
      return readingDate.getTime() === today.getTime();
    });

    // Simulate streak calculation (in real backend this is more sophisticated)
    const mockStreak = Math.min(todayReadings.length > 0 ? 7 : 0, 30);
    const mockMaxStreak = Math.max(mockStreak, 14);

    return {
      streak: mockStreak,
      max_streak: mockMaxStreak,
      four_times_today: Math.min(todayReadings.length, 3), // 0-3 range
      streak_last_date: today.toISOString().split('T')[0],
    };
  }

  /**
   * Mock: Get achievements list
   * Returns sample achievements for testing
   */
  async mockGetAchievements(): Promise<
    Array<{
      ach_id: number;
      name: string;
      attribute: string;
      got: boolean;
      progress: number;
      threshold: number;
    }>
  > {
    await this.delay(undefined);

    // Get reading count for progress calculation
    const stored = this.storage?.getItem(this.READINGS_STORAGE_KEY);
    const allReadings: LocalGlucoseReading[] = stored ? JSON.parse(stored) : [];
    const totalReadings = allReadings.length;

    return [
      {
        ach_id: 1,
        name: 'Primera Lectura',
        attribute: 'times_measured',
        got: totalReadings >= 1,
        progress: Math.min(totalReadings, 1),
        threshold: 1,
      },
      {
        ach_id: 2,
        name: '10 Lecturas',
        attribute: 'times_measured',
        got: totalReadings >= 10,
        progress: Math.min(totalReadings, 10),
        threshold: 10,
      },
      {
        ach_id: 3,
        name: '50 Lecturas',
        attribute: 'times_measured',
        got: totalReadings >= 50,
        progress: Math.min(totalReadings, 50),
        threshold: 50,
      },
      {
        ach_id: 4,
        name: '100 Lecturas',
        attribute: 'times_measured',
        got: totalReadings >= 100,
        progress: Math.min(totalReadings, 100),
        threshold: 100,
      },
      {
        ach_id: 5,
        name: 'Racha de 7 días',
        attribute: 'max_streak',
        got: false, // Would need real streak tracking
        progress: 3,
        threshold: 7,
      },
      {
        ach_id: 6,
        name: 'Racha de 30 días',
        attribute: 'max_streak',
        got: false,
        progress: 3,
        threshold: 30,
      },
    ];
  }

  /**
   * Clear all mock data (useful for testing/reset).
   * Removes all app-specific keys from localStorage.
   */
  clearAllMockData(): void {
    this.storage?.removeItem(this.READINGS_STORAGE_KEY);
    this.storage?.removeItem(this.APPOINTMENTS_STORAGE_KEY);
    this.storage?.removeItem(this.PROFILE_STORAGE_KEY);
    this.storage?.removeItem('diabetactic_mock_token');
    this.storage?.removeItem('demoMode');
    this.logger.info('MockAdapter', 'All mock data cleared');
  }

  // ==================== PRIVATE METHODS ====================

  private loadConfig(): MockAdapterConfig {
    let config: MockAdapterConfig | null = null;

    try {
      const stored = this.storage?.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        config = this.validateConfig(parsed);
      }
    } catch (error) {
      this.logger.warn('MockAdapter', 'Failed to load mock adapter config', error);
    }

    // Fall back to environment-aware defaults when no stored config
    if (!config) {
      config = this.getDefaultConfig();
    }

    // When talking to real backends (local Docker, cloud/Heroku, or production),
    // force mocks off so the app uses real services.
    const backendMode = (environment as { backendMode?: string }).backendMode;
    const isProd = Boolean((environment as { production?: boolean }).production);

    if (isProd || backendMode === 'local' || backendMode === 'cloud') {
      config.enabled = false;
      config.services.appointments = false;
      config.services.glucoserver = false;
      config.services.auth = false;
    }

    return config;
  }

  private saveConfig(): void {
    try {
      this.storage?.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      this.logger.error('MockAdapter', 'Failed to save mock adapter config', error);
    }
  }

  private getDefaultConfig(): MockAdapterConfig {
    const backendMode = (environment as { backendMode?: string }).backendMode;
    const isProd = Boolean((environment as { production?: boolean }).production);

    // For production, cloud/Heroku, and local Docker environments we default to REAL backends.
    if (isProd || backendMode === 'local' || backendMode === 'cloud') {
      return {
        enabled: false,
        services: {
          appointments: false,
          glucoserver: false,
          auth: false,
        },
      };
    }

    // For explicit mock dev environments only, keep mocks enabled by default.
    return {
      enabled: true,
      services: {
        appointments: true,
        glucoserver: true,
        auth: true,
      },
    };
  }

  private validateConfig(config: unknown): MockAdapterConfig {
    const defaultConfig = this.getDefaultConfig();

    if (typeof config !== 'object' || config === null) {
      return defaultConfig;
    }

    const partial = config as Partial<MockAdapterConfig>;

    return {
      enabled: typeof partial.enabled === 'boolean' ? partial.enabled : defaultConfig.enabled,
      services: {
        appointments:
          typeof partial.services?.appointments === 'boolean'
            ? partial.services.appointments
            : defaultConfig.services.appointments,
        glucoserver:
          typeof partial.services?.glucoserver === 'boolean'
            ? partial.services.glucoserver
            : defaultConfig.services.glucoserver,
        auth:
          typeof partial.services?.auth === 'boolean'
            ? partial.services.auth
            : defaultConfig.services.auth,
      },
    };
  }
}
