/**
 * Appointments Flow Integration Tests
 *
 * Tests del flujo completo de citas médicas a través de múltiples servicios:
 * 1. AppointmentService - Gestión de estados de citas
 * 2. ApiGatewayService - Coordinación de sincronización HTTP (mocked)
 * 3. NotificationService - Programación de recordatorios
 *
 * Flujo de estados: NONE → PENDING → ACCEPTED → CREATED
 *                                  ↘ DENIED
 */

// Inicializar entorno TestBed para Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { AppointmentService } from '@core/services/appointment.service';
import { ApiGatewayService, ApiResponse } from '@core/services/api-gateway.service';
import { TranslationService } from '@core/services/translation.service';
import { NotificationService } from '@core/services/notification.service';
import { LoggerService } from '@core/services/logger.service';
import {
  Appointment,
  CreateAppointmentRequest,
  AppointmentQueueState,
} from '@core/models/appointment.model';

describe('Appointments Flow Integration Tests', () => {
  let appointmentService: AppointmentService;
  let mockApiGateway: { request: Mock };
  let mockNotificationService: { scheduleAppointmentReminder: Mock; cancelNotification: Mock };
  let mockLogger: { info: Mock; debug: Mock; warn: Mock; error: Mock };

  const createMockAppointment = (overrides?: Partial<Appointment>): Appointment => ({
    appointment_id: 100,
    user_id: 1000,
    glucose_objective: 120,
    insulin_type: 'rapid',
    dose: 10,
    fast_insulin: 'Humalog',
    fixed_dose: 5,
    ratio: 10,
    sensitivity: 50,
    pump_type: 'none',
    control_data: 'Control de rutina',
    motive: ['AJUSTE'],
    other_motive: null,
    another_treatment: null,
    ...overrides,
  });

  const createMockRequest = (
    overrides?: Partial<CreateAppointmentRequest>
  ): CreateAppointmentRequest => ({
    glucose_objective: 120,
    insulin_type: 'rapid',
    dose: 10,
    fast_insulin: 'Humalog',
    fixed_dose: 5,
    ratio: 10,
    sensitivity: 50,
    pump_type: 'none',
    control_data: 'Necesito ajuste de dosis',
    motive: ['AJUSTE', 'DUDAS'],
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock ApiGatewayService.request()
    mockApiGateway = {
      request: vi.fn(),
    };

    // Mock NotificationService
    mockNotificationService = {
      scheduleAppointmentReminder: vi.fn().mockResolvedValue(undefined),
      cancelNotification: vi.fn().mockResolvedValue(undefined),
    };

    // Mock LoggerService
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AppointmentService,
        { provide: ApiGatewayService, useValue: mockApiGateway },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: LoggerService, useValue: mockLogger },
        {
          provide: TranslationService,
          useValue: { instant: (key: string) => key },
        },
      ],
    });

    appointmentService = TestBed.inject(AppointmentService);
  });

  describe('Estado NONE - Sin cita en cola', () => {
    it('debe retornar estado NONE cuando el usuario no tiene cita en cola', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: 'NONE' }));

      const state = await appointmentService.getQueueState().toPromise();

      expect(state?.state).toBe('NONE');
      expect(mockApiGateway.request).toHaveBeenCalledWith('extservices.appointments.state');
    });

    it('debe retornar NONE cuando recibe error 404 (cola no existe)', async () => {
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          status: 404,
          error: {
            statusCode: 404,
            details: { detail: 'Appointment does not exist in queue' },
          },
        }))
      );

      const state = await appointmentService.getQueueState().toPromise();

      expect(state?.state).toBe('NONE');
    });

    it('debe permitir verificar si la cola está abierta', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: true }));

      const isOpen = await appointmentService.checkQueueOpen().toPromise();

      expect(isOpen).toBe(true);
      expect(mockApiGateway.request).toHaveBeenCalledWith('appointments.queue.open');
    });

    it('debe retornar false cuando cola está cerrada', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: false }));

      const isOpen = await appointmentService.checkQueueOpen().toPromise();

      expect(isOpen).toBe(false);
    });
  });

  describe('Estado PENDING - Cita solicitada', () => {
    it('debe transicionar de NONE a PENDING al solicitar cita', async () => {
      // Backend returns position in queue (0-indexed, converted by service)
      mockApiGateway.request.mockReturnValue(of({ success: true, data: 2 }));

      const result = await appointmentService.requestAppointment().toPromise();

      expect(result?.success).toBe(true);
      expect(result?.state).toBe('PENDING');
      expect(result?.position).toBeDefined();
      expect(mockApiGateway.request).toHaveBeenCalledWith('extservices.appointments.submit');
    });

    it('debe obtener posición en cola cuando está en PENDING', async () => {
      // Backend returns 0-indexed, service converts to 1-indexed
      mockApiGateway.request.mockReturnValue(of({ success: true, data: 1 }));

      const position = await appointmentService.getQueuePosition().toPromise();

      expect(position).toBe(2); // 1 (0-indexed) → 2 (1-indexed)
      expect(mockApiGateway.request).toHaveBeenCalledWith('extservices.appointments.placement');
    });

    it('debe retornar -1 si usuario no está en cola', async () => {
      mockApiGateway.request.mockReturnValue(throwError(() => ({ status: 404 })));

      const position = await appointmentService.getQueuePosition().toPromise();

      expect(position).toBe(-1);
    });

    it('debe rechazar solicitud cuando cola está llena', async () => {
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          error: {
            message: 'Appointment Queue Full',
            statusCode: 400,
          },
        }))
      );

      try {
        await appointmentService.requestAppointment().toPromise();
        expect.fail('Debería haber lanzado error');
      } catch (error: unknown) {
        expect((error as Error).message).toContain('appointments.errors.queueFull');
      }
    });

    it('debe rechazar solicitud cuando ya existe en cola', async () => {
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          error: {
            message: 'Appointment already exists in queue',
            statusCode: 400,
          },
        }))
      );

      try {
        await appointmentService.requestAppointment().toPromise();
        expect.fail('Debería haber lanzado error');
      } catch (error: unknown) {
        expect((error as Error).message).toContain('appointments.errors.alreadyInQueue');
      }
    });
  });

  describe('Estado ACCEPTED - Cita aceptada', () => {
    it('debe obtener estado ACCEPTED cuando backend acepta cita', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: 'ACCEPTED' }));

      const state = await appointmentService.getQueueState().toPromise();

      expect(state?.state).toBe('ACCEPTED');
    });

    it('debe crear cita completa después de ser aceptada', async () => {
      const request = createMockRequest({
        control_data: 'Hiperglucemia frecuente en la mañana',
        motive: ['HIPERGLUCEMIA', 'AJUSTE'],
      });

      const createdAppointment = createMockAppointment({
        ...request,
        appointment_id: 100,
      });

      mockApiGateway.request.mockReturnValue(of({ success: true, data: createdAppointment }));

      const scheduledDate = new Date('2025-12-25T10:00:00');
      const appointment = await appointmentService
        .createAppointment(request, scheduledDate, 30)
        .toPromise();

      expect(appointment?.appointment_id).toBe(100);
      expect(appointment?.control_data).toBe('Hiperglucemia frecuente en la mañana');
      expect(appointment?.scheduled_date).toEqual(scheduledDate);
      expect(mockNotificationService.scheduleAppointmentReminder).toHaveBeenCalled();
    });

    it('debe obtener resolución con recomendaciones del médico', async () => {
      const resolutionData = {
        appointment_id: 100,
        change_basal_type: 'Lantus',
        change_basal_dose: 22,
        change_basal_time: '22:00',
        change_fast_type: 'Humalog',
        change_ratio: 12,
        change_sensitivity: 45,
        emergency_care: false,
        needed_physical_appointment: false,
        state: 'ACCEPTED',
      };

      mockApiGateway.request.mockReturnValue(of({ success: true, data: resolutionData }));

      const resolution = await appointmentService.getResolution(100).toPromise();

      expect(resolution?.appointment_id).toBe(100);
      expect(resolution?.change_basal_type).toBe('Lantus');
      expect(resolution?.change_basal_dose).toBe(22);
      expect(resolution?.change_ratio).toBe(12);
      expect(resolution?.emergency_care).toBe(false);
    });
  });

  describe('Estado CREATED - Cita completada', () => {
    it('debe listar citas completadas del usuario', async () => {
      const appointments: Appointment[] = [
        createMockAppointment({ appointment_id: 101, control_data: 'Primera consulta' }),
        createMockAppointment({
          appointment_id: 102,
          control_data: 'Seguimiento - ajuste de dosis',
          motive: ['AJUSTE'],
        }),
      ];

      mockApiGateway.request.mockReturnValue(of({ success: true, data: appointments }));

      const result = await appointmentService.getAppointments().toPromise();

      expect(result?.length).toBe(2);
      expect(result?.[0].appointment_id).toBe(101);
      expect(result?.[1].control_data).toBe('Seguimiento - ajuste de dosis');
    });

    it('debe obtener una cita específica por ID', async () => {
      const appointments: Appointment[] = [
        createMockAppointment({ appointment_id: 201, control_data: 'Cita objetivo' }),
        createMockAppointment({ appointment_id: 202, control_data: 'Otra cita' }),
      ];

      mockApiGateway.request.mockReturnValue(of({ success: true, data: appointments }));

      const appointment = await appointmentService.getAppointment(201).toPromise();

      expect(appointment?.appointment_id).toBe(201);
      expect(appointment?.control_data).toBe('Cita objetivo');
    });

    it('debe lanzar error si cita no existe', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: [] }));

      try {
        await appointmentService.getAppointment(999).toPromise();
        expect.fail('Debería haber lanzado error');
      } catch (error: unknown) {
        expect((error as Error).message).toContain('Appointment not found');
      }
    });
  });

  describe('Estado DENIED - Cita rechazada', () => {
    it('debe obtener estado DENIED cuando backend rechaza cita', async () => {
      mockApiGateway.request.mockReturnValue(of({ success: true, data: 'DENIED' }));

      const state = await appointmentService.getQueueState().toPromise();

      expect(state?.state).toBe('DENIED');
    });
  });

  describe('Recordatorios de citas', () => {
    it('debe programar recordatorio al crear cita con fecha', async () => {
      const request = createMockRequest();
      const createdAppointment = createMockAppointment({ ...request, appointment_id: 300 });

      mockApiGateway.request.mockReturnValue(of({ success: true, data: createdAppointment }));

      const scheduledDate = new Date('2025-12-25T14:00:00');
      await appointmentService.createAppointment(request, scheduledDate, 60).toPromise();

      expect(mockNotificationService.scheduleAppointmentReminder).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.scheduleAppointmentReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: expect.any(String),
          appointmentDate: scheduledDate,
          reminderMinutesBefore: 60,
        })
      );
    });
  });

  describe('Manejo de errores', () => {
    it('debe manejar error de red al obtener estado', async () => {
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({ status: 0, message: 'Network error' }))
      );

      try {
        await appointmentService.getQueueState().toPromise();
        expect.fail('Debería haber lanzado error');
      } catch {
        // Expected error
      }
    });

    it('debe manejar error de servidor al solicitar cita', async () => {
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          status: 500,
          error: { message: 'Internal server error' },
        }))
      );

      try {
        await appointmentService.requestAppointment().toPromise();
        expect.fail('Debería haber lanzado error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('debe manejar error de autorización', async () => {
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized',
            statusCode: 401,
          },
        }))
      );

      try {
        await appointmentService.getAppointments().toPromise();
        expect.fail('Debería haber lanzado error');
      } catch (error: unknown) {
        expect((error as Error).message).toContain('appointments.errors.unauthorized');
      }
    });

    it('debe manejar servicio no disponible', async () => {
      mockApiGateway.request.mockReturnValue(
        throwError(() => ({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Service unavailable',
            statusCode: 503,
          },
        }))
      );

      try {
        await appointmentService.getAppointments().toPromise();
        expect.fail('Debería haber lanzado error');
      } catch (error: unknown) {
        expect((error as Error).message).toContain('appointments.errors.serviceUnavailable');
      }
    });
  });

  describe('Flujo completo de cita', () => {
    it('debe completar flujo: verificar cola abierta → solicitar → aceptar', async () => {
      // PASO 1: Verificar cola abierta
      mockApiGateway.request.mockReturnValueOnce(of({ success: true, data: true }));
      const isOpen = await appointmentService.checkQueueOpen().toPromise();
      expect(isOpen).toBe(true);

      // PASO 2: Solicitar cita
      mockApiGateway.request.mockReturnValueOnce(of({ success: true, data: 2 }));
      const submitResult = await appointmentService.requestAppointment().toPromise();
      expect(submitResult?.state).toBe('PENDING');

      // PASO 3: Verificar estado PENDING
      mockApiGateway.request.mockReturnValueOnce(of({ success: true, data: 'PENDING' }));
      const pendingState = await appointmentService.getQueueState().toPromise();
      expect(pendingState?.state).toBe('PENDING');

      // PASO 4: Backend acepta
      mockApiGateway.request.mockReturnValueOnce(of({ success: true, data: 'ACCEPTED' }));
      const acceptedState = await appointmentService.getQueueState().toPromise();
      expect(acceptedState?.state).toBe('ACCEPTED');
    });

    it('debe manejar flujo de rechazo: PENDING → DENIED', async () => {
      // PASO 1: Solicitar cita
      mockApiGateway.request.mockReturnValueOnce(of({ success: true, data: 1 }));
      const submitResult = await appointmentService.requestAppointment().toPromise();
      expect(submitResult?.state).toBe('PENDING');

      // PASO 2: Backend rechaza
      mockApiGateway.request.mockReturnValueOnce(of({ success: true, data: 'DENIED' }));
      const deniedState = await appointmentService.getQueueState().toPromise();
      expect(deniedState?.state).toBe('DENIED');
    });
  });

  describe('Actualización de estado reactivo', () => {
    it('debe actualizar BehaviorSubject al obtener citas', async () => {
      const appointments = [createMockAppointment({ appointment_id: 1 })];

      mockApiGateway.request.mockReturnValue(of({ success: true, data: appointments }));

      let emittedAppointments: Appointment[] = [];
      const subscription = appointmentService.appointments$.subscribe(appts => {
        emittedAppointments = appts;
      });

      await appointmentService.getAppointments().toPromise();

      expect(emittedAppointments.length).toBe(1);
      expect(emittedAppointments[0].appointment_id).toBe(1);

      subscription.unsubscribe();
    });
  });
});
