/**
 * NotificationService Integration Tests
 *
 * Pruebas de integración para NotificationService.
 * Verifica flujos completos de notificaciones con LocalNotifications y Platform.
 *
 * COBERTURA (15 tests):
 *
 * Permission Flow (3 tests):
 * 1. Request permissions en modo Capacitor → granted
 * 2. Request permissions en modo web → Notification API
 * 3. Check permissions y persistir estado interno
 *
 * Reading Reminders (3 tests):
 * 4. Schedule reading reminder con tiempo futuro → LocalNotifications.schedule
 * 5. Schedule reminder con tiempo pasado → ajustar a mañana
 * 6. Cancel reading reminder → LocalNotifications.cancel
 *
 * Appointment Reminders (2 tests):
 * 7. Schedule appointment reminder con appointmentId → navigation data
 * 8. Skip reminder si tiempo ya pasó
 *
 * Notification Listeners (3 tests):
 * 9. Register listeners en init() → recibir notificación
 * 10. Handle notification action → NgZone.run + Router.navigate
 * 11. Cleanup listeners en ngOnDestroy() → prevenir memory leaks
 *
 * Fallback & Error Handling (2 tests):
 * 12. Gracefully handle no permissions → no throw
 * 13. Cancel all notifications → circuit breaker pattern
 *
 * Platform Detection (2 tests):
 * 14. Web mode → skip LocalNotifications, usar Notification API
 * 15. Capacitor mode → usar LocalNotifications plugin
 */

// Inicializar entorno TestBed para Vitest
import '../../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { NgZone } from '@angular/core';
import { vi } from 'vitest';
import { LocalNotifications, ActionPerformed } from '@capacitor/local-notifications';
import {
  NotificationService,
  ReadingReminder,
  AppointmentReminder,
} from '@core/services/notification.service';
import { LoggerService } from '@core/services/logger.service';
import { ROUTES, appointmentDetailRoute } from '@core/constants';

describe('NotificationService Integration Tests', () => {
  let service: NotificationService;
  let platform: Platform;
  let router: Router;
  let ngZone: NgZone;
  let mockLogger: jasmine.SpyObj<LoggerService>;

  /**
   * Helper: Crear mock de Platform
   */
  const createPlatformMock = (isCapacitor: boolean) => ({
    is: vi.fn((platformName: string) => {
      if (platformName === 'capacitor') return isCapacitor;
      if (platformName === 'web') return !isCapacitor;
      return false;
    }),
    ready: vi.fn().mockResolvedValue('dom'),
    platforms: vi.fn().mockReturnValue(isCapacitor ? ['capacitor', 'android'] : ['web']),
  });

  /**
   * Helper: Crear mock de Router
   */
  const createRouterMock = () => ({
    navigate: vi.fn().mockResolvedValue(true),
    navigateByUrl: vi.fn().mockResolvedValue(true),
    url: '/',
    events: { subscribe: vi.fn() },
  });

  /**
   * Helper: Crear mock de NgZone
   */
  const createNgZoneMock = () => {
    const zone = TestBed.inject(NgZone);
    vi.spyOn(zone, 'run').mockImplementation((fn: () => void) => {
      fn();
      return undefined as any;
    });
    return zone;
  };

  /**
   * Setup común para modo Capacitor
   */
  const setupCapacitorMode = () => {
    platform = createPlatformMock(true) as any;
    router = createRouterMock() as any;
    mockLogger = jasmine.createSpyObj('LoggerService', ['debug', 'info', 'error', 'warn']);

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: Platform, useValue: platform },
        { provide: Router, useValue: router },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(NotificationService);
    ngZone = createNgZoneMock();
  };

  /**
   * Setup común para modo Web
   */
  const setupWebMode = () => {
    platform = createPlatformMock(false) as any;
    router = createRouterMock() as any;
    mockLogger = jasmine.createSpyObj('LoggerService', ['debug', 'info', 'error', 'warn']);

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: Platform, useValue: platform },
        { provide: Router, useValue: router },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(NotificationService);
  };

  beforeEach(() => {
    // Reset todos los mocks de Capacitor
    vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: 'granted' });
    vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: 'granted' });
    vi.mocked(LocalNotifications.schedule).mockResolvedValue({ notifications: [] });
    vi.mocked(LocalNotifications.cancel).mockResolvedValue(undefined);
    vi.mocked(LocalNotifications.getPending).mockResolvedValue({ notifications: [] });
    vi.mocked(LocalNotifications.addListener).mockResolvedValue({ remove: vi.fn() });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  // ============================================================================
  // Permission Flow
  // ============================================================================

  describe('Permission Flow', () => {
    it('debe solicitar permisos en modo Capacitor y retornar granted', async () => {
      // ARRANGE
      setupCapacitorMode();
      vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: 'granted' });

      // ACT
      const result = await service.requestPermissions();

      // ASSERT
      expect(result).toBe(true);
      expect(LocalNotifications.requestPermissions).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notifications',
        'Permission result',
        jasmine.objectContaining({ granted: true })
      );
    });

    it('debe solicitar permisos en modo web usando Notification API', async () => {
      // ARRANGE
      setupWebMode();

      // Mock Notification API
      const mockNotification = {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };
      (global as any).Notification = mockNotification;

      // ACT
      const result = await service.requestPermissions();

      // ASSERT
      expect(result).toBe(true);
      expect(mockNotification.requestPermission).toHaveBeenCalledTimes(1);
      expect(LocalNotifications.requestPermissions).not.toHaveBeenCalled();

      // Cleanup
      delete (global as any).Notification;
    });

    it('debe verificar permisos existentes y persistir estado interno', async () => {
      // ARRANGE
      setupCapacitorMode();
      vi.mocked(LocalNotifications.checkPermissions).mockResolvedValue({ display: 'granted' });

      // ACT
      const result = await service.checkPermissions();

      // ASSERT
      expect(result).toBe(true);
      expect(LocalNotifications.checkPermissions).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Reading Reminders
  // ============================================================================

  describe('Reading Reminders', () => {
    it('debe programar reading reminder con tiempo futuro', async () => {
      // ARRANGE
      setupCapacitorMode();

      const reminder: ReadingReminder = {
        id: 1,
        time: '14:30', // 2:30 PM
        enabled: true,
        label: 'Afternoon Check',
      };

      // ACT
      await service.scheduleReadingReminder(reminder);

      // ASSERT
      expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);
      const scheduleCall = vi.mocked(LocalNotifications.schedule).mock.calls[0][0];
      expect(scheduleCall.notifications).toHaveLength(1);

      const notification = scheduleCall.notifications[0];
      expect(notification.id).toBe(1001); // READING_REMINDER_BASE_ID + reminder.id
      expect(notification.title).toBe('Afternoon Check');
      expect(notification.body).toBe("It's time to check your glucose level!");
      expect(notification.schedule?.repeats).toBe(true);
      expect(notification.schedule?.every).toBe('day');
      expect(notification.extra).toEqual({
        type: 'reading_reminder',
        reminderId: 1,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notifications',
        'Reading reminder scheduled',
        jasmine.objectContaining({ id: 1001, time: '14:30' })
      );
    });

    it('debe ajustar reminder a mañana si el tiempo ya pasó hoy', async () => {
      // ARRANGE
      setupCapacitorMode();

      // Configurar un tiempo que ya pasó hoy (6 AM)
      const now = new Date();
      const pastTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0);
      const isPast = pastTime <= now;

      const reminder: ReadingReminder = {
        id: 2,
        time: '06:00',
        enabled: true,
      };

      // ACT
      await service.scheduleReadingReminder(reminder);

      // ASSERT
      expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);
      const scheduleCall = vi.mocked(LocalNotifications.schedule).mock.calls[0][0];
      const notification = scheduleCall.notifications[0];

      if (isPast) {
        // Verificar que se programó para mañana
        const scheduleDate = notification.schedule?.at as Date;
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 6, 0);
        expect(scheduleDate.getDate()).toBe(tomorrow.getDate());
      }
    });

    it('debe cancelar reading reminder cuando se deshabilita', async () => {
      // ARRANGE
      setupCapacitorMode();

      const reminder: ReadingReminder = {
        id: 3,
        time: '10:00',
        enabled: false, // Deshabilitado
      };

      // ACT
      await service.scheduleReadingReminder(reminder);

      // ASSERT
      expect(LocalNotifications.cancel).toHaveBeenCalledTimes(1);
      expect(LocalNotifications.cancel).toHaveBeenCalledWith({
        notifications: [{ id: 1003 }], // READING_REMINDER_BASE_ID + 3
      });
      expect(LocalNotifications.schedule).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Appointment Reminders
  // ============================================================================

  describe('Appointment Reminders', () => {
    it('debe programar appointment reminder con navigation data', async () => {
      // ARRANGE
      setupCapacitorMode();

      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas adelante
      const reminder: AppointmentReminder = {
        appointmentId: 'apt-12345',
        appointmentDate: futureDate,
        reminderMinutesBefore: 30,
      };

      // ACT
      await service.scheduleAppointmentReminder(reminder);

      // ASSERT
      expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);
      const scheduleCall = vi.mocked(LocalNotifications.schedule).mock.calls[0][0];
      const notification = scheduleCall.notifications[0];

      expect(notification.title).toBe('Upcoming Appointment');
      expect(notification.body).toBe('You have an appointment in 30 minutes');
      expect(notification.extra).toEqual({
        type: 'appointment_reminder',
        appointmentId: 'apt-12345',
      });

      // Verificar que el tiempo es 30 minutos antes
      const scheduleDate = notification.schedule?.at as Date;
      const expectedTime = new Date(futureDate.getTime() - 30 * 60 * 1000);
      expect(scheduleDate.getTime()).toBeCloseTo(expectedTime.getTime(), -3); // Precisión de 1000ms
    });

    it('debe saltar reminder si el tiempo ya pasó', async () => {
      // ARRANGE
      setupCapacitorMode();

      const pastDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hora atrás
      const reminder: AppointmentReminder = {
        appointmentId: 'apt-past',
        appointmentDate: pastDate,
        reminderMinutesBefore: 15,
      };

      // ACT
      await service.scheduleAppointmentReminder(reminder);

      // ASSERT
      expect(LocalNotifications.schedule).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Notifications',
        'Appointment reminder time has passed, skipping'
      );
    });
  });

  // ============================================================================
  // Notification Listeners
  // ============================================================================

  describe('Notification Listeners', () => {
    it('debe registrar listeners en init() para recibir notificaciones', async () => {
      // ARRANGE
      let receivedCallback: ((notification: any) => void) | null = null;

      vi.mocked(LocalNotifications.addListener).mockImplementation((event, callback) => {
        if (event === 'localNotificationReceived') {
          receivedCallback = callback as any;
        }
        return Promise.resolve({ remove: vi.fn() });
      });

      // ACT
      setupCapacitorMode(); // Esto llama a init()

      // Esperar a que se completen los listeners
      await new Promise(resolve => setTimeout(resolve, 50));

      // ASSERT
      expect(LocalNotifications.addListener).toHaveBeenCalledWith(
        'localNotificationReceived',
        expect.any(Function)
      );
      expect(LocalNotifications.addListener).toHaveBeenCalledWith(
        'localNotificationActionPerformed',
        expect.any(Function)
      );

      // Simular notificación recibida
      if (receivedCallback) {
        receivedCallback({ id: 1001, title: 'Test', body: 'Test notification' });
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Notifications',
          'Notification received',
          jasmine.objectContaining({ id: 1001 })
        );
      }
    });

    it('debe manejar notification action con NgZone.run y Router.navigate', async () => {
      // ARRANGE
      let actionCallback: ((action: ActionPerformed) => void) | null = null;

      vi.mocked(LocalNotifications.addListener).mockImplementation((event, callback) => {
        if (event === 'localNotificationActionPerformed') {
          actionCallback = callback as any;
        }
        return Promise.resolve({ remove: vi.fn() });
      });

      setupCapacitorMode();
      await new Promise(resolve => setTimeout(resolve, 50));

      // ACT: Simular tap en reading reminder
      const action: ActionPerformed = {
        actionId: 'tap',
        notification: {
          id: 1001,
          title: 'Reading Reminder',
          body: 'Time to check glucose',
          extra: {
            type: 'reading_reminder',
            reminderId: 1,
          },
        },
      };

      if (actionCallback) {
        actionCallback(action);
      }

      // ASSERT
      expect(ngZone.run).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith([ROUTES.ADD_READING]);
      expect(mockLogger.info).toHaveBeenCalledWith('Notifications', 'User tapped reading reminder');
    });

    it('debe limpiar listeners en ngOnDestroy() para prevenir memory leaks', async () => {
      // ARRANGE
      const removeFn1 = vi.fn();
      const removeFn2 = vi.fn();

      vi.mocked(LocalNotifications.addListener)
        .mockResolvedValueOnce({ remove: removeFn1 })
        .mockResolvedValueOnce({ remove: removeFn2 });

      setupCapacitorMode();
      await new Promise(resolve => setTimeout(resolve, 50));

      // ACT
      service.ngOnDestroy();

      // ASSERT
      expect(removeFn1).toHaveBeenCalledTimes(1);
      expect(removeFn2).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Notifications',
        'Notification listeners removed'
      );
    });
  });

  // ============================================================================
  // Fallback & Error Handling
  // ============================================================================

  describe('Fallback & Error Handling', () => {
    it('debe manejar gracefully falta de permisos sin lanzar error', async () => {
      // ARRANGE
      setupCapacitorMode();
      vi.mocked(LocalNotifications.requestPermissions).mockResolvedValue({ display: 'denied' });

      // ACT
      const result = await service.requestPermissions();

      // ASSERT
      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notifications',
        'Permission result',
        jasmine.objectContaining({ granted: false })
      );
    });

    it('debe cancelar todas las notificaciones con circuit breaker pattern', async () => {
      // ARRANGE
      setupCapacitorMode();

      // Crear notificaciones pendientes
      vi.mocked(LocalNotifications.getPending).mockResolvedValue({
        notifications: [
          { id: 1001, title: 'Test 1' },
          { id: 1002, title: 'Test 2' },
          { id: 2001, title: 'Appointment' },
        ] as any,
      });

      // ACT
      await service.cancelAllNotifications();

      // ASSERT
      expect(LocalNotifications.getPending).toHaveBeenCalledTimes(1);
      expect(LocalNotifications.cancel).toHaveBeenCalledWith({
        notifications: [
          { id: 1001, title: 'Test 1' },
          { id: 1002, title: 'Test 2' },
          { id: 2001, title: 'Appointment' },
        ],
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notifications',
        'All notifications cancelled',
        jasmine.objectContaining({ count: 3 })
      );
    });
  });

  // ============================================================================
  // Platform Detection
  // ============================================================================

  describe('Platform Detection', () => {
    it('debe usar Notification API en modo web, no LocalNotifications', async () => {
      // ARRANGE
      setupWebMode();

      // Mock Notification API
      const mockNotificationConstructor = vi.fn();
      (global as any).Notification = mockNotificationConstructor;
      (global as any).Notification.permission = 'granted';

      // ACT
      await service.showImmediateNotification('Test Title', 'Test Body');

      // ASSERT
      expect(mockNotificationConstructor).toHaveBeenCalledWith('Test Title', { body: 'Test Body' });
      expect(LocalNotifications.schedule).not.toHaveBeenCalled();

      // Cleanup
      delete (global as any).Notification;
    });

    it('debe usar LocalNotifications en modo Capacitor', async () => {
      // ARRANGE
      setupCapacitorMode();

      // ACT
      await service.showImmediateNotification('Capacitor Test', 'Capacitor Body');

      // ASSERT
      expect(LocalNotifications.schedule).toHaveBeenCalledTimes(1);
      const scheduleCall = vi.mocked(LocalNotifications.schedule).mock.calls[0][0];
      const notification = scheduleCall.notifications[0];

      expect(notification.title).toBe('Capacitor Test');
      expect(notification.body).toBe('Capacitor Body');
      expect(notification.schedule?.at).toBeInstanceOf(Date);
    });
  });

  // ============================================================================
  // Edge Cases & Navigation
  // ============================================================================

  describe('Edge Cases & Navigation', () => {
    it('debe navegar a appointment detail cuando appointmentId está presente', async () => {
      // ARRANGE
      let actionCallback: ((action: ActionPerformed) => void) | null = null;

      vi.mocked(LocalNotifications.addListener).mockImplementation((event, callback) => {
        if (event === 'localNotificationActionPerformed') {
          actionCallback = callback as any;
        }
        return Promise.resolve({ remove: vi.fn() });
      });

      setupCapacitorMode();
      await new Promise(resolve => setTimeout(resolve, 50));

      // ACT: Simular tap en appointment reminder
      const action: ActionPerformed = {
        actionId: 'tap',
        notification: {
          id: 2001,
          title: 'Appointment',
          body: 'Upcoming appointment',
          extra: {
            type: 'appointment_reminder',
            appointmentId: 'apt-789',
          },
        },
      };

      if (actionCallback) {
        actionCallback(action);
      }

      // ASSERT
      expect(router.navigate).toHaveBeenCalledWith([appointmentDetailRoute('apt-789')]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notifications',
        'User tapped appointment reminder',
        jasmine.objectContaining({ appointmentId: 'apt-789' })
      );
    });

    it('debe navegar a appointments tab cuando appointmentId falta', async () => {
      // ARRANGE
      let actionCallback: ((action: ActionPerformed) => void) | null = null;

      vi.mocked(LocalNotifications.addListener).mockImplementation((event, callback) => {
        if (event === 'localNotificationActionPerformed') {
          actionCallback = callback as any;
        }
        return Promise.resolve({ remove: vi.fn() });
      });

      setupCapacitorMode();
      await new Promise(resolve => setTimeout(resolve, 50));

      // ACT: Simular tap sin appointmentId
      const action: ActionPerformed = {
        actionId: 'tap',
        notification: {
          id: 2002,
          title: 'Appointment',
          body: 'Upcoming appointment',
          extra: {
            type: 'appointment_reminder',
            // appointmentId falta
          },
        },
      };

      if (actionCallback) {
        actionCallback(action);
      }

      // ASSERT
      expect(router.navigate).toHaveBeenCalledWith([ROUTES.TABS_APPOINTMENTS]);
    });
  });
});
