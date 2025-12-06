# Database Seeding and Test Fixture Strategy for Diabetify

**Status**: Design Document
**Created**: 2025-12-06
**Architecture**: System Architecture Designer

---

## Executive Summary

This document outlines a comprehensive database seeding and test fixture strategy for Diabetify, covering frontend (IndexedDB), backend (PostgreSQL), and E2E testing patterns. The strategy leverages industry best practices, TypeScript factory patterns, and test isolation techniques to enable reliable, maintainable testing at all levels.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Fixture Factory Design](#fixture-factory-design)
4. [Backend Seeding API](#backend-seeding-api)
5. [Frontend IndexedDB Seeding](#frontend-indexeddb-seeding)
6. [E2E Test Integration](#e2e-test-integration)
7. [Implementation Roadmap](#implementation-roadmap)
8. [References](#references)

---

## Current State Analysis

### Existing Infrastructure

**Strengths:**

- ✅ Builder pattern in `test-builders.ts` with 5+ entity builders
- ✅ `DemoDataService` with realistic data generation using Faker.js
- ✅ IndexedDB (Dexie) with versioned schema and seed data support
- ✅ Comprehensive test coverage (1012 tests passing)
- ✅ Maestro E2E tests with backoffice API integration

**Gaps:**

- ❌ No type-safe factory library (fishery/factory.ts)
- ❌ No backend seeding API for E2E test isolation
- ❌ No Playwright fixtures for database seeding
- ❌ No snapshot testing for data consistency
- ❌ Manual test data management in E2E tests
- ❌ No shared fixture definitions across test suites

---

## Architecture Overview

### Three-Layer Fixture Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Data Sources                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────┐│
│  │   Fishery     │  │  Test Builders│  │  Scenario        ││
│  │   Factories   │  │  (existing)   │  │  Composers       ││
│  │  (new layer)  │  │               │  │  (test helpers)  ││
│  └───────┬───────┘  └───────┬───────┘  └────────┬─────────┘│
│          │                  │                     │          │
│          └──────────────────┴─────────────────────┘          │
│                             │                                │
└─────────────────────────────┼────────────────────────────────┘
                              │
              ┌───────────────┴────────────────┐
              │                                 │
    ┌─────────▼─────────┐          ┌──────────▼──────────┐
    │  Frontend Layer   │          │   Backend Layer      │
    │  (IndexedDB)      │          │   (PostgreSQL)       │
    ├───────────────────┤          ├─────────────────────┤
    │ • Dexie Service   │          │ • Seeding API       │
    │ • Test Fixtures   │◄────────►│ • pytest fixtures   │
    │ • Data Isolation  │          │ • Factory Functions │
    └───────┬───────────┘          └──────────┬──────────┘
            │                                  │
            │        ┌─────────────────┐      │
            └────────►  E2E Test Layer  ◄──────┘
                     ├─────────────────┤
                     │ • Playwright    │
                     │ • Maestro       │
                     │ • API Mocking   │
                     └─────────────────┘
```

### Design Principles

1. **Single Source of Truth**: One factory definition per entity
2. **Type Safety**: TypeScript types validated at compile time
3. **Test Isolation**: Independent test execution with cleanup
4. **Realistic Data**: Faker.js for meaningful test data
5. **Composability**: Build complex scenarios from simple factories
6. **Performance**: Lazy loading and database transactions

---

## Fixture Factory Design

### 1. Fishery Factory Implementation

**Why Fishery over factory.ts?**

- Better TypeScript support with DeepPartial
- Built-in associations and transient attributes
- Cleaner API with `build()`, `buildList()`, `create()`
- Factory extension/inheritance support
- More active maintenance (2025)

**Installation:**

```bash
npm install --save-dev fishery
```

### 2. Factory Definitions

**File Structure:**

```
src/app/tests/
├── factories/
│   ├── index.ts                    # Export all factories
│   ├── glucose-reading.factory.ts  # Glucose reading factory
│   ├── profile.factory.ts          # User profile factory
│   ├── appointment.factory.ts      # Appointment factory
│   ├── statistics.factory.ts       # Statistics factory
│   └── scenarios/                  # Complex test scenarios
│       ├── diabetes-patient.ts     # Complete patient fixture
│       ├── weekly-readings.ts      # Weekly reading patterns
│       └── clinical-flow.ts        # Appointment flow scenarios
├── helpers/
│   └── test-builders.ts            # Keep for migration compatibility
└── fixtures/
    └── playwright.ts               # Playwright-specific fixtures
```

### 3. Example Factory Implementation

**glucose-reading.factory.ts:**

```typescript
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { LocalGlucoseReading, GlucoseType } from '@/app/core/models';

interface ReadingTransientParams {
  status?: 'low' | 'normal' | 'high';
  daysAgo?: number;
  mealContext?: 'beforeMeal' | 'afterMeal' | 'bedtime' | 'exercise';
}

export const glucoseReadingFactory = Factory.define<LocalGlucoseReading, ReadingTransientParams>(
  ({ sequence, params, transientParams, associations }) => {
    const now = new Date();
    const timestamp = new Date(
      now.getTime() - (transientParams.daysAgo || 0) * 24 * 60 * 60 * 1000
    );

    // Determine value based on status
    let value = 95; // default normal
    if (transientParams.status === 'low') {
      value = faker.number.int({ min: 50, max: 69 });
    } else if (transientParams.status === 'high') {
      value = faker.number.int({ min: 181, max: 300 });
    } else {
      value = faker.number.int({ min: 70, max: 180 });
    }

    return {
      id: `local_${sequence}_${faker.string.alphanumeric(9)}`,
      type: 'smbg' as GlucoseType,
      value,
      units: 'mg/dL',
      time: timestamp.toISOString(),
      synced: false,
      mealContext: transientParams.mealContext || 'other',
      notes: faker.helpers.maybe(() => [faker.lorem.sentence()], { probability: 0.3 }),
      userId: associations.userId || '1000',
      ...params,
    };
  }
);

// Export convenience builders
export const glucoseReadingBuilders = {
  low: () => glucoseReadingFactory.build({ status: 'low' }),
  normal: () => glucoseReadingFactory.build({ status: 'normal' }),
  high: () => glucoseReadingFactory.build({ status: 'high' }),

  beforeBreakfast: (daysAgo = 0) =>
    glucoseReadingFactory.build({ daysAgo, mealContext: 'beforeMeal' }),

  weeklyPattern: () =>
    Array.from({ length: 7 }, (_, i) => glucoseReadingFactory.buildList(4, { daysAgo: i })).flat(),
};
```

**profile.factory.ts:**

```typescript
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { UserProfile, AccountState } from '@/app/core/models';

export const profileFactory = Factory.define<UserProfile>(() => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  age: faker.number.int({ min: 25, max: 70 }),
  accountState: AccountState.ACTIVE,
  dateOfBirth: faker.date.birthdate({ min: 25, max: 70, mode: 'age' }).toISOString().split('T')[0],
  diabetesType: faker.helpers.arrayElement(['type1', 'type2'] as const),
  diagnosisDate: faker.date.past({ years: 5 }).toISOString().split('T')[0],
  tidepoolConnection: { connected: false },
  preferences: {
    glucoseUnit: 'mg/dL',
    colorPalette: 'default',
    themeMode: 'light',
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
    relationship: faker.helpers.arrayElement(['Spouse', 'Parent', 'Sibling', 'Child']),
    phone: faker.phone.number(),
  },
  hasCompletedOnboarding: true,
}));

// Export convenience builders
export const profileBuilders = {
  type1Patient: () => profileFactory.build({ diabetesType: 'type1' }),
  type2Patient: () => profileFactory.build({ diabetesType: 'type2' }),
  newUser: () => profileFactory.build({ hasCompletedOnboarding: false }),
};
```

**appointment.factory.ts:**

```typescript
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { Appointment, AppointmentQueueState } from '@/app/core/models';

interface AppointmentTransientParams {
  queueState?: AppointmentQueueState;
}

export const appointmentFactory = Factory.define<Appointment, AppointmentTransientParams>(
  ({ sequence, transientParams }) => ({
    appointment_id: sequence,
    user_id: 1000,
    glucose_objective: faker.number.int({ min: 100, max: 130 }),
    insulin_type: faker.helpers.arrayElement(['rapid', 'long', 'mixed']),
    dose: faker.number.int({ min: 5, max: 30 }),
    fast_insulin: faker.helpers.arrayElement(['Humalog', 'NovoRapid', 'Lantus']),
    fixed_dose: faker.number.int({ min: 5, max: 20 }),
    ratio: faker.number.int({ min: 8, max: 15 }),
    sensitivity: faker.number.int({ min: 30, max: 60 }),
    pump_type: faker.helpers.arrayElement(['none', 'medtronic', 'omnipod']),
    control_data: faker.lorem.sentence(),
    motive: faker.helpers.arrayElements(['AJUSTE', 'CONTROL', 'CONSULTA'], { min: 1, max: 2 }),
    other_motive: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
    another_treatment: faker.helpers.maybe(() => faker.lorem.words(3), { probability: 0.4 }),
  })
);

// Export state-based builders
export const appointmentBuilders = {
  pending: () => appointmentFactory.build({ queueState: 'PENDING' }),
  accepted: () => appointmentFactory.build({ queueState: 'ACCEPTED' }),
  created: () => appointmentFactory.build({ queueState: 'CREATED' }),
  denied: () => appointmentFactory.build({ queueState: 'DENIED' }),
};
```

### 4. Scenario Composers (Test Helpers)

**scenarios/diabetes-patient.ts:**

```typescript
import { glucoseReadingFactory, profileFactory, appointmentFactory } from '../factories';
import { db } from '@/app/core/services/database.service';

/**
 * Complete patient scenario with profile, readings, and appointments
 */
export async function seedDiabetesPatient(
  options: {
    userId?: string;
    diabetesType?: 'type1' | 'type2';
    readingDays?: number;
    appointmentCount?: number;
  } = {}
) {
  const userId = options.userId || '1000';

  // Create profile
  const profile = profileFactory.build({
    id: userId,
    diabetesType: options.diabetesType || 'type1',
  });

  // Create glucose readings for specified days (default 30)
  const readingDays = options.readingDays || 30;
  const readings = Array.from({ length: readingDays }, (_, day) => {
    // 4 readings per day: breakfast, lunch, dinner, bedtime
    return [
      glucoseReadingFactory.build({ daysAgo: day, mealContext: 'beforeMeal' }), // breakfast
      glucoseReadingFactory.build({ daysAgo: day, mealContext: 'afterMeal' }), // lunch
      glucoseReadingFactory.build({ daysAgo: day, mealContext: 'beforeMeal' }), // dinner
      glucoseReadingFactory.build({ daysAgo: day, mealContext: 'bedtime' }), // bedtime
    ];
  }).flat();

  // Create appointments
  const appointmentCount = options.appointmentCount || 3;
  const appointments = appointmentFactory.buildList(appointmentCount, {
    user_id: parseInt(userId),
  });

  // Seed into IndexedDB
  await db.transaction('rw', db.readings, db.appointments, async () => {
    await db.readings.bulkAdd(readings);
    await db.appointments.bulkAdd(appointments);
  });

  return {
    profile,
    readings,
    appointments,
    summary: {
      userId,
      totalReadings: readings.length,
      totalAppointments: appointments.length,
      dateRange: {
        start: readings[readings.length - 1].time,
        end: readings[0].time,
      },
    },
  };
}

/**
 * Patient with specific glucose patterns (for testing edge cases)
 */
export async function seedPatientWithPatterns(patterns: {
  hypoglycemicDays?: number;
  hyperglycemicDays?: number;
  stableDays?: number;
}) {
  const userId = '1000';
  const readings: any[] = [];

  // Hypoglycemic pattern
  if (patterns.hypoglycemicDays) {
    for (let i = 0; i < patterns.hypoglycemicDays; i++) {
      readings.push(
        ...glucoseReadingFactory.buildList(4, {
          status: 'low',
          daysAgo: i,
        })
      );
    }
  }

  // Hyperglycemic pattern
  if (patterns.hyperglycemicDays) {
    for (let i = 0; i < patterns.hyperglycemicDays; i++) {
      readings.push(
        ...glucoseReadingFactory.buildList(4, {
          status: 'high',
          daysAgo: patterns.hypoglycemicDays + i,
        })
      );
    }
  }

  // Stable pattern
  if (patterns.stableDays) {
    const offset = (patterns.hypoglycemicDays || 0) + (patterns.hyperglycemicDays || 0);
    for (let i = 0; i < patterns.stableDays; i++) {
      readings.push(
        ...glucoseReadingFactory.buildList(4, {
          status: 'normal',
          daysAgo: offset + i,
        })
      );
    }
  }

  await db.readings.bulkAdd(readings);

  return { userId, readings };
}
```

**scenarios/clinical-flow.ts:**

```typescript
import { appointmentFactory } from '../factories';
import { db } from '@/app/core/services/database.service';

/**
 * Seed appointment state machine scenarios
 */
export async function seedAppointmentFlow(userId: number = 1000) {
  const scenarios = {
    // NONE → PENDING
    pendingAppointment: appointmentFactory.build({
      user_id: userId,
      appointment_id: 1,
    }),

    // PENDING → ACCEPTED (requires backend API call)
    acceptedAppointment: appointmentFactory.build({
      user_id: userId,
      appointment_id: 2,
    }),

    // ACCEPTED → CREATED
    createdAppointment: appointmentFactory.build({
      user_id: userId,
      appointment_id: 3,
    }),

    // PENDING → DENIED
    deniedAppointment: appointmentFactory.build({
      user_id: userId,
      appointment_id: 4,
    }),
  };

  await db.appointments.bulkAdd(Object.values(scenarios));

  return scenarios;
}
```

---

## Backend Seeding API

### FastAPI Seeding Endpoints (Design Specification)

**File Structure (Backend):**

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── test_data.py           # Seeding endpoints
│   ├── tests/
│   │   ├── conftest.py                # Pytest fixtures
│   │   ├── factories/
│   │   │   ├── user_factory.py
│   │   │   ├── reading_factory.py
│   │   │   └── appointment_factory.py
│   │   └── fixtures/
│   │       └── database.py            # DB fixtures
│   └── db/
│       └── seeding.py                 # Seeding logic
```

### API Endpoint Design

**POST /api/v1/test-data/seed**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.db.seeding import seed_user, seed_readings, seed_appointments
from app.db.session import get_db

router = APIRouter(prefix="/test-data", tags=["test-data"])

class SeedRequest(BaseModel):
    """Request to seed test data"""
    user_id: int
    profile: Optional[dict] = None
    readings_count: int = 30
    appointments_count: int = 3
    patterns: Optional[dict] = None  # e.g., {"hypoglycemic_days": 5}

class SeedResponse(BaseModel):
    """Response with seeded data summary"""
    user_id: int
    readings_created: int
    appointments_created: int
    seed_id: str  # For cleanup tracking

@router.post("/seed", response_model=SeedResponse)
async def seed_test_data(
    request: SeedRequest,
    db: Session = Depends(get_db),
):
    """
    Seed test data for E2E tests

    Only available in test/dev environments
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(403, "Test data seeding not allowed in production")

    # Create user profile
    user = seed_user(db, user_id=request.user_id, profile=request.profile)

    # Seed glucose readings
    readings = seed_readings(
        db,
        user_id=request.user_id,
        count=request.readings_count,
        patterns=request.patterns,
    )

    # Seed appointments
    appointments = seed_appointments(
        db,
        user_id=request.user_id,
        count=request.appointments_count,
    )

    db.commit()

    # Track seed for cleanup
    seed_id = f"seed_{request.user_id}_{datetime.now().isoformat()}"

    return SeedResponse(
        user_id=request.user_id,
        readings_created=len(readings),
        appointments_created=len(appointments),
        seed_id=seed_id,
    )

@router.delete("/seed/{user_id}")
async def clear_test_data(
    user_id: int,
    db: Session = Depends(get_db),
):
    """Clear all test data for a user"""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(403, "Test data cleanup not allowed in production")

    # Delete in order of dependencies
    db.query(GlucoseReading).filter_by(user_id=user_id).delete()
    db.query(Appointment).filter_by(user_id=user_id).delete()
    db.query(User).filter_by(id=user_id).delete()

    db.commit()

    return {"message": f"Test data cleared for user {user_id}"}

@router.post("/reset")
async def reset_test_database(db: Session = Depends(get_db)):
    """
    Reset entire test database (use with caution)

    Only available in test environment with AUTH_BYPASS=true
    """
    if settings.ENVIRONMENT != "test" or not settings.AUTH_BYPASS:
        raise HTTPException(403, "Database reset only allowed in test mode")

    # Truncate all tables
    db.execute("TRUNCATE users, glucose_readings, appointments CASCADE")
    db.commit()

    return {"message": "Test database reset complete"}
```

### Pytest Factory Fixtures

**backend/app/tests/factories/reading_factory.py:**

```python
import factory
from factory.alchemy import SQLAlchemyModelFactory
from datetime import datetime, timedelta
from app.models import GlucoseReading
from app.db.session import SessionLocal

class GlucoseReadingFactory(SQLAlchemyModelFactory):
    class Meta:
        model = GlucoseReading
        sqlalchemy_session = SessionLocal()
        sqlalchemy_session_persistence = "commit"

    id = factory.Sequence(lambda n: n)
    user_id = 1000
    value = factory.Faker('random_int', min=70, max=180)
    units = "mg/dL"
    type = "smbg"
    time = factory.LazyFunction(datetime.now)

    @factory.post_generation
    def set_status(obj, create, extracted, **kwargs):
        """Automatically set status based on value"""
        if obj.value < 70:
            obj.status = "low"
        elif obj.value > 180:
            obj.status = "high"
        else:
            obj.status = "normal"

class LowReadingFactory(GlucoseReadingFactory):
    value = factory.Faker('random_int', min=40, max=69)

class HighReadingFactory(GlucoseReadingFactory):
    value = factory.Faker('random_int', min=181, max=300)
```

**backend/app/tests/conftest.py:**

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Test database URL
TEST_DATABASE_URL = "postgresql://test_user:test_pass@localhost:5432/diabetactic_test"

@pytest.fixture(scope="session")
def engine():
    """Create test database engine"""
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(engine):
    """Create a new database session for each test"""
    connection = engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(bind=connection)
    session = SessionLocal()

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    """FastAPI test client with database override"""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    from fastapi.testclient import TestClient
    yield TestClient(app)

    app.dependency_overrides.clear()

@pytest.fixture
def seed_patient(db_session):
    """Fixture to seed a complete patient scenario"""
    from app.tests.factories import UserFactory, GlucoseReadingFactory, AppointmentFactory

    def _seed(user_id=1000, readings_count=30, appointments_count=3):
        user = UserFactory(id=user_id)
        readings = GlucoseReadingFactory.create_batch(readings_count, user_id=user_id)
        appointments = AppointmentFactory.create_batch(appointments_count, user_id=user_id)

        db_session.commit()

        return {
            "user": user,
            "readings": readings,
            "appointments": appointments,
        }

    return _seed
```

---

## Frontend IndexedDB Seeding

### Test Utilities

**src/app/tests/fixtures/database-seeder.ts:**

```typescript
import { db, DiabetacticDatabase } from '@/app/core/services/database.service';
import { glucoseReadingFactory, profileFactory, appointmentFactory } from '../factories';

export class DatabaseSeeder {
  /**
   * Reset database to clean state
   */
  static async reset(): Promise<void> {
    await db.transaction('rw', db.readings, db.syncQueue, db.appointments, async () => {
      await db.readings.clear();
      await db.syncQueue.clear();
      await db.appointments.clear();
    });
  }

  /**
   * Seed standard test dataset
   */
  static async seedStandard(userId: string = '1000'): Promise<void> {
    const readings = glucoseReadingFactory.buildList(30, { userId });
    const appointments = appointmentFactory.buildList(3, { user_id: parseInt(userId) });

    await db.transaction('rw', db.readings, db.appointments, async () => {
      await db.readings.bulkAdd(readings);
      await db.appointments.bulkAdd(appointments);
    });
  }

  /**
   * Seed with specific patterns for edge case testing
   */
  static async seedWithPatterns(patterns: {
    lowReadings?: number;
    highReadings?: number;
    normalReadings?: number;
  }): Promise<void> {
    const readings = [
      ...glucoseReadingFactory.buildList(patterns.lowReadings || 0, { status: 'low' }),
      ...glucoseReadingFactory.buildList(patterns.highReadings || 0, { status: 'high' }),
      ...glucoseReadingFactory.buildList(patterns.normalReadings || 0, { status: 'normal' }),
    ];

    await db.readings.bulkAdd(readings);
  }

  /**
   * Create snapshot of current database state
   */
  static async createSnapshot(): Promise<DatabaseSnapshot> {
    const [readings, appointments] = await Promise.all([
      db.readings.toArray(),
      db.appointments.toArray(),
    ]);

    return {
      readings,
      appointments,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Restore database from snapshot
   */
  static async restoreSnapshot(snapshot: DatabaseSnapshot): Promise<void> {
    await this.reset();

    await db.transaction('rw', db.readings, db.appointments, async () => {
      await db.readings.bulkAdd(snapshot.readings);
      await db.appointments.bulkAdd(snapshot.appointments);
    });
  }
}

interface DatabaseSnapshot {
  readings: any[];
  appointments: any[];
  timestamp: string;
}
```

### Jest Integration

**Example Unit Test with Factories:**

```typescript
import { TestBed } from '@angular/core/testing';
import { ReadingsService } from './readings.service';
import { glucoseReadingFactory } from '@/app/tests/factories';
import { DatabaseSeeder } from '@/app/tests/fixtures/database-seeder';

describe('ReadingsService', () => {
  let service: ReadingsService;

  beforeEach(async () => {
    await DatabaseSeeder.reset();

    TestBed.configureTestingModule({
      providers: [ReadingsService],
    });

    service = TestBed.inject(ReadingsService);
  });

  it('should calculate statistics from seeded readings', async () => {
    // Seed 30 readings with specific pattern
    const readings = glucoseReadingFactory.buildList(30, { status: 'normal' });
    await db.readings.bulkAdd(readings);

    const stats = await service.calculateStatistics();

    expect(stats.totalReadings).toBe(30);
    expect(stats.average).toBeGreaterThan(70);
    expect(stats.average).toBeLessThan(180);
  });

  it('should detect hypoglycemic pattern', async () => {
    await DatabaseSeeder.seedWithPatterns({ lowReadings: 20 });

    const stats = await service.calculateStatistics();

    expect(stats.timeBelowRange).toBeGreaterThan(60); // >60% low
  });
});
```

---

## E2E Test Integration

### Playwright Fixtures

**playwright/fixtures/database.ts:**

```typescript
import { test as base, Page } from '@playwright/test';
import axios from 'axios';

interface DatabaseFixtures {
  seedTestData: (userId: number, options?: SeedOptions) => Promise<SeedResponse>;
  clearTestData: (userId: number) => Promise<void>;
  resetDatabase: () => Promise<void>;
}

interface SeedOptions {
  readingsCount?: number;
  appointmentsCount?: number;
  patterns?: {
    hypoglycemic_days?: number;
    hyperglycemic_days?: number;
  };
}

interface SeedResponse {
  user_id: number;
  readings_created: number;
  appointments_created: number;
  seed_id: string;
}

export const test = base.extend<DatabaseFixtures>({
  seedTestData: async ({}, use) => {
    const seeds: number[] = [];

    const seed = async (userId: number, options: SeedOptions = {}) => {
      const response = await axios.post<SeedResponse>(
        `${process.env.BACKEND_URL}/api/v1/test-data/seed`,
        {
          user_id: userId,
          readings_count: options.readingsCount || 30,
          appointments_count: options.appointmentsCount || 3,
          patterns: options.patterns,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
          },
        }
      );

      seeds.push(userId);
      return response.data;
    };

    await use(seed);

    // Cleanup all seeded data
    for (const userId of seeds) {
      await axios.delete(`${process.env.BACKEND_URL}/api/v1/test-data/seed/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
        },
      });
    }
  },

  clearTestData: async ({}, use) => {
    await use(async (userId: number) => {
      await axios.delete(`${process.env.BACKEND_URL}/api/v1/test-data/seed/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
        },
      });
    });
  },

  resetDatabase: async ({}, use) => {
    await use(async () => {
      await axios.post(
        `${process.env.BACKEND_URL}/api/v1/test-data/reset`,
        {},
        {
          headers: {
            Authorization: `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
          },
        }
      );
    });
  },
});

export { expect } from '@playwright/test';
```

**Example Playwright Test:**

```typescript
import { test, expect } from '../fixtures/database';

test.describe('Glucose Readings CRUD', () => {
  test('should display seeded readings', async ({ page, seedTestData }) => {
    // Seed test data via backend API
    const seed = await seedTestData(1000, {
      readingsCount: 50,
      patterns: {
        hypoglycemic_days: 5,
      },
    });

    expect(seed.readings_created).toBe(50);

    // Navigate to readings page
    await page.goto('/tabs/readings');

    // Verify readings are displayed
    await expect(page.locator('[data-testid="reading-item"]')).toHaveCount(50);

    // Verify hypoglycemic readings are highlighted
    const lowReadings = page.locator('[data-testid="reading-item"][data-status="low"]');
    await expect(lowReadings).toHaveCount(20); // 5 days * 4 readings/day
  });

  test('should create new reading', async ({ page, seedTestData }) => {
    await seedTestData(1000, { readingsCount: 10 });

    await page.goto('/tabs/readings');
    await page.click('[data-testid="add-reading-button"]');

    // Fill form
    await page.fill('[data-testid="glucose-value"]', '120');
    await page.click('[data-testid="save-reading"]');

    // Verify reading count increased
    await expect(page.locator('[data-testid="reading-item"]')).toHaveCount(11);
  });
});
```

### Maestro Integration

**maestro/fixtures/seed-data.yaml:**

```yaml
# Seed test data using backoffice API
appId: io.diabetactic.app
---
# Seed standard patient data
- runScript: maestro/scripts/seed-patient.js
  env:
    USER_ID: ${TEST_USER_ID}
    READINGS_COUNT: 30
    APPOINTMENTS_COUNT: 3
```

**maestro/scripts/seed-patient.js:**

```javascript
const axios = require('axios');

const BACKEND_URL =
  process.env.BACKOFFICE_API_URL || 'https://dt-api-gateway-backoffice.herokuapp.com';
const USER_ID = process.env.USER_ID || 1000;
const READINGS_COUNT = parseInt(process.env.READINGS_COUNT || '30');
const APPOINTMENTS_COUNT = parseInt(process.env.APPOINTMENTS_COUNT || '3');

async function seedPatient() {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/test-data/seed`,
      {
        user_id: USER_ID,
        readings_count: READINGS_COUNT,
        appointments_count: APPOINTMENTS_COUNT,
      },
      {
        auth: {
          username: process.env.BACKOFFICE_ADMIN_USERNAME,
          password: process.env.BACKOFFICE_ADMIN_PASSWORD,
        },
      }
    );

    console.log(`Seeded data for user ${USER_ID}:`, response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to seed patient data:', error.message);
    throw error;
  }
}

seedPatient();
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Priority: HIGH**

1. **Install Fishery** ✅

   ```bash
   npm install --save-dev fishery
   ```

2. **Create Core Factories** ✅
   - `glucose-reading.factory.ts`
   - `profile.factory.ts`
   - `appointment.factory.ts`
   - `statistics.factory.ts`

3. **Database Seeder Utility** ✅
   - `database-seeder.ts` with reset/seed/snapshot

4. **Update 2-3 Existing Tests** ✅
   - Migrate from builders to factories
   - Validate pattern works

**Deliverables:**

- ✅ Factories for all core entities
- ✅ DatabaseSeeder utility
- ✅ 2-3 migrated unit tests

### Phase 2: Backend Integration (Week 2)

**Priority: MEDIUM**

1. **Backend Seeding API** 🔄
   - `/api/v1/test-data/seed` endpoint
   - `/api/v1/test-data/seed/{user_id}` DELETE
   - `/api/v1/test-data/reset` POST

2. **Pytest Factories** 🔄
   - SQLAlchemy model factories
   - Conftest.py fixtures
   - Database session management

3. **Environment Guards** 🔄
   - Test/dev only endpoints
   - AUTH_BYPASS flag
   - Production safeguards

**Deliverables:**

- ✅ Backend seeding endpoints
- ✅ Pytest fixtures
- ✅ API documentation

### Phase 3: E2E Test Integration (Week 3)

**Priority: MEDIUM**

1. **Playwright Fixtures** 🔄
   - Database fixture with auto-cleanup
   - Seed/clear helpers
   - Snapshot/restore utilities

2. **Maestro Integration** 🔄
   - Seed scripts for common scenarios
   - Backoffice API integration
   - Data isolation between tests

3. **Migrate 3-5 E2E Tests** 🔄
   - Use new seeding fixtures
   - Remove manual data setup
   - Validate isolation

**Deliverables:**

- ✅ Playwright database fixtures
- ✅ Maestro seed scripts
- ✅ 3-5 migrated E2E tests

### Phase 4: Scenario Builders (Week 4)

**Priority: LOW**

1. **Complex Scenarios** 🔄
   - `diabetes-patient.ts` - Complete patient
   - `weekly-readings.ts` - Realistic weekly patterns
   - `clinical-flow.ts` - Appointment state machine

2. **Edge Case Scenarios** 🔄
   - Hypoglycemic episodes
   - Hyperglycemic crises
   - Data gaps and missing readings

3. **Documentation** 🔄
   - Factory usage guide
   - Scenario cookbook
   - Migration guide from builders

**Deliverables:**

- ✅ 5+ scenario composers
- ✅ Usage documentation
- ✅ Migration guide

### Phase 5: Optimization (Ongoing)

**Priority: LOW**

1. **Snapshot Testing** 🔄
   - Database state snapshots
   - Visual regression baselines
   - API response snapshots

2. **Performance** 🔄
   - Lazy factory initialization
   - Bulk insert optimization
   - Transaction batching

3. **CI/CD Integration** 🔄
   - CircleCI test data seeding
   - Parallel test isolation
   - Cleanup automation

**Deliverables:**

- ✅ Snapshot infrastructure
- ✅ Performance benchmarks
- ✅ CI/CD optimizations

---

## References

### Research Sources

1. **Fishery Library**
   - [Announcing Fishery – a JavaScript and TypeScript Factory Library](https://thoughtbot.com/blog/announcing-fishery-a-javascript-and-typescript-factory-library)
   - [Stepping up Our Test Fixture Game With Fishery](https://medium.com/leaselock-engineering/stepping-up-our-test-fixture-game-with-fishery-be22b76d1f22)
   - [fishery - npm](https://www.npmjs.com/package/fishery)

2. **Factory Patterns**
   - [factory.ts - GitHub](https://github.com/willryan/factory.ts)
   - [Mock-Factory-Pattern in TypeScript](https://dev.to/davelosert/mock-factory-pattern-in-typescript-44l9)
   - [Fixtures, the way to manage sample and test data](https://michalzalecki.com/fixtures-the-way-to-manage-sample-and-test-data/)

3. **Database Seeding for E2E Tests**
   - [Test Data Strategies for E2E Tests](https://www.playwright-user-event.org/playwright-tips/test-data-strategies-for-e2e-tests)
   - [Mock database in Svelte e2e tests with drizzle and playwright fixtures](https://mainmatter.com/blog/2025/08/21/mock-database-in-svelte-tests/)
   - [The Definitive Guide to Playwright Test Data Management Strategies](https://momentic.ai/resources/the-definitive-guide-to-playwright-test-data-management-strategies)

4. **FastAPI & Pytest**
   - [Test Applications with FastAPI and SQLModel](https://sqlmodel.tiangolo.com/tutorial/fastapi/tests/)
   - [Testing FastAPI application with PostgreSQL database — using Pytest and SQLAlchemy](https://medium.com/sp-lutsk/testing-fastapi-application-with-postgresql-database-using-pytest-and-sqlalchemy-26902d8ce053)
   - [Building And Testing FastAPI CRUD APIs With Pytest](https://pytest-with-eric.com/pytest-advanced/pytest-fastapi-testing/)
   - [Testing a Database - FastAPI](https://fastapi.tiangolo.com/how-to/testing-database/)

5. **Test Isolation**
   - [How to Ensure Data Consistency In E2E Tests](https://elvanco.com/blog/how-to-ensure-data-consistency-in-e2e-tests)
   - [E2E Tests Best Practices | Handbook](https://handbook.cal.com/engineering/best-practices/e2e-tests-best-practices)

---

## Appendix A: Factory Migration Checklist

### Migrating from Builders to Factories

**Before (using builders):**

```typescript
const reading = new GlucoseReadingBuilder()
  .withValue(120)
  .withTimestamp(new Date())
  .asNormal()
  .build();
```

**After (using factories):**

```typescript
const reading = glucoseReadingFactory.build({
  value: 120,
  time: new Date().toISOString(),
  status: 'normal',
});
```

**Benefits:**

- ✅ Type-safe params with IntelliSense
- ✅ Realistic defaults via Faker
- ✅ Associations handled automatically
- ✅ Transient attributes for scenarios
- ✅ Factory extension/inheritance

---

## Appendix B: Test Data Isolation Strategies

### Strategy Comparison

| Strategy                 | Pros           | Cons               | Use Case          |
| ------------------------ | -------------- | ------------------ | ----------------- |
| **Transaction Rollback** | Fast, isolated | Complex setup      | Unit tests        |
| **Database Truncation**  | Clean state    | Slower             | Integration tests |
| **Seeding API**          | Realistic data | Network dependency | E2E tests         |
| **Snapshot/Restore**     | Fast reset     | Storage overhead   | Visual regression |

### Recommended Approach by Test Type

1. **Unit Tests (Jest)**: Transaction rollback with in-memory DB
2. **Integration Tests**: Database truncation with factories
3. **E2E Tests (Playwright)**: Backend seeding API with cleanup
4. **Visual Tests**: Snapshot/restore for consistency

---

## Appendix C: Performance Benchmarks

### Target Metrics

| Operation                | Target | Current | Status |
| ------------------------ | ------ | ------- | ------ |
| Factory build (1 entity) | <1ms   | N/A     | 🔄     |
| Factory buildList (100)  | <50ms  | N/A     | 🔄     |
| DB seed (100 readings)   | <200ms | N/A     | 🔄     |
| Backend API seed         | <1s    | N/A     | 🔄     |
| Test isolation reset     | <500ms | N/A     | 🔄     |

**Measurement Method:**

```typescript
import { performance } from 'perf_hooks';

const start = performance.now();
const readings = glucoseReadingFactory.buildList(100);
const duration = performance.now() - start;
console.log(`Built 100 readings in ${duration}ms`);
```

---

**End of Design Document**
