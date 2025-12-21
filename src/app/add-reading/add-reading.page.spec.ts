// Initialize TestBed environment for Vitest
import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { AddReadingPage } from './add-reading.page';
import { getLucideIconsForTesting } from '@core/../tests/helpers/icon-test.helper';
import { ReadingsService } from '@core/services/readings.service';
import { ProfileService } from '@core/services/profile.service';
import { LoggerService } from '@core/services/logger.service';
import { BehaviorSubject, of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { vi } from 'vitest';

describe('AddReadingPage', () => {
  let component: AddReadingPage;
  let fixture: ComponentFixture<AddReadingPage>;

  beforeEach(async () => {
    const mockModalController = {
      dismiss: vi.fn().mockResolvedValue(undefined),
    };

    const mockReadingsService = {
      addReading: vi.fn().mockReturnValue(of({})),
    };

    const mockProfileService = {
      profile$: new BehaviorSubject({
        id: 'test-user-id',
        dni: '12345678',
        name: 'Test',
        surname: 'User',
        email: 'test@example.com',
        accountState: 'active' as const,
        preferences: {
          glucoseUnit: 'mg/dL' as const,
          language: 'en',
          theme: 'light',
        },
        tidepoolConnection: {
          connected: false,
        },
      }),
      tidepoolConnected$: new BehaviorSubject(false),
      getProfile: vi.fn().mockResolvedValue(null),
      updateProfile: vi.fn().mockResolvedValue(undefined),
    };

    const mockLoggerService = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        AddReadingPage,
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        getLucideIconsForTesting(),
      ],
      providers: [
        { provide: ModalController, useValue: mockModalController },
        { provide: ReadingsService, useValue: mockReadingsService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AddReadingPage);
    component = fixture.componentInstance;
    // DO NOT call fixture.detectChanges() as it triggers form initialization
    // which requires Ionic's ControlValueAccessor for ion-input
  });

  describe('Form Validation', () => {
    // Initialize component before each validation test
    beforeEach(() => {
      // Call ngOnInit to initialize the form
      component.ngOnInit();
    });

    describe('mg/dL unit', () => {
      beforeEach(() => {
        component.currentUnit = 'mg/dL';
        component.updateValidatorsForUnit('mg/dL');
      });

      it('should reject glucose value below minimum (19)', () => {
        component.readingForm.controls.value.setValue(19);
        expect(component.readingForm.controls.value.errors?.['min']).toBeTruthy();
        expect(component.readingForm.valid).toBeFalsy();
      });

      it('should accept glucose value at minimum boundary (20)', () => {
        component.readingForm.controls.value.setValue(20);
        expect(component.readingForm.controls.value.errors?.['min']).toBeFalsy();
      });

      it('should accept glucose value in valid range (120)', () => {
        component.readingForm.controls.value.setValue(120);
        expect(component.readingForm.controls.value.valid).toBeTruthy();
      });

      it('should accept glucose value at maximum boundary (600)', () => {
        component.readingForm.controls.value.setValue(600);
        expect(component.readingForm.controls.value.errors?.['max']).toBeFalsy();
      });

      it('should reject glucose value above maximum (601)', () => {
        component.readingForm.controls.value.setValue(601);
        expect(component.readingForm.controls.value.errors?.['max']).toBeTruthy();
        expect(component.readingForm.valid).toBeFalsy();
      });

      it('should require a glucose value', () => {
        component.readingForm.controls.value.setValue(null);
        expect(component.readingForm.controls.value.errors?.['required']).toBeTruthy();
      });
    });

    describe('mmol/L unit', () => {
      beforeEach(() => {
        component.currentUnit = 'mmol/L';
        component.updateValidatorsForUnit('mmol/L');
      });

      it('should reject glucose value below minimum (1.0)', () => {
        component.readingForm.controls.value.setValue(1.0);
        expect(component.readingForm.controls.value.errors?.['min']).toBeTruthy();
        expect(component.readingForm.valid).toBeFalsy();
      });

      it('should accept glucose value at minimum boundary (1.1)', () => {
        component.readingForm.controls.value.setValue(1.1);
        expect(component.readingForm.controls.value.errors?.['min']).toBeFalsy();
      });

      it('should accept glucose value in valid range (6.5)', () => {
        component.readingForm.controls.value.setValue(6.5);
        expect(component.readingForm.controls.value.valid).toBeTruthy();
      });

      it('should accept glucose value at maximum boundary (33.3)', () => {
        component.readingForm.controls.value.setValue(33.3);
        expect(component.readingForm.controls.value.errors?.['max']).toBeFalsy();
      });

      it('should reject glucose value above maximum (33.4)', () => {
        component.readingForm.controls.value.setValue(33.4);
        expect(component.readingForm.controls.value.errors?.['max']).toBeTruthy();
        expect(component.readingForm.valid).toBeFalsy();
      });
    });

    describe('getValidationMessage', () => {
      it('should return required error message for empty value', () => {
        component.readingForm.controls.value.setValue(null);
        component.readingForm.controls.value.markAsTouched();
        const error = component.getValidationMessage('value');
        // Mocked TranslateService returns the key as-is
        expect(error).toContain('required');
      });

      it('should return minValue key for value below minimum', () => {
        component.currentUnit = 'mg/dL';
        component.updateValidatorsForUnit('mg/dL');
        component.readingForm.controls.value.setValue(15);
        component.readingForm.controls.value.markAsTouched();
        const error = component.getValidationMessage('value');
        // Mocked TranslateService returns the key as-is
        expect(error).toContain('minValue');
      });

      it('should return maxValue key for value above maximum', () => {
        component.currentUnit = 'mg/dL';
        component.updateValidatorsForUnit('mg/dL');
        component.readingForm.controls.value.setValue(700);
        component.readingForm.controls.value.markAsTouched();
        const error = component.getValidationMessage('value');
        // Mocked TranslateService returns the key as-is
        expect(error).toContain('maxValue');
      });
    });

    describe('Unit Conversion', () => {
      it('should update validators when unit changes to mmol/L', () => {
        component.currentUnit = 'mg/dL';
        component.updateValidatorsForUnit('mg/dL');

        // Value valid in mg/dL
        component.readingForm.controls.value.setValue(100);
        expect(component.readingForm.controls.value.valid).toBeTruthy();

        // Switch to mmol/L - 100 is way above max of 33.3
        component.updateValidatorsForUnit('mmol/L');
        component.currentUnit = 'mmol/L';
        expect(component.readingForm.controls.value.errors?.['max']).toBeTruthy();
      });
    });
  });
});
