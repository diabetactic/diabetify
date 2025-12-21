// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';
import { Platform } from '@ionic/angular';
import {
  NotificationService,
  ReadingReminder,
  AppointmentReminder,
} from '@services/notification.service';
import { LoggerService } from '@services/logger.service';
import {
  LocalNotifications,
  ActionPerformed,
  LocalNotificationSchema,
  PermissionStatus,
} from '@capacitor/local-notifications';

class MockPlatform {
  is = vi.fn().mockReturnValue(false);
}

class MockLogger {
  debug = vi.fn();
  info = vi.fn();
  error = vi.fn();
}

class MockRouter {
  navigate = vi.fn().mockResolvedValue(true);
}

class MockNgZone extends NgZone {
  override run = vi.fn((fn: any) => fn());
  override runOutsideAngular = vi.fn((fn: any) => fn());

  constructor() {
    super({ enableLongStackTrace: false });
  }
}

describe('NotificationService', () => {
  let service: NotificationService;
  let mockPlatform: MockPlatform;
  let mockLogger: MockLogger;
  let mockRouter: MockRouter;
  let mockNgZone: MockNgZone;

  beforeEach(() => {
    mockPlatform = new MockPlatform();
    mockLogger = new MockLogger();
    mockRouter = new MockRouter();
    mockNgZone = new MockNgZone();

    vi.clearAllMocks();

    (LocalNotifications.requestPermissions as Mock).mockResolvedValue({
      display: 'granted',
    } as PermissionStatus);
    (LocalNotifications.checkPermissions as Mock).mockResolvedValue({
      display: 'granted',
    } as PermissionStatus);
    (LocalNotifications.schedule as Mock).mockResolvedValue({ notifications: [] });
    (LocalNotifications.cancel as Mock).mockResolvedValue(undefined);
    (LocalNotifications.getPending as Mock).mockResolvedValue({ notifications: [] });
    (LocalNotifications.addListener as Mock).mockResolvedValue({ remove: vi.fn() });

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: Platform, useValue: mockPlatform },
        { provide: LoggerService, useValue: mockLogger },
        { provide: Router, useValue: mockRouter },
        { provide: NgZone, useValue: mockNgZone },
      ],
    });
  });

  // ============================================================================
  // SERVICE INITIALIZATION
  // ============================================================================

  describe('Service Initialization', () => {
    it('should initialize in web mode and skip Capacitor setup', async () => {
      mockPlatform.is.mockReturnValue(false);
      service = TestBed.inject(NotificationService);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Notifications',
        'Running in web mode, notifications limited'
      );
      expect(LocalNotifications.addListener).not.toHaveBeenCalled();
    });

    it('should register notification listeners in Capacitor mode', async () => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(LocalNotifications.addListener).toHaveBeenCalledWith(
        'localNotificationReceived',
        expect.any(Function)
      );
      expect(LocalNotifications.addListener).toHaveBeenCalledWith(
        'localNotificationActionPerformed',
        expect.any(Function)
      );
    });
  });

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  describe('requestPermissions()', () => {
    it.each([
      {
        mode: 'web',
        isCapacitor: false,
        mockNotification: { requestPermission: vi.fn().mockResolvedValue('granted') },
        expected: true,
      },
      {
        mode: 'web',
        isCapacitor: false,
        mockNotification: { requestPermission: vi.fn().mockResolvedValue('denied') },
        expected: false,
      },
      { mode: 'web', isCapacitor: false, mockNotification: undefined, expected: false },
      {
        mode: 'capacitor',
        isCapacitor: true,
        mockResolvedValue: { display: 'granted' },
        expected: true,
      },
      {
        mode: 'capacitor',
        isCapacitor: true,
        mockResolvedValue: { display: 'denied' },
        expected: false,
      },
      {
        mode: 'capacitor',
        isCapacitor: true,
        mockRejectedValue: new Error('Failed'),
        expected: false,
      },
    ])(
      'should handle permission request in $mode mode with result $expected',
      async ({ isCapacitor, mockNotification, mockResolvedValue, mockRejectedValue, expected }) => {
        mockPlatform.is.mockReturnValue(isCapacitor);
        service = TestBed.inject(NotificationService);

        if (!isCapacitor && mockNotification) {
          (window as any).Notification = mockNotification;
        } else if (!isCapacitor && !mockNotification) {
          delete (window as any).Notification;
        } else if (mockResolvedValue) {
          (LocalNotifications.requestPermissions as Mock).mockResolvedValue(mockResolvedValue);
        } else if (mockRejectedValue) {
          (LocalNotifications.requestPermissions as Mock).mockRejectedValue(mockRejectedValue);
        }

        const result = await service.requestPermissions();

        expect(result).toBe(expected);
        if (isCapacitor && expected) {
          expect(LocalNotifications.requestPermissions).toHaveBeenCalled();
        } else if (!isCapacitor && mockNotification) {
          expect(mockNotification.requestPermission).toHaveBeenCalled();
        }

        if (!isCapacitor && mockNotification) {
          delete (window as any).Notification;
        }
      }
    );
  });

  describe('checkPermissions()', () => {
    it.each([
      { mode: 'web', isCapacitor: false, permission: 'granted', expected: true },
      { mode: 'web', isCapacitor: false, permission: 'denied', expected: false },
      { mode: 'web', isCapacitor: false, permission: undefined, expected: false },
      {
        mode: 'capacitor',
        isCapacitor: true,
        mockResolvedValue: { display: 'granted' },
        expected: true,
      },
      {
        mode: 'capacitor',
        isCapacitor: true,
        mockResolvedValue: { display: 'denied' },
        expected: false,
      },
      {
        mode: 'capacitor',
        isCapacitor: true,
        mockRejectedValue: new Error('Failed'),
        expected: false,
      },
    ])(
      'should check permissions in $mode mode with result $expected',
      async ({ isCapacitor, permission, mockResolvedValue, mockRejectedValue, expected }) => {
        mockPlatform.is.mockReturnValue(isCapacitor);
        service = TestBed.inject(NotificationService);

        if (!isCapacitor && permission) {
          (window as any).Notification = { permission };
        } else if (!isCapacitor && !permission) {
          delete (window as any).Notification;
        } else if (mockResolvedValue) {
          (LocalNotifications.checkPermissions as Mock).mockResolvedValue(mockResolvedValue);
        } else if (mockRejectedValue) {
          (LocalNotifications.checkPermissions as Mock).mockRejectedValue(mockRejectedValue);
        }

        expect(await service.checkPermissions()).toBe(expected);

        if (!isCapacitor && permission) {
          delete (window as any).Notification;
        }
      }
    );
  });

  // ============================================================================
  // SCHEDULE NOTIFICATION
  // ============================================================================

  describe('scheduleNotification()', () => {
    it('should skip scheduling in web mode', async () => {
      mockPlatform.is.mockReturnValue(false);
      service = TestBed.inject(NotificationService);

      await service.scheduleNotification(1, 'Test', 'Body', new Date(Date.now() + 3600000));

      expect(LocalNotifications.schedule).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Notifications',
        'Skipping notification in web mode'
      );
    });

    it('should schedule notification with all parameters in Capacitor mode', async () => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);

      const scheduleAt = new Date('2024-12-01T10:00:00Z');
      const data = { type: 'custom', customId: '123' };

      await service.scheduleNotification(42, 'Test Title', 'Test Body', scheduleAt, data);

      expect(LocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [
          {
            id: 42,
            title: 'Test Title',
            body: 'Test Body',
            schedule: { at: scheduleAt },
            sound: 'default',
            extra: data,
          },
        ],
      });

      (LocalNotifications.schedule as Mock).mockRejectedValue(new Error('Failed'));
      await expect(service.scheduleNotification(1, 'Test', 'Body', new Date())).rejects.toThrow();
    });
  });

  // ============================================================================
  // READING REMINDERS
  // ============================================================================

  describe('scheduleReadingReminder()', () => {
    beforeEach(() => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-12-01T08:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cancel reminder when disabled', async () => {
      const reminder: ReadingReminder = { id: 5, time: '14:00', enabled: false };

      await service.scheduleReadingReminder(reminder);

      expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1005 }] });
      expect(LocalNotifications.schedule).not.toHaveBeenCalled();
    });

    it('should schedule daily repeating reminder for future time', async () => {
      const reminder: ReadingReminder = {
        id: 3,
        time: '14:00',
        enabled: true,
        label: 'Afternoon Check',
      };

      await service.scheduleReadingReminder(reminder);

      const now = new Date();
      const expectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0);

      expect(LocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [
          {
            id: 1003,
            title: 'Afternoon Check',
            body: "It's time to check your glucose level!",
            schedule: { at: expectedDate, repeats: true, every: 'day' },
            sound: 'default',
            extra: { type: 'reading_reminder', reminderId: 3 },
          },
        ],
      });
    });

    it.each([
      {
        time: '05:00',
        expectedDay: 1,
        expectedHour: 5,
        expectedMinute: 0,
        scenario: 'next day if time passed',
      },
      {
        time: '09:30',
        expectedDay: 0,
        expectedHour: 9,
        expectedMinute: 30,
        scenario: 'same day with time parsing',
      },
      {
        time: '00:00',
        expectedDay: 1,
        expectedHour: 0,
        expectedMinute: 0,
        scenario: 'midnight time',
      },
      {
        time: '23:59',
        expectedDay: 0,
        expectedHour: 23,
        expectedMinute: 59,
        scenario: 'end of day time',
      },
    ])(
      'should schedule for $scenario',
      async ({ time, expectedDay, expectedHour, expectedMinute }) => {
        const reminder: ReadingReminder = { id: 1, time, enabled: true };

        await service.scheduleReadingReminder(reminder);

        const call = (LocalNotifications.schedule as Mock).mock.calls.slice(-1)[0];
        const scheduleDate = call[0].notifications[0].schedule.at as Date;
        const now = new Date();

        expect(scheduleDate.getFullYear()).toBe(now.getFullYear());
        expect(scheduleDate.getMonth()).toBe(now.getMonth());
        expect(scheduleDate.getDate()).toBe(now.getDate() + expectedDay);
        expect(scheduleDate.getHours()).toBe(expectedHour);
        expect(scheduleDate.getMinutes()).toBe(expectedMinute);

        (LocalNotifications.schedule as Mock).mockClear();
      }
    );
  });

  describe('cancelReadingReminder()', () => {
    it('should cancel reading reminder by calculated notification ID', async () => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);

      await service.cancelReadingReminder(5);
      await service.cancelReadingReminder(10);
      await service.cancelReadingReminder(99);

      expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1005 }] });
      expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1010 }] });
      expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1099 }] });
    });
  });

  // ============================================================================
  // APPOINTMENT REMINDERS
  // ============================================================================

  describe('scheduleAppointmentReminder()', () => {
    beforeEach(() => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-12-01T10:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([
      {
        appointmentDate: new Date('2024-12-01T14:00:00Z'),
        minutesBefore: 30,
        expectedSchedule: new Date('2024-12-01T13:30:00Z'),
        expectedBody: 'You have an appointment in 30 minutes',
        shouldSchedule: true,
        scenario: 'future appointment',
      },
      {
        appointmentDate: new Date('2024-12-01T15:00:00Z'),
        minutesBefore: 60,
        expectedSchedule: new Date('2024-12-01T14:00:00Z'),
        expectedBody: 'You have an appointment in 60 minutes',
        shouldSchedule: true,
        scenario: '60 minutes before',
      },
      {
        appointmentDate: new Date('2024-12-01T15:00:00Z'),
        minutesBefore: 120,
        expectedSchedule: new Date('2024-12-01T13:00:00Z'),
        expectedBody: 'You have an appointment in 120 minutes',
        shouldSchedule: true,
        scenario: '120 minutes before',
      },
      {
        appointmentDate: new Date('2024-12-01T10:15:00Z'),
        minutesBefore: 30,
        expectedSchedule: null,
        expectedBody: null,
        shouldSchedule: false,
        scenario: 'past appointment',
      },
    ])(
      'should handle $scenario correctly',
      async ({
        appointmentDate,
        minutesBefore,
        expectedSchedule,
        expectedBody,
        shouldSchedule,
      }) => {
        const reminder: AppointmentReminder = {
          appointmentId: 'test123',
          appointmentDate,
          reminderMinutesBefore: minutesBefore,
        };

        await service.scheduleAppointmentReminder(reminder);

        if (shouldSchedule) {
          expect(LocalNotifications.schedule).toHaveBeenCalledWith({
            notifications: [
              {
                id: expect.any(Number),
                title: 'Upcoming Appointment',
                body: expectedBody,
                schedule: { at: expectedSchedule },
                sound: 'default',
                extra: { type: 'appointment_reminder', appointmentId: 'test123' },
              },
            ],
          });
        } else {
          expect(LocalNotifications.schedule).not.toHaveBeenCalled();
          expect(mockLogger.debug).toHaveBeenCalledWith(
            'Notifications',
            'Appointment reminder time has passed, skipping'
          );
        }

        (LocalNotifications.schedule as Mock).mockClear();
      }
    );
  });

  // ============================================================================
  // CANCEL NOTIFICATIONS
  // ============================================================================

  describe('cancelNotification()', () => {
    it('should skip cancellation in web mode', async () => {
      mockPlatform.is.mockReturnValue(false);
      service = TestBed.inject(NotificationService);

      await service.cancelNotification(123);

      expect(LocalNotifications.cancel).not.toHaveBeenCalled();
    });

    it('should cancel notification by ID in Capacitor mode', async () => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);

      await service.cancelNotification(456);

      expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 456 }] });
      expect(mockLogger.info).toHaveBeenCalledWith('Notifications', 'Notification cancelled', {
        id: 456,
      });

      (LocalNotifications.cancel as Mock).mockRejectedValue(new Error('Failed'));
      await service.cancelNotification(999);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Notifications',
        'Failed to cancel notification',
        expect.any(Error)
      );
    });
  });

  describe('cancelAllNotifications()', () => {
    it.each([
      {
        pending: [
          { id: 1, title: 'N1', body: 'B1' },
          { id: 2, title: 'N2', body: 'B2' },
        ],
        shouldCancel: true,
        count: 2,
        scenario: 'with pending notifications',
      },
      {
        pending: [],
        shouldCancel: false,
        count: 0,
        scenario: 'with no pending notifications',
      },
    ])('should handle $scenario', async ({ pending, shouldCancel, count }) => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);

      vi.spyOn(LocalNotifications, 'getPending').mockResolvedValue({ notifications: pending });

      await service.cancelAllNotifications();

      if (shouldCancel) {
        expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: pending });
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Notifications',
          'All notifications cancelled',
          { count }
        );
      } else {
        expect(LocalNotifications.cancel).not.toHaveBeenCalled();
      }
    });
  });

  // ============================================================================
  // GET PENDING NOTIFICATIONS
  // ============================================================================

  describe('getPendingNotifications()', () => {
    it.each([
      {
        isCapacitor: true,
        pending: [{ id: 1001, title: 'Reading', body: 'Check' }],
        shouldReject: false,
        expected: [{ id: 1001, title: 'Reading', body: 'Check' }],
        scenario: 'Capacitor mode with notifications',
      },
      {
        isCapacitor: false,
        pending: [],
        shouldReject: false,
        expected: [],
        scenario: 'web mode',
      },
      {
        isCapacitor: true,
        pending: [],
        shouldReject: true,
        expected: [],
        scenario: 'Capacitor mode with error',
      },
    ])(
      'should return correct result in $scenario',
      async ({ isCapacitor, pending, shouldReject, expected }) => {
        mockPlatform.is.mockReturnValue(isCapacitor);
        service = TestBed.inject(NotificationService);

        if (shouldReject) {
          (LocalNotifications.getPending as Mock).mockRejectedValue(new Error('Failed'));
        } else {
          vi.spyOn(LocalNotifications, 'getPending').mockResolvedValue({ notifications: pending });
        }

        expect(await service.getPendingNotifications()).toEqual(expected);
      }
    );
  });

  // ============================================================================
  // IMMEDIATE NOTIFICATIONS
  // ============================================================================

  describe('showImmediateNotification()', () => {
    it('should show Web Notification in web mode when permission granted', async () => {
      mockPlatform.is.mockReturnValue(false);
      service = TestBed.inject(NotificationService);

      const mockNotificationConstructor = vi.fn();
      (window as any).Notification = mockNotificationConstructor;
      (window as any).Notification.permission = 'granted';

      await service.showImmediateNotification('Test Title', 'Test Body');

      expect(mockNotificationConstructor).toHaveBeenCalledWith('Test Title', { body: 'Test Body' });
    });

    it('should schedule immediate notification in Capacitor mode', async () => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);

      const mockNow = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);

      await service.showImmediateNotification('Immediate Test', 'Immediate Body');

      const call = (LocalNotifications.schedule as Mock).mock.calls.slice(-1)[0];
      expect(call[0].notifications[0].title).toBe('Immediate Test');
      expect(call[0].notifications[0].schedule.at).toEqual(new Date(mockNow + 1000));
    });
  });

  // ============================================================================
  // ACTION HANDLING
  // ============================================================================

  describe('handleNotificationAction()', () => {
    beforeEach(async () => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it.each([
      {
        extra: { type: 'reading_reminder', reminderId: 1 },
        expectedRoute: ['/add-reading'],
        scenario: 'reading reminder',
      },
      {
        extra: { type: 'appointment_reminder', appointmentId: 'appt-123' },
        expectedRoute: ['/tabs/appointments/appointment-detail/appt-123'],
        scenario: 'appointment reminder',
      },
      {
        extra: { type: 'unknown_type' },
        expectedRoute: null,
        expectDebugLog: true,
        scenario: 'unknown notification type',
      },
      {
        extra: undefined,
        expectedRoute: null,
        expectInfoLog: true,
        scenario: 'missing extra data',
      },
    ])('should handle $scenario', ({ extra, expectedRoute, expectDebugLog, expectInfoLog }) => {
      const actionHandler = (LocalNotifications.addListener as Mock).mock.calls.find(
        call => call[0] === 'localNotificationActionPerformed'
      )?.[1];

      actionHandler({
        actionId: 'tap',
        notification: { id: 1001, title: 'Test', body: 'Body', extra },
      } as ActionPerformed);

      if (expectedRoute) {
        expect(mockRouter.navigate).toHaveBeenCalledWith(expectedRoute);
      } else if (expectDebugLog) {
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Notifications',
          'Unknown notification type',
          { type: 'unknown_type' }
        );
      } else if (expectInfoLog) {
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Notifications',
          'Notification action performed',
          {
            actionId: 'tap',
            notificationId: 1001,
          }
        );
      }

      vi.clearAllMocks();
    });

    it('should log when notification is received', () => {
      const receivedHandler = (LocalNotifications.addListener as Mock).mock.calls.find(
        call => call[0] === 'localNotificationReceived'
      )?.[1];

      receivedHandler({ id: 1234, title: 'Test', body: 'Body' } as LocalNotificationSchema);

      expect(mockLogger.info).toHaveBeenCalledWith('Notifications', 'Notification received', {
        id: 1234,
      });
    });
  });

  // ============================================================================
  // ID COLLISION PREVENTION
  // ============================================================================

  describe('Notification ID Collision Prevention', () => {
    it('should use distinct ID ranges for different notification types', async () => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-12-01T10:00:00Z'));

      await service.scheduleReadingReminder({ id: 50, time: '10:00', enabled: true });
      await service.scheduleAppointmentReminder({
        appointmentId: '0050',
        appointmentDate: new Date('2024-12-01T15:00:00Z'),
        reminderMinutesBefore: 30,
      });

      const calls = (LocalNotifications.schedule as Mock).mock.calls;
      const readingId = calls[0][0].notifications[0].id;
      const appointmentId = calls[1][0].notifications[0].id;

      expect(readingId).toBe(1050); // 1000 + 50
      expect(appointmentId).toBe(2080); // 2000 + parseInt('0050', 16)
      expect(readingId).not.toBe(appointmentId);

      vi.useRealTimers();
    });
  });
});
