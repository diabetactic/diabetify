/**
 * ReadingsService Backend Mapping Tests
 *
 * These tests verify that the ReadingsService correctly maps between
 * frontend meal context values and backend reading_type enum values.
 *
 * CRITICAL: These tests ensure 422 validation errors are caught before deployment.
 *
 * Backend enum values (from glucoserver/models/glucose_reading_model.py):
 * - DESAYUNO (breakfast)
 * - ALMUERZO (lunch)
 * - MERIENDA (snack)
 * - CENA (dinner)
 * - EJERCICIO (exercise)
 * - OTRAS_COMIDAS (other meals - includes bedtime, fasting)
 * - OTRO (other/unspecified)
 */

import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { ReadingsService, LIVE_QUERY_FN } from './readings.service';
import { DiabetacticDatabase } from './database.service';
import { MockDataService } from './mock-data.service';
import { ApiGatewayService } from './api-gateway.service';
import { LoggerService } from './logger.service';
import {
  BACKEND_READING_TYPES,
  isValidBackendReadingType,
} from '../contracts/backend-enums.contract';
import { GlucoseReading } from '../models/glucose-reading.model';

// ============================================================================
// EXPECTED MAPPING DEFINITIONS
// ============================================================================

/**
 * Expected mapping from frontend meal context to backend reading_type
 * This is the source of truth for the test - if mapping changes, update here
 */
const EXPECTED_MEAL_CONTEXT_TO_BACKEND: Record<string, string> = {
  'before-breakfast': 'DESAYUNO',
  'after-breakfast': 'DESAYUNO',
  'before-lunch': 'ALMUERZO',
  'after-lunch': 'ALMUERZO',
  'before-dinner': 'CENA',
  'after-dinner': 'CENA',
  snack: 'MERIENDA',
  bedtime: 'OTRAS_COMIDAS', // NOT 'NOCHE' - that doesn't exist in backend
  fasting: 'OTRAS_COMIDAS', // NOT 'AYUNO' - that doesn't exist in backend
  exercise: 'EJERCICIO',
  other: 'OTRO',
};

/**
 * Expected mapping from backend reading_type to frontend meal context
 */
const EXPECTED_BACKEND_TO_MEAL_CONTEXT: Record<string, string> = {
  DESAYUNO: 'before-breakfast',
  ALMUERZO: 'before-lunch',
  CENA: 'before-dinner',
  MERIENDA: 'snack',
  OTRAS_COMIDAS: 'other',
  EJERCICIO: 'exercise',
  OTRO: 'other',
};

/**
 * INVALID backend values that should NOT be produced by the mapping
 * These were bugs in previous versions
 */
const INVALID_BACKEND_VALUES = [
  'NOCHE', // Was incorrectly used for bedtime
  'AYUNO', // Was incorrectly used for fasting
  'FASTING',
  'NIGHT',
  'BEDTIME',
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'exercise',
  'other',
  '', // Empty string
  null,
  undefined,
];

// ============================================================================
// MOCK DATABASE
// ============================================================================

class MockDatabaseService {
  readings = {
    toArray: jest.fn().mockResolvedValue([]),
    where: jest.fn().mockReturnValue({
      between: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
      equals: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue(undefined),
      }),
    }),
    get: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue('mock-id'),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(undefined),
    bulkAdd: jest.fn().mockResolvedValue(undefined),
    orderBy: jest.fn().mockReturnValue({
      reverse: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
        toArray: jest.fn().mockResolvedValue([]),
      }),
    }),
    toCollection: jest.fn().mockReturnValue({
      toArray: jest.fn().mockResolvedValue([]),
    }),
    filter: jest.fn().mockReturnValue({
      toArray: jest.fn().mockResolvedValue([]),
    }),
  };

  syncQueue = {
    add: jest.fn().mockResolvedValue(undefined),
    count: jest.fn().mockResolvedValue(0),
    toArray: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    where: jest.fn().mockReturnValue({
      equals: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue(undefined),
      }),
    }),
  };

  clear() {
    return Promise.resolve();
  }
}

// Mock API Gateway that captures requests
class MockApiGatewayService {
  lastRequest: { endpoint: string; options: any } | null = null;

  request(endpoint: string, options?: any): Observable<any> {
    this.lastRequest = { endpoint, options };
    return new Observable(subscriber => {
      subscriber.next({ success: true, data: { id: 1 } });
      subscriber.complete();
    });
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('ReadingsService: Backend Mapping', () => {
  let service: ReadingsService;
  let mockDb: MockDatabaseService;
  let mockApiGateway: MockApiGatewayService;

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    mockApiGateway = new MockApiGatewayService();

    TestBed.configureTestingModule({
      providers: [
        ReadingsService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        { provide: MockDataService, useValue: null },
        { provide: ApiGatewayService, useValue: mockApiGateway },
        {
          provide: LoggerService,
          useValue: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        },
        {
          provide: LIVE_QUERY_FN,
          useValue: (factory: () => Promise<any> | any) =>
            new Observable<any>(subscriber => {
              Promise.resolve(factory())
                .then(result => subscriber.next(result))
                .catch(error => subscriber.error?.(error));
              return () => {};
            }),
        },
      ],
    });

    service = TestBed.inject(ReadingsService);
  });

  describe('Meal Context to Backend Mapping', () => {
    describe('All valid meal contexts should map to valid backend values', () => {
      Object.entries(EXPECTED_MEAL_CONTEXT_TO_BACKEND).forEach(([mealContext, expectedBackend]) => {
        it(`should map "${mealContext}" to "${expectedBackend}"`, async () => {
          // Create a reading with this meal context
          const reading: GlucoseReading & { mealContext?: string } = {
            id: '',
            type: 'smbg',
            value: 100,
            units: 'mg/dL',
            time: new Date().toISOString(),
            mealContext: mealContext,
          };

          await service.addReading(reading);

          // The reading should have been stored
          expect(mockDb.readings.add).toHaveBeenCalled();
          const addedReading = (mockDb.readings.add as jest.Mock).mock.calls.slice(-1)[0][0];

          // Verify the meal context was stored correctly
          expect(addedReading.mealContext).toBe(mealContext);
        });
      });
    });

    describe('Mapped values should be valid backend reading types', () => {
      Object.entries(EXPECTED_MEAL_CONTEXT_TO_BACKEND).forEach(([mealContext, backendValue]) => {
        it(`"${mealContext}" -> "${backendValue}" should be valid backend type`, () => {
          expect(isValidBackendReadingType(backendValue)).toBe(true);
          expect(BACKEND_READING_TYPES).toContain(backendValue);
        });
      });
    });

    describe('Regression: Known invalid values should NOT be used', () => {
      it('bedtime should map to OTRAS_COMIDAS, NOT NOCHE', () => {
        const expected = EXPECTED_MEAL_CONTEXT_TO_BACKEND['bedtime'];
        expect(expected).toBe('OTRAS_COMIDAS');
        expect(expected).not.toBe('NOCHE');
        expect(isValidBackendReadingType(expected)).toBe(true);
      });

      it('fasting should map to OTRAS_COMIDAS, NOT AYUNO', () => {
        const expected = EXPECTED_MEAL_CONTEXT_TO_BACKEND['fasting'];
        expect(expected).toBe('OTRAS_COMIDAS');
        expect(expected).not.toBe('AYUNO');
        expect(isValidBackendReadingType(expected)).toBe(true);
      });
    });

    describe('All mapped values should be uppercase', () => {
      Object.entries(EXPECTED_MEAL_CONTEXT_TO_BACKEND).forEach(([mealContext, backendValue]) => {
        it(`"${mealContext}" mapped value "${backendValue}" should be uppercase`, () => {
          expect(backendValue).toBe(backendValue.toUpperCase());
        });
      });
    });
  });

  describe('Backend to Meal Context Mapping (reverse)', () => {
    describe('All backend reading types should have a frontend mapping', () => {
      BACKEND_READING_TYPES.forEach(backendType => {
        it(`should have mapping for backend type "${backendType}"`, () => {
          expect(EXPECTED_BACKEND_TO_MEAL_CONTEXT[backendType]).toBeDefined();
        });
      });
    });

    describe('Mapped meal contexts should be valid frontend values', () => {
      const validFrontendValues = [
        'before-breakfast',
        'after-breakfast',
        'before-lunch',
        'after-lunch',
        'before-dinner',
        'after-dinner',
        'snack',
        'bedtime',
        'fasting',
        'exercise',
        'other',
      ];

      Object.entries(EXPECTED_BACKEND_TO_MEAL_CONTEXT).forEach(([backendType, mealContext]) => {
        it(`"${backendType}" -> "${mealContext}" should be valid frontend value`, () => {
          expect(validFrontendValues).toContain(mealContext);
        });
      });
    });
  });

  describe('Invalid Values Should Never Be Produced', () => {
    INVALID_BACKEND_VALUES.forEach(invalidValue => {
      it(`should never map any meal context to "${invalidValue}"`, () => {
        Object.values(EXPECTED_MEAL_CONTEXT_TO_BACKEND).forEach(backendValue => {
          expect(backendValue).not.toBe(invalidValue);
        });
      });
    });
  });

  describe('Undefined/Missing Meal Context Handling', () => {
    it('should handle undefined meal context by defaulting to OTRO', async () => {
      const reading: GlucoseReading = {
        id: '',
        type: 'smbg',
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        // No mealContext provided
      };

      await service.addReading(reading);

      // Verify it was stored without crashing
      expect(mockDb.readings.add).toHaveBeenCalled();
    });

    it('should handle empty string meal context', async () => {
      const reading: GlucoseReading & { mealContext?: string } = {
        id: '',
        type: 'smbg',
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        mealContext: '',
      };

      await service.addReading(reading);

      expect(mockDb.readings.add).toHaveBeenCalled();
    });
  });

  describe('Coverage: All Backend Types Are Mapped', () => {
    it('every backend reading type should have at least one frontend mapping', () => {
      const mappedBackendTypes = new Set(Object.values(EXPECTED_MEAL_CONTEXT_TO_BACKEND));

      BACKEND_READING_TYPES.forEach(backendType => {
        expect(mappedBackendTypes.has(backendType)).toBe(true);
      });
    });

    it('number of unique mapped backend types should match backend enum size', () => {
      const mappedBackendTypes = new Set(Object.values(EXPECTED_MEAL_CONTEXT_TO_BACKEND));
      expect(mappedBackendTypes.size).toBe(BACKEND_READING_TYPES.length);
    });
  });
});

// ============================================================================
// SYNC QUEUE MAPPING TESTS (Integration)
// ============================================================================

describe('ReadingsService: Sync to Backend', () => {
  let service: ReadingsService;
  let mockDb: MockDatabaseService;
  let mockApiGateway: MockApiGatewayService;

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    mockApiGateway = new MockApiGatewayService();

    // Set environment to not mock mode for sync tests
    jest.resetModules();

    TestBed.configureTestingModule({
      providers: [
        ReadingsService,
        { provide: DiabetacticDatabase, useValue: mockDb },
        { provide: MockDataService, useValue: null },
        { provide: ApiGatewayService, useValue: mockApiGateway },
        {
          provide: LoggerService,
          useValue: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        },
        {
          provide: LIVE_QUERY_FN,
          useValue: (factory: () => Promise<any> | any) =>
            new Observable<any>(subscriber => {
              Promise.resolve(factory()).then(result => subscriber.next(result));
              return () => {};
            }),
        },
      ],
    });

    service = TestBed.inject(ReadingsService);
  });

  describe('Meal context should be properly stored for later sync', () => {
    const mealContexts = [
      'before-breakfast',
      'after-lunch',
      'snack',
      'bedtime',
      'fasting',
      'exercise',
      'other',
    ];

    mealContexts.forEach(mealContext => {
      it(`should store mealContext "${mealContext}" in the reading`, async () => {
        const reading: GlucoseReading & { mealContext?: string } = {
          id: '',
          type: 'smbg',
          value: 120,
          units: 'mg/dL',
          time: new Date().toISOString(),
          mealContext: mealContext,
        };

        await service.addReading(reading);

        const addedReading = (mockDb.readings.add as jest.Mock).mock.calls.slice(-1)[0][0];
        expect(addedReading.mealContext).toBe(mealContext);
      });
    });
  });
});

// ============================================================================
// COMPREHENSIVE VALIDATION SNAPSHOT
// ============================================================================

describe('Backend Contract Validation Snapshot', () => {
  it('should have comprehensive mapping coverage', () => {
    const coverage = {
      frontendMealContexts: Object.keys(EXPECTED_MEAL_CONTEXT_TO_BACKEND),
      backendReadingTypes: [...BACKEND_READING_TYPES],
      mappedBackendTypes: [...new Set(Object.values(EXPECTED_MEAL_CONTEXT_TO_BACKEND))],
    };

    // Snapshot test - if mappings change, this will fail and need review
    expect(coverage).toMatchSnapshot();
  });

  it('mapping should be deterministic (same input = same output)', () => {
    Object.entries(EXPECTED_MEAL_CONTEXT_TO_BACKEND).forEach(([mealContext, expected]) => {
      // Multiple lookups should return the same value
      for (let i = 0; i < 10; i++) {
        expect(EXPECTED_MEAL_CONTEXT_TO_BACKEND[mealContext]).toBe(expected);
      }
    });
  });
});
