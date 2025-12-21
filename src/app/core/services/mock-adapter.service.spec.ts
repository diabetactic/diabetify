// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { MockAdapterService } from '@services/mock-adapter.service';
import { DemoDataService } from '@services/demo-data.service';
import { LocalGlucoseReading, UserProfile } from '@core/models';

// Helper to create reading with defaults
const createReading = (overrides: Partial<LocalGlucoseReading> = {}): LocalGlucoseReading =>
  ({
    id: 'test-1',
    type: 'smbg',
    value: 120,
    units: 'mg/dL',
    time: new Date().toISOString(),
    deviceId: 'test',
    synced: true,
    ...overrides,
  }) as LocalGlucoseReading;

describe('MockAdapterService', () => {
  let service: MockAdapterService;
  let demoDataService: Mock<DemoDataService>;

  beforeEach(async () => {
    const demoDataMock = {
      generateGlucoseReadings: vi.fn().mockResolvedValue([]),
      generateAppointments: vi.fn().mockResolvedValue([]),
      generateUserProfile: vi.fn().mockReturnValue({}),
    };

    TestBed.configureTestingModule({
      providers: [MockAdapterService, { provide: DemoDataService, useValue: demoDataMock }],
    });

    demoDataService = TestBed.inject(DemoDataService) as Mock<DemoDataService>;
    service = TestBed.inject(MockAdapterService);

    localStorage.clear();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  describe('Configuration Management', () => {
    it('should initialize with default config structure', () => {
      const config = service.getConfig();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('services');
      expect(config.services).toHaveProperty('appointments');
      expect(config.services).toHaveProperty('glucoserver');
      expect(config.services).toHaveProperty('auth');
    });

    it('should toggle mock backend and persist to localStorage', () => {
      // Enable
      service.useMockBackend(true);
      expect(service.isMockEnabled()).toBe(true);
      const stored = JSON.parse(localStorage.getItem('diabetactic_use_mock_backend') || '{}');
      expect(stored.enabled).toBe(true);

      // Disable
      service.useMockBackend(false);
      expect(service.isMockEnabled()).toBe(false);
    });

    it('should require both global and service-specific to be enabled', () => {
      service.useMockBackend(true);
      service.setServiceMockEnabled('glucoserver', true);
      expect(service.isServiceMockEnabled('glucoserver')).toBe(true);

      service.useMockBackend(false);
      expect(service.isServiceMockEnabled('glucoserver')).toBe(false);

      // Service-specific only works when global enabled
      service.setServiceMockEnabled('appointments', true);
      expect(service.isServiceMockEnabled('appointments')).toBe(false);
    });

    it('should reset to default configuration', () => {
      service.useMockBackend(true);
      service.setServiceMockEnabled('appointments', false);
      service.resetConfig();
      expect(service.getConfig().enabled).toBeDefined();
    });
  });

  // ============================================================================
  // READINGS CRUD
  // ============================================================================

  describe('mockGetAllReadings', () => {
    beforeEach(() => {
      const testReadings = [
        createReading({
          id: '1',
          value: 120,
          time: new Date('2024-12-06T10:00:00Z').toISOString(),
        }),
        createReading({
          id: '2',
          value: 150,
          time: new Date('2024-12-05T10:00:00Z').toISOString(),
        }),
      ];
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify(testReadings));
    });

    it('should return paginated readings sorted by date descending', async () => {
      const result = await service.mockGetAllReadings(0, 10);

      expect(result.total).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.hasMore).toBe(false);

      // Verify sort order
      const firstTime = new Date(result.readings[0].time).getTime();
      const secondTime = new Date(result.readings[1].time).getTime();
      expect(firstTime).toBeGreaterThan(secondTime);
    });

    it('should apply pagination correctly', async () => {
      // Test offset
      let result = await service.mockGetAllReadings(1, 10);
      expect(result.readings.length).toBe(1);
      expect(result.offset).toBe(1);

      // Test limit
      result = await service.mockGetAllReadings(0, 1);
      expect(result.readings.length).toBe(1);
      expect(result.hasMore).toBe(true);
    });

    it('should return empty array when no data', async () => {
      localStorage.removeItem('diabetactic_mock_readings');
      const result = await service.mockGetAllReadings();
      expect(result.readings).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('mockAddReading', () => {
    it('should add reading with unique ID and local metadata', async () => {
      const reading = {
        type: 'smbg',
        value: 135,
        units: 'mg/dL',
        time: new Date().toISOString(),
        deviceId: 'test',
      } as Omit<LocalGlucoseReading, 'id'>;

      const result = await service.mockAddReading(reading);

      expect(result.id).toMatch(/^mock_/);
      expect(result.value).toBe(135);
      expect(result.isLocalOnly).toBe(true);
      expect(result.localStoredAt).toBeDefined();

      // Verify persistence
      const stored = JSON.parse(localStorage.getItem('diabetactic_mock_readings') || '[]');
      expect(stored.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs', async () => {
      const reading = {
        type: 'smbg',
        value: 120,
        units: 'mg/dL',
        time: new Date().toISOString(),
        deviceId: 'test',
      } as Omit<LocalGlucoseReading, 'id'>;

      const result1 = await service.mockAddReading(reading);
      const result2 = await service.mockAddReading(reading);
      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('mockUpdateReading', () => {
    beforeEach(() => {
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify([createReading()]));
    });

    it('should update existing reading and persist changes', async () => {
      const result = await service.mockUpdateReading('test-1', { value: 140, synced: true });

      expect(result.value).toBe(140);

      const stored = JSON.parse(localStorage.getItem('diabetactic_mock_readings') || '[]');
      expect(stored[0].value).toBe(140);
      expect(stored[0].synced).toBe(true);
    });

    it('should throw error for non-existent reading', async () => {
      await expect(service.mockUpdateReading('nonexistent', { value: 100 })).rejects.toThrow(
        'Reading not found'
      );
    });
  });

  describe('mockDeleteReading', () => {
    beforeEach(() => {
      const readings = [
        createReading({ id: 'test-1' }),
        createReading({ id: 'test-2', value: 130 }),
      ];
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify(readings));
    });

    it('should delete reading by ID', async () => {
      await service.mockDeleteReading('test-1');

      const stored = JSON.parse(localStorage.getItem('diabetactic_mock_readings') || '[]');
      expect(stored.length).toBe(1);
      expect(stored[0].id).toBe('test-2');
    });

    it('should handle deleting non-existent reading gracefully', async () => {
      await expect(service.mockDeleteReading('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('mockGetReadingById', () => {
    beforeEach(() => {
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify([createReading()]));
    });

    it('should return reading by ID or throw if not found', async () => {
      const result = await service.mockGetReadingById('test-1');
      expect(result.id).toBe('test-1');
      expect(result.value).toBe(120);

      await expect(service.mockGetReadingById('nonexistent')).rejects.toThrow('Reading not found');
    });
  });

  describe('mockSyncReadings', () => {
    it('should sync unsynced readings and mark them as synced', async () => {
      const readings = [
        createReading({ id: '1', synced: false }),
        createReading({ id: '2', synced: false }),
        createReading({ id: '3', synced: true }),
      ];
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify(readings));

      const result = await service.mockSyncReadings();

      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);

      const stored = JSON.parse(localStorage.getItem('diabetactic_mock_readings') || '[]');
      expect(stored.every((r: LocalGlucoseReading) => r.synced)).toBe(true);
    });
  });

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  describe('mockLogin', () => {
    it('should authenticate with valid credentials and persist token', async () => {
      const testCases = [
        { username: 'demo@diabetactic.com', password: 'demo123' },
        { username: '1000', password: 'demo123' },
      ];

      for (const { username, password } of testCases) {
        const result = await service.mockLogin(username, password);
        expect(result.token).toContain('mock_token_');
        expect(result.user).toBeDefined();
      }

      const token = localStorage.getItem('diabetactic_mock_token');
      expect(token).toContain('mock_token_');
    });

    it('should reject invalid credentials', async () => {
      await expect(service.mockLogin('invalid@email.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should return stored profile if available', async () => {
      const testProfile = { id: 'test123', name: 'Test User' } as UserProfile;
      localStorage.setItem('diabetactic_mock_profile', JSON.stringify(testProfile));

      const result = await service.mockLogin('demo@diabetactic.com', 'demo123');
      expect(result.user.id).toBe('test123');
    });
  });

  describe('mockRegister', () => {
    it('should create new user with default preferences', async () => {
      const userData = {
        dni: '12345',
        password: 'password123',
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = await service.mockRegister(userData);

      expect(result.token).toContain('mock_token_');
      expect(result.user.name).toBe('John Doe');
      expect(result.user.preferences.glucoseUnit).toBe('mg/dL');
      expect(result.user.preferences.targetRange.min).toBe(70);
      expect(result.user.preferences.targetRange.max).toBe(180);
    });
  });

  describe('mockLogout', () => {
    it('should remove mock token', async () => {
      localStorage.setItem('diabetactic_mock_token', 'mock_token_123');
      await service.mockLogout();
      expect(localStorage.getItem('diabetactic_mock_token')).toBeNull();
    });
  });

  // ============================================================================
  // PROFILE MANAGEMENT
  // ============================================================================

  describe('Profile Management', () => {
    it('should return stored profile or generate one', async () => {
      // With stored profile
      const profile = { id: 'test123', name: 'Test User' } as UserProfile;
      localStorage.setItem('diabetactic_mock_profile', JSON.stringify(profile));

      let result = await service.mockGetProfile();
      expect(result.id).toBe('test123');

      // Without stored profile - should generate
      localStorage.removeItem('diabetactic_mock_profile');
      demoDataService.generateUserProfile.mockReturnValue({
        id: 'generated-id',
        name: 'Generated User',
      } as UserProfile);

      result = await service.mockGetProfile();
      expect(result.id).toBeDefined();
    });

    it('should update profile and timestamp', async () => {
      const profile = {
        id: 'test123',
        name: 'Original Name',
        updatedAt: new Date('2020-01-01').toISOString(),
      } as UserProfile;
      localStorage.setItem('diabetactic_mock_profile', JSON.stringify(profile));

      const result = await service.mockUpdateProfile({ name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(result.id).toBe('test123');
      expect(new Date(result.updatedAt!).getTime()).toBeGreaterThan(
        new Date('2020-01-01').getTime()
      );
    });
  });

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  describe('Token Management', () => {
    it('should verify and refresh tokens correctly', async () => {
      // Verify valid token
      expect(await service.mockVerifyToken('mock_token_123')).toBe(true);
      expect(await service.mockVerifyToken('invalid_token')).toBe(false);

      // Refresh valid token
      const newToken = await service.mockRefreshToken('mock_token_123');
      expect(newToken).toContain('mock_token_');
      expect(newToken).not.toBe('mock_token_123');

      // Verify persisted
      expect(localStorage.getItem('diabetactic_mock_token')).toContain('mock_token_');

      // Reject invalid refresh
      await expect(service.mockRefreshToken('invalid_token')).rejects.toThrow('Invalid token');
    });
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe('mockGetStatistics', () => {
    beforeEach(() => {
      const readings = [
        createReading({ id: '1', value: 120 }),
        createReading({ id: '2', value: 100 }),
        createReading({ id: '3', value: 200 }),
      ];
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify(readings));
    });

    it('should calculate all statistics correctly', async () => {
      const stats = await service.mockGetStatistics(30);

      expect(stats.average).toBe(140); // (120 + 100 + 200) / 3
      expect(stats.median).toBe(120); // Median of [100, 120, 200]
      expect(stats.timeInRange).toBe(67); // 2/3 in range
      expect(stats.timeAboveRange).toBe(33); // 1/3 above range
    });

    it('should return zero stats for no data', async () => {
      localStorage.removeItem('diabetactic_mock_readings');
      const stats = await service.mockGetStatistics(30);
      expect(stats.average).toBe(0);
      expect(stats.totalReadings).toBe(0);
    });

    it('should filter by date range', async () => {
      const oldReading = createReading({
        id: '4',
        value: 90,
        time: new Date('2020-01-01').toISOString(),
      });
      const stored = JSON.parse(localStorage.getItem('diabetactic_mock_readings') || '[]');
      stored.push(oldReading);
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify(stored));

      const stats = await service.mockGetStatistics(7);
      expect(stats.totalReadings).toBe(3); // Should not include old reading
    });
  });

  // ============================================================================
  // DATA MANAGEMENT & EDGE CASES
  // ============================================================================

  describe('clearAllMockData', () => {
    it('should clear all mock data from localStorage', () => {
      localStorage.setItem('diabetactic_mock_readings', '[]');
      localStorage.setItem('diabetactic_mock_appointments', '[]');
      localStorage.setItem('diabetactic_mock_profile', '{}');
      localStorage.setItem('diabetactic_mock_token', 'token');
      localStorage.setItem('demoMode', 'true');

      service.clearAllMockData();

      expect(localStorage.getItem('diabetactic_mock_readings')).toBeNull();
      expect(localStorage.getItem('diabetactic_mock_appointments')).toBeNull();
      expect(localStorage.getItem('diabetactic_mock_profile')).toBeNull();
      expect(localStorage.getItem('diabetactic_mock_token')).toBeNull();
      expect(localStorage.getItem('demoMode')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted localStorage data gracefully', async () => {
      localStorage.setItem('diabetactic_mock_readings', 'invalid json');
      await expect(service.mockGetAllReadings()).rejects.toThrow();
    });

    it('should handle null values in localStorage', async () => {
      localStorage.removeItem('diabetactic_mock_readings');
      const result = await service.mockGetAllReadings();
      expect(result.readings).toEqual([]);
    });

    it('should generate unique timestamps for IDs', async () => {
      const reading1 = await service.mockAddReading({
        type: 'smbg',
        value: 120,
        units: 'mg/dL',
        time: new Date().toISOString(),
        deviceId: 'test',
      } as Omit<LocalGlucoseReading, 'id'>);

      await new Promise(resolve => setTimeout(resolve, 10));

      const reading2 = await service.mockAddReading({
        type: 'smbg',
        value: 120,
        units: 'mg/dL',
        time: new Date().toISOString(),
        deviceId: 'test',
      } as Omit<LocalGlucoseReading, 'id'>);

      expect(reading1.id).not.toBe(reading2.id);
    });
  });
});
