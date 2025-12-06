import { TestBed } from '@angular/core/testing';
import { MockAdapterService } from './mock-adapter.service';
import { DemoDataService } from './demo-data.service';
import { MockAdapterConfig } from '../config/mock-adapter-config';
import { LocalGlucoseReading, UserProfile, GlucoseStatistics } from '../models';
import { PaginatedReadings } from './readings.service';

describe('MockAdapterService', () => {
  let service: MockAdapterService;
  let demoDataService: jest.Mocked<DemoDataService>;

  beforeEach(async () => {
    const demoDataMock = {
      generateGlucoseReadings: jest.fn().mockResolvedValue([]),
      generateAppointments: jest.fn().mockResolvedValue([]),
      generateUserProfile: jest.fn().mockReturnValue({}),
    };

    TestBed.configureTestingModule({
      providers: [MockAdapterService, { provide: DemoDataService, useValue: demoDataMock }],
    });

    demoDataService = TestBed.inject(DemoDataService) as jest.Mocked<DemoDataService>;
    service = TestBed.inject(MockAdapterService);

    // Clear localStorage before each test
    localStorage.clear();

    // Wait for async initialization to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default config', () => {
      const config = service.getConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('services');
    });

    it('should auto-initialize mock data on creation', () => {
      // Data should be initialized in localStorage
      const readings = localStorage.getItem('diabetactic_mock_readings');
      const appointments = localStorage.getItem('diabetactic_mock_appointments');
      const profile = localStorage.getItem('diabetactic_mock_profile');

      // Data initialization is async, so we just check the service exists
      expect(service).toBeTruthy();
    });
  });

  describe('Configuration Management', () => {
    it('should enable mock backend globally', () => {
      service.useMockBackend(true);

      expect(service.isMockEnabled()).toBe(true);
    });

    it('should disable mock backend globally', () => {
      service.useMockBackend(false);

      expect(service.isMockEnabled()).toBe(false);
    });

    it('should persist enabled state to localStorage', () => {
      service.useMockBackend(true);

      const stored = localStorage.getItem('diabetactic_use_mock_backend');
      expect(stored).toBeDefined();

      const config = JSON.parse(stored || '{}');
      expect(config.enabled).toBe(true);
    });

    it('should enable specific service mocks', () => {
      service.setServiceMockEnabled('appointments', true);

      expect(service.isServiceMockEnabled('appointments')).toBe(false); // False if global disabled
    });

    it('should require both global and service-specific to be enabled', () => {
      service.useMockBackend(true);
      service.setServiceMockEnabled('glucoserver', true);

      expect(service.isServiceMockEnabled('glucoserver')).toBe(true);

      service.useMockBackend(false);
      expect(service.isServiceMockEnabled('glucoserver')).toBe(false);
    });

    it('should reset to default configuration', () => {
      service.useMockBackend(true);
      service.setServiceMockEnabled('appointments', false);

      service.resetConfig();

      const config = service.getConfig();
      expect(config.enabled).toBeDefined();
    });

    it('should return configuration object', () => {
      const config = service.getConfig();

      expect(config).toHaveProperty('enabled');
      expect(config.services).toHaveProperty('appointments');
      expect(config.services).toHaveProperty('glucoserver');
      expect(config.services).toHaveProperty('auth');
    });
  });

  describe('mockGetAllReadings', () => {
    beforeEach(async () => {
      // Seed some test data
      const testReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          type: 'smbg',
          value: 120,
          units: 'mg/dL',
          time: new Date('2024-12-06T10:00:00Z').toISOString(),
          deviceId: 'test',
          synced: true,
        } as LocalGlucoseReading,
        {
          id: '2',
          type: 'smbg',
          value: 150,
          units: 'mg/dL',
          time: new Date('2024-12-05T10:00:00Z').toISOString(),
          deviceId: 'test',
          synced: true,
        } as LocalGlucoseReading,
      ];
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify(testReadings));
    });

    it('should return paginated readings', async () => {
      const result = await service.mockGetAllReadings(0, 10);

      expect(result).toBeDefined();
      expect(result.readings).toBeDefined();
      expect(result.total).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    it('should sort readings by date descending', async () => {
      const result = await service.mockGetAllReadings();

      const firstTime = new Date(result.readings[0].time).getTime();
      const secondTime = new Date(result.readings[1].time).getTime();
      expect(firstTime).toBeGreaterThan(secondTime);
    });

    it('should apply pagination offset', async () => {
      const result = await service.mockGetAllReadings(1, 10);

      expect(result.readings.length).toBe(1);
      expect(result.offset).toBe(1);
    });

    it('should apply pagination limit', async () => {
      const result = await service.mockGetAllReadings(0, 1);

      expect(result.readings.length).toBe(1);
      expect(result.hasMore).toBe(true);
    });

    it('should return empty array when no data', async () => {
      localStorage.removeItem('diabetactic_mock_readings');

      const result = await service.mockGetAllReadings();

      expect(result.readings).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should simulate network delay', async () => {
      const startTime = Date.now();
      await service.mockGetAllReadings();
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(300);
    });
  });

  describe('mockAddReading', () => {
    it('should add a new reading', async () => {
      const reading: Omit<LocalGlucoseReading, 'id'> = {
        type: 'smbg',
        value: 135,
        units: 'mg/dL',
        time: new Date().toISOString(),
        deviceId: 'test',
        synced: false,
      } as Omit<LocalGlucoseReading, 'id'>;

      const result = await service.mockAddReading(reading);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^mock_/);
      expect(result.value).toBe(135);
      expect(result.synced).toBe(false);
    });

    it('should mark reading as local only', async () => {
      const reading = {
        type: 'smbg',
        value: 135,
        units: 'mg/dL',
        time: new Date().toISOString(),
        deviceId: 'test',
      } as Omit<LocalGlucoseReading, 'id'>;

      const result = await service.mockAddReading(reading);

      expect(result.isLocalOnly).toBe(true);
      expect(result.localStoredAt).toBeDefined();
    });

    it('should persist reading to localStorage', async () => {
      const reading = {
        type: 'smbg',
        value: 140,
        units: 'mg/dL',
        time: new Date().toISOString(),
        deviceId: 'test',
      } as Omit<LocalGlucoseReading, 'id'>;

      await service.mockAddReading(reading);

      const stored = JSON.parse(localStorage.getItem('diabetactic_mock_readings') || '[]');
      expect(stored.length).toBeGreaterThan(0);
      expect(stored[stored.length - 1].value).toBe(140);
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
      const readings = [
        {
          id: 'test-1',
          value: 120,
          synced: false,
        } as LocalGlucoseReading,
      ];
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify(readings));
    });

    it('should update existing reading', async () => {
      const result = await service.mockUpdateReading('test-1', { value: 130 });

      expect(result.value).toBe(130);
    });

    it('should throw error for non-existent reading', async () => {
      await expect(service.mockUpdateReading('nonexistent', { value: 100 })).rejects.toThrow(
        'Reading not found'
      );
    });

    it('should persist updates to localStorage', async () => {
      await service.mockUpdateReading('test-1', { value: 140, synced: true });

      const stored = JSON.parse(localStorage.getItem('diabetactic_mock_readings') || '[]');
      expect(stored[0].value).toBe(140);
      expect(stored[0].synced).toBe(true);
    });
  });

  describe('mockDeleteReading', () => {
    beforeEach(() => {
      const readings = [
        { id: 'test-1', value: 120 } as LocalGlucoseReading,
        { id: 'test-2', value: 130 } as LocalGlucoseReading,
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
      const readings = [{ id: 'test-1', value: 120 } as LocalGlucoseReading];
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify(readings));
    });

    it('should return reading by ID', async () => {
      const result = await service.mockGetReadingById('test-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-1');
      expect(result.value).toBe(120);
    });

    it('should throw error for non-existent reading', async () => {
      await expect(service.mockGetReadingById('nonexistent')).rejects.toThrow('Reading not found');
    });
  });

  describe('mockSyncReadings', () => {
    beforeEach(() => {
      const readings = [
        { id: '1', synced: false } as LocalGlucoseReading,
        { id: '2', synced: false } as LocalGlucoseReading,
        { id: '3', synced: true } as LocalGlucoseReading,
      ];
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify(readings));
    });

    it('should sync unsynced readings', async () => {
      const result = await service.mockSyncReadings();

      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should mark readings as synced', async () => {
      await service.mockSyncReadings();

      const stored = JSON.parse(localStorage.getItem('diabetactic_mock_readings') || '[]');
      expect(stored.every((r: LocalGlucoseReading) => r.synced)).toBe(true);
    });

    it('should simulate longer sync delay', async () => {
      const startTime = Date.now();
      await service.mockSyncReadings();
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(800);
    });
  });

  describe('mockLogin', () => {
    it('should authenticate with valid email credentials', async () => {
      const result = await service.mockLogin('demo@diabetactic.com', 'demo123');

      expect(result).toBeDefined();
      expect(result.token).toContain('mock_token_');
      expect(result.user).toBeDefined();
    });

    it('should authenticate with valid DNI credentials', async () => {
      const result = await service.mockLogin('1000', 'demo123');

      expect(result).toBeDefined();
      expect(result.token).toContain('mock_token_');
    });

    it('should reject invalid credentials', async () => {
      await expect(service.mockLogin('invalid@email.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should persist token to localStorage', async () => {
      await service.mockLogin('demo@diabetactic.com', 'demo123');

      const token = localStorage.getItem('diabetactic_mock_token');
      expect(token).toBeDefined();
      expect(token).toContain('mock_token_');
    });

    it('should return stored profile if available', async () => {
      const testProfile = { id: 'test123', name: 'Test User' } as UserProfile;
      localStorage.setItem('diabetactic_mock_profile', JSON.stringify(testProfile));

      const result = await service.mockLogin('demo@diabetactic.com', 'demo123');

      expect(result.user.id).toBe('test123');
    });
  });

  describe('mockRegister', () => {
    it('should create new user profile', async () => {
      const userData = {
        dni: '12345',
        password: 'password123',
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = await service.mockRegister(userData);

      expect(result).toBeDefined();
      expect(result.token).toContain('mock_token_');
      expect(result.user.name).toBe('John Doe');
    });

    it('should set default preferences', async () => {
      const userData = {
        dni: '12345',
        password: 'password123',
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = await service.mockRegister(userData);

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

  describe('mockGetProfile', () => {
    it('should return stored profile', async () => {
      const profile = { id: 'test123', name: 'Test User' } as UserProfile;
      localStorage.setItem('diabetactic_mock_profile', JSON.stringify(profile));

      const result = await service.mockGetProfile();

      expect(result.id).toBe('test123');
    });

    it('should generate profile with faker if not stored', async () => {
      demoDataService.generateUserProfile.mockReturnValue({
        id: 'generated-id',
        name: 'Generated User',
      } as UserProfile);

      localStorage.removeItem('diabetactic_mock_profile');

      const result = await service.mockGetProfile();

      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
    });
  });

  describe('mockUpdateProfile', () => {
    it('should update existing profile', async () => {
      const profile = { id: 'test123', name: 'Original Name' } as UserProfile;
      localStorage.setItem('diabetactic_mock_profile', JSON.stringify(profile));

      const result = await service.mockUpdateProfile({ name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(result.id).toBe('test123');
    });

    it('should update updatedAt timestamp', async () => {
      const profile = {
        id: 'test123',
        updatedAt: new Date('2020-01-01').toISOString(),
      } as UserProfile;
      localStorage.setItem('diabetactic_mock_profile', JSON.stringify(profile));

      const result = await service.mockUpdateProfile({ name: 'New Name' });

      expect(new Date(result.updatedAt!).getTime()).toBeGreaterThan(
        new Date('2020-01-01').getTime()
      );
    });
  });

  describe('mockVerifyToken', () => {
    it('should verify valid mock token', async () => {
      const result = await service.mockVerifyToken('mock_token_123');

      expect(result).toBe(true);
    });

    it('should reject invalid token', async () => {
      const result = await service.mockVerifyToken('invalid_token');

      expect(result).toBe(false);
    });
  });

  describe('mockRefreshToken', () => {
    it('should refresh valid token', async () => {
      const newToken = await service.mockRefreshToken('mock_token_123');

      expect(newToken).toContain('mock_token_');
      expect(newToken).not.toBe('mock_token_123');
    });

    it('should reject invalid token refresh', async () => {
      await expect(service.mockRefreshToken('invalid_token')).rejects.toThrow('Invalid token');
    });

    it('should persist new token', async () => {
      await service.mockRefreshToken('mock_token_123');

      const stored = localStorage.getItem('diabetactic_mock_token');
      expect(stored).toContain('mock_token_');
    });
  });

  describe('mockGetStatistics', () => {
    beforeEach(() => {
      const readings: LocalGlucoseReading[] = [
        {
          id: '1',
          value: 120,
          time: new Date().toISOString(),
          type: 'smbg',
          units: 'mg/dL',
          deviceId: 'test',
          synced: true,
        } as LocalGlucoseReading,
        {
          id: '2',
          value: 100,
          time: new Date().toISOString(),
          type: 'smbg',
          units: 'mg/dL',
          deviceId: 'test',
          synced: true,
        } as LocalGlucoseReading,
        {
          id: '3',
          value: 200,
          time: new Date().toISOString(),
          type: 'smbg',
          units: 'mg/dL',
          deviceId: 'test',
          synced: true,
        } as LocalGlucoseReading,
      ];
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify(readings));
    });

    it('should calculate average glucose', async () => {
      const stats = await service.mockGetStatistics(30);

      expect(stats.average).toBe(140); // (120 + 100 + 200) / 3 = 140
    });

    it('should calculate median glucose', async () => {
      const stats = await service.mockGetStatistics(30);

      expect(stats.median).toBe(120); // Median of [100, 120, 200]
    });

    it('should calculate time in range', async () => {
      const stats = await service.mockGetStatistics(30);

      // 2 out of 3 readings in range (70-180)
      expect(stats.timeInRange).toBe(67); // 2/3 = 66.67 rounded
    });

    it('should calculate time above range', async () => {
      const stats = await service.mockGetStatistics(30);

      // 1 out of 3 readings above 180
      expect(stats.timeAboveRange).toBe(33);
    });

    it('should return zero stats for no data', async () => {
      localStorage.removeItem('diabetactic_mock_readings');

      const stats = await service.mockGetStatistics(30);

      expect(stats.average).toBe(0);
      expect(stats.totalReadings).toBe(0);
    });

    it('should filter by date range', async () => {
      const oldReading = {
        id: '4',
        value: 90,
        time: new Date('2020-01-01').toISOString(),
        type: 'smbg',
        units: 'mg/dL',
        deviceId: 'test',
        synced: true,
      } as LocalGlucoseReading;

      const stored = JSON.parse(localStorage.getItem('diabetactic_mock_readings') || '[]');
      stored.push(oldReading);
      localStorage.setItem('diabetactic_mock_readings', JSON.stringify(stored));

      const stats = await service.mockGetStatistics(7); // Last 7 days only

      expect(stats.totalReadings).toBe(3); // Should not include old reading
    });
  });

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

      // Small delay to ensure different timestamp
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
