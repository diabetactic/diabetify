import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastController, ModalController, IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

import { AddReadingPage } from './add-reading.page';
import { ReadingsService } from '@services/readings.service';
import { ProfileService } from '@services/profile.service';
import { LoggerService } from '@services/logger.service';
import { GlucoseUnit } from '@models/glucose-reading.model';
import { UserProfile, DEFAULT_USER_PREFERENCES, AccountState } from '@models/user-profile.model';

describe('AddReadingPage', () => {
  let component: AddReadingPage;
  let fixture: ComponentFixture<AddReadingPage>;
  let mockReadingsService: any;
  let mockProfileService: any;
  let mockToastController: any;
  let mockTranslateService: any;
  let mockLoggerService: any;
  let mockModalController: any;
  let mockRouter: any;

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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    mockReadingsService = {
      addReading: vi.fn().mockResolvedValue(undefined),
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

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
      url: '/add-reading',
    };

    await TestBed.configureTestingModule({
      imports: [AddReadingPage, IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: ReadingsService, useValue: mockReadingsService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: ToastController, useValue: mockToastController },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: ModalController, useValue: mockModalController },
        { provide: Router, useValue: mockRouter },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AddReadingPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should be a standalone component', () => {
      const componentMetadata = (AddReadingPage as any).ɵcmp;
      expect(componentMetadata.standalone).toBe(true);
    });

    it('should use OnPush change detection strategy', () => {
      const componentMetadata = (AddReadingPage as any).ɵcmp;
      expect(
        componentMetadata.changeDetection === 0 || componentMetadata.changeDetection === undefined
      ).toBe(true);
    });

    it('should have correct selector', () => {
      const componentMetadata = (AddReadingPage as any).ɵcmp;
      expect(componentMetadata.selectors[0][0]).toBe('app-add-reading');
    });

    it('should initialize form with default values', () => {
      component.ngOnInit();

      expect(component.readingForm).toBeDefined();
      expect(component.readingForm.get('value')?.value).toBe('');
      expect(component.readingForm.get('datetime')?.value).toBeTruthy();
      expect(component.readingForm.get('mealContext')?.value).toBe('');
      expect(component.readingForm.get('notes')?.value).toBe('');
    });

    it('should set maxDateTime to current time on init', () => {
      component.ngOnInit();

      expect(component.maxDateTime).toBeTruthy();
      expect(component.maxDateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should initialize with mg/dL unit by default', () => {
      component.ngOnInit();

      expect(component.currentUnit).toBe('mg/dL');
    });

    it('should load user preferences from profile', () => {
      component.ngOnInit();

      expect(component.currentUnit).toBe('mg/dL');
    });

    it('should subscribe to glucose value changes', () => {
      component.ngOnInit();
      component.readingForm.get('value')?.setValue(120);

      expect(component.glucoseStatus).toBe('normal');
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
      const mmolProfile = {
        ...mockProfile,
        preferences: { ...mockProfile.preferences, glucoseUnit: 'mmol/L' as GlucoseUnit },
      };
      mockProfileService.profile$.next(mmolProfile);
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
      const mmolProfile = {
        ...mockProfile,
        preferences: { ...mockProfile.preferences, glucoseUnit: 'mmol/L' as GlucoseUnit },
      };
      mockProfileService.profile$.next(mmolProfile);
      component.ngOnInit();
      component.readingForm.get('value')?.setValue(10);

      expect(component.glucoseStatus).toBe('high');
    });

    it('should clear status when value is empty', () => {
      component.readingForm.get('value')?.setValue(120);
      expect(component.glucoseStatus).toBe('normal');

      component.readingForm.get('value')?.setValue('');

      expect(component.glucoseStatus).toBeNull();
      expect(component.glucoseStatusEmoji).toBe('');
      expect(component.glucoseStatusColor).toBe('');
    });

    it('should clear status when value is invalid', () => {
      component.readingForm.get('value')?.setValue(120);
      expect(component.glucoseStatus).toBe('normal');

      component.readingForm.get('value')?.setValue(-5);

      expect(component.glucoseStatus).toBeNull();
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should add reading on valid form submission', async () => {
      component.readingForm.get('value')?.setValue(150);
      component.readingForm.get('mealContext')?.setValue('DESAYUNO');
      component.readingForm.get('notes')?.setValue('Test note');

      await component.onSubmit();

      expect(mockReadingsService.addReading).toHaveBeenCalledWith({
        type: 'smbg',
        value: 150,
        units: 'mg/dL',
        time: expect.any(String),
        subType: 'manual',
        notes: 'Test note',
        mealContext: 'DESAYUNO',
      });
      expect(mockToastController.create).toHaveBeenCalled();
      expect(mockModalController.dismiss).toHaveBeenCalled();
    });

    it('should not submit invalid form', async () => {
      component.readingForm.get('value')?.setValue(19);

      await component.onSubmit();

      expect(mockReadingsService.addReading).not.toHaveBeenCalled();
      expect(mockLoggerService.warn).toHaveBeenCalled();
    });

    it('should mark all fields as touched when form is invalid', async () => {
      component.readingForm.get('value')?.setValue(null);

      await component.onSubmit();

      expect(component.readingForm.get('value')?.touched).toBe(true);
    });

    it('should handle submission error', async () => {
      mockReadingsService.addReading.mockRejectedValue(new Error('Add failed'));
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

    it('should navigate to readings page after successful submission', async () => {
      component.readingForm.get('value')?.setValue(150);

      await component.onSubmit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tabs/readings']);
    });

    it('should dismiss modal after successful submission', async () => {
      component.readingForm.get('value')?.setValue(150);

      await component.onSubmit();

      expect(mockModalController.dismiss).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'smbg', value: 150 }),
        'confirm'
      );
    });

    it('should omit undefined notes from submission', async () => {
      component.readingForm.get('value')?.setValue(150);
      component.readingForm.get('notes')?.setValue('');

      await component.onSubmit();

      expect(mockReadingsService.addReading).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: undefined,
        })
      );
    });

    it('should omit undefined mealContext from submission', async () => {
      component.readingForm.get('value')?.setValue(150);
      component.readingForm.get('mealContext')?.setValue('');

      await component.onSubmit();

      expect(mockReadingsService.addReading).toHaveBeenCalledWith(
        expect.objectContaining({
          mealContext: undefined,
        })
      );
    });
  });

  describe('Cancel Action', () => {
    it('should dismiss modal on cancel', () => {
      component.onCancel();

      expect(mockModalController.dismiss).toHaveBeenCalledWith(null, 'cancel');
    });

    it('should navigate to readings page after cancel from direct route', async () => {
      mockRouter.url = '/add-reading';
      component.onCancel();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tabs/readings']);
    });

    it('should not navigate after cancel from modal', async () => {
      mockRouter.url = '/tabs/readings';
      component.onCancel();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should get status label', () => {
      component.glucoseStatus = 'high';
      const translateSpy = vi
        .spyOn(component['translate'], 'instant')
        .mockReturnValue('glucose.status.high');

      const label = component.getStatusLabel();

      expect(translateSpy).toHaveBeenCalledWith('glucose.status.high');
      expect(label).toBe('glucose.status.high');
    });

    it('should return empty string for null status', () => {
      component.glucoseStatus = null;

      const label = component.getStatusLabel();

      expect(label).toBe('');
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

    it('should return empty string for untouched field with errors', () => {
      component.readingForm.get('value')?.setValue(19);

      const message = component.getValidationMessage('value');

      expect(message).toBe('');
    });
  });

  describe('Status Label Keys', () => {
    it('should return correct key for critical-low status', () => {
      component.glucoseStatus = 'critical-low';

      expect(component.getStatusLabelKey()).toBe('glucose.status.veryLow');
    });

    it('should return correct key for low status', () => {
      component.glucoseStatus = 'low';

      expect(component.getStatusLabelKey()).toBe('glucose.status.low');
    });

    it('should return correct key for normal status', () => {
      component.glucoseStatus = 'normal';

      expect(component.getStatusLabelKey()).toBe('glucose.status.normal');
    });

    it('should return correct key for high status', () => {
      component.glucoseStatus = 'high';

      expect(component.getStatusLabelKey()).toBe('glucose.status.high');
    });

    it('should return correct key for critical-high status', () => {
      component.glucoseStatus = 'critical-high';

      expect(component.getStatusLabelKey()).toBe('glucose.status.veryHigh');
    });

    it('should return null for null status', () => {
      component.glucoseStatus = null;

      expect(component.getStatusLabelKey()).toBeNull();
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

  describe('Date/Time Handling', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should initialize datetime to current time', () => {
      const datetimeValue = component.readingForm.get('datetime')?.value;
      const now = new Date();

      expect(datetimeValue).toBeTruthy();
      expect(new Date(datetimeValue).getFullYear()).toBe(now.getFullYear());
      expect(new Date(datetimeValue).getMonth()).toBe(now.getMonth());
      expect(new Date(datetimeValue).getDate()).toBe(now.getDate());
    });

    it('should format datetime with timezone offset', () => {
      const datetimeValue = component.readingForm.get('datetime')?.value;

      expect(datetimeValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    });

    it('should set maxDateTime to prevent future dates', () => {
      expect(component.maxDateTime).toBeTruthy();
      expect(new Date(component.maxDateTime).getTime()).toBeLessThanOrEqual(
        new Date().getTime() + 1000
      );
    });
  });

  describe('User Preferences', () => {
    it('should update validators when unit preference changes', () => {
      component.ngOnInit();
      expect(component.currentUnit).toBe('mg/dL');

      const mmolProfile = {
        ...mockProfile,
        preferences: { ...mockProfile.preferences, glucoseUnit: 'mmol/L' as GlucoseUnit },
      };
      mockProfileService.profile$.next(mmolProfile);

      expect(component.currentUnit).toBe('mmol/L');
    });

    it('should handle null profile gracefully', () => {
      mockProfileService.profile$.next(null);
      component.ngOnInit();

      expect(component.currentUnit).toBe('mg/dL');
    });

    it('should handle profile without glucose unit preference', () => {
      const profileWithoutUnit = {
        ...mockProfile,
        preferences: { ...mockProfile.preferences, glucoseUnit: undefined as any },
      };
      mockProfileService.profile$.next(profileWithoutUnit);
      component.ngOnInit();

      expect(component.currentUnit).toBe('mg/dL');
    });
  });
});
