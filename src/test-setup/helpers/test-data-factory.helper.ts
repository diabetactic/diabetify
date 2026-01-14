/**
 * Test Data Factory with Faker.js Integration
 *
 * Generates realistic, typed test data for Diabetify domain objects.
 * Uses @faker-js/faker for realistic data generation.
 *
 * @example
 * ```typescript
 * // Create a single user
 * const user = TestDataFactory.createUser();
 *
 * // Create with overrides
 * const adminUser = TestDataFactory.createUser({ role: 'admin' });
 *
 * // Create multiple readings
 * const readings = TestDataFactory.createReadingSeries(30, {
 *   minValue: 80,
 *   maxValue: 160
 * });
 *
 * // Create related data
 * const { user, readings, appointments } = TestDataFactory.createPatientWithData();
 * ```
 */

import { faker } from '@faker-js/faker';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User data matching LocalUser interface
 */
export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'doctor' | 'admin';
  accountState: 'ACTIVE' | 'DISABLED';
  phone?: string;
  dateOfBirth?: string;
  diabetesType?: '1' | '2' | 'gestational' | 'other';
  diagnosisDate?: string;
  createdAt: string;
  updatedAt: string;
  streak?: number;
  times_measured?: number;
  max_streak?: number;
}

/**
 * Glucose reading data
 */
export interface TestGlucoseReading {
  id: string;
  value: number;
  units: 'mg/dL' | 'mmol/L';
  time: string;
  type: 'smbg' | 'cgm';
  mealContext?: 'AYUNAS' | 'PREPRANDIAL' | 'POSTPRANDIAL' | 'OTRO';
  notes?: string;
  synced: boolean;
  status: 'critical-low' | 'low' | 'normal' | 'high' | 'critical-high';
  createdAt: string;
  updatedAt: string;
}

/**
 * Appointment data
 */
export interface TestAppointment {
  id: string;
  userId: string;
  doctorId?: string;
  status: 'NONE' | 'PENDING' | 'ACCEPTED' | 'RESOLVED' | 'CANCELLED';
  scheduledAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Auth tokens
 */
export interface TestAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: 'bearer';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return faker.string.alphanumeric(15);
}

/**
 * Get glucose status based on value
 */
function getGlucoseStatus(value: number, units: 'mg/dL' | 'mmol/L'): TestGlucoseReading['status'] {
  // Convert to mg/dL for comparison if needed
  const mgdL = units === 'mmol/L' ? value * 18 : value;

  if (mgdL < 54) return 'critical-low';
  if (mgdL < 70) return 'low';
  if (mgdL <= 180) return 'normal';
  if (mgdL <= 250) return 'high';
  return 'critical-high';
}

/**
 * Generate a random date within a range
 */
function randomDate(start: Date, end: Date): Date {
  return faker.date.between({ from: start, to: end });
}

// ============================================================================
// TEST DATA FACTORY
// ============================================================================

export const TestDataFactory = {
  // ==========================================================================
  // USER FACTORY
  // ==========================================================================

  /**
   * Create a test user with realistic data
   */
  createUser(overrides: Partial<TestUser> = {}): TestUser {
    const now = new Date();
    const createdAt = faker.date.past({ years: 2 });

    return {
      id: generateId(),
      email: faker.internet.email().toLowerCase(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: 'patient',
      accountState: 'ACTIVE',
      phone: faker.phone.number(),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }).toISOString(),
      diabetesType: faker.helpers.arrayElement(['1', '2', 'gestational', 'other']),
      diagnosisDate: faker.date.past({ years: 10 }).toISOString(),
      createdAt: createdAt.toISOString(),
      updatedAt: now.toISOString(),
      streak: faker.number.int({ min: 0, max: 100 }),
      times_measured: faker.number.int({ min: 0, max: 1000 }),
      max_streak: faker.number.int({ min: 0, max: 365 }),
      ...overrides,
    };
  },

  /**
   * Create a doctor user
   */
  createDoctor(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      role: 'doctor',
      diabetesType: undefined,
      diagnosisDate: undefined,
      ...overrides,
    });
  },

  /**
   * Create an admin user
   */
  createAdmin(overrides: Partial<TestUser> = {}): TestUser {
    return this.createUser({
      role: 'admin',
      diabetesType: undefined,
      diagnosisDate: undefined,
      ...overrides,
    });
  },

  // ==========================================================================
  // GLUCOSE READING FACTORY
  // ==========================================================================

  /**
   * Create a single glucose reading
   */
  createGlucoseReading(overrides: Partial<TestGlucoseReading> = {}): TestGlucoseReading {
    const units = overrides.units ?? 'mg/dL';
    const value =
      overrides.value ??
      (units === 'mg/dL'
        ? faker.number.int({ min: 70, max: 180 })
        : faker.number.float({ min: 4, max: 10, fractionDigits: 1 }));

    const time = overrides.time ?? faker.date.recent({ days: 7 }).toISOString();
    const status = getGlucoseStatus(value, units);

    return {
      id: generateId(),
      value,
      units,
      time,
      type: 'smbg',
      mealContext: faker.helpers.arrayElement(['AYUNAS', 'PREPRANDIAL', 'POSTPRANDIAL', 'OTRO']),
      notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
      synced: true,
      status,
      createdAt: time,
      updatedAt: time,
      ...overrides,
    };
  },

  /**
   * Create a low glucose reading (hypoglycemia)
   */
  createLowReading(overrides: Partial<TestGlucoseReading> = {}): TestGlucoseReading {
    return this.createGlucoseReading({
      value: faker.number.int({ min: 40, max: 69 }),
      notes: 'Hypoglycemia event',
      ...overrides,
    });
  },

  /**
   * Create a high glucose reading (hyperglycemia)
   */
  createHighReading(overrides: Partial<TestGlucoseReading> = {}): TestGlucoseReading {
    return this.createGlucoseReading({
      value: faker.number.int({ min: 181, max: 400 }),
      notes: 'Hyperglycemia event',
      ...overrides,
    });
  },

  /**
   * Create a series of readings over time
   */
  createReadingSeries(
    count: number,
    options: {
      minValue?: number;
      maxValue?: number;
      units?: 'mg/dL' | 'mmol/L';
      startDate?: Date;
      endDate?: Date;
      synced?: boolean;
    } = {}
  ): TestGlucoseReading[] {
    const {
      minValue = 70,
      maxValue = 180,
      units = 'mg/dL',
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      synced = true,
    } = options;

    const readings: TestGlucoseReading[] = [];

    for (let i = 0; i < count; i++) {
      const time = randomDate(startDate, endDate);
      readings.push(
        this.createGlucoseReading({
          value: faker.number.int({ min: minValue, max: maxValue }),
          units,
          time: time.toISOString(),
          synced,
        })
      );
    }

    // Sort by time descending (newest first)
    return readings.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  },

  /**
   * Create an unsynced reading (for testing sync queue)
   */
  createUnsyncedReading(overrides: Partial<TestGlucoseReading> = {}): TestGlucoseReading {
    return this.createGlucoseReading({
      id: `local_${Date.now()}_${generateId()}`,
      synced: false,
      ...overrides,
    });
  },

  // ==========================================================================
  // APPOINTMENT FACTORY
  // ==========================================================================

  /**
   * Create an appointment
   */
  createAppointment(overrides: Partial<TestAppointment> = {}): TestAppointment {
    const now = new Date();
    const createdAt = faker.date.recent({ days: 14 });

    return {
      id: generateId(),
      userId: generateId(),
      doctorId: faker.helpers.maybe(() => generateId(), { probability: 0.7 }),
      status: 'PENDING',
      scheduledAt: faker.helpers.maybe(() => faker.date.soon({ days: 30 }).toISOString(), {
        probability: 0.5,
      }),
      notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
      createdAt: createdAt.toISOString(),
      updatedAt: now.toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a pending appointment
   */
  createPendingAppointment(overrides: Partial<TestAppointment> = {}): TestAppointment {
    return this.createAppointment({
      status: 'PENDING',
      scheduledAt: undefined,
      ...overrides,
    });
  },

  /**
   * Create an accepted appointment
   */
  createAcceptedAppointment(overrides: Partial<TestAppointment> = {}): TestAppointment {
    return this.createAppointment({
      status: 'ACCEPTED',
      scheduledAt: faker.date.soon({ days: 14 }).toISOString(),
      doctorId: generateId(),
      ...overrides,
    });
  },

  // ==========================================================================
  // AUTH TOKENS FACTORY
  // ==========================================================================

  /**
   * Create valid auth tokens
   */
  createAuthTokens(overrides: Partial<TestAuthTokens> = {}): TestAuthTokens {
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now

    return {
      accessToken: `mock-access-token-${generateId()}`,
      refreshToken: `mock-refresh-token-${generateId()}`,
      expiresAt: expiresAt.toISOString(),
      tokenType: 'bearer',
      ...overrides,
    };
  },

  /**
   * Create expired auth tokens
   */
  createExpiredTokens(overrides: Partial<TestAuthTokens> = {}): TestAuthTokens {
    return this.createAuthTokens({
      expiresAt: new Date(Date.now() - 1000).toISOString(), // Already expired
      ...overrides,
    });
  },

  /**
   * Create tokens expiring soon
   */
  createExpiringTokens(secondsUntilExpiry = 60): TestAuthTokens {
    return this.createAuthTokens({
      expiresAt: new Date(Date.now() + secondsUntilExpiry * 1000).toISOString(),
    });
  },

  // ==========================================================================
  // COMPOSITE FACTORIES
  // ==========================================================================

  /**
   * Create a patient with related data
   */
  createPatientWithData(
    options: {
      readingCount?: number;
      hasAppointment?: boolean;
    } = {}
  ) {
    const { readingCount = 10, hasAppointment = true } = options;

    const user = this.createUser();
    const readings = this.createReadingSeries(readingCount);
    const appointment = hasAppointment ? this.createAppointment({ userId: user.id }) : null;

    return {
      user,
      readings,
      appointment,
      tokens: this.createAuthTokens(),
    };
  },

  /**
   * Create a complete test scenario with multiple users and data
   */
  createTestScenario() {
    const patient = this.createPatientWithData({ readingCount: 30, hasAppointment: true });
    const doctor = this.createDoctor();

    // Link appointment to doctor
    if (patient.appointment) {
      patient.appointment.doctorId = doctor.id;
      patient.appointment.status = 'ACCEPTED';
    }

    return {
      patient,
      doctor,
      // Unsynced readings for testing sync
      pendingReadings: [
        this.createUnsyncedReading(),
        this.createUnsyncedReading(),
        this.createUnsyncedReading(),
      ],
    };
  },

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Set the faker seed for reproducible tests
   */
  setSeed(seed: number): void {
    faker.seed(seed);
  },

  /**
   * Reset faker to random seed
   */
  resetSeed(): void {
    faker.seed();
  },

  /**
   * Generate a unique email
   */
  email(): string {
    return faker.internet.email().toLowerCase();
  },

  /**
   * Generate a unique ID
   */
  id(): string {
    return generateId();
  },

  /**
   * Generate a random glucose value in mg/dL
   */
  glucoseValue(options: { min?: number; max?: number } = {}): number {
    const { min = 70, max = 180 } = options;
    return faker.number.int({ min, max });
  },

  /**
   * Generate a past date within specified days
   */
  pastDate(days = 30): Date {
    return faker.date.recent({ days });
  },

  /**
   * Generate a future date within specified days
   */
  futureDate(days = 30): Date {
    return faker.date.soon({ days });
  },
};

// Export faker for direct use if needed
export { faker };
