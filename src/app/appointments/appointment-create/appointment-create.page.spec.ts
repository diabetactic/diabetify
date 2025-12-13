/**
 * AppointmentCreatePage Backend Contract Tests
 *
 * These tests verify that the appointment creation form uses
 * ONLY valid backend enum values for motives.
 *
 * Backend motive enum (from appointments/app/schemas/appointment_schema.py):
 * - AJUSTE
 * - HIPOGLUCEMIA
 * - HIPERGLUCEMIA
 * - CETOSIS
 * - DUDAS
 * - OTRO
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { AppointmentCreatePage } from './appointment-create.page';
import { AppointmentService } from '@core/services/appointment.service';
import { LocalAuthService } from '@core/services/local-auth.service';
import { TranslationService } from '@core/services/translation.service';
import {
  BACKEND_APPOINTMENT_MOTIVES,
  isValidBackendMotive,
} from '@core/contracts/backend-enums.contract';
import { APPOINTMENT_MOTIVES } from '@core/models/appointment.model';
import { of } from 'rxjs';

// ============================================================================
// EXPECTED VALUES - Source of Truth
// ============================================================================

/**
 * Old invalid motive values that were causing 422 errors
 */
const INVALID_OLD_MOTIVES = [
  'control_routine',
  'follow_up',
  'emergency',
  'consultation',
  'adjustment',
  'hypoglycemia',
  'hyperglycemia',
  'ketosis',
  'questions',
  'other',
];

/**
 * Expected motive options structure
 */
const EXPECTED_MOTIVE_OPTIONS = [
  { value: 'AJUSTE', label: 'appointments.create.motive_ajuste' },
  { value: 'HIPOGLUCEMIA', label: 'appointments.create.motive_hipoglucemia' },
  { value: 'HIPERGLUCEMIA', label: 'appointments.create.motive_hiperglucemia' },
  { value: 'CETOSIS', label: 'appointments.create.motive_cetosis' },
  { value: 'DUDAS', label: 'appointments.create.motive_dudas' },
  { value: 'OTRO', label: 'appointments.create.motive_otro' },
];

// ============================================================================
// MOCKS
// ============================================================================

const mockRouter = {
  navigate: jest.fn(),
};

const mockAlertController = {
  create: jest.fn().mockResolvedValue({
    present: jest.fn(),
    onDidDismiss: jest.fn().mockResolvedValue({ role: 'cancel' }),
  }),
};

const mockLoadingController = {
  create: jest.fn().mockResolvedValue({
    present: jest.fn(),
    dismiss: jest.fn(),
  }),
};

const mockToastController = {
  create: jest.fn().mockResolvedValue({
    present: jest.fn(),
  }),
};

const mockAppointmentService = {
  getQueueState: jest.fn().mockReturnValue(of({ state: 'ACCEPTED' })),
  createAppointment: jest.fn().mockReturnValue(of({ appointment_id: 1 })),
};

const mockAuthService = {
  getUserId: jest.fn().mockReturnValue(1),
};

const mockTranslationService = {
  instant: jest.fn((key: string) => key),
};

// ============================================================================
// TESTS
// ============================================================================

describe('AppointmentCreatePage: Backend Contract', () => {
  let component: AppointmentCreatePage;
  let fixture: ComponentFixture<AppointmentCreatePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppointmentCreatePage, TranslateModule.forRoot()],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AlertController, useValue: mockAlertController },
        { provide: LoadingController, useValue: mockLoadingController },
        { provide: ToastController, useValue: mockToastController },
        { provide: AppointmentService, useValue: mockAppointmentService },
        { provide: LocalAuthService, useValue: mockAuthService },
        { provide: TranslationService, useValue: mockTranslationService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentCreatePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Motive Options Configuration', () => {
    it('should have motiveOptions defined', () => {
      expect(component.motiveOptions).toBeDefined();
      expect(Array.isArray(component.motiveOptions)).toBe(true);
    });

    it('should have exactly 6 motive options', () => {
      expect(component.motiveOptions.length).toBe(6);
    });

    it('should have all motive values be valid backend values', () => {
      component.motiveOptions.forEach(option => {
        expect(isValidBackendMotive(option.value)).toBe(true);
      });
    });

    it('should match the expected motive options structure', () => {
      expect(component.motiveOptions).toEqual(EXPECTED_MOTIVE_OPTIONS);
    });

    describe('Individual motive option validation', () => {
      it('should have AJUSTE option', () => {
        const option = component.motiveOptions.find(o => o.value === 'AJUSTE');
        expect(option).toBeDefined();
        expect(option?.label).toBe('appointments.create.motive_ajuste');
      });

      it('should have HIPOGLUCEMIA option', () => {
        const option = component.motiveOptions.find(o => o.value === 'HIPOGLUCEMIA');
        expect(option).toBeDefined();
        expect(option?.label).toBe('appointments.create.motive_hipoglucemia');
      });

      it('should have HIPERGLUCEMIA option', () => {
        const option = component.motiveOptions.find(o => o.value === 'HIPERGLUCEMIA');
        expect(option).toBeDefined();
        expect(option?.label).toBe('appointments.create.motive_hiperglucemia');
      });

      it('should have CETOSIS option', () => {
        const option = component.motiveOptions.find(o => o.value === 'CETOSIS');
        expect(option).toBeDefined();
        expect(option?.label).toBe('appointments.create.motive_cetosis');
      });

      it('should have DUDAS option', () => {
        const option = component.motiveOptions.find(o => o.value === 'DUDAS');
        expect(option).toBeDefined();
        expect(option?.label).toBe('appointments.create.motive_dudas');
      });

      it('should have OTRO option', () => {
        const option = component.motiveOptions.find(o => o.value === 'OTRO');
        expect(option).toBeDefined();
        expect(option?.label).toBe('appointments.create.motive_otro');
      });
    });
  });

  describe('Regression: Invalid Old Values Should NOT Exist', () => {
    INVALID_OLD_MOTIVES.forEach(invalidMotive => {
      it(`should NOT have old invalid motive "${invalidMotive}"`, () => {
        const hasInvalidMotive = component.motiveOptions.some(
          option => option.value === invalidMotive
        );
        expect(hasInvalidMotive).toBe(false);
      });
    });

    it('should NOT have lowercase motive values', () => {
      component.motiveOptions.forEach(option => {
        expect(option.value).toBe(option.value.toUpperCase());
      });
    });
  });

  describe('Form Data Structure', () => {
    it('should have motive array initialized as empty', () => {
      expect(component.formData.motive).toEqual([]);
    });

    it('should have other_motive field for OTRO explanation', () => {
      expect(component.formData.other_motive).toBeDefined();
    });
  });

  describe('Motive Selection Logic', () => {
    it('should add valid motive to formData when selected', () => {
      const event = { detail: { checked: true } } as CustomEvent;
      component.onMotiveChange('AJUSTE', event);

      expect(component.formData.motive).toContain('AJUSTE');
    });

    it('should remove motive from formData when deselected', () => {
      // First add
      component.formData.motive = ['AJUSTE'];

      const event = { detail: { checked: false } } as CustomEvent;
      component.onMotiveChange('AJUSTE', event);

      expect(component.formData.motive).not.toContain('AJUSTE');
    });

    it('should show other_motive field when OTRO is selected', () => {
      const event = { detail: { checked: true } } as CustomEvent;
      component.onMotiveChange('OTRO', event);

      expect(component.showOtherMotive).toBe(true);
    });

    it('should hide other_motive field when OTRO is deselected', () => {
      component.showOtherMotive = true;
      component.formData.motive = ['OTRO'];

      const event = { detail: { checked: false } } as CustomEvent;
      component.onMotiveChange('OTRO', event);

      expect(component.showOtherMotive).toBe(false);
    });

    it('isMotiveSelected should correctly identify selected motives', () => {
      component.formData.motive = ['AJUSTE', 'HIPOGLUCEMIA'];

      expect(component.isMotiveSelected('AJUSTE')).toBe(true);
      expect(component.isMotiveSelected('HIPOGLUCEMIA')).toBe(true);
      expect(component.isMotiveSelected('CETOSIS')).toBe(false);
    });
  });

  describe('Form Validation with Backend Values', () => {
    it('should require at least one motive to be selected', () => {
      // Setup valid form except motives
      component.formData = {
        ...component.formData,
        glucose_objective: 100,
        insulin_type: 'rapid',
        dose: 10,
        fast_insulin: 'NovoRapid',
        fixed_dose: 5,
        ratio: 10,
        sensitivity: 30,
        pump_type: 'none',
        control_data: '',
        motive: [], // Empty - should fail validation
      };

      // Try to submit
      component.submitAppointment();

      // Should not have called createAppointment
      expect(mockAppointmentService.createAppointment).not.toHaveBeenCalled();
    });
  });

  describe('Alignment with Model Constants', () => {
    it('motiveOptions values should match APPOINTMENT_MOTIVES constant', () => {
      const optionValues = component.motiveOptions.map(o => o.value);
      expect(optionValues).toEqual([...APPOINTMENT_MOTIVES]);
    });

    it('motiveOptions values should match BACKEND_APPOINTMENT_MOTIVES', () => {
      const optionValues = component.motiveOptions.map(o => o.value);
      expect(optionValues).toEqual([...BACKEND_APPOINTMENT_MOTIVES]);
    });

    it('all three sources should be in sync', () => {
      const componentValues = component.motiveOptions.map(o => o.value);
      const modelValues = [...APPOINTMENT_MOTIVES];
      const backendValues = [...BACKEND_APPOINTMENT_MOTIVES];

      expect(componentValues).toEqual(modelValues);
      expect(modelValues).toEqual(backendValues);
    });
  });
});

// ============================================================================
// MODEL CONSTANT TESTS
// ============================================================================

describe('appointment.model.ts: Backend Contract', () => {
  it('APPOINTMENT_MOTIVES should match BACKEND_APPOINTMENT_MOTIVES exactly', () => {
    expect([...APPOINTMENT_MOTIVES]).toEqual([...BACKEND_APPOINTMENT_MOTIVES]);
  });

  it('all APPOINTMENT_MOTIVES should be valid backend values', () => {
    APPOINTMENT_MOTIVES.forEach(motive => {
      expect(isValidBackendMotive(motive)).toBe(true);
    });
  });

  it('APPOINTMENT_MOTIVES should NOT contain any old invalid values', () => {
    INVALID_OLD_MOTIVES.forEach(invalidValue => {
      expect(APPOINTMENT_MOTIVES).not.toContain(invalidValue);
    });
  });
});
