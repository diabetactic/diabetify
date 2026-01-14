/**
 * BolusSafetyService - Comprehensive Unit Tests
 *
 * CRITICAL MEDICAL SAFETY CODE
 * These tests validate insulin dosing safety guardrails that are LIFE-CRITICAL.
 * Insulin dosing errors can cause severe hypoglycemia (potentially fatal)
 * or hyperglycemia (leading to DKA - Diabetic Ketoacidosis).
 *
 * Test coverage includes:
 * - Safety threshold validation (max dose, low glucose)
 * - Edge cases and boundary conditions
 * - Service configuration and dependency injection
 */

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { BolusSafetyService } from './bolus-safety.service';
import { BolusCalculation } from './mock-data.service';
import { PreferencesService } from './preferences.service';
import { LoggerService } from './logger.service';

describe('BolusSafetyService - CRITICAL MEDICAL SAFETY CODE', () => {
  let service: BolusSafetyService;
  let prefsService: { getCurrentPreferences: ReturnType<typeof vi.fn> };
  let loggerService: { logAuditEvent: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };
  let translateService: { instant: ReturnType<typeof vi.fn> };

  const interpolate = (template: string, params: Record<string, unknown> = {}): string =>
    template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => String(params[key] ?? ''));

  const translationTemplates: Record<string, string> = {
    'bolusCalculator.warnings.maxDose': 'maxDose {{recommended}} units exceeds {{max}} units',
    'bolusCalculator.warnings.lowGlucose': 'lowGlucose {{glucose}} mg/dL',
  };

  // Default safety settings for testing
  const defaultSafetySettings = {
    maxBolus: 15,
    lowGlucoseThreshold: 70,
  };

  // Helper to create a bolus calculation object
  const createBolusCalculation = (overrides: Partial<BolusCalculation> = {}): BolusCalculation => ({
    carbGrams: 45,
    currentGlucose: 150,
    targetGlucose: 120,
    carbRatio: 15,
    correctionFactor: 50,
    recommendedInsulin: 3.6,
    ...overrides,
  });

  beforeEach(() => {
    // Create mock services
    prefsService = {
      getCurrentPreferences: vi.fn().mockReturnValue({
        safety: { ...defaultSafetySettings },
      }),
    };

    loggerService = {
      logAuditEvent: vi.fn(),
      info: vi.fn(),
    };

    translateService = {
      instant: vi.fn((key: string, params?: Record<string, unknown>) =>
        interpolate(translationTemplates[key] ?? key, params ?? {})
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        BolusSafetyService,
        { provide: PreferencesService, useValue: prefsService },
        { provide: LoggerService, useValue: loggerService },
        { provide: TranslateService, useValue: translateService },
      ],
    });

    service = TestBed.inject(BolusSafetyService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // SAFETY GUARDRAILS TESTS
  // ============================================================================
  describe('checkSafetyGuardrails()', () => {
    describe('Max Dose Warning', () => {
      it('should return maxDose warning when recommended insulin exceeds max bolus', () => {
        const calculation = createBolusCalculation({ recommendedInsulin: 16 });

        const warnings = service.checkSafetyGuardrails(calculation);

        const maxWarning = warnings.find(w => w.type === 'maxDose');
        expect(maxWarning).toBeDefined();
        expect(maxWarning?.message).toContain('16.0');
        expect(maxWarning?.message).toContain('15');
      });

      it('should NOT return maxDose warning when recommended insulin is below max', () => {
        const calculation = createBolusCalculation({ recommendedInsulin: 14 });

        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings.some(w => w.type === 'maxDose')).toBe(false);
      });

      it('should NOT return maxDose warning when recommended insulin equals max', () => {
        const calculation = createBolusCalculation({ recommendedInsulin: 15 });

        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings.some(w => w.type === 'maxDose')).toBe(false);
      });

      it('should use maxBolus from preferences', () => {
        // Set custom max bolus
        prefsService.getCurrentPreferences.mockReturnValue({
          safety: { maxBolus: 10, lowGlucoseThreshold: 70 },
        });

        const calculation = createBolusCalculation({ recommendedInsulin: 11 });
        const warnings = service.checkSafetyGuardrails(calculation);

        const maxWarning = warnings.find(w => w.type === 'maxDose');
        expect(maxWarning).toBeDefined();
        expect(maxWarning?.message).toContain('10');
      });

      it('Scenario: Patient with lower max bolus setting (pediatric)', () => {
        // Pediatric patient with max bolus of 8 units
        prefsService.getCurrentPreferences.mockReturnValue({
          safety: { maxBolus: 8, lowGlucoseThreshold: 70 },
        });

        const calculation = createBolusCalculation({ recommendedInsulin: 10 });
        const warnings = service.checkSafetyGuardrails(calculation);

        const maxWarning = warnings.find(w => w.type === 'maxDose');
        expect(maxWarning).toBeDefined();
        expect(maxWarning?.message).toContain('8');
      });
    });

    describe('Low Glucose Warning', () => {
      it('should return lowGlucose warning when current glucose is below threshold', () => {
        const calculation = createBolusCalculation({ currentGlucose: 65 });

        const warnings = service.checkSafetyGuardrails(calculation);

        const lowWarning = warnings.find(w => w.type === 'lowGlucose');
        expect(lowWarning).toBeDefined();
        expect(lowWarning?.message).toContain('65');
      });

      it('should NOT return lowGlucose warning when current glucose is above threshold', () => {
        const calculation = createBolusCalculation({ currentGlucose: 120 });

        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings.some(w => w.type === 'lowGlucose')).toBe(false);
      });

      it('should NOT return lowGlucose warning when current glucose equals threshold', () => {
        const calculation = createBolusCalculation({ currentGlucose: 70 });

        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings.some(w => w.type === 'lowGlucose')).toBe(false);
      });

      it('should use lowGlucoseThreshold from preferences', () => {
        // Set custom threshold
        prefsService.getCurrentPreferences.mockReturnValue({
          safety: { maxBolus: 15, lowGlucoseThreshold: 80 },
        });

        const calculation = createBolusCalculation({ currentGlucose: 75 });
        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings.some(w => w.type === 'lowGlucose')).toBe(true);
      });

      it('Scenario: Hypoglycemia danger zone (<54 mg/dL)', () => {
        const calculation = createBolusCalculation({ currentGlucose: 50 });

        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings.some(w => w.type === 'lowGlucose')).toBe(true);
      });
    });

    describe('Combined Warnings', () => {
      it('should return both warnings when both conditions are met', () => {
        const calculation = createBolusCalculation({
          currentGlucose: 60,
          recommendedInsulin: 20,
        });

        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings.length).toBe(2);
        expect(warnings.some(w => w.type === 'maxDose')).toBe(true);
        expect(warnings.some(w => w.type === 'lowGlucose')).toBe(true);
      });

      it('should return empty array when no warnings are triggered', () => {
        const calculation = createBolusCalculation({
          currentGlucose: 120,
          recommendedInsulin: 5,
        });

        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings).toEqual([]);
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero recommended insulin', () => {
        const calculation = createBolusCalculation({ recommendedInsulin: 0 });

        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings.some(w => w.type === 'maxDose')).toBe(false);
      });

      it('should handle negative recommended insulin', () => {
        const calculation = createBolusCalculation({ recommendedInsulin: -2 });

        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings.some(w => w.type === 'maxDose')).toBe(false);
      });

      it('should handle very high glucose values', () => {
        const calculation = createBolusCalculation({ currentGlucose: 500 });

        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings.some(w => w.type === 'lowGlucose')).toBe(false);
      });

      it('should handle very low glucose values', () => {
        const calculation = createBolusCalculation({ currentGlucose: 20 });

        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings.some(w => w.type === 'lowGlucose')).toBe(true);
      });

      it('should handle decimal insulin values', () => {
        const calculation = createBolusCalculation({ recommendedInsulin: 15.1 });

        const warnings = service.checkSafetyGuardrails(calculation);

        expect(warnings.some(w => w.type === 'maxDose')).toBe(true);
      });
    });
  });

  // ============================================================================
  // CLINICAL SCENARIOS
  // ============================================================================
  describe('Clinical Scenarios', () => {
    it('Scenario: Normal meal bolus within limits', () => {
      const calculation = createBolusCalculation({
        carbGrams: 60,
        currentGlucose: 130,
        recommendedInsulin: 4,
      });

      const warnings = service.checkSafetyGuardrails(calculation);

      expect(warnings).toEqual([]);
    });

    it('Scenario: Large meal approaching max dose', () => {
      const calculation = createBolusCalculation({
        carbGrams: 150,
        currentGlucose: 180,
        recommendedInsulin: 14,
      });

      const warnings = service.checkSafetyGuardrails(calculation);

      expect(warnings).toEqual([]);
    });

    it('Scenario: Extreme meal exceeding safety limits', () => {
      const calculation = createBolusCalculation({
        carbGrams: 200,
        currentGlucose: 300,
        recommendedInsulin: 17.0,
      });

      const warnings = service.checkSafetyGuardrails(calculation);

      expect(warnings.some(w => w.type === 'maxDose')).toBe(true);
    });

    it('Scenario: Pre-meal with low glucose', () => {
      const calculation = createBolusCalculation({
        currentGlucose: 65,
        recommendedInsulin: 2,
      });

      const warnings = service.checkSafetyGuardrails(calculation);

      expect(warnings.some(w => w.type === 'lowGlucose')).toBe(true);
      expect(warnings.length).toBe(1);
    });

    it('Scenario: Correction dose only', () => {
      const calculation = createBolusCalculation({
        carbGrams: 0,
        currentGlucose: 200,
        recommendedInsulin: 1.6,
      });

      const warnings = service.checkSafetyGuardrails(calculation);

      expect(warnings).toEqual([]);
    });
  });

  // ============================================================================
  // SERVICE CONFIGURATION TESTS
  // ============================================================================
  describe('Service Configuration', () => {
    it('should be created and injectable', () => {
      expect(service).toBeTruthy();
    });

    it('should have PreferencesService injected', () => {
      // Verify the service uses PreferencesService
      prefsService.getCurrentPreferences.mockReturnValue({
        safety: { maxBolus: 20, lowGlucoseThreshold: 70 },
      });

      const calculation = createBolusCalculation({ recommendedInsulin: 18 });
      const warnings = service.checkSafetyGuardrails(calculation);

      expect(prefsService.getCurrentPreferences).toHaveBeenCalled();
      expect(warnings.some(w => w.type === 'maxDose')).toBe(false);
    });

    it('should have LoggerService injected', () => {
      service.logAuditEvent('TEST', { data: 'test' });
      expect(loggerService.logAuditEvent).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // AUDIT LOGGING TESTS
  // ============================================================================
  describe('Audit Logging', () => {
    it('should log audit events with provided data', () => {
      const eventData = { action: 'bolus_confirmed', amount: 5.5 };

      service.logAuditEvent('BOLUS_CONFIRMATION', eventData);

      expect(loggerService.logAuditEvent).toHaveBeenCalledWith('BOLUS_CONFIRMATION', eventData);
    });

    it('should handle complex audit data', () => {
      const complexData = {
        calculation: createBolusCalculation(),
        warnings: [{ type: 'maxDose', message: 'test' }],
        timestamp: new Date().toISOString(),
      };

      service.logAuditEvent('SAFETY_CHECK', complexData);

      expect(loggerService.logAuditEvent).toHaveBeenCalledWith('SAFETY_CHECK', complexData);
    });
  });
});
