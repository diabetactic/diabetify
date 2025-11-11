/**
 * Integration Test: Add Glucose Reading Flow
 *
 * Following London School TDD (mockist approach):
 * - Tests object collaborations and interactions
 * - Uses mocks to isolate the component under test
 * - Verifies behavior through interaction verification
 * - Focuses on the "conversation" between objects
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, BehaviorSubject } from 'rxjs';

import { AddReadingPage } from '../../../add-reading/add-reading.page';
import { ReadingsService } from '../../../core/services/readings.service';
import { ProfileService } from '../../../core/services/profile.service';
import {
  LocalGlucoseReading,
  SMBGReading,
  GlucoseUnit,
  GlucoseStatus,
} from '../../../core/models/glucose-reading.model';
import { UserProfile, UserPreferences } from '../../../core/models/user-profile.model';
import { getTranslateModuleForTesting } from '../../helpers/translate-test.helper';

describe('Integration: Add Glucose Reading Flow', () => {
  let component: AddReadingPage;
  let fixture: ComponentFixture<AddReadingPage>;

  // Mock collaborators (London School approach)
  let mockReadingsService: jasmine.SpyObj<ReadingsService>;
  let mockProfileService: jasmine.SpyObj<ProfileService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockToastController: jasmine.SpyObj<ToastController>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

  // Mock observables
  let profileSubject: BehaviorSubject<UserProfile | null>;
  let readingsSubject: BehaviorSubject<LocalGlucoseReading[]>;

  // Mock toast instance
  let mockToast: jasmine.SpyObj<HTMLIonToastElement>;

  beforeEach(async () => {
    // Initialize mock observables
    profileSubject = new BehaviorSubject<UserProfile | null>({
      id: 'test-user-123',
      name: 'Test User',
      age: 30,
      accountState: 'active' as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tidepoolConnection: { connected: false },
      preferences: {
        glucoseUnit: 'mg/dL' as GlucoseUnit,
        themeMode: 'auto',
        language: 'en',
      } as any,
    });

    readingsSubject = new BehaviorSubject<LocalGlucoseReading[]>([]);

    // Create mock toast
    mockToast = jasmine.createSpyObj<HTMLIonToastElement>('HTMLIonToastElement', ['present']);
    mockToast.present.and.returnValue(Promise.resolve());

    // Create service mocks (define contracts through mocks)
    mockReadingsService = jasmine.createSpyObj<ReadingsService>(
      'ReadingsService',
      ['addReading', 'getAllReadings', 'getStatistics'],
      {
        readings$: readingsSubject.asObservable(),
        pendingSyncCount$: of(0),
      }
    );

    mockProfileService = jasmine.createSpyObj<ProfileService>(
      'ProfileService',
      ['getProfile', 'updateProfile'],
      {
        profile$: profileSubject.asObservable(),
      }
    );

    mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);

    mockToastController = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    mockToastController.create.and.returnValue(Promise.resolve(mockToast));

    mockTranslateService = jasmine.createSpyObj<TranslateService>(
      'TranslateService',
      ['instant', 'get', 'use'],
      {
        onLangChange: of({ lang: 'en', translations: {} } as any),
        onTranslationChange: of({ lang: 'en', translations: {} } as any),
        onDefaultLangChange: of({ lang: 'en', translations: {} } as any),
      }
    );
    mockTranslateService.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [AddReadingPage, getTranslateModuleForTesting()],
      providers: [
        { provide: ReadingsService, useValue: mockReadingsService },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: Router, useValue: mockRouter },
        { provide: ToastController, useValue: mockToastController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddReadingPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('BEHAVIOR: Form Initialization', () => {
    it('should initialize form with default values from profile preferences', () => {
      // Given: User profile has mg/dL preference
      expect(profileSubject.value?.preferences?.glucoseUnit).toBe('mg/dL');

      // When: Component initializes
      fixture.detectChanges(); // Triggers ngOnInit

      // Then: Form should be initialized with correct unit
      expect(component.currentUnit).toBe('mg/dL');
      expect(component.readingForm).toBeDefined();
      expect(component.readingForm.get('value')).toBeDefined();
      expect(component.readingForm.get('datetime')).toBeDefined();
    });

    it('should adapt validators based on user unit preference (mg/dL)', () => {
      // Given: Profile with mg/dL unit
      fixture.detectChanges();

      const valueControl = component.readingForm.get('value');

      // When: Testing mg/dL validators
      valueControl?.setValue(19); // Below minimum
      expect(valueControl?.hasError('min')).toBe(true);

      valueControl?.setValue(601); // Above maximum
      expect(valueControl?.hasError('max')).toBe(true);

      valueControl?.setValue(120); // Valid
      expect(valueControl?.valid).toBe(true);
    });

    it('should adapt validators based on user unit preference (mmol/L)', () => {
      // Given: Profile with mmol/L unit
      profileSubject.next({
        id: 'test-user-123',
        name: 'Test User',
        age: 30,
        accountState: 'active' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tidepoolConnection: { connected: false },
        preferences: {
          glucoseUnit: 'mmol/L' as GlucoseUnit,
          themeMode: 'auto',
          language: 'en',
        } as any,
      });

      fixture.detectChanges();

      const valueControl = component.readingForm.get('value');

      // When: Testing mmol/L validators
      valueControl?.setValue(1.0); // Below minimum
      expect(valueControl?.hasError('min')).toBe(true);

      valueControl?.setValue(34); // Above maximum
      expect(valueControl?.hasError('max')).toBe(true);

      valueControl?.setValue(6.7); // Valid
      expect(valueControl?.valid).toBe(true);
    });
  });

  describe('BEHAVIOR: Glucose Status Calculation', () => {
    it('should calculate status as "normal" for healthy glucose values', () => {
      fixture.detectChanges();

      // When: User enters normal glucose value
      component.readingForm.get('value')?.setValue(120); // mg/dL
      fixture.detectChanges();

      // Then: Status should be normal
      expect(component.glucoseStatus).toBe('normal');
      expect(component.glucoseStatusColor).toBe('success');
    });

    it('should calculate status as "high" for elevated glucose', () => {
      fixture.detectChanges();

      // When: User enters high glucose value
      component.readingForm.get('value')?.setValue(200); // mg/dL
      fixture.detectChanges();

      // Then: Status should be high
      expect(component.glucoseStatus).toBe('high');
      expect(component.glucoseStatusColor).toBe('warning');
    });

    it('should calculate status as "critical-high" for very high glucose', () => {
      fixture.detectChanges();

      // When: User enters critical high glucose value
      component.readingForm.get('value')?.setValue(300); // mg/dL
      fixture.detectChanges();

      // Then: Status should be critical-high
      expect(component.glucoseStatus).toBe('critical-high');
      expect(component.glucoseStatusColor).toBe('danger');
    });

    it('should calculate status as "low" for low glucose', () => {
      fixture.detectChanges();

      // When: User enters low glucose value
      component.readingForm.get('value')?.setValue(65); // mg/dL
      fixture.detectChanges();

      // Then: Status should be low
      expect(component.glucoseStatus).toBe('low');
      expect(component.glucoseStatusColor).toBe('warning');
    });

    it('should calculate status as "critical-low" for very low glucose', () => {
      fixture.detectChanges();

      // When: User enters critical low glucose value
      component.readingForm.get('value')?.setValue(50); // mg/dL
      fixture.detectChanges();

      // Then: Status should be critical-low
      expect(component.glucoseStatus).toBe('critical-low');
      expect(component.glucoseStatusColor).toBe('danger');
    });
  });

  describe('BEHAVIOR: Reading Submission Workflow', () => {
    it('should coordinate with ReadingsService to save a valid reading', async () => {
      // Given: A valid form with glucose reading
      fixture.detectChanges();
      const testReading: LocalGlucoseReading = {
        id: 'local_1234567890_abc123',
        localId: 'local_1234567890_abc123',
        type: 'smbg',
        value: 120,
        units: 'mg/dL' as GlucoseUnit,
        time: new Date().toISOString(),
        subType: 'manual',
        synced: false,
        userId: 'test-user-123',
        isLocalOnly: true,
        status: 'normal' as GlucoseStatus,
      };

      mockReadingsService.addReading.and.returnValue(Promise.resolve(testReading));

      component.readingForm.patchValue({
        value: 120,
        datetime: testReading.time,
        mealContext: 'before-breakfast',
        notes: 'Feeling good',
      });

      // When: User submits the form
      await component.onSubmit();

      // Then: Should collaborate with ReadingsService
      expect(mockReadingsService.addReading).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: 'smbg',
          value: 120,
          units: 'mg/dL',
          subType: 'manual',
          notes: ['Feeling good'],
          tags: ['before-breakfast'],
        })
      );
    });

    it('should follow proper workflow: save → toast → navigate', async () => {
      // Given: Valid reading data
      fixture.detectChanges();
      const savedReading: LocalGlucoseReading = {
        id: 'local_test_123',
        localId: 'local_test_123',
        type: 'smbg',
        value: 95,
        units: 'mg/dL' as GlucoseUnit,
        time: new Date().toISOString(),
        subType: 'manual',
        synced: false,
        isLocalOnly: true,
      };

      mockReadingsService.addReading.and.returnValue(Promise.resolve(savedReading));

      component.readingForm.patchValue({
        value: 95,
        datetime: savedReading.time,
      });

      // When: Submitting the form
      await component.onSubmit();

      // Then: Verify interaction sequence
      // 1. Save to service
      expect(mockReadingsService.addReading).toHaveBeenCalled();

      // 2. Show success toast
      expect(mockToastController.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'success',
          icon: 'checkmark-circle-outline',
        })
      );
      expect(mockToast.present).toHaveBeenCalled();

      // 3. Navigate to readings list
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tabs/readings']);
    });

    it('should handle service errors gracefully and show error toast', async () => {
      // Given: Service that will fail
      fixture.detectChanges();
      const errorMessage = 'Database connection failed';
      mockReadingsService.addReading.and.returnValue(Promise.reject(new Error(errorMessage)));

      component.readingForm.patchValue({
        value: 110,
        datetime: new Date().toISOString(),
      });

      // When: Submitting form with failing service
      await component.onSubmit();

      // Then: Should show error toast
      expect(mockToastController.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'danger',
          icon: 'alert-circle-outline',
        })
      );

      // And: Should NOT navigate away
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should NOT submit if form is invalid', async () => {
      // Given: Invalid form (empty value)
      fixture.detectChanges();
      component.readingForm.patchValue({
        value: null,
        datetime: new Date().toISOString(),
      });

      // When: Attempting to submit
      await component.onSubmit();

      // Then: Should NOT call service
      expect(mockReadingsService.addReading).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('BEHAVIOR: Cancel Workflow', () => {
    it('should navigate back without saving when cancelled', async () => {
      // Given: Form with data
      fixture.detectChanges();
      component.readingForm.patchValue({
        value: 150,
        datetime: new Date().toISOString(),
      });

      // When: User cancels
      await component.onCancel();

      // Then: Should navigate without saving
      expect(mockReadingsService.addReading).not.toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/tabs/readings']);
    });
  });

  describe('INTERACTION: Service Contract Verification', () => {
    it('should pass correct SMBG reading structure to ReadingsService', async () => {
      // This test verifies the contract between AddReadingPage and ReadingsService
      fixture.detectChanges();

      const expectedTime = new Date().toISOString();
      component.readingForm.patchValue({
        value: 145,
        datetime: expectedTime,
        mealContext: 'after-lunch',
        notes: 'Post-meal reading',
      });

      const mockSavedReading: LocalGlucoseReading = {
        id: 'local_contract_test',
        localId: 'local_contract_test',
        type: 'smbg',
        value: 145,
        units: 'mg/dL',
        time: expectedTime,
        subType: 'manual',
        notes: ['Post-meal reading'],
        tags: ['after-lunch'],
        synced: false,
        isLocalOnly: true,
      };

      mockReadingsService.addReading.and.returnValue(Promise.resolve(mockSavedReading));

      await component.onSubmit();

      // Verify contract: ReadingsService.addReading receives Omit<SMBGReading, 'id'>
      const callArg = mockReadingsService.addReading.calls.argsFor(0)[0];
      expect(callArg).toEqual(
        jasmine.objectContaining({
          type: 'smbg',
          value: 145,
          units: 'mg/dL',
          time: expectedTime,
          subType: 'manual',
          notes: ['Post-meal reading'],
          tags: ['after-lunch'],
        })
      );

      // Verify optional notes and tags are arrays
      expect(Array.isArray(callArg.notes)).toBe(true);
      expect(Array.isArray(callArg.tags)).toBe(true);
    });

    it('should omit notes and tags when not provided', async () => {
      fixture.detectChanges();

      const mockSavedReading: LocalGlucoseReading = {
        id: 'local_minimal',
        localId: 'local_minimal',
        type: 'smbg',
        value: 100,
        units: 'mg/dL',
        time: new Date().toISOString(),
        subType: 'manual',
        synced: false,
        isLocalOnly: true,
      };

      mockReadingsService.addReading.and.returnValue(Promise.resolve(mockSavedReading));

      component.readingForm.patchValue({
        value: 100,
        datetime: new Date().toISOString(),
        mealContext: '', // Empty
        notes: '', // Empty
      });

      await component.onSubmit();

      const callArg = mockReadingsService.addReading.calls.argsFor(0)[0];

      // Verify optional fields are omitted or undefined when empty
      expect(callArg.notes).toBeUndefined();
      expect(callArg.tags).toBeUndefined();
    });
  });

  describe('BEHAVIOR: Real-time Reactive Updates', () => {
    it('should react to profile changes for unit preferences', done => {
      // Given: Component initialized with mg/dL
      fixture.detectChanges();
      expect(component.currentUnit).toBe('mg/dL');

      // When: Profile changes to mmol/L
      profileSubject.next({
        id: 'test-user-123',
        name: 'Test User',
        age: 30,
        accountState: 'active' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tidepoolConnection: { connected: false },
        preferences: {
          glucoseUnit: 'mmol/L' as GlucoseUnit,
          themeMode: 'auto',
          language: 'en',
        } as any,
      });

      // Then: Component should react and update unit
      setTimeout(() => {
        expect(component.currentUnit).toBe('mmol/L');
        done();
      }, 100);
    });
  });
});
