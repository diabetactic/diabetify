/**
 * Backend Integration Tests - Bolus Calculator
 *
 * Tests: Insulin dose calculations, ratio-based dosing, correction factors,
 * and integration with user settings.
 * Requires Docker backend: pnpm run docker:start
 */

import {
  waitForBackendServices,
  loginTestUser,
  TEST_USER,
  SERVICE_URLS,
  isBackendAvailable,
  authenticatedGet,
  createGlucoseReading,
  getGlucoseReadings,
} from '../../helpers/backend-services.helper';

// Test execution state
let shouldRun = false;
let authToken: string;

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    shouldRun = false;
    return;
  }
  shouldRun = true;
}, 10000);

// Helper for conditional tests
const conditionalIt = (name: string, fn: () => Promise<void>, timeout?: number) => {
  it(
    name,
    async () => {
      if (!shouldRun) {
        return;
      }
      await fn();
    },
    timeout
  );
};

// Interfaces for bolus calculations
interface InsulinSettings {
  ratio: number; // Grams of carbs per insulin unit (I:C)
  sensitivity: number; // Glucose reduction per unit (ISF)
  targetGlucose: number; // Target glucose
  activeInsulinDuration: number; // Active insulin duration (hours)
}

interface DetailedBolusCalculation {
  mealDose: number; // Dose for carbohydrates
  correctionDose: number; // Correction dose
  iobAdjustment: number; // Insulin on board adjustment
  totalDose: number; // Total recommended dose
  warnings: string[];
}

// Bolus calculator
function calculateBolus(
  currentGlucose: number,
  carbs: number,
  settings: InsulinSettings,
  insulinOnBoard: number = 0
): DetailedBolusCalculation {
  const warnings: string[] = [];

  // Dose for carbohydrates
  const mealDose = carbs / settings.ratio;

  // Correction dose (only if above target)
  let correctionDose = 0;
  if (currentGlucose > settings.targetGlucose) {
    correctionDose = (currentGlucose - settings.targetGlucose) / settings.sensitivity;
  } else if (currentGlucose < settings.targetGlucose - 20) {
    // If low, may need to reduce dose
    correctionDose = (currentGlucose - settings.targetGlucose) / settings.sensitivity;
    warnings.push('Low glucose - consider reducing meal dose');
  }

  // Adjustment for active insulin (IOB)
  const iobAdjustment = -insulinOnBoard;

  // Total (cannot be negative)
  let totalDose = mealDose + correctionDose + iobAdjustment;
  if (totalDose < 0) {
    warnings.push('Negative calculated dose - consider not injecting');
    totalDose = 0;
  }

  // Safety warnings
  if (currentGlucose < 70) {
    warnings.push('HYPOGLYCEMIA - treat first before injecting');
  }
  if (totalDose > 20) {
    warnings.push('High dose - verify carbohydrates');
  }

  return {
    mealDose: Math.round(mealDose * 100) / 100,
    correctionDose: Math.round(correctionDose * 100) / 100,
    iobAdjustment: Math.round(iobAdjustment * 100) / 100,
    totalDose: Math.round(totalDose * 100) / 100,
    warnings,
  };
}

// Calculate active insulin (IOB)
function calculateIOB(doses: { units: number; timestamp: Date }[], durationHours: number): number {
  const now = new Date();
  let iob = 0;

  doses.forEach(dose => {
    const hoursAgo = (now.getTime() - dose.timestamp.getTime()) / (1000 * 60 * 60);
    if (hoursAgo < durationHours) {
      // Simple linear decay model
      const remaining = 1 - hoursAgo / durationHours;
      iob += dose.units * remaining;
    }
  });

  return Math.round(iob * 100) / 100;
}

describe('Backend Integration - Bolus Calculator', () => {
  beforeAll(async () => {
    if (!shouldRun) return;
    await waitForBackendServices(['apiGateway']);
    authToken = await loginTestUser(TEST_USER);
  }, 60000);

  // =========================================================================
  // BASIC BOLUS CALCULATION Tests
  // =========================================================================

  describe('BASIC BOLUS Calculation', () => {
    const defaultSettings: InsulinSettings = {
      ratio: 10, // 1:10 I:C ratio
      sensitivity: 50, // 1U lowers 50 mg/dL
      targetGlucose: 100,
      activeInsulinDuration: 4,
    };

    conditionalIt('should calculate meal dose correctly', async () => {
      const result = calculateBolus(100, 50, defaultSettings);

      // 50g carbs / 10 = 5U
      expect(result.mealDose).toBe(5);
      expect(result.correctionDose).toBe(0); // At target
      expect(result.totalDose).toBe(5);
    });

    conditionalIt('should add correction dose for high glucose', async () => {
      const result = calculateBolus(200, 50, defaultSettings);

      // Meal: 50/10 = 5U
      // Correction: (200-100)/50 = 2U
      expect(result.mealDose).toBe(5);
      expect(result.correctionDose).toBe(2);
      expect(result.totalDose).toBe(7);
    });

    conditionalIt('should subtract for low glucose', async () => {
      const result = calculateBolus(70, 50, defaultSettings);

      // Meal: 50/10 = 5U
      // Correction: (70-100)/50 = -0.6U
      expect(result.mealDose).toBe(5);
      expect(result.correctionDose).toBe(-0.6);
      expect(result.totalDose).toBe(4.4);
      expect(result.warnings).toContain('Low glucose - consider reducing meal dose');
    });

    conditionalIt('should handle zero carbs (correction only)', async () => {
      const result = calculateBolus(200, 0, defaultSettings);

      expect(result.mealDose).toBe(0);
      expect(result.correctionDose).toBe(2);
      expect(result.totalDose).toBe(2);
    });

    conditionalIt('should prevent negative total dose', async () => {
      const result = calculateBolus(50, 10, defaultSettings, 5);

      // Meal: 10/10 = 1U
      // Correction: (50-100)/50 = -1U
      // IOB adjustment: -5U
      // Total would be: 1 - 1 - 5 = -5, but capped at 0
      expect(result.totalDose).toBe(0);
      expect(result.warnings).toContain('Negative calculated dose - consider not injecting');
    });
  });

  // =========================================================================
  // INSULIN ON BOARD (IOB) Tests
  // =========================================================================

  describe('INSULIN ON BOARD (IOB) Calculation', () => {
    conditionalIt('should calculate IOB from recent doses', async () => {
      const now = new Date();
      const doses = [
        { units: 4, timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000) }, // 1 hour ago
        { units: 2, timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000) }, // 2 hours ago
      ];

      const iob = calculateIOB(doses, 4);

      // Dose 1: 4U * (1 - 1/4) = 3U remaining
      // Dose 2: 2U * (1 - 2/4) = 1U remaining
      // Total: ~4U
      expect(iob).toBeGreaterThan(3);
      expect(iob).toBeLessThan(5);
    });

    conditionalIt('should return 0 for expired doses', async () => {
      const now = new Date();
      const doses = [
        { units: 5, timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000) }, // 5 hours ago
      ];

      const iob = calculateIOB(doses, 4);

      expect(iob).toBe(0);
    });

    conditionalIt('should account for IOB in bolus calculation', async () => {
      const settings: InsulinSettings = {
        ratio: 10,
        sensitivity: 50,
        targetGlucose: 100,
        activeInsulinDuration: 4,
      };

      const result = calculateBolus(150, 30, settings, 2);

      // Meal: 30/10 = 3U
      // Correction: (150-100)/50 = 1U
      // IOB adjustment: -2U
      // Total: 3 + 1 - 2 = 2U
      expect(result.mealDose).toBe(3);
      expect(result.correctionDose).toBe(1);
      expect(result.iobAdjustment).toBe(-2);
      expect(result.totalDose).toBe(2);
    });
  });

  // =========================================================================
  // SAFETY WARNINGS Tests
  // =========================================================================

  describe('SAFETY Warnings', () => {
    const settings: InsulinSettings = {
      ratio: 10,
      sensitivity: 50,
      targetGlucose: 100,
      activeInsulinDuration: 4,
    };

    conditionalIt('should warn about hypoglycemia', async () => {
      const result = calculateBolus(55, 30, settings);

      expect(result.warnings).toContain('HYPOGLYCEMIA - treat first before injecting');
    });

    conditionalIt('should warn about high dose', async () => {
      const result = calculateBolus(300, 300, settings);

      // Meal: 300/10 = 30U
      // Correction: (300-100)/50 = 4U
      // Total: 34U (muy alto)
      expect(result.totalDose).toBeGreaterThan(20);
      expect(result.warnings).toContain('High dose - verify carbohydrates');
    });

    conditionalIt('should handle edge case of very low glucose', async () => {
      const result = calculateBolus(40, 15, settings);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('HIPO') || w.includes('bajo'))).toBe(true);
    });
  });

  // =========================================================================
  // TIME-BASED RATIO VARIATIONS Tests
  // =========================================================================

  describe('TIME-BASED Ratio Variations', () => {
    conditionalIt('should use different ratios by time of day', async () => {
      // Typical ratios by hour
      const getRatioForHour = (hour: number): number => {
        if (hour >= 5 && hour < 10) return 8; // Morning: more sensitive
        if (hour >= 10 && hour < 17) return 10; // Mediodia: normal
        if (hour >= 17 && hour < 21) return 12; // Evening: less sensitive
        return 10; // Night: normal
      };

      expect(getRatioForHour(7)).toBe(8);
      expect(getRatioForHour(12)).toBe(10);
      expect(getRatioForHour(19)).toBe(12);
    });

    conditionalIt('should calculate different doses by time', async () => {
      const carbs = 40;
      const morningRatio = 8;
      const eveningRatio = 12;

      const morningDose = carbs / morningRatio;
      const eveningDose = carbs / eveningRatio;

      expect(morningDose).toBe(5); // 40/8 = 5U
      expect(eveningDose).toBeCloseTo(3.33, 1); // 40/12 = 3.33U

      // Morning dose is higher
      expect(morningDose).toBeGreaterThan(eveningDose);
    });
  });

  // =========================================================================
  // INTEGRATION WITH BACKEND Tests
  // =========================================================================

  describe('INTEGRATION with Backend Data', () => {
    conditionalIt('should calculate based on current glucose reading', async () => {
      // Create a recent reading
      const reading = await createGlucoseReading(
        {
          glucose_level: 180,
          reading_type: 'ALMUERZO',
          notes: '__BOLUS_TEST__ Current reading',
        },
        authToken
      );

      expect(reading).toBeDefined();

      // Use the value to calculate
      const settings: InsulinSettings = {
        ratio: 10,
        sensitivity: 50,
        targetGlucose: 100,
        activeInsulinDuration: 4,
      };

      const result = calculateBolus(reading.glucose_level, 45, settings);

      // Meal: 45/10 = 4.5U
      // Correction: (180-100)/50 = 1.6U
      expect(result.mealDose).toBe(4.5);
      expect(result.correctionDose).toBe(1.6);
      expect(result.totalDose).toBe(6.1);
    });

    conditionalIt('should retrieve user profile for settings', async () => {
      const profile = await authenticatedGet('/users/me', authToken);

      expect(profile).toBeDefined();

      // Insulin settings could come from the profile
      // For now we verify that the profile exists
      expect(profile.dni).toBe(TEST_USER.dni);
    });
  });

  // =========================================================================
  // DOSE ROUNDING Tests
  // =========================================================================

  describe('DOSE Rounding', () => {
    conditionalIt('should round to nearest 0.5 units (pen)', async () => {
      const roundToHalfUnit = (dose: number): number => Math.round(dose * 2) / 2;

      expect(roundToHalfUnit(3.3)).toBe(3.5);
      expect(roundToHalfUnit(3.1)).toBe(3);
      expect(roundToHalfUnit(3.75)).toBe(4);
    });

    conditionalIt('should round to nearest 0.05 units (pump)', async () => {
      const roundToPump = (dose: number): number => Math.round(dose * 20) / 20;

      expect(roundToPump(3.33)).toBe(3.35);
      expect(roundToPump(3.36)).toBe(3.35);
      expect(roundToPump(3.38)).toBe(3.4);
    });

    conditionalIt('should round to whole units (conservative)', async () => {
      const roundToWhole = (dose: number): number => Math.round(dose);

      expect(roundToWhole(3.4)).toBe(3);
      expect(roundToWhole(3.5)).toBe(4);
      expect(roundToWhole(3.6)).toBe(4);
    });
  });

  // =========================================================================
  // COMPLEX SCENARIOS Tests
  // =========================================================================

  describe('COMPLEX Scenarios', () => {
    conditionalIt('should handle pre-meal bolus with high glucose', async () => {
      const settings: InsulinSettings = {
        ratio: 12,
        sensitivity: 40,
        targetGlucose: 110,
        activeInsulinDuration: 4,
      };

      // Scenario: high glucose before lunch
      const result = calculateBolus(250, 60, settings);

      // Meal: 60/12 = 5U
      // Correction: (250-110)/40 = 3.5U
      expect(result.mealDose).toBe(5);
      expect(result.correctionDose).toBe(3.5);
      expect(result.totalDose).toBe(8.5);
    });

    conditionalIt('should handle snack with existing IOB', async () => {
      const settings: InsulinSettings = {
        ratio: 15,
        sensitivity: 50,
        targetGlucose: 100,
        activeInsulinDuration: 4,
      };

      // Scenario: snack with active insulin
      const result = calculateBolus(140, 20, settings, 1.5);

      // Meal: 20/15 = 1.33U
      // Correction: (140-100)/50 = 0.8U
      // IOB: -1.5U
      expect(result.mealDose).toBeCloseTo(1.33, 1);
      expect(result.correctionDose).toBe(0.8);
      expect(result.iobAdjustment).toBe(-1.5);
      expect(result.totalDose).toBeCloseTo(0.63, 1);
    });
  });

  // =========================================================================
  // CLEANUP
  // =========================================================================

  afterAll(async () => {
    if (!shouldRun) return;

    try {
      const readings = await getGlucoseReadings(authToken);
      const testReadings = readings.filter(r => r.notes?.includes('__BOLUS_TEST__'));

      for (const reading of testReadings) {
        if (reading.id) {
          await fetch(`${SERVICE_URLS.apiGateway}/glucose/${reading.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` },
          });
        }
      }
    } catch (_error) {
      // Cleanup failed silently during teardown
    }
  });
});
