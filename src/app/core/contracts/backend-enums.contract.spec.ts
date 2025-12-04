/**
 * Backend/Frontend Contract Alignment Tests
 *
 * These tests ensure that frontend constants, mappings, and types
 * exactly match the backend API expectations.
 *
 * CRITICAL: If any of these tests fail, it means there's a mismatch
 * between frontend and backend that will cause 422 validation errors.
 *
 * When backend enums change:
 * 1. Update backend-enums.contract.ts with the new values
 * 2. Update the affected frontend models/services
 * 3. Run these tests to verify alignment
 */

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
} from '../models/appointment.model';

// ============================================================================
// GLUCOSE READING TYPE TESTS
// ============================================================================

describe('Backend Contract: Glucose Reading Types', () => {
  describe('BACKEND_READING_TYPES constant', () => {
    it('should contain exactly 7 valid reading types', () => {
      expect(BACKEND_READING_TYPES).toHaveLength(7);
    });

    it('should contain DESAYUNO (breakfast)', () => {
      expect(BACKEND_READING_TYPES).toContain('DESAYUNO');
    });

    it('should contain ALMUERZO (lunch)', () => {
      expect(BACKEND_READING_TYPES).toContain('ALMUERZO');
    });

    it('should contain MERIENDA (snack)', () => {
      expect(BACKEND_READING_TYPES).toContain('MERIENDA');
    });

    it('should contain CENA (dinner)', () => {
      expect(BACKEND_READING_TYPES).toContain('CENA');
    });

    it('should contain EJERCICIO (exercise)', () => {
      expect(BACKEND_READING_TYPES).toContain('EJERCICIO');
    });

    it('should contain OTRAS_COMIDAS (other meals)', () => {
      expect(BACKEND_READING_TYPES).toContain('OTRAS_COMIDAS');
    });

    it('should contain OTRO (other)', () => {
      expect(BACKEND_READING_TYPES).toContain('OTRO');
    });

    it('should NOT contain invalid values like NOCHE', () => {
      expect(BACKEND_READING_TYPES).not.toContain('NOCHE');
    });

    it('should NOT contain invalid values like AYUNO', () => {
      expect(BACKEND_READING_TYPES).not.toContain('AYUNO');
    });

    it('should NOT contain invalid values like FASTING', () => {
      expect(BACKEND_READING_TYPES).not.toContain('FASTING');
    });

    it('should NOT contain lowercase values', () => {
      BACKEND_READING_TYPES.forEach(type => {
        expect(type).toBe(type.toUpperCase());
      });
    });
  });

  describe('isValidBackendReadingType validation', () => {
    it('should return true for all valid backend values', () => {
      BACKEND_READING_TYPES.forEach(type => {
        expect(isValidBackendReadingType(type)).toBe(true);
      });
    });

    it('should return false for invalid value NOCHE', () => {
      expect(isValidBackendReadingType('NOCHE')).toBe(false);
    });

    it('should return false for invalid value AYUNO', () => {
      expect(isValidBackendReadingType('AYUNO')).toBe(false);
    });

    it('should return false for lowercase versions', () => {
      expect(isValidBackendReadingType('desayuno')).toBe(false);
      expect(isValidBackendReadingType('almuerzo')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidBackendReadingType('')).toBe(false);
    });

    it('should return false for random strings', () => {
      expect(isValidBackendReadingType('breakfast')).toBe(false);
      expect(isValidBackendReadingType('lunch')).toBe(false);
      expect(isValidBackendReadingType('dinner')).toBe(false);
    });
  });

  describe('assertValidReadingType', () => {
    it('should not throw for valid values', () => {
      BACKEND_READING_TYPES.forEach(type => {
        expect(() => assertValidReadingType(type)).not.toThrow();
      });
    });

    it('should throw for invalid value NOCHE', () => {
      expect(() => assertValidReadingType('NOCHE')).toThrow(/Invalid reading_type/);
    });

    it('should throw for invalid value AYUNO', () => {
      expect(() => assertValidReadingType('AYUNO')).toThrow(/Invalid reading_type/);
    });

    it('should include valid values in error message', () => {
      expect(() => assertValidReadingType('INVALID')).toThrow(/DESAYUNO/);
    });
  });
});

// ============================================================================
// APPOINTMENT MOTIVE TESTS
// ============================================================================

describe('Backend Contract: Appointment Motives', () => {
  describe('BACKEND_APPOINTMENT_MOTIVES constant', () => {
    it('should contain exactly 6 valid motives', () => {
      expect(BACKEND_APPOINTMENT_MOTIVES).toHaveLength(6);
    });

    it('should contain AJUSTE (adjustment)', () => {
      expect(BACKEND_APPOINTMENT_MOTIVES).toContain('AJUSTE');
    });

    it('should contain HIPOGLUCEMIA (hypoglycemia)', () => {
      expect(BACKEND_APPOINTMENT_MOTIVES).toContain('HIPOGLUCEMIA');
    });

    it('should contain HIPERGLUCEMIA (hyperglycemia)', () => {
      expect(BACKEND_APPOINTMENT_MOTIVES).toContain('HIPERGLUCEMIA');
    });

    it('should contain CETOSIS (ketosis)', () => {
      expect(BACKEND_APPOINTMENT_MOTIVES).toContain('CETOSIS');
    });

    it('should contain DUDAS (questions)', () => {
      expect(BACKEND_APPOINTMENT_MOTIVES).toContain('DUDAS');
    });

    it('should contain OTRO (other)', () => {
      expect(BACKEND_APPOINTMENT_MOTIVES).toContain('OTRO');
    });

    it('should NOT contain old English values', () => {
      expect(BACKEND_APPOINTMENT_MOTIVES).not.toContain('control_routine');
      expect(BACKEND_APPOINTMENT_MOTIVES).not.toContain('follow_up');
      expect(BACKEND_APPOINTMENT_MOTIVES).not.toContain('emergency');
      expect(BACKEND_APPOINTMENT_MOTIVES).not.toContain('consultation');
      expect(BACKEND_APPOINTMENT_MOTIVES).not.toContain('adjustment');
      expect(BACKEND_APPOINTMENT_MOTIVES).not.toContain('other');
    });

    it('should NOT contain lowercase values', () => {
      BACKEND_APPOINTMENT_MOTIVES.forEach(motive => {
        expect(motive).toBe(motive.toUpperCase());
      });
    });
  });

  describe('isValidBackendMotive validation', () => {
    it('should return true for all valid backend values', () => {
      BACKEND_APPOINTMENT_MOTIVES.forEach(motive => {
        expect(isValidBackendMotive(motive)).toBe(true);
      });
    });

    it('should return false for old English values', () => {
      expect(isValidBackendMotive('control_routine')).toBe(false);
      expect(isValidBackendMotive('follow_up')).toBe(false);
      expect(isValidBackendMotive('emergency')).toBe(false);
    });

    it('should return false for lowercase versions', () => {
      expect(isValidBackendMotive('ajuste')).toBe(false);
      expect(isValidBackendMotive('hipoglucemia')).toBe(false);
    });
  });

  describe('assertValidMotive', () => {
    it('should not throw for valid values', () => {
      BACKEND_APPOINTMENT_MOTIVES.forEach(motive => {
        expect(() => assertValidMotive(motive)).not.toThrow();
      });
    });

    it('should throw for old English values', () => {
      expect(() => assertValidMotive('control_routine')).toThrow(/Invalid motive/);
      expect(() => assertValidMotive('follow_up')).toThrow(/Invalid motive/);
    });
  });
});

// ============================================================================
// QUEUE STATE TESTS
// ============================================================================

describe('Backend Contract: Queue States', () => {
  describe('BACKEND_QUEUE_STATES constant', () => {
    it('should contain exactly 4 backend states', () => {
      expect(BACKEND_QUEUE_STATES).toHaveLength(4);
    });

    it('should contain PENDING', () => {
      expect(BACKEND_QUEUE_STATES).toContain('PENDING');
    });

    it('should contain ACCEPTED', () => {
      expect(BACKEND_QUEUE_STATES).toContain('ACCEPTED');
    });

    it('should contain DENIED', () => {
      expect(BACKEND_QUEUE_STATES).toContain('DENIED');
    });

    it('should contain CREATED', () => {
      expect(BACKEND_QUEUE_STATES).toContain('CREATED');
    });

    it('should NOT contain NONE (frontend-only)', () => {
      expect(BACKEND_QUEUE_STATES).not.toContain('NONE');
    });
  });

  describe('ALL_QUEUE_STATES includes frontend-only state', () => {
    it('should contain all backend states plus NONE', () => {
      expect(ALL_QUEUE_STATES).toHaveLength(5);
      expect(ALL_QUEUE_STATES).toContain('NONE');
    });
  });

  describe('isValidBackendQueueState validation', () => {
    it('should return true for all backend states', () => {
      BACKEND_QUEUE_STATES.forEach(state => {
        expect(isValidBackendQueueState(state)).toBe(true);
      });
    });

    it('should return false for NONE (frontend-only)', () => {
      expect(isValidBackendQueueState('NONE')).toBe(false);
    });

    it('should return false for lowercase versions', () => {
      expect(isValidBackendQueueState('pending')).toBe(false);
      expect(isValidBackendQueueState('accepted')).toBe(false);
    });
  });
});

// ============================================================================
// FRONTEND MODEL ALIGNMENT TESTS
// ============================================================================

describe('Frontend Model Alignment: Appointment Motives', () => {
  describe('APPOINTMENT_MOTIVES matches backend exactly', () => {
    it('should have the same length as backend motives', () => {
      expect(APPOINTMENT_MOTIVES.length).toBe(BACKEND_APPOINTMENT_MOTIVES.length);
    });

    it('should contain all backend motive values', () => {
      BACKEND_APPOINTMENT_MOTIVES.forEach(motive => {
        expect(APPOINTMENT_MOTIVES).toContain(motive);
      });
    });

    it('should have all values be valid backend motives', () => {
      APPOINTMENT_MOTIVES.forEach(motive => {
        expect(isValidBackendMotive(motive)).toBe(true);
      });
    });

    it('should be in the same order as backend', () => {
      BACKEND_APPOINTMENT_MOTIVES.forEach((motive, index) => {
        expect(APPOINTMENT_MOTIVES[index]).toBe(motive);
      });
    });
  });

  describe('MOTIVE_TRANSLATION_KEYS covers all motives', () => {
    it('should have a translation key for every motive', () => {
      APPOINTMENT_MOTIVES.forEach(motive => {
        expect(MOTIVE_TRANSLATION_KEYS[motive]).toBeDefined();
        expect(typeof MOTIVE_TRANSLATION_KEYS[motive]).toBe('string');
      });
    });

    it('should have translation keys in correct format', () => {
      Object.values(MOTIVE_TRANSLATION_KEYS).forEach(key => {
        expect(key).toMatch(/^appointments\.motives\./);
      });
    });
  });
});

describe('Frontend Model Alignment: Queue States', () => {
  describe('QUEUE_STATES matches backend plus NONE', () => {
    it('should contain all backend queue states', () => {
      BACKEND_QUEUE_STATES.forEach(state => {
        expect(QUEUE_STATES).toContain(state);
      });
    });

    it('should contain frontend-only NONE state', () => {
      expect(QUEUE_STATES).toContain('NONE');
    });

    it('should have exactly 6 states (5 backend + 1 frontend)', () => {
      expect(QUEUE_STATES).toHaveLength(6);
    });
  });
});

// ============================================================================
// TYPE COMPATIBILITY TESTS
// ============================================================================

describe('Type Compatibility', () => {
  describe('AppointmentMotive type', () => {
    it('should accept all backend motive values', () => {
      // This test verifies TypeScript type compatibility
      const motives: AppointmentMotive[] = [...BACKEND_APPOINTMENT_MOTIVES];
      expect(motives).toHaveLength(6);
    });
  });

  describe('AppointmentQueueState type', () => {
    it('should accept all queue state values including NONE', () => {
      const states: AppointmentQueueState[] = [...QUEUE_STATES];
      expect(states).toHaveLength(6);
    });
  });

  describe('BackendReadingType assignability', () => {
    it('should be assignable from valid string literals', () => {
      const types: BackendReadingType[] = [
        'DESAYUNO',
        'ALMUERZO',
        'MERIENDA',
        'CENA',
        'EJERCICIO',
        'OTRAS_COMIDAS',
        'OTRO',
      ];
      expect(types).toHaveLength(7);
    });
  });
});

// ============================================================================
// REGRESSION TESTS - Known Past Issues
// ============================================================================

describe('Regression Tests: Known Past Issues', () => {
  describe('Reading Type Mapping (Issue: NOCHE/AYUNO caused 422)', () => {
    it('should NOT include NOCHE in valid reading types', () => {
      expect(BACKEND_READING_TYPES).not.toContain('NOCHE');
      expect(isValidBackendReadingType('NOCHE')).toBe(false);
    });

    it('should NOT include AYUNO in valid reading types', () => {
      expect(BACKEND_READING_TYPES).not.toContain('AYUNO');
      expect(isValidBackendReadingType('AYUNO')).toBe(false);
    });

    it('should have OTRAS_COMIDAS as fallback for bedtime/fasting', () => {
      expect(BACKEND_READING_TYPES).toContain('OTRAS_COMIDAS');
    });
  });

  describe('Appointment Motive Mapping (Issue: English values caused 422)', () => {
    it('should NOT include control_routine', () => {
      expect(BACKEND_APPOINTMENT_MOTIVES).not.toContain('control_routine');
      expect(APPOINTMENT_MOTIVES).not.toContain('control_routine');
    });

    it('should NOT include follow_up', () => {
      expect(BACKEND_APPOINTMENT_MOTIVES).not.toContain('follow_up');
      expect(APPOINTMENT_MOTIVES).not.toContain('follow_up');
    });

    it('should NOT include emergency', () => {
      expect(BACKEND_APPOINTMENT_MOTIVES).not.toContain('emergency');
      expect(APPOINTMENT_MOTIVES).not.toContain('emergency');
    });

    it('should NOT include consultation', () => {
      expect(BACKEND_APPOINTMENT_MOTIVES).not.toContain('consultation');
      expect(APPOINTMENT_MOTIVES).not.toContain('consultation');
    });

    it('should use AJUSTE instead of adjustment', () => {
      expect(APPOINTMENT_MOTIVES).toContain('AJUSTE');
      expect(APPOINTMENT_MOTIVES).not.toContain('adjustment');
    });

    it('should use OTRO instead of other', () => {
      expect(APPOINTMENT_MOTIVES).toContain('OTRO');
      expect(APPOINTMENT_MOTIVES).not.toContain('other');
    });
  });
});

// ============================================================================
// COMPREHENSIVE VALIDATION - ALL VALUES CROSS-REFERENCED
// ============================================================================

describe('Comprehensive Cross-Reference Validation', () => {
  it('every APPOINTMENT_MOTIVES value must be in BACKEND_APPOINTMENT_MOTIVES', () => {
    const backendSet = new Set(BACKEND_APPOINTMENT_MOTIVES);
    const mismatches: string[] = [];

    APPOINTMENT_MOTIVES.forEach(motive => {
      if (!backendSet.has(motive as BackendAppointmentMotive)) {
        mismatches.push(motive);
      }
    });

    expect(mismatches).toEqual([]);
  });

  it('every BACKEND_APPOINTMENT_MOTIVES value must be in APPOINTMENT_MOTIVES', () => {
    const frontendSet = new Set(APPOINTMENT_MOTIVES);
    const mismatches: string[] = [];

    BACKEND_APPOINTMENT_MOTIVES.forEach(motive => {
      if (!frontendSet.has(motive as AppointmentMotive)) {
        mismatches.push(motive);
      }
    });

    expect(mismatches).toEqual([]);
  });

  it('QUEUE_STATES should be a superset of BACKEND_QUEUE_STATES', () => {
    const frontendSet = new Set(QUEUE_STATES);
    const missingInFrontend: string[] = [];

    BACKEND_QUEUE_STATES.forEach(state => {
      if (!frontendSet.has(state as AppointmentQueueState)) {
        missingInFrontend.push(state);
      }
    });

    expect(missingInFrontend).toEqual([]);
  });
});
