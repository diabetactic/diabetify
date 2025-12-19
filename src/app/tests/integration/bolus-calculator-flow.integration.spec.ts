/**
 * Bolus Calculator Flow Integration Tests
 *
 * Tests the bolus calculation logic and service integration:
 * 1. Form validation rules (glucose 40-600 mg/dL, carbs 0-300g)
 * 2. MockDataService - Bolus calculation formulas
 * 3. Result computation based on glucose and carb inputs
 *
 * Flow: Validate Inputs -> Calculate -> Return Result
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { MockDataService, BolusCalculation } from '@core/services/mock-data.service';
import { LoggerService } from '@core/services/logger.service';

describe('Bolus Calculator Flow Integration Tests', () => {
  let mockDataService: MockDataService;
  let mockLogger: { info: Mock; error: Mock; debug: Mock; warn: Mock };
  let calculatorForm: FormGroup;

  // BolusCalculation interface from MockDataService:
  // { carbGrams, currentGlucose, targetGlucose, carbRatio, correctionFactor, recommendedInsulin }

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        MockDataService,
        FormBuilder,
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    mockDataService = TestBed.inject(MockDataService);
    const fb = TestBed.inject(FormBuilder);

    // Create form matching BolusCalculatorPage
    calculatorForm = fb.group({
      currentGlucose: ['', [Validators.required, Validators.min(40), Validators.max(600)]],
      carbGrams: ['', [Validators.required, Validators.min(0), Validators.max(300)]],
    });
  });

  describe('Form Validation Rules', () => {
    describe('Glucose Validation', () => {
      it('should require glucose value', () => {
        const glucoseControl = calculatorForm.get('currentGlucose');
        glucoseControl?.setValue(null);
        expect(glucoseControl?.errors?.['required']).toBeTruthy();
      });

      it('should reject glucose below minimum (39)', () => {
        const glucoseControl = calculatorForm.get('currentGlucose');
        glucoseControl?.setValue(39);
        expect(glucoseControl?.errors?.['min']).toBeTruthy();
      });

      it('should accept glucose at minimum boundary (40)', () => {
        const glucoseControl = calculatorForm.get('currentGlucose');
        glucoseControl?.setValue(40);
        expect(glucoseControl?.errors?.['min']).toBeFalsy();
      });

      it('should accept glucose in valid range (120)', () => {
        const glucoseControl = calculatorForm.get('currentGlucose');
        glucoseControl?.setValue(120);
        expect(glucoseControl?.valid).toBe(true);
      });

      it('should accept glucose at maximum boundary (600)', () => {
        const glucoseControl = calculatorForm.get('currentGlucose');
        glucoseControl?.setValue(600);
        expect(glucoseControl?.errors?.['max']).toBeFalsy();
      });

      it('should reject glucose above maximum (601)', () => {
        const glucoseControl = calculatorForm.get('currentGlucose');
        glucoseControl?.setValue(601);
        expect(glucoseControl?.errors?.['max']).toBeTruthy();
      });
    });

    describe('Carbs Validation', () => {
      it('should require carbs value', () => {
        const carbsControl = calculatorForm.get('carbGrams');
        carbsControl?.setValue(null);
        expect(carbsControl?.errors?.['required']).toBeTruthy();
      });

      it('should accept zero carbs', () => {
        const carbsControl = calculatorForm.get('carbGrams');
        carbsControl?.setValue(0);
        expect(carbsControl?.errors?.['min']).toBeFalsy();
      });

      it('should accept carbs in valid range (50)', () => {
        const carbsControl = calculatorForm.get('carbGrams');
        carbsControl?.setValue(50);
        expect(carbsControl?.valid).toBe(true);
      });

      it('should accept carbs at maximum boundary (300)', () => {
        const carbsControl = calculatorForm.get('carbGrams');
        carbsControl?.setValue(300);
        expect(carbsControl?.errors?.['max']).toBeFalsy();
      });

      it('should reject carbs above maximum (301)', () => {
        const carbsControl = calculatorForm.get('carbGrams');
        carbsControl?.setValue(301);
        expect(carbsControl?.errors?.['max']).toBeTruthy();
      });
    });

    describe('Form Validity', () => {
      it('should be invalid when empty', () => {
        expect(calculatorForm.valid).toBe(false);
      });

      it('should be valid with glucose and carbs in range', () => {
        calculatorForm.patchValue({
          currentGlucose: 150,
          carbGrams: 45,
        });
        expect(calculatorForm.valid).toBe(true);
      });

      it('should be invalid with only glucose filled', () => {
        calculatorForm.patchValue({
          currentGlucose: 150,
        });
        expect(calculatorForm.valid).toBe(false);
      });

      it('should be invalid with only carbs filled', () => {
        calculatorForm.patchValue({
          carbGrams: 45,
        });
        expect(calculatorForm.valid).toBe(false);
      });
    });
  });

  describe('Bolus Calculation Service', () => {
    it('should calculate bolus from MockDataService', async () => {
      const input = { currentGlucose: 180, carbGrams: 50 };

      const result = await firstValueFrom(mockDataService.calculateBolus(input));

      expect(result).toBeDefined();
      expect(result.recommendedInsulin).toBeGreaterThan(0);
    });

    it('should return calculation parameters', async () => {
      const input = { currentGlucose: 200, carbGrams: 60 };

      const result = await firstValueFrom(mockDataService.calculateBolus(input));

      expect(result.carbRatio).toBeDefined();
      expect(result.correctionFactor).toBeDefined();
      expect(result.targetGlucose).toBeDefined();
    });

    it('should echo back input values in result', async () => {
      const input = { currentGlucose: 150, carbGrams: 30 };

      const result = await firstValueFrom(mockDataService.calculateBolus(input));

      expect(result.currentGlucose).toBe(150);
      expect(result.carbGrams).toBe(30);
    });

    it('should calculate lower insulin for normal glucose', async () => {
      // Normal glucose (around 100) should have lower insulin than high glucose
      const normalInput = { currentGlucose: 100, carbGrams: 30 };
      const highInput = { currentGlucose: 200, carbGrams: 30 };

      const normalResult = await firstValueFrom(mockDataService.calculateBolus(normalInput));
      const highResult = await firstValueFrom(mockDataService.calculateBolus(highInput));

      expect(normalResult.recommendedInsulin).toBeLessThan(highResult.recommendedInsulin);
    });

    it('should calculate higher insulin for high glucose', async () => {
      const normalInput = { currentGlucose: 100, carbGrams: 50 };
      const highInput = { currentGlucose: 300, carbGrams: 50 };

      const normalResult = await firstValueFrom(mockDataService.calculateBolus(normalInput));
      const highResult = await firstValueFrom(mockDataService.calculateBolus(highInput));

      expect(highResult.recommendedInsulin).toBeGreaterThan(normalResult.recommendedInsulin);
    });

    it('should scale insulin with carb amount', async () => {
      const lowCarbInput = { currentGlucose: 120, carbGrams: 20 };
      const highCarbInput = { currentGlucose: 120, carbGrams: 60 };

      const lowCarbResult = await firstValueFrom(mockDataService.calculateBolus(lowCarbInput));
      const highCarbResult = await firstValueFrom(mockDataService.calculateBolus(highCarbInput));

      expect(highCarbResult.recommendedInsulin).toBeGreaterThan(lowCarbResult.recommendedInsulin);
    });

    it('should return low insulin for zero carbs with target glucose', async () => {
      // With target glucose and zero carbs, insulin should be minimal (just correction)
      const input = { currentGlucose: 120, carbGrams: 0 }; // 120 is typical target

      const result = await firstValueFrom(mockDataService.calculateBolus(input));

      // Should have minimal to no insulin when at target with no carbs
      expect(result.recommendedInsulin).toBeLessThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid inputs', async () => {
      const input = { currentGlucose: 40, carbGrams: 0 };

      const result = await firstValueFrom(mockDataService.calculateBolus(input));

      expect(result).toBeDefined();
      expect(result.recommendedInsulin).toBeDefined();
    });

    it('should handle maximum valid inputs', async () => {
      const input = { currentGlucose: 600, carbGrams: 300 };

      const result = await firstValueFrom(mockDataService.calculateBolus(input));

      expect(result).toBeDefined();
      expect(result.recommendedInsulin).toBeGreaterThan(0);
    });

    it('should handle decimal carb values', async () => {
      const input = { currentGlucose: 150, carbGrams: 45.5 };

      const result = await firstValueFrom(mockDataService.calculateBolus(input));

      expect(result).toBeDefined();
    });
  });
});
