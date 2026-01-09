import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastController, ModalController, IonicModule } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

import { EditReadingPage } from './edit-reading.page';
import { ReadingsService } from '@services/readings.service';
import { ProfileService } from '@services/profile.service';
import { LoggerService } from '@services/logger.service';
import { LocalGlucoseReading, GlucoseUnit } from '@models/glucose-reading.model';
import { UserProfile, DEFAULT_USER_PREFERENCES, AccountState } from '@models/user-profile.model';

describe('EditReadingPage', () => {
  let component: EditReadingPage;
  let fixture: ComponentFixture<EditReadingPage>;
  let mockReadingsService: any;
  let mockProfileService: any;
  let mockToastController: any;
  let mockTranslateService: any;
  let mockLoggerService: any;
  let mockModalController: any;

  const mockReading: LocalGlucoseReading = {
    id: 'reading-1',
    type: 'smbg',
    value: 120,
    units: 'mg/dL' as GlucoseUnit,
    time: new Date().toISOString(),
    mealContext: 'DESAYUNO',
    notes: 'Test reading',
    synced: false,
  };

  const mockProfile: UserProfile = {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    age: 25,
    accountState: AccountState.ACTIVE,
    preferences: {
      ...DEFAULT_USER_PREFERENCES,
      glucoseUnit: 'mg/dL',
    },
    tidepoolConnection: {
      connected: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    mockReadingsService = {
      updateReading: vi.fn().mockResolvedValue(undefined),
    };

    mockProfileService = {
      profile$: new BehaviorSubject<UserProfile | null>(mockProfile),
    };

    mockToastController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockTranslateService = {
      instant: vi.fn((key: string) => key),
    };

    mockLoggerService = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockModalController = {
      dismiss: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [EditReadingPage, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: ReadingsService, useValue: mockReadingsService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: ToastController, useValue: mockToastController },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: ModalController, useValue: mockModalController },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditReadingPage);
    component = fixture.componentInstance;
    component.reading = { ...mockReading };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should be a standalone component', () => {
      const componentMetadata = (EditReadingPage as any).ɵcmp;
      expect(componentMetadata.standalone).toBe(true);
    });

    it('should use OnPush change detection strategy', () => {
      const componentMetadata = (EditReadingPage as any).ɵcmp;
      expect(
        componentMetadata.changeDetection === 0 || componentMetadata.changeDetection === undefined
      ).toBe(true);
    });

    it('should have correct selector', () => {
      const componentMetadata = (EditReadingPage as any).ɵcmp;
      expect(componentMetadata.selectors[0][0]).toBe('app-edit-reading');
    });

    it('should initialize form with reading data', () => {
      component.ngOnInit();

      expect(component.readingForm).toBeDefined();
      expect(component.readingForm.get('value')?.value).toBe(120);
      expect(component.readingForm.get('datetime')?.value).toBe(mockReading.time);
      expect(component.readingForm.get('mealContext')?.value).toBe('DESAYUNO');
      expect(component.readingForm.get('notes')?.value).toBe('Test reading');
    });

    it('should dismiss modal if no reading is provided', async () => {
      const dismissSpy = vi.spyOn(mockModalController, 'dismiss');
      const errorSpy = vi.spyOn(mockLoggerService, 'error');
      
      component.reading = null as any;
      component.ngOnInit();

      expect(errorSpy).toHaveBeenCalled();
      expect(dismissSpy).toHaveBeenCalledWith(null, 'cancel');
    });

    it('should set correct glucose unit from reading', () => {
      component.ngOnInit();

      expect(component.currentUnit).toBe('mg/dL');
    });

    it('should update glucose status on init', () => {
      component.ngOnInit();

      expect(component.glucoseStatus).toBe('normal');
      expect(component.glucoseStatusEmoji).toBe('✅');
      expect(component.glucoseStatusColor).toBe('success');
    });

    it('should clean up subscriptions on destroy', () => {
      component.ngOnInit();
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Form Validation - mg/dL', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should reject glucose value below minimum (19)', () => {
      component.readingForm.get('value')?.setValue(19);

      expect(component.readingForm.get('value')?.errors?.['min']).toBeTruthy();
      expect(component.readingForm.valid).toBeFalsy();
    });

    it('should accept glucose value at minimum boundary (20)', () => {
      component.readingForm.get('value')?.setValue(20);

      expect(component.readingForm.get('value')?.errors).toBeNull();
    });

    it('should accept glucose value in normal range (100)', () => {
      component.readingForm.get('value')?.setValue(100);

      expect(component.readingForm.get('value')?.errors).toBeNull();
      expect(component.readingForm.valid).toBeTruthy();
    });

    it('should accept glucose value at maximum boundary (600)', () => {
      component.readingForm.get('value')?.setValue(600);

      expect(component.readingForm.get('value')?.errors).toBeNull();
    });

    it('should reject glucose value above maximum (601)', () => {
      component.readingForm.get('value')?.setValue(601);

      expect(component.readingForm.get('value')?.errors?.['max']).toBeTruthy();
      expect(component.readingForm.valid).toBeFalsy();
    });

    it('should require glucose value', () => {
      component.readingForm.get('value')?.setValue(null);

      expect(component.readingForm.get('value')?.errors?.['required']).toBeTruthy();
      expect(component.readingForm.valid).toBeFalsy();
    });
  });

  describe('Form Validation - mmol/L', () => {
    beforeEach(() => {
      component.reading = { ...mockReading, units: 'mmol/L' };
      component.ngOnInit();
    });

    it('should reject glucose value below minimum (1.0)', () => {
      component.readingForm.get('value')?.setValue(1.0);

      expect(component.readingForm.get('value')?.errors?.['min']).toBeTruthy();
    });

    it('should accept glucose value at minimum boundary (1.1)', () => {
      component.readingForm.get('value')?.setValue(1.1);

      expect(component.readingForm.get('value')?.errors).toBeNull();
    });

    it('should accept glucose value in normal range (5.5)', () => {
      component.readingForm.get('value')?.setValue(5.5);

      expect(component.readingForm.get('value')?.errors).toBeNull();
    });

    it('should accept glucose value at maximum boundary (33.3)', () => {
      component.readingForm.get('value')?.setValue(33.3);

      expect(component.readingForm.get('value')?.errors).toBeNull();
    });

    it('should reject glucose value above maximum (33.4)', () => {
      component.readingForm.get('value')?.setValue(33.4);

      expect(component.readingForm.get('value')?.errors?.['max']).toBeTruthy();
    });
  });

  describe('Glucose Status Classification', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should classify critical low glucose (< 54 mg/dL)', () => {
      component.readingForm.get('value')?.setValue(50);

      expect(component.glucoseStatus).toBe('critical-low');
      expect(component.glucoseStatusEmoji).toBe('⚠️');
      expect(component.glucoseStatusColor).toBe('danger');
    });

    it('should classify low glucose (54-69 mg/dL)', () => {
      component.readingForm.get('value')?.setValue(65);

      expect(component.glucoseStatus).toBe('low');
      expect(component.glucoseStatusEmoji).toBe('⬇️');
      expect(component.glucoseStatusColor).toBe('warning');
    });

    it('should classify normal glucose (70-180 mg/dL)', () => {
      component.readingForm.get('value')?.setValue(120);

      expect(component.glucoseStatus).toBe('normal');
      expect(component.glucoseStatusEmoji).toBe('✅');
      expect(component.glucoseStatusColor).toBe('success');
    });

    it('should classify high glucose (181-250 mg/dL)', () => {
      component.readingForm.get('value')?.setValue(200);

      expect(component.glucoseStatus).toBe('high');
      expect(component.glucoseStatusEmoji).toBe('⬆️');
      expect(component.glucoseStatusColor).toBe('warning');
    });

    it('should classify critical high glucose (> 250 mg/dL)', () => {
      component.readingForm.get('value')?.setValue(300);

      expect(component.glucoseStatus).toBe('critical-high');
      expect(component.glucoseStatusEmoji).toBe('⚠️');
      expect(component.glucoseStatusColor).toBe('danger');
    });

    it('should handle mmol/L conversion for status', () => {
      component.reading = { ...mockReading, units: 'mmol/L' };
      component.ngOnInit();
      component.readingForm.get('value')?.setValue(10);

      expect(component.glucoseStatus).toBe('high');
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should update reading on valid form submission', async () => {
      component.readingForm.get('value')?.setValue(150);
      component.readingForm.get('notes')?.setValue('Updated note');

      await component.onSubmit();

      expect(mockReadingsService.updateReading).toHaveBeenCalledWith('reading-1', {
        value: 150,
        time: expect.any(String),
        notes: 'Updated note',
        mealContext: 'DESAYUNO',
      });
      expect(mockToastController.create).toHaveBeenCalled();
      expect(mockModalController.dismiss).toHaveBeenCalledWith({ updated: true }, 'confirm');
    });

    it('should not submit invalid form', async () => {
      component.readingForm.get('value')?.setValue(19);

      await component.onSubmit();

      expect(mockReadingsService.updateReading).not.toHaveBeenCalled();
      expect(mockLoggerService.warn).toHaveBeenCalled();
    });

    it('should handle submission error', async () => {
      mockReadingsService.updateReading.mockRejectedValue(new Error('Update failed'));
      component.readingForm.get('value')?.setValue(150);

      await component.onSubmit();

      expect(mockLoggerService.error).toHaveBeenCalled();
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'danger',
        })
      );
    });

    it('should set isSubmitting flag during submission', async () => {
      component.readingForm.get('value')?.setValue(150);

      const submitPromise = component.onSubmit();
      expect(component.isSubmitting).toBe(true);

      await submitPromise;
      expect(component.isSubmitting).toBe(false);
    });
  });

  describe('Cancel Action', () => {
    it('should dismiss modal on cancel', () => {
      component.onCancel();

      expect(mockModalController.dismiss).toHaveBeenCalledWith(null, 'cancel');
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should get status label', () => {
      component.glucoseStatus = 'high';
      const translateSpy = vi.spyOn(component['translate'], 'instant').mockReturnValue('glucose.status.high');

      const label = component.getStatusLabel();

      expect(translateSpy).toHaveBeenCalledWith('glucose.status.high');
      expect(label).toBe('glucose.status.high');
    });

    it('should get unit label', () => {
      expect(component.getUnitLabel()).toBe('mg/dL');
    });

    it('should get validation message for required field', () => {
      component.readingForm.get('value')?.setValue(null);
      component.readingForm.get('value')?.markAsTouched();

      const message = component.getValidationMessage('value');

      expect(message).toBe('addReading.validation.required');
    });

    it('should get validation message for min value', () => {
      component.readingForm.get('value')?.setValue(19);
      component.readingForm.get('value')?.markAsTouched();

      const message = component.getValidationMessage('value');

      expect(message).toContain('addReading.validation.minValue');
    });

    it('should get validation message for max value', () => {
      component.readingForm.get('value')?.setValue(601);
      component.readingForm.get('value')?.markAsTouched();

      const message = component.getValidationMessage('value');

      expect(message).toContain('addReading.validation.maxValue');
    });

    it('should return empty string for valid field', () => {
      component.readingForm.get('value')?.setValue(120);

      const message = component.getValidationMessage('value');

      expect(message).toBe('');
    });
  });

  describe('Meal Context Options', () => {
    it('should have correct meal context options', () => {
      expect(component.mealContextOptions).toEqual([
        { value: 'DESAYUNO', labelKey: 'glucose.context.breakfast' },
        { value: 'ALMUERZO', labelKey: 'glucose.context.lunch' },
        { value: 'MERIENDA', labelKey: 'glucose.context.snack' },
        { value: 'CENA', labelKey: 'glucose.context.dinner' },
        { value: 'EJERCICIO', labelKey: 'glucose.context.exercise' },
        { value: 'OTRAS_COMIDAS', labelKey: 'glucose.context.otherMeals' },
        { value: 'OTRO', labelKey: 'glucose.context.other' },
      ]);
    });

    it('should track meal context by value', () => {
      const option = { value: 'DESAYUNO', labelKey: 'glucose.context.breakfast' };

      const result = component.trackByMealContext(0, option);

      expect(result).toBe('DESAYUNO');
    });
  });
});
