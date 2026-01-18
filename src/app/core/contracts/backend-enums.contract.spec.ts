/**
 * Backend/Frontend Contract Alignment Tests
 *
 * These tests ensure that frontend constants, mappings, and types
 * exactly match the backend API expectations.
 *
 * CRITICAL: If any of these tests fail, it means there's a mismatch
 * between frontend and backend that will cause 422 validation errors.
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import {
  BACKEND_READING_TYPES,
  BACKEND_APPOINTMENT_MOTIVES,
  BACKEND_QUEUE_STATES,
  ALL_QUEUE_STATES,
  isValidBackendReadingType,
  isValidBackendMotive,
  isValidBackendQueueState,
  assertValidReadingType,
  assertValidMotive,
  BackendReadingType,
  BackendAppointmentMotive,
} from './backend-enums.contract';

import {
  APPOINTMENT_MOTIVES,
  QUEUE_STATES,
  MOTIVE_TRANSLATION_KEYS,
  AppointmentMotive,
  AppointmentQueueState,
} from '@models/appointment.model';

// ============================================================================
// GLUCOSE READING TYPE TESTS
// ============================================================================

describe('Backend Contract: Glucose Reading Types', () => {
  const EXPECTED_TYPES: BackendReadingType[] = [
    'DESAYUNO',
    'ALMUERZO',
    'MERIENDA',
    'CENA',
    'EJERCICIO',
    'OTRAS_COMIDAS',
    'OTRO',
  ];
  const INVALID_TYPES = ['NOCHE', 'AYUNO', 'FASTING', 'desayuno', '', 'breakfast', 'lunch'];

  it('should contain all required reading types', () => {
    expect(BACKEND_READING_TYPES).toHaveLength(EXPECTED_TYPES.length);
    EXPECTED_TYPES.forEach(type => {
      expect(BACKEND_READING_TYPES).toContain(type);
    });
  });

  it('should only contain uppercase values', () => {
    BACKEND_READING_TYPES.forEach(type => {
      expect(type).toBe(type.toUpperCase());
    });
  });

  it('should validate correct types with isValidBackendReadingType', () => {
    EXPECTED_TYPES.forEach(type => {
      expect(isValidBackendReadingType(type)).toBe(true);
    });
  });

  it('should reject invalid types with isValidBackendReadingType', () => {
    INVALID_TYPES.forEach(type => {
      expect(isValidBackendReadingType(type)).toBe(false);
    });
  });

  it('should not throw for valid types in assertValidReadingType', () => {
    EXPECTED_TYPES.forEach(type => {
      expect(() => assertValidReadingType(type)).not.toThrow();
    });
  });

  it('should throw for invalid types in assertValidReadingType', () => {
    INVALID_TYPES.filter(t => t !== '').forEach(type => {
      expect(() => assertValidReadingType(type)).toThrow(/Invalid reading_type/);
    });
  });
});

// ============================================================================
// APPOINTMENT MOTIVE TESTS
// ============================================================================

describe('Backend Contract: Appointment Motives', () => {
  const EXPECTED_MOTIVES: BackendAppointmentMotive[] = [
    'AJUSTE',
    'HIPOGLUCEMIA',
    'HIPERGLUCEMIA',
    'CETOSIS',
    'DUDAS',
    'OTRO',
  ];
  const INVALID_MOTIVES = [
    'control_routine',
    'follow_up',
    'emergency',
    'consultation',
    'adjustment',
    'other',
    'ajuste',
  ];

  it('should contain all required motives', () => {
    expect(BACKEND_APPOINTMENT_MOTIVES).toHaveLength(EXPECTED_MOTIVES.length);
    EXPECTED_MOTIVES.forEach(motive => {
      expect(BACKEND_APPOINTMENT_MOTIVES).toContain(motive);
    });
  });

  it('should only contain uppercase values', () => {
    BACKEND_APPOINTMENT_MOTIVES.forEach(motive => {
      expect(motive).toBe(motive.toUpperCase());
    });
  });

  it('should validate correct motives with isValidBackendMotive', () => {
    EXPECTED_MOTIVES.forEach(motive => {
      expect(isValidBackendMotive(motive)).toBe(true);
    });
  });

  it('should reject invalid/old English motives', () => {
    INVALID_MOTIVES.forEach(motive => {
      expect(isValidBackendMotive(motive)).toBe(false);
    });
  });

  it('should not throw for valid motives in assertValidMotive', () => {
    EXPECTED_MOTIVES.forEach(motive => {
      expect(() => assertValidMotive(motive)).not.toThrow();
    });
  });
});

// ============================================================================
// QUEUE STATE TESTS
// ============================================================================

describe('Backend Contract: Queue States', () => {
  const EXPECTED_BACKEND_STATES = ['PENDING', 'ACCEPTED', 'DENIED', 'CREATED', 'NONE'];

  it('should contain all backend queue states', () => {
    expect(BACKEND_QUEUE_STATES).toHaveLength(EXPECTED_BACKEND_STATES.length);
    EXPECTED_BACKEND_STATES.forEach(state => {
      expect(BACKEND_QUEUE_STATES).toContain(state);
    });
  });

  it('should include NONE as a backend state (returned by backend for users with no appointment)', () => {
    expect(BACKEND_QUEUE_STATES).toContain('NONE');
  });

  it('should include all states in ALL_QUEUE_STATES', () => {
    expect(ALL_QUEUE_STATES).toContain('NONE');
    expect(ALL_QUEUE_STATES).toHaveLength(EXPECTED_BACKEND_STATES.length);
  });

  it('should validate backend states with isValidBackendQueueState', () => {
    EXPECTED_BACKEND_STATES.forEach(state => {
      expect(isValidBackendQueueState(state)).toBe(true);
    });
    expect(isValidBackendQueueState('pending')).toBe(false);
  });
});

// ============================================================================
// FRONTEND MODEL ALIGNMENT TESTS
// ============================================================================

describe('Frontend Model Alignment', () => {
  it('APPOINTMENT_MOTIVES matches backend exactly', () => {
    expect(APPOINTMENT_MOTIVES.length).toBe(BACKEND_APPOINTMENT_MOTIVES.length);
    BACKEND_APPOINTMENT_MOTIVES.forEach((motive, index) => {
      expect(APPOINTMENT_MOTIVES).toContain(motive);
      expect(APPOINTMENT_MOTIVES[index]).toBe(motive);
    });
  });

  it('MOTIVE_TRANSLATION_KEYS covers all motives with correct format', () => {
    APPOINTMENT_MOTIVES.forEach(motive => {
      expect(MOTIVE_TRANSLATION_KEYS[motive]).toBeDefined();
      expect(MOTIVE_TRANSLATION_KEYS[motive]).toMatch(/^appointments\.motives\./);
    });
  });

  it('QUEUE_STATES is superset of backend states plus NONE', () => {
    BACKEND_QUEUE_STATES.forEach(state => {
      expect(QUEUE_STATES).toContain(state);
    });
    expect(QUEUE_STATES).toContain('NONE');
    expect(QUEUE_STATES).toHaveLength(6); // 4 backend + NONE + RESOLVED (frontend)
  });
});

// ============================================================================
// TYPE COMPATIBILITY & CROSS-REFERENCE VALIDATION
// ============================================================================

describe('Type Compatibility & Cross-Reference', () => {
  it('AppointmentMotive type accepts all backend values', () => {
    const motives: AppointmentMotive[] = [...BACKEND_APPOINTMENT_MOTIVES];
    expect(motives).toHaveLength(6);
  });

  it('AppointmentQueueState type accepts all queue states', () => {
    const states: AppointmentQueueState[] = [...QUEUE_STATES];
    expect(states).toHaveLength(6);
  });

  it('BackendReadingType accepts all valid reading types', () => {
    const types: BackendReadingType[] = [...BACKEND_READING_TYPES];
    expect(types).toHaveLength(7);
  });

  it('bidirectional mapping: frontend motives match backend exactly', () => {
    const backendSet = new Set(BACKEND_APPOINTMENT_MOTIVES);
    const frontendSet = new Set(APPOINTMENT_MOTIVES);

    // Every frontend motive exists in backend
    const frontendMismatches = APPOINTMENT_MOTIVES.filter(
      m => !backendSet.has(m as BackendAppointmentMotive)
    );
    expect(frontendMismatches).toEqual([]);

    // Every backend motive exists in frontend
    const backendMismatches = BACKEND_APPOINTMENT_MOTIVES.filter(
      m => !frontendSet.has(m as AppointmentMotive)
    );
    expect(backendMismatches).toEqual([]);
  });
});
