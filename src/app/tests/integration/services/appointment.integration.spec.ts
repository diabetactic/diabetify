/**
 * AppointmentService Integration Tests
 *
 * Tests appointment operations through ApiGatewayService:
 * 1. Fetch all appointments (mine endpoint)
 * 2. Fetch appointment by ID
 * 3. Create new appointment with validation
 * 4. Update appointment treatment data
 * 5. Delete appointment
 * 6. Queue state fetching
 * 7. Queue position tracking
 * 8. Request appointment (submit to queue)
 * 9. Get resolution data
 * 10. Notification scheduling for reminders
 * 11. Mock vs real backend mode switching
 */

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { AppointmentService } from '@core/services/appointment.service';
import { ApiGatewayService, ApiResponse } from '@core/services/api-gateway.service';
import { TranslationService } from '@core/services/translation.service';
import { NotificationService } from '@core/services/notification.service';
import { LoggerService } from '@core/services/logger.service';
import {
  Appointment,
  AppointmentQueueState,
  CreateAppointmentRequest,
} from '@core/models/appointment.model';

describe('AppointmentService Integration Tests', () => {
  let service: AppointmentService;
  let httpMock: HttpTestingController;

  let mockApiGateway: {
    request: ReturnType<typeof vi.fn>;
  };

  let mockTranslation: {
    instant: ReturnType<typeof vi.fn>;
  };

  let mockNotification: {
    scheduleAppointmentReminder: ReturnType<typeof vi.fn>;
    cancelNotification: ReturnType<typeof vi.fn>;
  };

  let mockLogger: {
    info: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const mockAppointments: Appointment[] = [
    {
      appointment_id: 1,
      user_id: 1000,
      glucose_objective: 120,
      insulin_type: 'rapid',
      dose: 10,
      fast_insulin: 'Humalog',
      fixed_dose: 5,
      ratio: 10,
      sensitivity: 50,
      pump_type: 'none',
      control_data: 'Regular checkup',
      motive: ['control_routine'],
      other_motive: null,
      another_treatment: null,
    },
    {
      appointment_id: 2,
      user_id: 1000,
      glucose_objective: 110,
      insulin_type: 'long',
      dose: 20,
      fast_insulin: 'Lantus',
      fixed_dose: 20,
      ratio: 12,
      sensitivity: 40,
      pump_type: 'none',
      control_data: 'Dose adjustment',
      motive: ['adjustment'],
      other_motive: 'Review readings',
      another_treatment: 'Metformin 500mg',
    },
  ];

  beforeEach(() => {
    mockApiGateway = {
      request: vi.fn(),
    };

    mockTranslation = {
      instant: vi.fn().mockImplementation((key: string) => key),
    };

    mockNotification = {
      scheduleAppointmentReminder: vi.fn().mockResolvedValue(undefined),
      cancelNotification: vi.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AppointmentService,
        { provide: ApiGatewayService, useValue: mockApiGateway },
        { provide: TranslationService, useValue: mockTranslation },
        { provide: NotificationService, useValue: mockNotification },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(AppointmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.ngOnDestroy();
    httpMock.verify();
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  describe('Fetch Appointments', () => {
    it('should fetch all appointments for current user', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockAppointments }));

      // ACT
      const result = await firstValueFrom(service.getAppointments());

      // ASSERT
      expect(result.length).toBe(2);
      expect(result[0].appointment_id).toBe(1);
      expect(mockApiGateway.request).toHaveBeenCalledWith('extservices.appointments.mine');
    });

    it('should update appointments$ observable when fetching', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockAppointments }));

      let observedAppointments: Appointment[] = [];
      const subscription = service.appointments$.subscribe(apt => {
        observedAppointments = apt;
      });

      // ACT
      await firstValueFrom(service.getAppointments());

      // ASSERT
      expect(observedAppointments.length).toBe(2);

      subscription.unsubscribe();
    });

    it('should handle fetch error correctly', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        of({ success: false, error: { message: 'Network error' } })
      );

      // ACT & ASSERT
      await expect(firstValueFrom(service.getAppointments())).rejects.toThrow('Network error');
    });
  });

  describe('Fetch Single Appointment', () => {
    it('should fetch appointment by ID', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockAppointments }));

      // ACT
      const result = await firstValueFrom(service.getAppointment(1));

      // ASSERT
      expect(result.appointment_id).toBe(1);
      expect(result.glucose_objective).toBe(120);
    });

    it('should throw error when appointment not found', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockAppointments }));

      // ACT & ASSERT
      await expect(firstValueFrom(service.getAppointment(999))).rejects.toThrow(
        'Appointment not found'
      );
    });
  });

  describe('Create Appointment', () => {
    it('should create new appointment with treatment data', async () => {
      // ARRANGE
      const newAppointment: CreateAppointmentRequest = {
        glucose_objective: 130,
        insulin_type: 'mixed',
        dose: 15,
        fast_insulin: 'NovoRapid',
        fixed_dose: 8,
        ratio: 11,
        sensitivity: 45,
        pump_type: 'medtronic',
        control_data: 'New patient setup',
        motive: ['new_patient'],
      };

      const createdAppointment: Appointment = {
        ...newAppointment,
        appointment_id: 3,
        user_id: 1000,
        other_motive: null,
        another_treatment: null,
      };

      mockApiGateway.request.mockReturnValue(of({ success: true, data: createdAppointment }));

      // ACT
      const result = await firstValueFrom(service.createAppointment(newAppointment));

      // ASSERT
      expect(result.appointment_id).toBe(3);
      expect(result.glucose_objective).toBe(130);
      expect(mockApiGateway.request).toHaveBeenCalledWith('extservices.appointments.create', {
        body: newAppointment,
      });
    });

    it('should schedule reminder when scheduled_date provided', async () => {
      // ARRANGE
      const scheduledDate = new Date(Date.now() + 86400000); // Tomorrow
      const newAppointment: CreateAppointmentRequest = {
        glucose_objective: 120,
        insulin_type: 'rapid',
        dose: 10,
        motive: ['follow_up'],
      };

      mockApiGateway.request.mockReturnValue(
        of({
          success: true,
          data: { ...newAppointment, appointment_id: 4, user_id: 1000 },
        })
      );

      // ACT
      await firstValueFrom(service.createAppointment(newAppointment, scheduledDate, 60));

      // ASSERT
      expect(mockNotification.scheduleAppointmentReminder).toHaveBeenCalledWith({
        appointmentId: '4',
        appointmentDate: scheduledDate,
        reminderMinutesBefore: 60,
      });
    });

    it('should handle creation error', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        of({ success: false, error: { message: 'Validation error' } })
      );

      // ACT & ASSERT
      await expect(
        firstValueFrom(service.createAppointment({ glucose_objective: 120, motive: [] }))
      ).rejects.toThrow('Validation error');
    });
  });

  describe('Queue State Management', () => {
    it('should fetch current queue state', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(of({ success: true, data: 'PENDING' }));

      // ACT
      const result = await firstValueFrom(service.getQueueState());

      // ASSERT
      expect(result.state).toBe('PENDING');
      expect(mockApiGateway.request).toHaveBeenCalledWith('extservices.appointments.state');
    });

    it('should handle queue state as object', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(of({ success: true, data: { state: 'ACCEPTED' } }));

      // ACT
      const result = await firstValueFrom(service.getQueueState());

      // ASSERT
      expect(result.state).toBe('ACCEPTED');
    });

    it('should return NONE when no queue state exists', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          status: 404,
          error: { detail: 'Appointment does not exist in queue' },
        }))
      );

      // ACT
      const result = await firstValueFrom(service.getQueueState());

      // ASSERT
      expect(result.state).toBe('NONE');
    });

    it('should return NONE when 404 error', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({ status: 404, message: 'Not found' }))
      );

      // ACT
      const result = await firstValueFrom(service.getQueueState());

      // ASSERT
      expect(result.state).toBe('NONE');
    });
  });

  describe('Queue Position', () => {
    it('should fetch user queue position', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        of({ success: true, data: 2 }) // 0-indexed from backend
      );

      // ACT
      const result = await firstValueFrom(service.getQueuePosition());

      // ASSERT
      expect(result).toBe(3); // 1-indexed for users
    });

    it('should return -1 on error', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(throwError(() => new Error('Not in queue')));

      // ACT
      const result = await firstValueFrom(service.getQueuePosition());

      // ASSERT
      expect(result).toBe(-1);
    });
  });

  describe('Request Appointment (Submit to Queue)', () => {
    it('should submit appointment request to queue', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        of({ success: true, data: 5 }) // Position in queue
      );

      // ACT
      const result = await firstValueFrom(service.requestAppointment());

      // ASSERT
      expect(result.success).toBe(true);
      expect(result.state).toBe('PENDING');
      expect(result.position).toBe(5);
      expect(mockApiGateway.request).toHaveBeenCalledWith('extservices.appointments.submit');
    });

    it('should handle queue full error', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          error: { details: { detail: 'Appointment Queue Full' } },
        }))
      );

      // ACT & ASSERT
      await expect(firstValueFrom(service.requestAppointment())).rejects.toThrow(
        'appointments.errors.queueFull'
      );
    });

    it('should handle already in queue error', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          error: { details: { detail: 'Appointment already exists in queue' } },
        }))
      );

      // ACT & ASSERT
      await expect(firstValueFrom(service.requestAppointment())).rejects.toThrow(
        'appointments.errors.alreadyInQueue'
      );
    });
  });

  describe('Get Resolution', () => {
    it('should fetch appointment resolution data', async () => {
      // ARRANGE
      const resolution = {
        appointment_id: 1,
        change_basal_type: 'Lantus',
        change_basal_dose: 22,
        change_basal_time: '22:00',
        change_fast_type: 'Humalog',
        change_ratio: 12,
        change_sensitivity: 45,
        emergency_care: false,
        needed_physical_appointment: false,
        state: 'ACCEPTED' as AppointmentQueueState,
      };

      mockApiGateway.request.mockReturnValue(of({ success: true, data: resolution }));

      // ACT
      const result = await firstValueFrom(service.getResolution(1));

      // ASSERT
      expect(result.appointment_id).toBe(1);
      expect(result.change_basal_dose).toBe(22);
      expect(result.state).toBe('ACCEPTED');
      expect(mockApiGateway.request).toHaveBeenCalledWith(
        'extservices.appointments.resolution',
        {},
        { appointmentId: '1' }
      );
    });

    it('should handle not accepted yet error', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          error: { details: { detail: "Appointment wasn't accepted yet" } },
        }))
      );

      // ACT & ASSERT
      await expect(firstValueFrom(service.getResolution(1))).rejects.toThrow(
        'appointments.errors.notAccepted'
      );
    });
  });

  describe('Delete Appointment', () => {
    it('should delete appointment and cancel reminder', async () => {
      // ACT
      await firstValueFrom(service.deleteAppointment(1));

      // ASSERT
      expect(mockNotification.cancelNotification).toHaveBeenCalled();
    });
  });

  describe('Update Appointment Schedule', () => {
    it('should update scheduling and reschedule reminder', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(of({ success: true, data: mockAppointments }));

      const newDate = new Date(Date.now() + 172800000); // 2 days from now

      // ACT
      await firstValueFrom(service.updateAppointmentSchedule(1, newDate, 45));

      // ASSERT
      expect(mockNotification.cancelNotification).toHaveBeenCalled();
      expect(mockNotification.scheduleAppointmentReminder).toHaveBeenCalledWith({
        appointmentId: '1',
        appointmentDate: newDate,
        reminderMinutesBefore: 45,
      });
    });
  });

  describe('Queue Open Check', () => {
    it('should check if queue is open', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(of({ success: true, data: true }));

      // ACT
      const result = await firstValueFrom(service.checkQueueOpen());

      // ASSERT
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(throwError(() => new Error('Service unavailable')));

      // ACT
      const result = await firstValueFrom(service.checkQueueOpen());

      // ASSERT
      expect(result).toBe(false);
    });
  });

  describe('Error Mapping', () => {
    it('should map backend error to translated message', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          error: { details: { detail: 'Appointment Queue is not open' } },
        }))
      );

      mockTranslation.instant.mockReturnValue('La cola de citas no está abierta');

      // ACT & ASSERT
      await expect(firstValueFrom(service.requestAppointment())).rejects.toThrow(
        'La cola de citas no está abierta'
      );

      expect(mockTranslation.instant).toHaveBeenCalledWith('appointments.errors.queueClosed');
    });

    it('should handle unauthorized error', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          error: { code: 'UNAUTHORIZED' },
        }))
      );

      // ACT & ASSERT
      await expect(firstValueFrom(service.getAppointments())).rejects.toThrow();

      expect(mockTranslation.instant).toHaveBeenCalledWith('appointments.errors.unauthorized');
    });

    it('should handle service unavailable error', async () => {
      // ARRANGE
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          error: { code: 'SERVICE_UNAVAILABLE' },
        }))
      );

      // ACT & ASSERT
      await expect(firstValueFrom(service.getAppointments())).rejects.toThrow();

      expect(mockTranslation.instant).toHaveBeenCalledWith(
        'appointments.errors.serviceUnavailable'
      );
    });
  });

  describe('Reactive State', () => {
    it('should complete subjects on destroy', () => {
      // ARRANGE
      let completed = false;
      service.appointments$.subscribe({
        complete: () => {
          completed = true;
        },
      });

      // ACT
      service.ngOnDestroy();

      // ASSERT
      expect(completed).toBe(true);
    });
  });
});
