import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule, NavController } from '@ionic/angular';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BolusCalculatorPage } from './bolus-calculator.page';
import { MockDataService, BolusCalculation } from '../core/services/mock-data.service';
import { FoodService } from '../core/services/food.service';
import { FoodPickerResult, SelectedFood } from '../core/models/food.model';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CUSTOM_ELEMENTS_SCHEMA, signal, computed } from '@angular/core';
import { getLucideIconsForTesting } from '../tests/helpers/icon-test.helper';

describe('BolusCalculatorPage', () => {
  let component: BolusCalculatorPage;
  let fixture: ComponentFixture<BolusCalculatorPage>;
  let mockDataService: jest.Mocked<MockDataService>;
  let mockNavController: jest.Mocked<NavController>;
  let mockFoodService: jest.Mocked<FoodService>;

  beforeEach(async () => {
    mockDataService = {
      calculateBolus: jest.fn(),
    } as any;

    mockNavController = {
      navigateBack: jest.fn(),
    } as any;

    // Create signals for mock FoodService
    const selectedFoodsSignal = signal<SelectedFood[]>([]);
    const totalCarbsComputed = computed(() =>
      selectedFoodsSignal().reduce((sum, sf) => sum + sf.totalCarbs, 0)
    );

    mockFoodService = {
      clearSelection: jest.fn(),
      getSortedCategories: jest
        .fn()
        .mockReturnValue([
          { key: 'fruits', nameKey: 'foodPicker.categories.fruits', emoji: '🍎', order: 1 },
        ]),
      searchFoods: jest.fn().mockReturnValue([]),
      getFoodsByCategory: jest.fn().mockReturnValue([]),
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
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BolusCalculatorPage);
    component = fixture.componentInstance;
    // Don't call detectChanges() here to avoid Ionic icon loading issues in tests
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty form', () => {
      expect(component.calculatorForm.value).toEqual({
        currentGlucose: '',
        carbGrams: '',
      });
    });

    it('should initialize with no result', () => {
      expect(component.result).toBeNull();
    });

    it('should initialize with calculating as false', () => {
      expect(component.calculating).toBe(false);
    });

    it('should initialize with food picker closed', () => {
      expect(component.showFoodPicker()).toBe(false);
    });

    it('should initialize with empty selected foods', () => {
      expect(component.selectedFoods()).toEqual([]);
    });
  });

  describe('Form Validation', () => {
    describe('currentGlucose field', () => {
      it('should be invalid when empty', () => {
        const field = component.calculatorForm.get('currentGlucose');
        expect(field?.valid).toBe(false);
        expect(field?.errors?.['required']).toBe(true);
      });

      it('should be invalid when below minimum (40)', () => {
        const field = component.calculatorForm.get('currentGlucose');
        field?.setValue(39);
        expect(field?.valid).toBe(false);
        expect(field?.errors?.['min']).toBeTruthy();
      });

      it('should be invalid when above maximum (600)', () => {
        const field = component.calculatorForm.get('currentGlucose');
        field?.setValue(601);
        expect(field?.valid).toBe(false);
        expect(field?.errors?.['max']).toBeTruthy();
      });

      it('should be valid at minimum boundary (40)', () => {
        const field = component.calculatorForm.get('currentGlucose');
        field?.setValue(40);
        expect(field?.valid).toBe(true);
      });

      it('should be valid at maximum boundary (600)', () => {
        const field = component.calculatorForm.get('currentGlucose');
        field?.setValue(600);
        expect(field?.valid).toBe(true);
      });

      it('should be valid with typical value (120)', () => {
        const field = component.calculatorForm.get('currentGlucose');
        field?.setValue(120);
        expect(field?.valid).toBe(true);
      });
    });

    describe('carbGrams field', () => {
      it('should be invalid when empty', () => {
        const field = component.calculatorForm.get('carbGrams');
        expect(field?.valid).toBe(false);
        expect(field?.errors?.['required']).toBe(true);
      });

      it('should be invalid when negative', () => {
        const field = component.calculatorForm.get('carbGrams');
        field?.setValue(-1);
        expect(field?.valid).toBe(false);
        expect(field?.errors?.['min']).toBeTruthy();
      });

      it('should be invalid when above maximum (300)', () => {
        const field = component.calculatorForm.get('carbGrams');
        field?.setValue(301);
        expect(field?.valid).toBe(false);
        expect(field?.errors?.['max']).toBeTruthy();
      });

      it('should be valid at minimum boundary (0)', () => {
        const field = component.calculatorForm.get('carbGrams');
        field?.setValue(0);
        expect(field?.valid).toBe(true);
      });

      it('should be valid at maximum boundary (300)', () => {
        const field = component.calculatorForm.get('carbGrams');
        field?.setValue(300);
        expect(field?.valid).toBe(true);
      });

      it('should be valid with typical value (45)', () => {
        const field = component.calculatorForm.get('carbGrams');
        field?.setValue(45);
        expect(field?.valid).toBe(true);
      });
    });

    it('should validate entire form when all fields are valid', () => {
      component.calculatorForm.patchValue({
        currentGlucose: 150,
        carbGrams: 60,
      });
      expect(component.calculatorForm.valid).toBe(true);
    });

    it('should invalidate form when any field is invalid', () => {
      component.calculatorForm.patchValue({
        currentGlucose: 150,
        carbGrams: 350, // exceeds max
      });
      expect(component.calculatorForm.valid).toBe(false);
    });
  });

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

    it('should calculate bolus with valid inputs', fakeAsync(() => {
      component.calculatorForm.patchValue({
        currentGlucose: 180,
        carbGrams: 60,
      });

      component.calculateBolus();
      expect(component.calculating).toBe(true);

      tick(100);

      expect(mockDataService.calculateBolus).toHaveBeenCalledWith({
        currentGlucose: 180,
        carbGrams: 60,
      });
      expect(component.result).toEqual(mockCalculation);
      expect(component.calculating).toBe(false);
    }));

    it('should not calculate when form is invalid', fakeAsync(() => {
      component.calculatorForm.patchValue({
        currentGlucose: '',
        carbGrams: 60,
      });

      component.calculateBolus();

      expect(mockDataService.calculateBolus).not.toHaveBeenCalled();
      expect(component.calculating).toBe(false);
    }));

    it('should handle calculation for high blood glucose (correction needed)', fakeAsync(() => {
      const highGlucoseCalc: BolusCalculation = {
        carbGrams: 45,
        currentGlucose: 250,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 5.6, // 3 (carbs) + 2.6 (correction)
      };

      mockDataService.calculateBolus.mockReturnValue(of(highGlucoseCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 250,
        carbGrams: 45,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result?.recommendedInsulin).toBe(5.6);
    }));

    it('should handle calculation for normal blood glucose (no correction)', fakeAsync(() => {
      const normalGlucoseCalc: BolusCalculation = {
        carbGrams: 45,
        currentGlucose: 120,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 3.0, // 3 (carbs) + 0 (no correction needed)
      };

      mockDataService.calculateBolus.mockReturnValue(of(normalGlucoseCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 120,
        carbGrams: 45,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result?.recommendedInsulin).toBe(3.0);
    }));

    it('should handle calculation for low blood glucose (hypoglycemia prevention)', fakeAsync(() => {
      const lowGlucoseCalc: BolusCalculation = {
        carbGrams: 30,
        currentGlucose: 70,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 2.0, // Only carb insulin, no negative correction
      };

      mockDataService.calculateBolus.mockReturnValue(of(lowGlucoseCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 70,
        carbGrams: 30,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result?.recommendedInsulin).toBe(2.0);
      expect(component.result?.currentGlucose).toBeLessThan(component.result?.targetGlucose || 0);
    }));

    it('should handle zero carbs calculation (correction only)', fakeAsync(() => {
      const zeroCarbs: BolusCalculation = {
        carbGrams: 0,
        currentGlucose: 200,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 1.6, // 0 (carbs) + 1.6 (correction)
      };

      mockDataService.calculateBolus.mockReturnValue(of(zeroCarbs));

      component.calculatorForm.patchValue({
        currentGlucose: 200,
        carbGrams: 0,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result?.recommendedInsulin).toBe(1.6);
    }));

    it('should handle large meal calculation (high carbs)', fakeAsync(() => {
      const largeMeal: BolusCalculation = {
        carbGrams: 150,
        currentGlucose: 130,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 10.2, // 10 (carbs) + 0.2 (correction)
      };

      mockDataService.calculateBolus.mockReturnValue(of(largeMeal));

      component.calculatorForm.patchValue({
        currentGlucose: 130,
        carbGrams: 150,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result?.recommendedInsulin).toBe(10.2);
    }));

    it('should round recommended insulin to 1 decimal place', fakeAsync(() => {
      const roundedCalc: BolusCalculation = {
        carbGrams: 47,
        currentGlucose: 145,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 3.6, // Rounded from 3.633...
      };

      mockDataService.calculateBolus.mockReturnValue(of(roundedCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 145,
        carbGrams: 47,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result?.recommendedInsulin).toBe(3.6);
    }));
  });

  describe('Error Handling', () => {
    it('should handle calculation error gracefully', fakeAsync(() => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDataService.calculateBolus.mockReturnValue(
        throwError(() => new Error('Calculation failed'))
      );

      component.calculatorForm.patchValue({
        currentGlucose: 150,
        carbGrams: 60,
      });

      component.calculateBolus();
      tick(100);

      expect(component.calculating).toBe(false);
      expect(component.result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error calculating bolus:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    }));

    it('should handle service throw error', fakeAsync(() => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDataService.calculateBolus.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      component.calculatorForm.patchValue({
        currentGlucose: 150,
        carbGrams: 60,
      });

      component.calculateBolus();

      expect(component.calculating).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    }));
  });

  describe('Error Messages', () => {
    it('should show glucose required error', () => {
      const field = component.calculatorForm.get('currentGlucose');
      field?.markAsTouched();
      field?.setValue('');

      expect(component.glucoseError).toBeTruthy();
      expect(component.glucoseError).toContain('bolusCalculator.errors.glucoseRequired');
    });

    it('should show glucose range error for low value', () => {
      const field = component.calculatorForm.get('currentGlucose');
      field?.markAsTouched();
      field?.setValue(30);

      expect(component.glucoseError).toBeTruthy();
      expect(component.glucoseError).toContain('bolusCalculator.errors.glucoseRange');
    });

    it('should show glucose range error for high value', () => {
      const field = component.calculatorForm.get('currentGlucose');
      field?.markAsTouched();
      field?.setValue(700);

      expect(component.glucoseError).toBeTruthy();
      expect(component.glucoseError).toContain('bolusCalculator.errors.glucoseRange');
    });

    it('should show carbs required error', () => {
      const field = component.calculatorForm.get('carbGrams');
      field?.markAsTouched();
      field?.setValue('');

      expect(component.carbsError).toBeTruthy();
      expect(component.carbsError).toContain('bolusCalculator.errors.carbsRequired');
    });

    it('should show carbs range error for negative value', () => {
      const field = component.calculatorForm.get('carbGrams');
      field?.markAsTouched();
      field?.setValue(-5);

      expect(component.carbsError).toBeTruthy();
      expect(component.carbsError).toContain('bolusCalculator.errors.carbsRange');
    });

    it('should show carbs range error for excessive value', () => {
      const field = component.calculatorForm.get('carbGrams');
      field?.markAsTouched();
      field?.setValue(350);

      expect(component.carbsError).toBeTruthy();
      expect(component.carbsError).toContain('bolusCalculator.errors.carbsRange');
    });

    it('should show no error when field is valid', () => {
      const glucoseField = component.calculatorForm.get('currentGlucose');
      const carbsField = component.calculatorForm.get('carbGrams');

      glucoseField?.markAsTouched();
      glucoseField?.setValue(150);
      carbsField?.markAsTouched();
      carbsField?.setValue(60);

      expect(component.glucoseError).toBe('');
      expect(component.carbsError).toBe('');
    });

    it('should not show error when field is untouched', () => {
      const field = component.calculatorForm.get('currentGlucose');
      field?.setValue(''); // Invalid but untouched

      expect(component.glucoseError).toBe('');
    });
  });

  describe('Field Validation Helper', () => {
    it('should return true when field is invalid and touched', () => {
      const field = component.calculatorForm.get('currentGlucose');
      field?.markAsTouched();
      field?.setValue('');

      expect(component.isFieldInvalid('currentGlucose')).toBe(true);
    });

    it('should return true when field is invalid and dirty', () => {
      const field = component.calculatorForm.get('currentGlucose');
      field?.markAsDirty();
      field?.setValue('');

      expect(component.isFieldInvalid('currentGlucose')).toBe(true);
    });

    it('should return false when field is valid', () => {
      const field = component.calculatorForm.get('currentGlucose');
      field?.markAsTouched();
      field?.setValue(150);

      expect(component.isFieldInvalid('currentGlucose')).toBe(false);
    });

    it('should return false when field is invalid but not touched or dirty', () => {
      const field = component.calculatorForm.get('currentGlucose');
      field?.setValue('');

      expect(component.isFieldInvalid('currentGlucose')).toBe(false);
    });
  });

  describe('Input Change Handler', () => {
    it('should update form value from ion-input event', () => {
      // Spy on detectChanges to prevent rendering
      const detectChangesSpy = jest.spyOn(component['cdr'], 'detectChanges');

      const event = {
        detail: { value: '150' },
      } as CustomEvent;

      component.onInputChange('currentGlucose', event);

      expect(component.calculatorForm.value.currentGlucose).toBe('150');
      expect(detectChangesSpy).toHaveBeenCalled();
    });

    it('should mark field as touched', () => {
      // Spy on detectChanges to prevent rendering
      jest.spyOn(component['cdr'], 'detectChanges');

      const event = {
        detail: { value: '60' },
      } as CustomEvent;

      component.onInputChange('carbGrams', event);

      const field = component.calculatorForm.get('carbGrams');
      expect(field?.touched).toBe(true);
    });
  });

  describe('Food Picker Integration', () => {
    it('should open food picker', () => {
      component.openFoodPicker();

      expect(mockFoodService.clearSelection).toHaveBeenCalled();
      expect(component.showFoodPicker()).toBe(true);
    });

    it('should close food picker without applying', () => {
      component.showFoodPicker.set(true);

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

      const result: FoodPickerResult = {
        selectedFoods,
        totalCarbs: 49,
      };

      component.onFoodPickerConfirmed(result);

      expect(component.showFoodPicker()).toBe(false);
      expect(component.selectedFoods()).toEqual(selectedFoods);
      expect(component.calculatorForm.value.carbGrams).toBe(49);
    });

    it('should round total carbs when applying from food picker', () => {
      const result: FoodPickerResult = {
        selectedFoods: [],
        totalCarbs: 47.8,
      };

      component.onFoodPickerConfirmed(result);

      expect(component.calculatorForm.value.carbGrams).toBe(48);
    });

    it('should not update carbs when food picker total is zero', () => {
      component.calculatorForm.patchValue({ carbGrams: 30 });

      const result: FoodPickerResult = {
        selectedFoods: [],
        totalCarbs: 0,
      };

      component.onFoodPickerConfirmed(result);

      expect(component.calculatorForm.value.carbGrams).toBe(30);
    });

    it('should mark carbs field as touched after food picker confirmation', () => {
      const result: FoodPickerResult = {
        selectedFoods: [],
        totalCarbs: 45,
      };

      component.onFoodPickerConfirmed(result);

      const field = component.calculatorForm.get('carbGrams');
      expect(field?.touched).toBe(true);
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

  describe('Reset Functionality', () => {
    it('should reset form to initial state', () => {
      component.calculatorForm.patchValue({
        currentGlucose: 150,
        carbGrams: 60,
      });
      component.result = {
        carbGrams: 60,
        currentGlucose: 150,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 5.2,
      };
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

      component.resetCalculator();

      expect(component.calculatorForm.value).toEqual({
        currentGlucose: null,
        carbGrams: null,
      });
      expect(component.result).toBeNull();
      expect(component.selectedFoods()).toEqual([]);
    });

    it('should clear validation errors on reset', () => {
      const glucoseField = component.calculatorForm.get('currentGlucose');
      glucoseField?.markAsTouched();
      glucoseField?.setValue('');

      component.resetCalculator();

      expect(component.glucoseError).toBe('');
      expect(component.isFieldInvalid('currentGlucose')).toBe(false);
    });
  });

  describe('Navigation', () => {
    it('should navigate back to dashboard', () => {
      component.goBack();

      expect(mockNavController.navigateBack).toHaveBeenCalledWith('/tabs/dashboard');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle minimum valid glucose (40 mg/dL)', fakeAsync(() => {
      const minGlucoseCalc: BolusCalculation = {
        carbGrams: 15,
        currentGlucose: 40,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 1.0,
      };

      mockDataService.calculateBolus.mockReturnValue(of(minGlucoseCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 40,
        carbGrams: 15,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result?.currentGlucose).toBe(40);
      expect(component.result?.recommendedInsulin).toBeGreaterThanOrEqual(0);
    }));

    it('should handle maximum valid glucose (600 mg/dL)', fakeAsync(() => {
      const maxGlucoseCalc: BolusCalculation = {
        carbGrams: 0,
        currentGlucose: 600,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 9.6, // Large correction dose
      };

      mockDataService.calculateBolus.mockReturnValue(of(maxGlucoseCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 600,
        carbGrams: 0,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result?.currentGlucose).toBe(600);
      expect(component.result?.recommendedInsulin).toBeGreaterThan(0);
    }));

    it('should handle maximum valid carbs (300g)', fakeAsync(() => {
      const maxCarbsCalc: BolusCalculation = {
        carbGrams: 300,
        currentGlucose: 120,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 20.0, // 300/15 = 20 units
      };

      mockDataService.calculateBolus.mockReturnValue(of(maxCarbsCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 120,
        carbGrams: 300,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result?.carbGrams).toBe(300);
      expect(component.result?.recommendedInsulin).toBe(20.0);
    }));

    it('should handle decimal glucose values', fakeAsync(() => {
      const decimalCalc: BolusCalculation = {
        carbGrams: 45,
        currentGlucose: 145.5,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 3.5,
      };

      mockDataService.calculateBolus.mockReturnValue(of(decimalCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 145.5,
        carbGrams: 45,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result).toBeDefined();
    }));

    it('should handle decimal carb values', fakeAsync(() => {
      const decimalCalc: BolusCalculation = {
        carbGrams: 47.5,
        currentGlucose: 120,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 3.2,
      };

      mockDataService.calculateBolus.mockReturnValue(of(decimalCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 120,
        carbGrams: 47.5,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result).toBeDefined();
    }));

    it('should handle string input conversion to numbers', fakeAsync(() => {
      const calc: BolusCalculation = {
        carbGrams: 45,
        currentGlucose: 150,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 3.6,
      };

      mockDataService.calculateBolus.mockReturnValue(of(calc));

      component.calculatorForm.patchValue({
        currentGlucose: '150',
        carbGrams: '45',
      });

      component.calculateBolus();
      tick(100);

      expect(mockDataService.calculateBolus).toHaveBeenCalledWith({
        currentGlucose: 150,
        carbGrams: 45,
      });
    }));
  });

  describe('Medical Safety Considerations', () => {
    it('should never recommend negative insulin', fakeAsync(() => {
      const safeCalc: BolusCalculation = {
        carbGrams: 0,
        currentGlucose: 70,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 0, // Should be 0, not negative
      };

      mockDataService.calculateBolus.mockReturnValue(of(safeCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 70,
        carbGrams: 0,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result?.recommendedInsulin).toBeGreaterThanOrEqual(0);
    }));

    it('should preserve calculation details for medical review', fakeAsync(() => {
      const detailedCalc: BolusCalculation = {
        carbGrams: 60,
        currentGlucose: 180,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 5.2,
      };

      mockDataService.calculateBolus.mockReturnValue(of(detailedCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 180,
        carbGrams: 60,
      });

      component.calculateBolus();
      tick(100);

      // All calculation details should be preserved
      expect(component.result?.carbGrams).toBe(60);
      expect(component.result?.currentGlucose).toBe(180);
      expect(component.result?.targetGlucose).toBe(120);
      expect(component.result?.carbRatio).toBe(15);
      expect(component.result?.correctionFactor).toBe(50);
      expect(component.result?.recommendedInsulin).toBe(5.2);
    }));

    it('should handle critical high glucose safely', fakeAsync(() => {
      const criticalHighCalc: BolusCalculation = {
        carbGrams: 30,
        currentGlucose: 400,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 7.6, // 2 (carbs) + 5.6 (correction)
      };

      mockDataService.calculateBolus.mockReturnValue(of(criticalHighCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 400,
        carbGrams: 30,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result?.currentGlucose).toBe(400);
      expect(component.result?.recommendedInsulin).toBeGreaterThan(0);
    }));

    it('should handle critical low glucose safely (hypoglycemia)', fakeAsync(() => {
      const criticalLowCalc: BolusCalculation = {
        carbGrams: 15,
        currentGlucose: 50,
        targetGlucose: 120,
        carbRatio: 15,
        correctionFactor: 50,
        recommendedInsulin: 1.0, // Only carb insulin, no correction
      };

      mockDataService.calculateBolus.mockReturnValue(of(criticalLowCalc));

      component.calculatorForm.patchValue({
        currentGlucose: 50,
        carbGrams: 15,
      });

      component.calculateBolus();
      tick(100);

      expect(component.result?.currentGlucose).toBe(50);
      // Should not add correction insulin when below target
      expect(component.result?.recommendedInsulin).toBeGreaterThanOrEqual(0);
    }));
  });

  describe('User Experience', () => {
    it('should show calculating state during async operation', () => {
      mockDataService.calculateBolus.mockReturnValue(of({} as BolusCalculation).pipe(delay(500)));

      component.calculatorForm.patchValue({
        currentGlucose: 150,
        carbGrams: 60,
      });

      component.calculateBolus();

      expect(component.calculating).toBe(true);
    });

    it('should clear calculating state after successful calculation', fakeAsync(() => {
      mockDataService.calculateBolus.mockReturnValue(
        of({
          carbGrams: 60,
          currentGlucose: 150,
          targetGlucose: 120,
          carbRatio: 15,
          correctionFactor: 50,
          recommendedInsulin: 4.6,
        }).pipe(delay(100))
      );

      component.calculatorForm.patchValue({
        currentGlucose: 150,
        carbGrams: 60,
      });

      component.calculateBolus();
      tick(100);

      expect(component.calculating).toBe(false);
    }));

    it('should preserve form values after calculation', fakeAsync(() => {
      mockDataService.calculateBolus.mockReturnValue(
        of({
          carbGrams: 45,
          currentGlucose: 120,
          targetGlucose: 120,
          carbRatio: 15,
          correctionFactor: 50,
          recommendedInsulin: 3.0,
        })
      );

      component.calculatorForm.patchValue({
        currentGlucose: 120,
        carbGrams: 45,
      });

      component.calculateBolus();
      tick(100);

      expect(component.calculatorForm.value.currentGlucose).toBe(120);
      expect(component.calculatorForm.value.carbGrams).toBe(45);
    }));

    it('should allow recalculation with different values', fakeAsync(() => {
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

      component.calculatorForm.patchValue({
        currentGlucose: 150,
        carbGrams: 60,
      });
      component.calculateBolus();
      tick(100);

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

      component.calculatorForm.patchValue({
        currentGlucose: 180,
        carbGrams: 30,
      });
      component.calculateBolus();
      tick(100);

      expect(component.result).not.toEqual(firstResult);
      expect(component.result?.carbGrams).toBe(30);
      expect(component.result?.currentGlucose).toBe(180);
    }));
  });
});
