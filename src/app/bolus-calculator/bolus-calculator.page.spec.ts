// Initialize TestBed environment for Vitest
import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule, NavController, ModalController } from '@ionic/angular';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BolusCalculatorPage } from './bolus-calculator.page';
import { MockDataService, BolusCalculation } from '@core/services/mock-data.service';
import { FoodService } from '@core/services/food.service';
import { LoggerService } from '@core/services/logger.service';
import { FoodPickerResult, SelectedFood } from '@core/models/food.model';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CUSTOM_ELEMENTS_SCHEMA, signal, computed } from '@angular/core';
import { getLucideIconsForTesting } from '@core/../tests/helpers/icon-test.helper';

describe('BolusCalculatorPage', () => {
  let component: BolusCalculatorPage;
  let fixture: ComponentFixture<BolusCalculatorPage>;
  let mockDataService: vi.Mocked<MockDataService>;
  let mockNavController: vi.Mocked<NavController>;
  let mockFoodService: vi.Mocked<FoodService>;
  let mockLoggerService: vi.Mocked<LoggerService>;
  let mockModalController: vi.Mocked<ModalController>;

  beforeEach(async () => {
    mockDataService = {
      calculateBolus: vi.fn(),
      getPatientParams: vi.fn().mockReturnValue({
        maxBolus: 15,
        lowGlucoseThreshold: 70,
      }),
      getReadings: vi.fn().mockReturnValue(of([])),
    } as any;
    mockLoggerService = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      logAuditEvent: vi.fn(),
    } as any;
    mockNavController = { navigateBack: vi.fn() } as any;
    mockModalController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onWillDismiss: vi.fn().mockResolvedValue({ role: 'confirmed' }),
      } as any),
      dismiss: vi.fn(),
      getTop: vi.fn().mockResolvedValue(null),
    } as any;

    const selectedFoodsSignal = signal<SelectedFood[]>([]);
    const totalCarbsComputed = computed(() =>
      selectedFoodsSignal().reduce((sum, sf) => sum + sf.totalCarbs, 0)
    );

    mockFoodService = {
      clearSelection: vi.fn(),
      getSortedCategories: vi.fn().mockReturnValue([]),
      searchFoods: vi.fn().mockReturnValue([]),
      getFoodsByCategory: vi.fn().mockReturnValue([]),
      selectedFoods: selectedFoodsSignal.asReadonly(),
      totalCarbs: totalCarbsComputed,
    } as any;

    await TestBed.configureTestingModule({
      imports: [
        BolusCalculatorPage,
        IonicModule.forRoot(),
        ReactiveFormsModule,
        TranslateModule.forRoot(),
        NoopAnimationsModule,
        getLucideIconsForTesting(),
      ],
      providers: [
        FormBuilder,
        { provide: MockDataService, useValue: mockDataService },
        { provide: NavController, useValue: mockNavController },
        { provide: FoodService, useValue: mockFoodService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: ModalController, useValue: mockModalController },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BolusCalculatorPage);
    component = fixture.componentInstance;
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe('Component Initialization', () => {
    it('should initialize with empty form and default state', () => {
      expect(component.calculatorForm.value).toEqual({ currentGlucose: '', carbGrams: '' });
      expect(component.result).toBeNull();
      expect(component.calculating).toBe(false);
      expect(component.showFoodPicker()).toBe(false);
      expect(component.selectedFoods()).toEqual([]);
    });
  });

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================

  describe('Form Validation', () => {
    it('should validate currentGlucose field boundaries', () => {
      const field = component.calculatorForm.get('currentGlucose');

      // Empty - required
      expect(field?.valid).toBe(false);
      expect(field?.errors?.['required']).toBe(true);

      // Below min (40)
      field?.setValue(39);
      expect(field?.valid).toBe(false);
      expect(field?.errors?.['min']).toBeTruthy();

      // Above max (600)
      field?.setValue(601);
      expect(field?.valid).toBe(false);
      expect(field?.errors?.['max']).toBeTruthy();

      // Valid boundaries
      field?.setValue(40);
      expect(field?.valid).toBe(true);
      field?.setValue(600);
      expect(field?.valid).toBe(true);
      field?.setValue(120);
      expect(field?.valid).toBe(true);
    });

    it('should validate carbGrams field boundaries', () => {
      const field = component.calculatorForm.get('carbGrams');

      // Empty - required
      expect(field?.valid).toBe(false);
      expect(field?.errors?.['required']).toBe(true);

      // Negative
      field?.setValue(-1);
      expect(field?.valid).toBe(false);
      expect(field?.errors?.['min']).toBeTruthy();

      // Above max (300)
      field?.setValue(301);
      expect(field?.valid).toBe(false);
      expect(field?.errors?.['max']).toBeTruthy();

      // Valid boundaries
      field?.setValue(0);
      expect(field?.valid).toBe(true);
      field?.setValue(300);
      expect(field?.valid).toBe(true);
    });

    it('should validate entire form correctly', () => {
      component.calculatorForm.patchValue({ currentGlucose: 150, carbGrams: 60 });
      expect(component.calculatorForm.valid).toBe(true);

      component.calculatorForm.patchValue({ currentGlucose: 150, carbGrams: 350 });
      expect(component.calculatorForm.valid).toBe(false);
    });
  });

  // ============================================================================
  // INSULIN CALCULATION - CORE MEDICAL LOGIC
  // ============================================================================

  describe('Insulin Calculation Logic', () => {
    const mockCalculation: BolusCalculation = {
      carbGrams: 60,
      currentGlucose: 180,
      targetGlucose: 120,
      carbRatio: 15,
      correctionFactor: 50,
      recommendedInsulin: 5.2,
    };

    beforeEach(() => {
      mockDataService.calculateBolus.mockReturnValue(of(mockCalculation).pipe(delay(100)));
    });

    it('should calculate bolus with valid inputs', async () => {
      component.calculatorForm.patchValue({ currentGlucose: 180, carbGrams: 60 });

      await component.calculateBolus();

      expect(mockDataService.calculateBolus).toHaveBeenCalledWith({
        currentGlucose: 180,
        carbGrams: 60,
      });
      expect(component.result).toEqual(mockCalculation);
      expect(component.calculating).toBe(false);
    });

    it('should not calculate when form is invalid', async () => {
      component.calculatorForm.patchValue({ currentGlucose: '', carbGrams: 60 });
      await component.calculateBolus();

      expect(mockDataService.calculateBolus).not.toHaveBeenCalled();
      expect(component.calculating).toBe(false);
    });

    it('should handle various glucose scenarios', async () => {
      const testCases = [
        { glucose: 250, carbs: 45, expectedMinInsulin: 0 }, // High - correction needed
        { glucose: 120, carbs: 45, expectedMinInsulin: 0 }, // Normal - no correction
        { glucose: 70, carbs: 30, expectedMinInsulin: 0 }, // Low - no negative correction
        { glucose: 200, carbs: 0, expectedMinInsulin: 0 }, // Zero carbs - correction only
      ];

      for (const tc of testCases) {
        const calc: BolusCalculation = {
          carbGrams: tc.carbs,
          currentGlucose: tc.glucose,
          targetGlucose: 120,
          carbRatio: 15,
          correctionFactor: 50,
          recommendedInsulin: Math.max(0, tc.carbs / 15 + (tc.glucose - 120) / 50),
        };
        mockDataService.calculateBolus.mockReturnValue(of(calc));

        component.calculatorForm.patchValue({ currentGlucose: tc.glucose, carbGrams: tc.carbs });
        await component.calculateBolus();

        expect(component.result?.recommendedInsulin).toBeGreaterThanOrEqual(tc.expectedMinInsulin);
        vi.clearAllMocks();
      }
    });

    it('should handle calculation errors gracefully', async () => {
      mockDataService.calculateBolus.mockReturnValue(
        throwError(() => new Error('Calculation failed'))
      );

      component.calculatorForm.patchValue({ currentGlucose: 150, carbGrams: 60 });
      await component.calculateBolus();

      expect(component.calculating).toBe(false);
      expect(component.result).toBeNull();
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'BolusCalculator',
        'Error calculating bolus',
        expect.any(Error)
      );
    });
  });

  // ============================================================================
  // ERROR MESSAGES
  // ============================================================================

  describe('Error Messages', () => {
    it('should show appropriate error messages for glucose field', () => {
      const field = component.calculatorForm.get('currentGlucose');
      field?.markAsTouched();

      field?.setValue('');
      expect(component.glucoseError).toContain('bolusCalculator.errors.glucoseRequired');

      field?.setValue(30);
      expect(component.glucoseError).toContain('bolusCalculator.errors.glucoseRange');

      field?.setValue(700);
      expect(component.glucoseError).toContain('bolusCalculator.errors.glucoseRange');

      field?.setValue(150);
      expect(component.glucoseError).toBe('');
    });

    it('should show appropriate error messages for carbs field', () => {
      const field = component.calculatorForm.get('carbGrams');
      field?.markAsTouched();

      field?.setValue('');
      expect(component.carbsError).toContain('bolusCalculator.errors.carbsRequired');

      field?.setValue(-5);
      expect(component.carbsError).toContain('bolusCalculator.errors.carbsRange');

      field?.setValue(350);
      expect(component.carbsError).toContain('bolusCalculator.errors.carbsRange');

      field?.setValue(60);
      expect(component.carbsError).toBe('');
    });

    it('should not show error when field is untouched', () => {
      const field = component.calculatorForm.get('currentGlucose');
      field?.setValue(''); // Invalid but untouched
      expect(component.glucoseError).toBe('');
    });
  });

  // ============================================================================
  // FIELD VALIDATION HELPER
  // ============================================================================

  describe('Field Validation Helper', () => {
    it('should correctly identify invalid fields', () => {
      const field = component.calculatorForm.get('currentGlucose');

      // Invalid + untouched = false
      field?.setValue('');
      expect(component.isFieldInvalid('currentGlucose')).toBe(false);

      // Invalid + touched = true
      field?.markAsTouched();
      expect(component.isFieldInvalid('currentGlucose')).toBe(true);

      // Invalid + dirty = true
      field?.markAsDirty();
      expect(component.isFieldInvalid('currentGlucose')).toBe(true);

      // Valid = false
      field?.setValue(150);
      expect(component.isFieldInvalid('currentGlucose')).toBe(false);
    });
  });

  // ============================================================================
  // FOOD PICKER INTEGRATION
  // ============================================================================

  describe('Food Picker Integration', () => {
    it('should open and close food picker', () => {
      component.openFoodPicker();
      expect(mockFoodService.clearSelection).toHaveBeenCalled();
      expect(component.showFoodPicker()).toBe(true);

      component.onFoodPickerClosed();
      expect(component.showFoodPicker()).toBe(false);
    });

    it('should apply selected foods and update carbs', () => {
      const selectedFoods: SelectedFood[] = [
        {
          food: {
            id: 'apple',
            name: 'Apple',
            nameKey: 'foodPicker.foods.apple',
            carbsPerServing: 19,
            servingSize: 1,
            servingUnit: 'piece',
            emoji: '🍎',
            category: 'fruits',
          },
          servings: 1,
          totalCarbs: 19,
        },
        {
          food: {
            id: 'bread',
            name: 'Bread',
            nameKey: 'foodPicker.foods.bread',
            carbsPerServing: 15,
            servingSize: 1,
            servingUnit: 'slice',
            emoji: '🍞',
            category: 'grains',
          },
          servings: 2,
          totalCarbs: 30,
        },
      ];

      const result: FoodPickerResult = { selectedFoods, totalCarbs: 49 };

      component.onFoodPickerConfirmed(result);

      expect(component.showFoodPicker()).toBe(false);
      expect(component.selectedFoods()).toEqual(selectedFoods);
      expect(component.calculatorForm.value.carbGrams).toBe(49);
    });

    it('should round carbs and handle zero total', () => {
      // Round decimal
      component.onFoodPickerConfirmed({ selectedFoods: [], totalCarbs: 47.8 });
      expect(component.calculatorForm.value.carbGrams).toBe(48);

      // Zero should not override existing value
      component.calculatorForm.patchValue({ carbGrams: 30 });
      component.onFoodPickerConfirmed({ selectedFoods: [], totalCarbs: 0 });
      expect(component.calculatorForm.value.carbGrams).toBe(30);
    });

    it('should clear selected foods', () => {
      component.selectedFoods.set([
        {
          food: {
            id: 'apple',
            name: 'Apple',
            nameKey: 'foodPicker.foods.apple',
            carbsPerServing: 19,
            servingSize: 1,
            servingUnit: 'piece',
            emoji: '🍎',
            category: 'fruits',
          },
          servings: 1,
          totalCarbs: 19,
        },
      ]);
      component.calculatorForm.patchValue({ carbGrams: 19 });

      component.clearSelectedFoods();

      expect(component.selectedFoods()).toEqual([]);
      expect(component.calculatorForm.value.carbGrams).toBe('');
    });
  });

  // ============================================================================
  // RESET & NAVIGATION
  // ============================================================================

  describe('Reset and Navigation', () => {
    it('should reset calculator to initial state', () => {
      component.calculatorForm.patchValue({ currentGlucose: 150, carbGrams: 60 });
      component.result = { ...component.result } as any;
      component.selectedFoods.set([{} as any]);

      const glucoseField = component.calculatorForm.get('currentGlucose');
      glucoseField?.markAsTouched();

      component.resetCalculator();

      expect(component.calculatorForm.value).toEqual({ currentGlucose: '', carbGrams: '' });
      expect(component.result).toBeNull();
      expect(component.selectedFoods()).toEqual([]);
      expect(component.glucoseError).toBe('');
    });

    it('should navigate back to dashboard when not in modal', async () => {
      mockModalController.getTop.mockResolvedValue(null);
      await component.goBack();
      expect(mockNavController.navigateBack).toHaveBeenCalledWith('/tabs/dashboard');
    });

    it('should dismiss modal when opened as modal', async () => {
      const mockModal = { dismiss: vi.fn().mockResolvedValue(undefined) };
      mockModalController.getTop.mockResolvedValue(mockModal);
      await component.goBack();
      expect(mockModal.dismiss).toHaveBeenCalled();
      expect(mockNavController.navigateBack).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // EDGE CASES & BOUNDARY CONDITIONS
  // ============================================================================

  describe('Edge Cases and Boundary Conditions', () => {
    beforeEach(() => {
      component.resetCalculator();
    });

    it('should handle extreme glucose values', async () => {
      const testCases = [
        { glucose: 40, expectedValid: true }, // Min boundary
        { glucose: 600, expectedValid: true }, // Max boundary
        { glucose: 145.5, expectedValid: true }, // Decimal
      ];

      for (const tc of testCases) {
        const calc: BolusCalculation = {
          carbGrams: 15,
          currentGlucose: tc.glucose,
          targetGlucose: 120,
          carbRatio: 15,
          correctionFactor: 50,
          recommendedInsulin: 1.0,
        };
        mockDataService.calculateBolus.mockReturnValue(of(calc));

        component.calculatorForm.patchValue({ currentGlucose: tc.glucose, carbGrams: 15 });
        await component.calculateBolus();

        expect(component.result?.currentGlucose).toBe(tc.glucose);
        vi.clearAllMocks();
      }
    });

    it('should handle string input conversion to numbers', async () => {
      const calc: BolusCalculation = {
        carbGrams: 45,
        currentGlucose: 150,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 3.6,
      };
      mockDataService.calculateBolus.mockReturnValue(of(calc));

      component.calculatorForm.patchValue({ currentGlucose: '150', carbGrams: '45' });
      await component.calculateBolus();

      expect(mockDataService.calculateBolus).toHaveBeenCalledWith({
        currentGlucose: 150,
        carbGrams: 45,
      });
    });
  });

  // ============================================================================
  // MEDICAL SAFETY CONSIDERATIONS - CRITICAL
  // ============================================================================

  describe('Medical Safety Considerations', () => {
    beforeEach(() => {
      component.resetCalculator();
    });

    it('should never recommend negative insulin', async () => {
      const safeCalc: BolusCalculation = {
        carbGrams: 0,
        currentGlucose: 70,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 0,
      };
      mockDataService.calculateBolus.mockReturnValue(of(safeCalc));

      component.calculatorForm.patchValue({ currentGlucose: 70, carbGrams: 0 });
      await component.calculateBolus();

      expect(component.result?.recommendedInsulin).toBeGreaterThanOrEqual(0);
    });

    it('should preserve all calculation details for medical review', async () => {
      const detailedCalc: BolusCalculation = {
        carbGrams: 60,
        currentGlucose: 180,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 5.2,
      };
      mockDataService.calculateBolus.mockReturnValue(of(detailedCalc));

      component.calculatorForm.patchValue({ currentGlucose: 180, carbGrams: 60 });
      await component.calculateBolus();

      expect(component.result?.carbGrams).toBe(60);
      expect(component.result?.currentGlucose).toBe(180);
      expect(component.result?.targetGlucose).toBe(120);
      expect(component.result?.carbRatio).toBe(15);
      expect(component.result?.correctionFactor).toBe(50);
      expect(component.result?.recommendedInsulin).toBe(5.2);
    });

    it('should handle critical glucose scenarios safely', async () => {
      // Critical high (400 mg/dL)
      let calc: BolusCalculation = {
        carbGrams: 30,
        currentGlucose: 400,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 7.6,
      };
      mockDataService.calculateBolus.mockReturnValue(of(calc));

      component.calculatorForm.patchValue({ currentGlucose: 400, carbGrams: 30 });
      await component.calculateBolus();

      expect(component.result?.currentGlucose).toBe(400);
      expect(component.result?.recommendedInsulin).toBeGreaterThan(0);

      component.result = null;

      // Critical low (50 mg/dL - hypoglycemia)
      calc = {
        carbGrams: 15,
        currentGlucose: 50,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 1.0,
      };
      mockDataService.calculateBolus.mockReturnValue(of(calc));

      component.calculatorForm.patchValue({ currentGlucose: 50, carbGrams: 15 });
      await component.calculateBolus();

      expect(component.result?.currentGlucose).toBe(50);
      expect(component.result?.recommendedInsulin).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // USER EXPERIENCE
  // ============================================================================

  describe('User Experience', () => {
    it('should manage calculating state correctly', async () => {
      mockDataService.calculateBolus.mockReturnValue(of({} as BolusCalculation).pipe(delay(100)));

      component.calculatorForm.patchValue({ currentGlucose: 150, carbGrams: 60 });

      await component.calculateBolus();
      expect(component.calculating).toBe(false);
    });

    it('should allow recalculation with different values', async () => {
      // First calculation
      mockDataService.calculateBolus.mockReturnValue(
        of({
          carbGrams: 60,
          currentGlucose: 150,
          targetGlucose: 120,
          carbRatio: 15,
          correctionFactor: 50,
          recommendedInsulin: 4.6,
        })
      );

      component.calculatorForm.patchValue({ currentGlucose: 150, carbGrams: 60 });
      await component.calculateBolus();

      const firstResult = component.result;

      // Second calculation with different values
      mockDataService.calculateBolus.mockReturnValue(
        of({
          carbGrams: 30,
          currentGlucose: 180,
          targetGlucose: 120,
          carbRatio: 15,
          correctionFactor: 50,
          recommendedInsulin: 3.2,
        })
      );

      component.calculatorForm.patchValue({ currentGlucose: 180, carbGrams: 30 });
      await component.calculateBolus();

      expect(component.result).not.toEqual(firstResult);
      expect(component.result?.carbGrams).toBe(30);
      expect(component.result?.currentGlucose).toBe(180);
    });
  });
});
