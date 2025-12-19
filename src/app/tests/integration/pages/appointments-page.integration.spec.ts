/**
 * AppointmentsPage Integration Tests
 *
 * Tests completos para el componente AppointmentsPage:
 * 1. Carga y ordenamiento de citas por ID
 * 2. Manejo de estados de cola (NONE, PENDING, ACCEPTED, DENIED, CREATED)
 * 3. Actualización optimista al solicitar cita
 * 4. Polling automático cada 15 segundos
 * 5. Notificaciones de cambio de estado
 * 6. Manejo de errores de polling
 * 7. Expansión de citas pasadas y carga de resoluciones
 * 8. Caché de resoluciones
 * 9. Formateo de motivos y tipos de insulina
 * 10. Navegación a detalles y creación
 * 11. Estados vacíos, de carga y error
 * 12. Codificación de colores por estado
 */

import '../../../../test-setup';

import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { TranslateModule } from '@ngx-translate/core';
import { AppointmentsPage } from '../../../appointments/appointments.page';
import { AppointmentService } from '@core/services/appointment.service';
import { ProfileService } from '@core/services/profile.service';
import { TranslationService } from '@core/services/translation.service';
import { LoggerService } from '@core/services/logger.service';
import {
  Appointment,
  AppointmentQueueState,
  AppointmentQueueStateResponse,
  AppointmentResolutionResponse,
} from '@core/models/appointment.model';
import { ROUTES, appointmentDetailRoute } from '@core/constants';
import { ChangeDetectorRef } from '@angular/core';

describe('AppointmentsPage Integration Tests', () => {
  let component: AppointmentsPage;
  let fixture: ComponentFixture<AppointmentsPage>;
  let mockAppointmentService: {
    getAppointments: Mock;
    appointments$: BehaviorSubject<Appointment[]>;
    getQueueState: Mock;
    getQueuePosition: Mock;
    checkQueueOpen: Mock;
    requestAppointment: Mock;
    getResolution: Mock;
  };
  let mockRouter: { navigate: Mock };
  let mockToastController: { create: Mock };
  let mockTranslationService: { instant: Mock };
  let mockLogger: { info: Mock; debug: Mock; warn: Mock; error: Mock };
  let mockProfileService: any;
  let mockCdr: { markForCheck: Mock; detectChanges: Mock };

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

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock AppointmentService
    const appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
    mockAppointmentService = {
      getAppointments: vi.fn().mockReturnValue(of([])),
      appointments$: appointmentsSubject,
      getQueueState: vi.fn().mockReturnValue(of({ state: 'NONE' as AppointmentQueueState })),
      getQueuePosition: vi.fn().mockReturnValue(of(1)),
      checkQueueOpen: vi.fn().mockReturnValue(of(true)),
      requestAppointment: vi.fn().mockReturnValue(
        of({
          success: true,
          state: 'PENDING' as AppointmentQueueState,
          position: 1,
          message: 'Success',
        })
      ),
      getResolution: vi.fn().mockReturnValue(
        of({
          appointment_id: 100,
          change_basal_type: 'Lantus',
          change_basal_dose: 22,
          emergency_care: false,
          needed_physical_appointment: false,
        } as AppointmentResolutionResponse)
      ),
    };

    // Mock Router
    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    // Mock ToastController
    mockToastController = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
      }),
    };

    // Mock TranslationService
    mockTranslationService = {
      instant: vi.fn((key: string) => key),
    };

    // Mock LoggerService
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Mock ProfileService
    mockProfileService = {};

    // Mock ChangeDetectorRef
    mockCdr = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        AppointmentsPage,
        TranslateModule.forRoot(),
      ],
      providers: [
        { provide: AppointmentService, useValue: mockAppointmentService },
        { provide: Router, useValue: mockRouter },
        { provide: ToastController, useValue: mockToastController },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: ChangeDetectorRef, useValue: mockCdr },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentsPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    if (fixture) {
      fixture.destroy();
    }
  });

  describe('1. Carga de citas y ordenamiento por ID descendente', () => {
    it('debe cargar citas y ordenarlas por appointment_id descendente', fakeAsync(() => {
      const appointments = [
        createMockAppointment({ appointment_id: 100 }),
        createMockAppointment({ appointment_id: 300 }),
        createMockAppointment({ appointment_id: 200 }),
      ];

      mockAppointmentService.getAppointments.mockReturnValue(of(appointments));

      component.ngOnInit();
      tick();

      // Trigger appointments$ subscription
      mockAppointmentService.appointments$.next(appointments);
      tick();

      expect(component.appointments.length).toBe(3);
      // Ordenadas por ID descendente: 300, 200, 100
      expect(component.appointments[0].appointment_id).toBe(300);
      expect(component.appointments[1].appointment_id).toBe(200);
      expect(component.appointments[2].appointment_id).toBe(100);

      flush();
    }));

    it('debe suscribirse a appointments$ y actualizar la lista reactivamente', fakeAsync(() => {
      component.ngOnInit();
      tick();

      expect(component.appointments.length).toBe(0);

      const newAppointments = [
        createMockAppointment({ appointment_id: 500 }),
        createMockAppointment({ appointment_id: 400 }),
      ];

      mockAppointmentService.appointments$.next(newAppointments);
      tick();

      expect(component.appointments.length).toBe(2);
      expect(component.appointments[0].appointment_id).toBe(500);
      expect(component.appointments[1].appointment_id).toBe(400);

      flush();
    }));
  });

  describe('2. Estados de cola y visualización de badges', () => {
    it('debe mostrar badge PENDING con clases warning', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'PENDING' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      const badge = component.getQueueBadge('PENDING');

      expect(badge.classes).toContain('badge-warning');
      expect(badge.icon).toBe('loader-circle');
      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'appointments.queue.labels.pending'
      );

      flush();
    }));

    it('debe mostrar badge ACCEPTED con clases success', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'ACCEPTED' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      const badge = component.getQueueBadge('ACCEPTED');

      expect(badge.classes).toContain('badge-success');
      expect(badge.icon).toBe('check');

      flush();
    }));

    it('debe mostrar badge DENIED con clases error', fakeAsync(() => {
      const badge = component.getQueueBadge('DENIED');

      expect(badge.classes).toContain('badge-error');
      expect(badge.icon).toBe('x');
    }));

    it('debe mostrar badge CREATED con clases info', fakeAsync(() => {
      const badge = component.getQueueBadge('CREATED');

      expect(badge.classes).toContain('badge-info');
      expect(badge.icon).toBe('calendar-check');
    }));

    it('debe mostrar badge BLOCKED con clases error', fakeAsync(() => {
      const badge = component.getQueueBadge('BLOCKED');

      expect(badge.classes).toContain('badge-error');
      expect(badge.icon).toBe('ban');
    }));

    it('debe mostrar badge NONE con clases ghost', fakeAsync(() => {
      const badge = component.getQueueBadge('NONE');

      expect(badge.classes).toContain('badge-ghost');
      expect(badge.icon).toBe('minus');
    }));
  });

  describe('3. Solicitud de cita con actualización optimista', () => {
    it('debe actualizar optimistamente el estado a PENDING al solicitar cita', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'NONE' as AppointmentQueueState })
      );
      mockAppointmentService.requestAppointment.mockReturnValue(
        of({
          success: true,
          state: 'PENDING' as AppointmentQueueState,
          position: 2,
          message: 'Success',
        })
      );

      component.ngOnInit();
      tick();

      expect(component.queueState?.state).toBe('NONE');

      component.onRequestAppointment();
      tick();

      // Actualización optimista
      expect(component.queueState?.state).toBe('PENDING');
      expect(mockAppointmentService.requestAppointment).toHaveBeenCalled();

      flush();
    }));

    it('debe mostrar toast de éxito al solicitar cita', fakeAsync(() => {
      mockAppointmentService.requestAppointment.mockReturnValue(
        of({
          success: true,
          state: 'PENDING' as AppointmentQueueState,
          position: 1,
        })
      );

      component.ngOnInit();
      tick();

      component.onRequestAppointment();
      tick();

      expect(mockToastController.create).toHaveBeenCalledWith({
        message: 'appointments.queue.messages.submitSuccess',
        duration: 3000,
        position: 'bottom',
        color: 'success',
      });

      flush();
    }));

    it('debe prevenir múltiples solicitudes simultáneas (debouncing)', fakeAsync(() => {
      component.ngOnInit();
      tick();

      component.onRequestAppointment();
      component.onRequestAppointment();
      component.onRequestAppointment();
      tick();

      expect(mockAppointmentService.requestAppointment).toHaveBeenCalledTimes(1);

      flush();
    }));
  });

  describe('4. Mecanismo de polling cada 15 segundos', () => {
    it('debe iniciar polling cuando estado es PENDING', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'PENDING' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      // Primera llamada en ngOnInit
      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(1);

      // Avanzar 15 segundos (POLLING_INTERVAL_MS)
      vi.advanceTimersByTime(15000);
      tick();

      // Segunda llamada por polling
      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(2);

      // Avanzar otros 15 segundos
      vi.advanceTimersByTime(15000);
      tick();

      // Tercera llamada
      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(3);

      flush();
    }));

    it('debe iniciar polling cuando estado es ACCEPTED', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'ACCEPTED' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      vi.advanceTimersByTime(15000);
      tick();

      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(2);

      flush();
    }));

    it('NO debe iniciar polling cuando estado es NONE', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'NONE' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      vi.advanceTimersByTime(15000);
      tick();

      // Solo la llamada inicial
      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(1);

      flush();
    }));

    it('debe detener polling cuando estado cambia a CREATED', fakeAsync(() => {
      let callCount = 0;
      mockAppointmentService.getQueueState.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return of({ state: 'PENDING' as AppointmentQueueState });
        } else if (callCount === 2) {
          return of({ state: 'CREATED' as AppointmentQueueState });
        }
        return of({ state: 'CREATED' as AppointmentQueueState });
      });

      component.ngOnInit();
      tick();

      // Primera llamada: PENDING → inicia polling
      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(1);

      // Primer polling: CREATED → detiene polling
      vi.advanceTimersByTime(15000);
      tick();

      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(2);

      // No debe haber más llamadas después de CREATED
      vi.advanceTimersByTime(15000);
      tick();

      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(2);

      flush();
    }));

    it('debe actualizar posición en cola durante polling si estado es PENDING', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'PENDING' as AppointmentQueueState, position: 3 })
      );
      mockAppointmentService.getQueuePosition.mockReturnValue(of(2));

      component.ngOnInit();
      tick();

      vi.advanceTimersByTime(15000);
      tick();

      // Debe intentar obtener la posición actualizada
      expect(mockAppointmentService.getQueuePosition).toHaveBeenCalled();

      flush();
    }));
  });

  describe('5. Notificaciones de cambio de estado', () => {
    it('debe mostrar toast cuando estado cambia a ACCEPTED', fakeAsync(() => {
      let callCount = 0;
      mockAppointmentService.getQueueState.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return of({ state: 'PENDING' as AppointmentQueueState });
        }
        return of({ state: 'ACCEPTED' as AppointmentQueueState });
      });

      component.ngOnInit();
      tick();

      vi.advanceTimersByTime(15000);
      tick();

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'appointments.queue.messages.accepted',
          color: 'success',
        })
      );

      flush();
    }));

    it('debe mostrar toast de error cuando estado cambia a DENIED', fakeAsync(() => {
      let callCount = 0;
      mockAppointmentService.getQueueState.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return of({ state: 'PENDING' as AppointmentQueueState });
        }
        return of({ state: 'DENIED' as AppointmentQueueState });
      });

      component.ngOnInit();
      tick();

      vi.advanceTimersByTime(15000);
      tick();

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'appointments.queue.messages.denied',
          color: 'danger',
        })
      );

      flush();
    }));

    it('debe mostrar toast cuando estado cambia a CREATED', fakeAsync(() => {
      let callCount = 0;
      mockAppointmentService.getQueueState.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return of({ state: 'ACCEPTED' as AppointmentQueueState });
        }
        return of({ state: 'CREATED' as AppointmentQueueState });
      });

      component.ngOnInit();
      tick();

      vi.advanceTimersByTime(15000);
      tick();

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'appointments.queue.messages.created',
          color: 'success',
        })
      );

      flush();
    }));
  });

  describe('6. Manejo de errores de polling', () => {
    it('debe rastrear fallos consecutivos de polling', fakeAsync(() => {
      mockAppointmentService.getQueueState
        .mockReturnValueOnce(of({ state: 'PENDING' as AppointmentQueueState }))
        .mockReturnValue(throwError(() => new Error('Network error')));

      component.ngOnInit();
      tick();

      // Primer fallo
      vi.advanceTimersByTime(15000);
      tick();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Queue',
        'Polling error',
        expect.objectContaining({ consecutiveFailures: 1 })
      );

      // Segundo fallo
      vi.advanceTimersByTime(15000);
      tick();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Queue',
        'Polling error',
        expect.objectContaining({ consecutiveFailures: 2 })
      );

      flush();
    }));

    it('debe mostrar warning después de 3 fallos consecutivos de polling', fakeAsync(() => {
      mockAppointmentService.getQueueState
        .mockReturnValueOnce(of({ state: 'PENDING' as AppointmentQueueState }))
        .mockReturnValue(throwError(() => new Error('Network error')));

      component.ngOnInit();
      tick();

      // 3 fallos consecutivos
      vi.advanceTimersByTime(15000);
      tick();
      vi.advanceTimersByTime(15000);
      tick();
      vi.advanceTimersByTime(15000);
      tick();

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'appointments.queue.messages.updatesUnavailable',
          color: 'warning',
        })
      );

      flush();
    }));

    it('debe resetear contador de fallos después de un polling exitoso', fakeAsync(() => {
      let callCount = 0;
      mockAppointmentService.getQueueState.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return of({ state: 'PENDING' as AppointmentQueueState });
        } else if (callCount === 2 || callCount === 3) {
          return throwError(() => new Error('Network error'));
        }
        return of({ state: 'PENDING' as AppointmentQueueState });
      });

      component.ngOnInit();
      tick();

      // 2 fallos
      vi.advanceTimersByTime(15000);
      tick();
      vi.advanceTimersByTime(15000);
      tick();

      // Éxito → debe resetear contador
      vi.advanceTimersByTime(15000);
      tick();

      // No debe haber warning (porque se reseteó el contador)
      expect(mockToastController.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'warning',
        })
      );

      flush();
    }));
  });

  describe('7. Expansión de citas pasadas', () => {
    it('debe expandir citas pasadas y cargar resoluciones', fakeAsync(() => {
      const appointments = [
        createMockAppointment({ appointment_id: 300 }),
        createMockAppointment({ appointment_id: 200 }),
        createMockAppointment({ appointment_id: 100 }),
      ];

      mockAppointmentService.getAppointments.mockReturnValue(of(appointments));
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'NONE' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();
      mockAppointmentService.appointments$.next(appointments);
      tick();

      expect(component.pastAppointmentsExpanded).toBe(false);

      component.togglePastAppointments();
      tick();

      expect(component.pastAppointmentsExpanded).toBe(true);
      expect(mockAppointmentService.getResolution).toHaveBeenCalled();

      flush();
    }));

    it('debe contraer citas pasadas al hacer toggle nuevamente', fakeAsync(() => {
      component.ngOnInit();
      tick();

      component.togglePastAppointments();
      tick();
      expect(component.pastAppointmentsExpanded).toBe(true);

      component.togglePastAppointments();
      tick();
      expect(component.pastAppointmentsExpanded).toBe(false);

      flush();
    }));

    it('debe manejar citas pasadas sin resolución (404 esperado)', fakeAsync(() => {
      const appointments = [
        createMockAppointment({ appointment_id: 100 }),
        createMockAppointment({ appointment_id: 200 }),
      ];

      mockAppointmentService.getAppointments.mockReturnValue(of(appointments));
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'NONE' as AppointmentQueueState })
      );
      mockAppointmentService.getResolution.mockReturnValue(
        throwError(() => ({ status: 404, message: 'Not found' }))
      );

      component.ngOnInit();
      tick();
      mockAppointmentService.appointments$.next(appointments);
      tick();

      component.togglePastAppointments();
      tick();

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(component.resolutions.size).toBe(0);

      flush();
    }));
  });

  describe('8. Caché de resoluciones', () => {
    it('debe cachear resoluciones y no volver a cargarlas', fakeAsync(() => {
      const appointments = [createMockAppointment({ appointment_id: 100 })];

      mockAppointmentService.getAppointments.mockReturnValue(of(appointments));
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'NONE' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();
      mockAppointmentService.appointments$.next(appointments);
      tick();

      // Primera expansión
      component.togglePastAppointments();
      tick();

      expect(mockAppointmentService.getResolution).toHaveBeenCalledTimes(1);

      // Contraer y expandir de nuevo
      component.togglePastAppointments();
      tick();
      component.togglePastAppointments();
      tick();

      // No debe cargar de nuevo (ya está en caché)
      expect(mockAppointmentService.getResolution).toHaveBeenCalledTimes(1);

      flush();
    }));

    it('debe recuperar resolución desde caché con getResolution()', fakeAsync(() => {
      const resolution: AppointmentResolutionResponse = {
        appointment_id: 100,
        change_basal_type: 'Lantus',
        change_basal_dose: 22,
        emergency_care: false,
        needed_physical_appointment: true,
      } as AppointmentResolutionResponse;

      component.resolutions.set(100, resolution);

      const cached = component.getResolution(100);

      expect(cached).toEqual(resolution);
      expect(cached?.needed_physical_appointment).toBe(true);
    }));
  });

  describe('9. Formateo de motivos y tipos de insulina', () => {
    it('debe formatear motivos correctamente (mapeo ES → EN)', () => {
      const formatted = component.formatMotive(['AJUSTE', 'HIPOGLUCEMIA']);

      expect(mockTranslationService.instant).toHaveBeenCalledWith('appointments.motives.adjustment');
      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'appointments.motives.hypoglycemia'
      );
    });

    it('debe formatear motivos en mayúsculas del backend', () => {
      component.formatMotive(['CETOSIS', 'DUDAS']);

      expect(mockTranslationService.instant).toHaveBeenCalledWith('appointments.motives.ketosis');
      expect(mockTranslationService.instant).toHaveBeenCalledWith('appointments.motives.questions');
    });

    it('debe retornar "-" cuando no hay motivos', () => {
      const result = component.formatMotive([]);
      expect(result).toBe('-');
    });

    it('debe formatear tipo de insulina (mapeo ES → EN)', () => {
      mockTranslationService.instant.mockReturnValue('Rápida');

      const formatted = component.formatInsulinType('RAPIDA');

      expect(mockTranslationService.instant).toHaveBeenCalledWith('appointments.insulinTypes.rapid');
    });

    it('debe retornar "-" para insulina vacía', () => {
      const result = component.formatInsulinType('');
      expect(result).toBe('-');
    });

    it('debe filtrar valores inválidos de insulina (string, asd, test)', () => {
      expect(component.isValidField('string')).toBe(false);
      expect(component.isValidField('asd')).toBe(false);
      expect(component.isValidField('test')).toBe(false);
      expect(component.isValidField('Humalog')).toBe(true);
    });
  });

  describe('10. Navegación a detalles y creación', () => {
    it('debe navegar a detalle de cita', () => {
      const appointment = createMockAppointment({ appointment_id: 123 });

      component.viewAppointment(appointment);

      expect(mockRouter.navigate).toHaveBeenCalledWith([appointmentDetailRoute(123)]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'UI',
        'Appointment clicked',
        expect.objectContaining({ appointmentId: 123 })
      );
    });

    it('debe navegar a página de creación de cita', () => {
      component.createAppointment();

      expect(mockRouter.navigate).toHaveBeenCalledWith([ROUTES.APPOINTMENTS_CREATE]);
      expect(mockLogger.info).toHaveBeenCalledWith('UI', 'Create appointment button clicked');
    });
  });

  describe('11. Estado vacío cuando no hay citas', () => {
    it('debe mostrar estado vacío cuando no hay citas', fakeAsync(() => {
      mockAppointmentService.getAppointments.mockReturnValue(of([]));

      component.ngOnInit();
      tick();

      expect(component.appointments.length).toBe(0);
      expect(component.currentAppointment).toBeNull();
      expect(component.pastAppointments.length).toBe(0);

      flush();
    }));
  });

  describe('12. Estado de carga', () => {
    it('debe mostrar loading=true mientras carga citas', fakeAsync(() => {
      let resolvePromise: (value: Appointment[]) => void;
      const loadingPromise = new Promise<Appointment[]>(resolve => {
        resolvePromise = resolve;
      });

      mockAppointmentService.getAppointments.mockReturnValue(of([]));

      component.loadAppointments();

      expect(component.loading).toBe(true);

      tick();

      expect(component.loading).toBe(false);

      flush();
    }));

    it('debe mostrar queueLoading=true mientras carga estado de cola', fakeAsync(() => {
      component.ngOnInit();

      // Durante la inicialización, queueLoading debe ser true
      expect(component.queueLoading).toBe(true);

      tick();

      expect(component.queueLoading).toBe(false);

      flush();
    }));
  });

  describe('13. Manejo de errores', () => {
    it('debe manejar error al cargar citas', fakeAsync(() => {
      mockAppointmentService.getAppointments.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      component.loadAppointments();
      tick();

      expect(component.error).toContain('Network error');
      expect(component.loading).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();

      flush();
    }));

    it('debe manejar error al solicitar cita', fakeAsync(() => {
      mockAppointmentService.requestAppointment.mockReturnValue(
        throwError(() => new Error('Queue full'))
      );

      component.ngOnInit();
      tick();

      component.onRequestAppointment();
      tick();

      expect(component.queueError).toContain('Queue full');
      expect(mockLogger.error).toHaveBeenCalled();

      flush();
    }));

    it('debe manejar error al cargar estado de cola', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        throwError(() => new Error('Service unavailable'))
      );

      component.loadQueueState();
      tick();

      expect(component.queueError).toContain('Service unavailable');
      expect(mockLogger.error).toHaveBeenCalled();

      flush();
    }));
  });

  describe('14. Codificación de colores por estado', () => {
    it('debe retornar clases correctas para estado PENDING (badge-warning badge-lg)', () => {
      const classes = component.getQueueStateBadgeClass('PENDING');
      expect(classes).toBe('badge badge-warning badge-lg');
    });

    it('debe retornar clases correctas para estado ACCEPTED (badge-info badge-lg)', () => {
      const classes = component.getQueueStateBadgeClass('ACCEPTED');
      expect(classes).toBe('badge badge-info badge-lg');
    });

    it('debe retornar clases correctas para estado CREATED (badge-success badge-lg)', () => {
      const classes = component.getQueueStateBadgeClass('CREATED');
      expect(classes).toBe('badge badge-success badge-lg');
    });

    it('debe retornar clases correctas para estado DENIED (badge-error badge-lg)', () => {
      const classes = component.getQueueStateBadgeClass('DENIED');
      expect(classes).toBe('badge badge-error badge-lg');
    });

    it('debe retornar clases correctas para estado BLOCKED (badge-error badge-lg)', () => {
      const classes = component.getQueueStateBadgeClass('BLOCKED');
      expect(classes).toBe('badge badge-error badge-lg');
    });

    it('debe retornar clases correctas para estado NONE (badge-ghost badge-lg)', () => {
      const classes = component.getQueueStateBadgeClass('NONE');
      expect(classes).toBe('badge badge-ghost badge-lg');
    });
  });

  describe('15. Pull to refresh', () => {
    it('debe recargar citas y estado de cola al hacer refresh', fakeAsync(() => {
      const mockRefresherEvent = {
        target: {
          complete: vi.fn(),
        },
      } as unknown as CustomEvent;

      component.ngOnInit();
      tick();

      mockAppointmentService.getAppointments.mockClear();
      mockAppointmentService.getQueueState.mockClear();

      component.doRefresh(mockRefresherEvent);
      tick();

      expect(mockAppointmentService.getAppointments).toHaveBeenCalled();
      expect(mockAppointmentService.getQueueState).toHaveBeenCalled();
      expect(mockRefresherEvent.target.complete).toHaveBeenCalled();

      flush();
    }));
  });

  describe('16. Getters canCreateAppointment y canRequestAppointment', () => {
    it('canCreateAppointment debe ser true cuando estado es ACCEPTED', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'ACCEPTED' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      expect(component.canCreateAppointment).toBe(true);

      flush();
    }));

    it('canCreateAppointment debe ser false para otros estados', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'PENDING' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      expect(component.canCreateAppointment).toBe(false);

      flush();
    }));

    it('canRequestAppointment debe ser true cuando estado es NONE', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'NONE' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      expect(component.canRequestAppointment).toBe(true);

      flush();
    }));

    it('canRequestAppointment debe ser false cuando estado es PENDING', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'PENDING' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      expect(component.canRequestAppointment).toBe(false);

      flush();
    }));
  });

  describe('17. Limpieza en ngOnDestroy', () => {
    it('debe limpiar suscripciones y detener polling en ngOnDestroy', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'PENDING' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      // Polling activo
      vi.advanceTimersByTime(15000);
      tick();
      const callsBeforeDestroy = mockAppointmentService.getQueueState.mock.calls.length;

      component.ngOnDestroy();
      tick();

      // Avanzar tiempo después de destroy
      vi.advanceTimersByTime(30000);
      tick();

      // No debe haber más llamadas
      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(callsBeforeDestroy);

      flush();
    }));
  });
});
