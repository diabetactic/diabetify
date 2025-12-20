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

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { TranslateModule, TranslateService, TranslateLoader } from '@ngx-translate/core';
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
import { ChangeDetectorRef, EventEmitter } from '@angular/core';

// Mock TranslateLoader
class MockTranslateLoader implements TranslateLoader {
  getTranslation() {
    return of({});
  }
}

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
  let mockTranslateService: Partial<TranslateService>;

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

    // Mock TranslateService (for Angular translation pipe)
    mockTranslateService = {
      currentLang: 'en',
      defaultLang: 'en',
      onLangChange: new EventEmitter(),
      onTranslationChange: new EventEmitter(),
      onDefaultLangChange: new EventEmitter(),
      instant: vi.fn((key: string) => key),
      get: vi.fn((key: string) => of(key)),
      use: vi.fn(() => of({})),
      setDefaultLang: vi.fn(),
      addLangs: vi.fn(),
      getLangs: vi.fn(() => ['en', 'es']),
      getBrowserLang: vi.fn(() => 'en'),
      getDefaultLang: vi.fn(() => 'en'),
      setTranslation: vi.fn(),
      getTranslation: vi.fn(() => of({})),
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
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: MockTranslateLoader }
        })
      ],
      providers: [
        { provide: AppointmentService, useValue: mockAppointmentService },
        { provide: Router, useValue: mockRouter },
        { provide: ToastController, useValue: mockToastController },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: ProfileService, useValue: mockProfileService },
      ],
    })
    .overrideComponent(AppointmentsPage, {
      set: {
        template: '<div></div>', // Skip template rendering to avoid icon loading issues
        providers: [
          { provide: ChangeDetectorRef, useValue: mockCdr },
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppointmentsPage);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
    }
  });

  describe('1. Carga de citas y ordenamiento por ID descendente', () => {
    it('debe cargar citas y ordenarlas por appointment_id descendente', async () => {
      const appointments = [
        createMockAppointment({ appointment_id: 100 }),
        createMockAppointment({ appointment_id: 300 }),
        createMockAppointment({ appointment_id: 200 }),
      ];

      mockAppointmentService.getAppointments.mockReturnValue(of(appointments));

      component.ngOnInit();
      await fixture.whenStable();

      // Trigger appointments$ subscription
      mockAppointmentService.appointments$.next(appointments);
      await fixture.whenStable();

      expect(component.appointments.length).toBe(3);
      // Ordenadas por ID descendente: 300, 200, 100
      expect(component.appointments[0].appointment_id).toBe(300);
      expect(component.appointments[1].appointment_id).toBe(200);
      expect(component.appointments[2].appointment_id).toBe(100);
    });

    it('debe suscribirse a appointments$ y actualizar la lista reactivamente', async () => {
      component.ngOnInit();
      await fixture.whenStable();

      expect(component.appointments.length).toBe(0);

      const newAppointments = [
        createMockAppointment({ appointment_id: 500 }),
        createMockAppointment({ appointment_id: 400 }),
      ];

      mockAppointmentService.appointments$.next(newAppointments);
      await fixture.whenStable();

      expect(component.appointments.length).toBe(2);
      expect(component.appointments[0].appointment_id).toBe(500);
      expect(component.appointments[1].appointment_id).toBe(400);
    });
  });

  describe('2. Estados de cola y visualización de badges', () => {
    it('debe mostrar badge PENDING con clases warning', () => {
      const badge = component.getQueueBadge('PENDING');

      expect(badge.classes).toContain('badge-warning');
      expect(badge.icon).toBe('loader-circle');
      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'appointments.queue.labels.pending'
      );
    });

    it('debe mostrar badge ACCEPTED con clases success', () => {
      const badge = component.getQueueBadge('ACCEPTED');

      expect(badge.classes).toContain('badge-success');
      expect(badge.icon).toBe('check');
    });

    it('debe mostrar badge DENIED con clases error', () => {
      const badge = component.getQueueBadge('DENIED');

      expect(badge.classes).toContain('badge-error');
      expect(badge.icon).toBe('x');
    });

    it('debe mostrar badge CREATED con clases info', () => {
      const badge = component.getQueueBadge('CREATED');

      expect(badge.classes).toContain('badge-info');
      expect(badge.icon).toBe('calendar-check');
    });

    it('debe mostrar badge BLOCKED con clases error', () => {
      const badge = component.getQueueBadge('BLOCKED');

      expect(badge.classes).toContain('badge-error');
      expect(badge.icon).toBe('ban');
    });

    it('debe mostrar badge NONE con clases ghost', () => {
      const badge = component.getQueueBadge('NONE');

      expect(badge.classes).toContain('badge-ghost');
      expect(badge.icon).toBe('minus');
    });
  });

  describe('3. Solicitud de cita con actualización optimista', () => {
    it('debe actualizar optimistamente el estado a PENDING al solicitar cita', async () => {
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
      await fixture.whenStable();

      expect(component.queueState?.state).toBe('NONE');

      await component.onRequestAppointment();
      await fixture.whenStable();

      // Actualización optimista
      expect(component.queueState?.state).toBe('PENDING');
      expect(mockAppointmentService.requestAppointment).toHaveBeenCalled();
    });

    it('debe mostrar toast de éxito al solicitar cita', async () => {
      mockAppointmentService.requestAppointment.mockReturnValue(
        of({
          success: true,
          state: 'PENDING' as AppointmentQueueState,
          position: 1,
        })
      );

      component.ngOnInit();
      await fixture.whenStable();

      await component.onRequestAppointment();
      await fixture.whenStable();

      expect(mockToastController.create).toHaveBeenCalledWith({
        message: 'appointments.queue.messages.submitSuccess',
        duration: 3000,
        position: 'bottom',
        color: 'success',
      });
    });

    it('debe prevenir múltiples solicitudes simultáneas (debouncing)', async () => {
      component.ngOnInit();
      await fixture.whenStable();

      // Llamar múltiples veces
      const promise1 = component.onRequestAppointment();
      const promise2 = component.onRequestAppointment();
      const promise3 = component.onRequestAppointment();

      await Promise.all([promise1, promise2, promise3]);
      await fixture.whenStable();

      // Solo debe llamarse una vez debido al flag isSubmitting
      expect(mockAppointmentService.requestAppointment).toHaveBeenCalledTimes(1);
    });
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
      tick(15000);

      // Segunda llamada por polling
      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(2);

      // Avanzar otros 15 segundos
      tick(15000);

      // Tercera llamada
      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(3);
    }));

    it('debe iniciar polling cuando estado es ACCEPTED', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'ACCEPTED' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      tick(15000);

      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(2);
    }));

    it('NO debe iniciar polling cuando estado es NONE', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'NONE' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      tick(15000);

      // Solo la llamada inicial
      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(1);
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
      tick(15000);

      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(2);

      // No debe haber más llamadas después de CREATED
      tick(15000);

      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(2);
    }));

    it('debe actualizar posición en cola durante polling si estado es PENDING', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'PENDING' as AppointmentQueueState, position: 3 })
      );
      mockAppointmentService.getQueuePosition.mockReturnValue(of(2));

      component.ngOnInit();
      tick();

      tick(15000);

      // Debe intentar obtener la posición actualizada
      expect(mockAppointmentService.getQueuePosition).toHaveBeenCalled();
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

      tick(15000);

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'appointments.queue.messages.accepted',
          color: 'success',
        })
      );
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

      tick(15000);

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'appointments.queue.messages.denied',
          color: 'danger',
        })
      );
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

      tick(15000);

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'appointments.queue.messages.created',
          color: 'success',
        })
      );
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
      tick(15000);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Queue',
        'Polling error',
        expect.objectContaining({ consecutiveFailures: 1 })
      );

      // Segundo fallo
      tick(15000);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Queue',
        'Polling error',
        expect.objectContaining({ consecutiveFailures: 2 })
      );
    }));

    it('debe mostrar warning después de 3 fallos consecutivos de polling', fakeAsync(() => {
      mockAppointmentService.getQueueState
        .mockReturnValueOnce(of({ state: 'PENDING' as AppointmentQueueState }))
        .mockReturnValue(throwError(() => new Error('Network error')));

      component.ngOnInit();
      tick();

      // 3 fallos consecutivos
      tick(15000);
      tick(15000);
      tick(15000);

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'appointments.queue.messages.updatesUnavailable',
          color: 'warning',
        })
      );
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
      tick(15000);
      tick(15000);

      // Éxito → debe resetear contador
      tick(15000);

      // No debe haber warning (porque se reseteó el contador)
      expect(mockToastController.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'warning',
        })
      );
    }));
  });

  describe('7. Expansión de citas pasadas', () => {
    it('debe expandir citas pasadas y cargar resoluciones', async () => {
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
      await fixture.whenStable();
      mockAppointmentService.appointments$.next(appointments);
      await fixture.whenStable();

      expect(component.pastAppointmentsExpanded).toBe(false);

      component.togglePastAppointments();
      await fixture.whenStable();

      expect(component.pastAppointmentsExpanded).toBe(true);
      expect(mockAppointmentService.getResolution).toHaveBeenCalled();
    });

    it('debe contraer citas pasadas al hacer toggle nuevamente', async () => {
      component.ngOnInit();
      await fixture.whenStable();

      component.togglePastAppointments();
      await fixture.whenStable();
      expect(component.pastAppointmentsExpanded).toBe(true);

      component.togglePastAppointments();
      await fixture.whenStable();
      expect(component.pastAppointmentsExpanded).toBe(false);
    });

    it('debe manejar citas pasadas sin resolución (404 esperado)', async () => {
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
      await fixture.whenStable();
      mockAppointmentService.appointments$.next(appointments);
      await fixture.whenStable();

      component.togglePastAppointments();
      await fixture.whenStable();

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(component.resolutions.size).toBe(0);
    });
  });

  describe('8. Caché de resoluciones', () => {
    it('debe cachear resoluciones y no volver a cargarlas', async () => {
      const appointments = [createMockAppointment({ appointment_id: 100 })];

      mockAppointmentService.getAppointments.mockReturnValue(of(appointments));
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'NONE' as AppointmentQueueState })
      );

      component.ngOnInit();
      await fixture.whenStable();
      mockAppointmentService.appointments$.next(appointments);
      await fixture.whenStable();

      // Primera expansión
      component.togglePastAppointments();
      await fixture.whenStable();

      expect(mockAppointmentService.getResolution).toHaveBeenCalledTimes(1);

      // Contraer y expandir de nuevo
      component.togglePastAppointments();
      await fixture.whenStable();
      component.togglePastAppointments();
      await fixture.whenStable();

      // No debe cargar de nuevo (ya está en caché)
      expect(mockAppointmentService.getResolution).toHaveBeenCalledTimes(1);
    });

    it('debe recuperar resolución desde caché con getResolution()', () => {
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
    });
  });

  describe('9. Formateo de motivos y tipos de insulina', () => {
    it('debe formatear motivos correctamente (mapeo ES → EN)', () => {
      const formatted = component.formatMotive(['AJUSTE', 'HIPOGLUCEMIA']);

      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'appointments.motives.adjustment'
      );
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

      expect(mockTranslationService.instant).toHaveBeenCalledWith(
        'appointments.insulinTypes.rapid'
      );
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
    it('debe mostrar estado vacío cuando no hay citas', async () => {
      mockAppointmentService.getAppointments.mockReturnValue(of([]));

      component.ngOnInit();
      await fixture.whenStable();

      expect(component.appointments.length).toBe(0);
      expect(component.currentAppointment).toBeNull();
      expect(component.pastAppointments.length).toBe(0);
    });
  });

  describe('12. Estado de carga', () => {
    it('debe mostrar loading=true mientras carga citas', async () => {
      mockAppointmentService.getAppointments.mockReturnValue(of([]));

      const loadPromise = component.loadAppointments();

      expect(component.loading).toBe(true);

      await loadPromise;
      await fixture.whenStable();

      expect(component.loading).toBe(false);
    });

    it('debe mostrar queueLoading=true mientras carga estado de cola', async () => {
      const loadPromise = component.loadQueueState();

      // Durante la inicialización, queueLoading debe ser true
      expect(component.queueLoading).toBe(true);

      await loadPromise;
      await fixture.whenStable();

      expect(component.queueLoading).toBe(false);
    });
  });

  describe('13. Manejo de errores', () => {
    it('debe manejar error al cargar citas', async () => {
      mockAppointmentService.getAppointments.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      await component.loadAppointments();
      await fixture.whenStable();

      expect(component.error).toContain('Network error');
      expect(component.loading).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('debe manejar error al solicitar cita', async () => {
      mockAppointmentService.requestAppointment.mockReturnValue(
        throwError(() => new Error('Queue full'))
      );

      component.ngOnInit();
      await fixture.whenStable();

      await component.onRequestAppointment();
      await fixture.whenStable();

      expect(component.queueError).toContain('Queue full');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('debe manejar error al cargar estado de cola', async () => {
      mockAppointmentService.getQueueState.mockReturnValue(
        throwError(() => new Error('Service unavailable'))
      );

      await component.loadQueueState();
      await fixture.whenStable();

      expect(component.queueError).toContain('Service unavailable');
      expect(mockLogger.error).toHaveBeenCalled();
    });
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
    it('debe recargar citas y estado de cola al hacer refresh', async () => {
      const mockRefresherEvent = {
        target: {
          complete: vi.fn(),
        },
      } as unknown as CustomEvent;

      component.ngOnInit();
      await fixture.whenStable();

      mockAppointmentService.getAppointments.mockClear();
      mockAppointmentService.getQueueState.mockClear();

      await component.doRefresh(mockRefresherEvent);
      await fixture.whenStable();

      expect(mockAppointmentService.getAppointments).toHaveBeenCalled();
      expect(mockAppointmentService.getQueueState).toHaveBeenCalled();
      expect(mockRefresherEvent.target.complete).toHaveBeenCalled();
    });
  });

  describe('16. Getters canCreateAppointment y canRequestAppointment', () => {
    it('canCreateAppointment debe ser true cuando estado es ACCEPTED', async () => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'ACCEPTED' as AppointmentQueueState })
      );

      component.ngOnInit();
      await fixture.whenStable();

      expect(component.canCreateAppointment).toBe(true);
    });

    it('canCreateAppointment debe ser false para otros estados', async () => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'PENDING' as AppointmentQueueState })
      );

      component.ngOnInit();
      await fixture.whenStable();

      expect(component.canCreateAppointment).toBe(false);
    });

    it('canRequestAppointment debe ser true cuando estado es NONE', async () => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'NONE' as AppointmentQueueState })
      );

      component.ngOnInit();
      await fixture.whenStable();

      expect(component.canRequestAppointment).toBe(true);
    });

    it('canRequestAppointment debe ser false cuando estado es PENDING', async () => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'PENDING' as AppointmentQueueState })
      );

      component.ngOnInit();
      await fixture.whenStable();

      expect(component.canRequestAppointment).toBe(false);
    });
  });

  describe('17. Limpieza en ngOnDestroy', () => {
    it('debe limpiar suscripciones y detener polling en ngOnDestroy', fakeAsync(() => {
      mockAppointmentService.getQueueState.mockReturnValue(
        of({ state: 'PENDING' as AppointmentQueueState })
      );

      component.ngOnInit();
      tick();

      // Polling activo
      tick(15000);
      const callsBeforeDestroy = mockAppointmentService.getQueueState.mock.calls.length;

      component.ngOnDestroy();
      tick();

      // Avanzar tiempo después de destroy
      tick(30000);

      // No debe haber más llamadas
      expect(mockAppointmentService.getQueueState).toHaveBeenCalledTimes(callsBeforeDestroy);
    }));
  });
});
