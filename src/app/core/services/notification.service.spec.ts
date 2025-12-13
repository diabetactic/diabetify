import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';
import { Platform } from '@ionic/angular';
import { NotificationService, ReadingReminder, AppointmentReminder } from '@services/notification.service';
import { LoggerService } from '@services/logger.service';
import {
  LocalNotifications,
  PendingLocalNotificationSchema,
  ActionPerformed,
  LocalNotificationSchema,
  PermissionStatus,
} from '@capacitor/local-notifications';

/**
 * Mock classes for dependencies
 */
class MockPlatform {
  is = jest.fn().mockReturnValue(false);
}

class MockLogger {
  debug = jest.fn();
  info = jest.fn();
  error = jest.fn();
}

class MockRouter {
  navigate = jest.fn().mockResolvedValue(true);
}

class MockNgZone extends NgZone {
  override run = jest.fn((fn: any) => fn());
  override runOutsideAngular = jest.fn((fn: any) => fn());

  constructor() {
    super({ enableLongStackTrace: false });
  }
}

/**
 * Comprehensive test suite for NotificationService
 * Tests Capacitor LocalNotifications integration, permission handling,
 * scheduling, cancellation, and notification action handling
 */
describe('NotificationService', () => {
  let service: NotificationService;
  let mockPlatform: MockPlatform;
  let mockLogger: MockLogger;
  let mockRouter: MockRouter;
  let mockNgZone: MockNgZone;

  beforeEach(() => {
    // Create fresh mock instances
    mockPlatform = new MockPlatform();
    mockLogger = new MockLogger();
    mockRouter = new MockRouter();
    mockNgZone = new MockNgZone();

    // Reset all LocalNotifications mocks
    jest.clearAllMocks();

    // LocalNotifications is already mocked in setup-jest.ts
    // We just need to ensure default mock implementations
    (LocalNotifications.requestPermissions as jest.Mock).mockResolvedValue({
      display: 'granted',
    } as PermissionStatus);
    (LocalNotifications.checkPermissions as jest.Mock).mockResolvedValue({
      display: 'granted',
    } as PermissionStatus);
    (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });
    (LocalNotifications.cancel as jest.Mock).mockResolvedValue(undefined);
    (LocalNotifications.getPending as jest.Mock).mockResolvedValue({ notifications: [] });
    (LocalNotifications.addListener as jest.Mock).mockResolvedValue({ remove: jest.fn() });

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

  describe('Service Initialization', () => {
    it('should be created', () => {
      mockPlatform.is.mockReturnValue(false); // Web mode
      service = TestBed.inject(NotificationService);
      expect(service).toBeTruthy();
    });

    it('should initialize in web mode and skip Capacitor setup', async () => {
      mockPlatform.is.mockReturnValue(false);
      service = TestBed.inject(NotificationService);

      // Wait for async init
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Notifications',
        'Running in web mode, notifications limited'
      );
      expect(LocalNotifications.addListener).not.toHaveBeenCalled();
    });

    it('should register notification listeners in Capacitor mode', async () => {
      mockPlatform.is.mockReturnValue(true); // Capacitor mode
      service = TestBed.inject(NotificationService);

      // Wait for async init
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

  describe('requestPermissions()', () => {
    describe('Web mode', () => {
      beforeEach(() => {
        mockPlatform.is.mockReturnValue(false);
        service = TestBed.inject(NotificationService);
      });

      it('should request permissions via Web Notification API when available', async () => {
        // Mock Web Notification API
        const mockNotification = {
          requestPermission: jest.fn().mockResolvedValue('granted'),
          permission: 'default',
        };
        (window as any).Notification = mockNotification;

        const result = await service.requestPermissions();

        expect(result).toBe(true);
        expect(mockNotification.requestPermission).toHaveBeenCalled();
      });

      it('should return true when Web Notification API grants permission', async () => {
        const mockNotification = {
          requestPermission: jest.fn().mockResolvedValue('granted'),
        };
        (window as any).Notification = mockNotification;

        const result = await service.requestPermissions();

        expect(result).toBe(true);
      });

      it('should return false when Web Notification API denies permission', async () => {
        const mockNotification = {
          requestPermission: jest.fn().mockResolvedValue('denied'),
        };
        (window as any).Notification = mockNotification;

        const result = await service.requestPermissions();

        expect(result).toBe(false);
      });

      it('should return false when Web Notification API is not available', async () => {
        delete (window as any).Notification;

        const result = await service.requestPermissions();

        expect(result).toBe(false);
      });
    });

    describe('Capacitor mode', () => {
      beforeEach(() => {
        mockPlatform.is.mockReturnValue(true);
        service = TestBed.inject(NotificationService);
      });

      it('should request permissions via LocalNotifications plugin', async () => {
        (LocalNotifications.requestPermissions as jest.Mock).mockResolvedValue({
          display: 'granted',
        } as PermissionStatus);

        const result = await service.requestPermissions();

        expect(LocalNotifications.requestPermissions).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should return true when permission is granted', async () => {
        (LocalNotifications.requestPermissions as jest.Mock).mockResolvedValue({
          display: 'granted',
        } as PermissionStatus);

        const result = await service.requestPermissions();

        expect(result).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith('Notifications', 'Permission result', {
          granted: true,
        });
      });

      it('should return false when permission is denied', async () => {
        (LocalNotifications.requestPermissions as jest.Mock).mockResolvedValue({
          display: 'denied',
        } as PermissionStatus);

        const result = await service.requestPermissions();

        expect(result).toBe(false);
        expect(mockLogger.info).toHaveBeenCalledWith('Notifications', 'Permission result', {
          granted: false,
        });
      });

      it('should handle permission request errors gracefully', async () => {
        const error = new Error('Permission request failed');
        (LocalNotifications.requestPermissions as jest.Mock).mockRejectedValue(error);

        const result = await service.requestPermissions();

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Notifications',
          'Failed to request permissions',
          error
        );
      });
    });
  });

  describe('checkPermissions()', () => {
    describe('Web mode', () => {
      beforeEach(() => {
        mockPlatform.is.mockReturnValue(false);
        service = TestBed.inject(NotificationService);
      });

      it('should check permissions via Web Notification API when available', async () => {
        (window as any).Notification = { permission: 'granted' };

        const result = await service.checkPermissions();

        expect(result).toBe(true);
      });

      it('should return false when Web Notification permission is denied', async () => {
        (window as any).Notification = { permission: 'denied' };

        const result = await service.checkPermissions();

        expect(result).toBe(false);
      });

      it('should return false when Web Notification API is not available', async () => {
        delete (window as any).Notification;

        const result = await service.checkPermissions();

        expect(result).toBe(false);
      });
    });

    describe('Capacitor mode', () => {
      beforeEach(() => {
        mockPlatform.is.mockReturnValue(true);
        service = TestBed.inject(NotificationService);
      });

      it('should check permissions via LocalNotifications plugin', async () => {
        (LocalNotifications.checkPermissions as jest.Mock).mockResolvedValue({
          display: 'granted',
        } as PermissionStatus);

        const result = await service.checkPermissions();

        expect(LocalNotifications.checkPermissions).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should return false when permission is denied', async () => {
        (LocalNotifications.checkPermissions as jest.Mock).mockResolvedValue({
          display: 'denied',
        } as PermissionStatus);

        const result = await service.checkPermissions();

        expect(result).toBe(false);
      });

      it('should handle check permission errors gracefully', async () => {
        const error = new Error('Check permissions failed');
        (LocalNotifications.checkPermissions as jest.Mock).mockRejectedValue(error);

        const result = await service.checkPermissions();

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Notifications',
          'Failed to check permissions',
          error
        );
      });
    });
  });

  describe('scheduleNotification()', () => {
    beforeEach(() => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);
    });

    it('should skip scheduling in web mode', async () => {
      mockPlatform.is.mockReturnValue(false);
      service = TestBed.inject(NotificationService);

      const scheduleAt = new Date(Date.now() + 3600000); // 1 hour from now

      await service.scheduleNotification(1, 'Test Title', 'Test Body', scheduleAt);

      expect(LocalNotifications.schedule).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Notifications',
        'Skipping notification in web mode'
      );
    });

    it('should schedule a one-time notification with all parameters', async () => {
      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

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
    });

    it('should schedule notification without extra data', async () => {
      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

      const scheduleAt = new Date('2024-12-01T10:00:00Z');

      await service.scheduleNotification(99, 'Simple Notification', 'Simple Body', scheduleAt);

      expect(LocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [
          {
            id: 99,
            title: 'Simple Notification',
            body: 'Simple Body',
            schedule: { at: scheduleAt },
            sound: 'default',
            extra: undefined,
          },
        ],
      });
    });

    it('should log successful notification scheduling', async () => {
      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

      const scheduleAt = new Date('2024-12-01T10:00:00Z');

      await service.scheduleNotification(1, 'Test', 'Body', scheduleAt);

      expect(mockLogger.info).toHaveBeenCalledWith('Notifications', 'Notification scheduled', {
        id: 1,
        scheduleAt,
      });
    });

    it('should throw error when scheduling fails', async () => {
      const error = new Error('Scheduling failed');
      (LocalNotifications.schedule as jest.Mock).mockRejectedValue(error);

      const scheduleAt = new Date();

      await expect(service.scheduleNotification(1, 'Test', 'Body', scheduleAt)).rejects.toThrow(
        error
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Notifications',
        'Failed to schedule notification',
        error
      );
    });
  });

  describe('scheduleReadingReminder()', () => {
    let mockDate: Date;

    beforeEach(() => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);

      // Mock current time: 2024-12-01 08:00:00
      mockDate = new Date('2024-12-01T08:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should cancel reminder when reminder is disabled', async () => {
      const reminder: ReadingReminder = {
        id: 5,
        time: '14:00',
        enabled: false,
      };

      (LocalNotifications.cancel as jest.Mock).mockResolvedValue(undefined);

      await service.scheduleReadingReminder(reminder);

      expect(LocalNotifications.cancel).toHaveBeenCalledWith({
        notifications: [{ id: 1005 }], // READING_REMINDER_BASE_ID (1000) + 5
      });
      expect(LocalNotifications.schedule).not.toHaveBeenCalled();
    });

    it('should schedule reminder for same day if time has not passed', async () => {
      const reminder: ReadingReminder = {
        id: 3,
        time: '14:00', // 2:00 PM - later than current 8:00 AM
        enabled: true,
        label: 'Afternoon Check',
      };

      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

      await service.scheduleReadingReminder(reminder);

      // The service creates dates in local time, so we need to construct the expected date the same way
      const now = new Date();
      const expectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0);

      expect(LocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [
          {
            id: 1003,
            title: 'Afternoon Check',
            body: "It's time to check your glucose level!",
            schedule: {
              at: expectedDate,
              repeats: true,
              every: 'day',
            },
            sound: 'default',
            extra: { type: 'reading_reminder', reminderId: 3 },
          },
        ],
      });
    });

    it('should schedule reminder for next day if time has already passed', async () => {
      const reminder: ReadingReminder = {
        id: 1,
        time: '05:00', // 5:00 AM - earlier than current 8:00 AM in any timezone
        enabled: true,
        label: 'Morning Check',
      };

      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

      await service.scheduleReadingReminder(reminder);

      // The service creates dates in local time, so we need to construct the expected date the same way
      const now = new Date();
      const expectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 5, 0);

      expect(LocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [
          expect.objectContaining({
            id: 1001,
            schedule: expect.objectContaining({
              at: expectedDate,
              repeats: true,
              every: 'day',
            }),
          }),
        ],
      });
    });

    it('should use default label when not provided', async () => {
      const reminder: ReadingReminder = {
        id: 10,
        time: '12:00',
        enabled: true,
      };

      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

      await service.scheduleReadingReminder(reminder);

      expect(LocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [
          expect.objectContaining({
            title: 'Glucose Reading Reminder',
          }),
        ],
      });
    });

    it('should skip scheduling in web mode and only log', async () => {
      mockPlatform.is.mockReturnValue(false);
      service = TestBed.inject(NotificationService);

      const reminder: ReadingReminder = {
        id: 2,
        time: '10:00',
        enabled: true,
      };

      await service.scheduleReadingReminder(reminder);

      expect(LocalNotifications.schedule).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Notifications',
        'Reading reminder scheduled (web mode)',
        { id: 1002 }
      );
    });

    it('should log successful reminder scheduling', async () => {
      const reminder: ReadingReminder = {
        id: 7,
        time: '18:00',
        enabled: true,
      };

      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

      await service.scheduleReadingReminder(reminder);

      expect(mockLogger.info).toHaveBeenCalledWith('Notifications', 'Reading reminder scheduled', {
        id: 1007,
        time: '18:00',
      });
    });

    it('should throw error when scheduling fails', async () => {
      const reminder: ReadingReminder = {
        id: 9,
        time: '09:00',
        enabled: true,
      };

      const error = new Error('Scheduling failed');
      (LocalNotifications.schedule as jest.Mock).mockRejectedValue(error);

      await expect(service.scheduleReadingReminder(reminder)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Notifications',
        'Failed to schedule reading reminder',
        error
      );
    });

    it('should parse time correctly for various formats', async () => {
      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

      const testCases = [
        { time: '09:30', expectedHour: 9, expectedMinute: 30 },
        { time: '00:00', expectedHour: 0, expectedMinute: 0 },
        { time: '23:59', expectedHour: 23, expectedMinute: 59 },
      ];

      for (const testCase of testCases) {
        const reminder: ReadingReminder = {
          id: 1,
          time: testCase.time,
          enabled: true,
        };

        await service.scheduleReadingReminder(reminder);

        const call = (LocalNotifications.schedule as jest.Mock).mock.calls.slice(-1)[0];
        const scheduleDate = call[0].notifications[0].schedule.at as Date;

        expect(scheduleDate.getHours()).toBe(testCase.expectedHour);
        expect(scheduleDate.getMinutes()).toBe(testCase.expectedMinute);

        (LocalNotifications.schedule as jest.Mock).mockClear();
      }
    });
  });

  describe('cancelReadingReminder()', () => {
    beforeEach(() => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);
    });

    it('should cancel reading reminder by calculated notification ID', async () => {
      (LocalNotifications.cancel as jest.Mock).mockResolvedValue(undefined);

      await service.cancelReadingReminder(5);

      expect(LocalNotifications.cancel).toHaveBeenCalledWith({
        notifications: [{ id: 1005 }], // READING_REMINDER_BASE_ID (1000) + 5
      });
    });

    it('should cancel multiple different reading reminders', async () => {
      (LocalNotifications.cancel as jest.Mock).mockResolvedValue(undefined);

      await service.cancelReadingReminder(1);
      await service.cancelReadingReminder(10);
      await service.cancelReadingReminder(99);

      expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1001 }] });
      expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1010 }] });
      expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1099 }] });
    });
  });

  describe('scheduleAppointmentReminder()', () => {
    let mockNow: Date;

    beforeEach(() => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);

      // Mock current time: 2024-12-01 10:00:00
      mockNow = new Date('2024-12-01T10:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(mockNow);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should schedule appointment reminder with correct timing', async () => {
      const appointmentDate = new Date('2024-12-01T14:00:00Z'); // 2:00 PM
      const reminder: AppointmentReminder = {
        appointmentId: 'abc123def',
        appointmentDate,
        reminderMinutesBefore: 30,
      };

      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

      await service.scheduleAppointmentReminder(reminder);

      const expectedReminderDate = new Date('2024-12-01T13:30:00Z'); // 30 mins before

      expect(LocalNotifications.schedule).toHaveBeenCalledWith({
        notifications: [
          {
            id: expect.any(Number),
            title: 'Upcoming Appointment',
            body: 'You have an appointment in 30 minutes',
            schedule: { at: expectedReminderDate },
            sound: 'default',
            extra: { type: 'appointment_reminder', appointmentId: 'abc123def' },
          },
        ],
      });
    });

    it('should skip scheduling if reminder time has already passed', async () => {
      const appointmentDate = new Date('2024-12-01T10:15:00Z'); // 15 mins from now
      const reminder: AppointmentReminder = {
        appointmentId: 'past123',
        appointmentDate,
        reminderMinutesBefore: 30, // Would be 30 mins ago
      };

      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

      await service.scheduleAppointmentReminder(reminder);

      expect(LocalNotifications.schedule).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Notifications',
        'Appointment reminder time has passed, skipping'
      );
    });

    it('should calculate notification ID from appointmentId', async () => {
      const appointmentDate = new Date('2024-12-01T15:00:00Z');
      const reminder: AppointmentReminder = {
        appointmentId: '123456789abc',
        appointmentDate,
        reminderMinutesBefore: 60,
      };

      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

      await service.scheduleAppointmentReminder(reminder);

      // ID should be APPOINTMENT_REMINDER_BASE_ID (2000) + parseInt(last 4 chars, 16)
      // Last 4 chars: '9abc' => parseInt('9abc', 16) = 39612
      const expectedId = 2000 + parseInt('9abc', 16);

      const call = (LocalNotifications.schedule as jest.Mock).mock.calls.slice(-1)[0];
      expect(call[0].notifications[0].id).toBe(expectedId);
    });

    it('should format reminder message with correct minutes', async () => {
      const testCases = [
        { minutes: 15, expectedBody: 'You have an appointment in 15 minutes' },
        { minutes: 60, expectedBody: 'You have an appointment in 60 minutes' },
        { minutes: 120, expectedBody: 'You have an appointment in 120 minutes' },
      ];

      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

      for (const testCase of testCases) {
        const appointmentDate = new Date('2024-12-01T15:00:00Z');
        const reminder: AppointmentReminder = {
          appointmentId: 'test123',
          appointmentDate,
          reminderMinutesBefore: testCase.minutes,
        };

        await service.scheduleAppointmentReminder(reminder);

        const call = (LocalNotifications.schedule as jest.Mock).mock.calls.slice(-1)[0];
        expect(call[0].notifications[0].body).toBe(testCase.expectedBody);

        (LocalNotifications.schedule as jest.Mock).mockClear();
      }
    });

    it('should include appointment metadata in notification', async () => {
      const appointmentDate = new Date('2024-12-02T09:00:00Z');
      const reminder: AppointmentReminder = {
        appointmentId: 'special-appointment-456',
        appointmentDate,
        reminderMinutesBefore: 45,
      };

      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

      await service.scheduleAppointmentReminder(reminder);

      const call = (LocalNotifications.schedule as jest.Mock).mock.calls.slice(-1)[0];
      expect(call[0].notifications[0].extra).toEqual({
        type: 'appointment_reminder',
        appointmentId: 'special-appointment-456',
      });
    });
  });

  describe('cancelNotification()', () => {
    beforeEach(() => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);
    });

    it('should skip cancellation in web mode', async () => {
      mockPlatform.is.mockReturnValue(false);
      service = TestBed.inject(NotificationService);

      await service.cancelNotification(123);

      expect(LocalNotifications.cancel).not.toHaveBeenCalled();
    });

    it('should cancel notification by ID', async () => {
      (LocalNotifications.cancel as jest.Mock).mockResolvedValue(undefined);

      await service.cancelNotification(456);

      expect(LocalNotifications.cancel).toHaveBeenCalledWith({
        notifications: [{ id: 456 }],
      });
    });

    it('should log successful cancellation', async () => {
      (LocalNotifications.cancel as jest.Mock).mockResolvedValue(undefined);

      await service.cancelNotification(789);

      expect(mockLogger.info).toHaveBeenCalledWith('Notifications', 'Notification cancelled', {
        id: 789,
      });
    });

    it('should handle cancellation errors gracefully', async () => {
      const error = new Error('Cancellation failed');
      (LocalNotifications.cancel as jest.Mock).mockRejectedValue(error);

      await service.cancelNotification(999);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Notifications',
        'Failed to cancel notification',
        error
      );
    });

    it('should cancel multiple notifications sequentially', async () => {
      (LocalNotifications.cancel as jest.Mock).mockResolvedValue(undefined);

      await service.cancelNotification(1);
      await service.cancelNotification(2);
      await service.cancelNotification(3);

      expect(LocalNotifications.cancel).toHaveBeenCalledTimes(3);
      expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }] });
      expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 2 }] });
      expect(LocalNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 3 }] });
    });
  });

  describe('cancelAllNotifications()', () => {
    beforeEach(() => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);
    });

    it('should skip cancellation in web mode', async () => {
      mockPlatform.is.mockReturnValue(false);
      service = TestBed.inject(NotificationService);

      await service.cancelAllNotifications();

      expect(LocalNotifications.getPending).not.toHaveBeenCalled();
      expect(LocalNotifications.cancel).not.toHaveBeenCalled();
    });

    it('should cancel all pending notifications', async () => {
      const pendingNotifications: PendingLocalNotificationSchema[] = [
        { id: 1, title: 'Notification 1', body: 'Body 1' },
        { id: 2, title: 'Notification 2', body: 'Body 2' },
        { id: 3, title: 'Notification 3', body: 'Body 3' },
      ];

      jest
        .spyOn(LocalNotifications, 'getPending')
        .mockResolvedValue({ notifications: pendingNotifications });
      (LocalNotifications.cancel as jest.Mock).mockResolvedValue(undefined);

      await service.cancelAllNotifications();

      expect(LocalNotifications.getPending).toHaveBeenCalled();
      expect(LocalNotifications.cancel).toHaveBeenCalledWith({
        notifications: pendingNotifications,
      });
    });

    it('should log successful cancellation with count', async () => {
      const pendingNotifications: PendingLocalNotificationSchema[] = [
        { id: 1, title: 'Notification 1', body: 'Body 1' },
        { id: 2, title: 'Notification 2', body: 'Body 2' },
      ];

      jest
        .spyOn(LocalNotifications, 'getPending')
        .mockResolvedValue({ notifications: pendingNotifications });
      (LocalNotifications.cancel as jest.Mock).mockResolvedValue(undefined);

      await service.cancelAllNotifications();

      expect(mockLogger.info).toHaveBeenCalledWith('Notifications', 'All notifications cancelled', {
        count: 2,
      });
    });

    it('should do nothing when no pending notifications exist', async () => {
      (LocalNotifications.getPending as jest.Mock).mockResolvedValue({ notifications: [] });

      await service.cancelAllNotifications();

      expect(LocalNotifications.cancel).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Failed to get pending notifications');
      (LocalNotifications.getPending as jest.Mock).mockRejectedValue(error);

      await service.cancelAllNotifications();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Notifications',
        'Failed to cancel all notifications',
        error
      );
    });
  });

  describe('getPendingNotifications()', () => {
    beforeEach(() => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);
    });

    it('should return empty array in web mode', async () => {
      mockPlatform.is.mockReturnValue(false);
      service = TestBed.inject(NotificationService);

      const result = await service.getPendingNotifications();

      expect(result).toEqual([]);
      expect(LocalNotifications.getPending).not.toHaveBeenCalled();
    });

    it('should return pending notifications', async () => {
      const pendingNotifications: PendingLocalNotificationSchema[] = [
        { id: 1001, title: 'Reading Reminder', body: 'Check glucose' },
        { id: 2005, title: 'Appointment Reminder', body: 'Appointment in 30 minutes' },
      ];

      jest
        .spyOn(LocalNotifications, 'getPending')
        .mockResolvedValue({ notifications: pendingNotifications });

      const result = await service.getPendingNotifications();

      expect(result).toEqual(pendingNotifications);
      expect(LocalNotifications.getPending).toHaveBeenCalled();
    });

    it('should return empty array when no pending notifications', async () => {
      (LocalNotifications.getPending as jest.Mock).mockResolvedValue({ notifications: [] });

      const result = await service.getPendingNotifications();

      expect(result).toEqual([]);
    });

    it('should handle errors and return empty array', async () => {
      const error = new Error('Failed to get pending');
      (LocalNotifications.getPending as jest.Mock).mockRejectedValue(error);

      const result = await service.getPendingNotifications();

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Notifications',
        'Failed to get pending notifications',
        error
      );
    });
  });

  describe('showImmediateNotification()', () => {
    beforeEach(() => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);
    });

    describe('Web mode', () => {
      beforeEach(() => {
        mockPlatform.is.mockReturnValue(false);
        service = TestBed.inject(NotificationService);
      });

      it('should show Web Notification when permission is granted', async () => {
        const mockNotificationConstructor = jest.fn();
        (window as any).Notification = mockNotificationConstructor;
        (window as any).Notification.permission = 'granted';

        await service.showImmediateNotification('Test Title', 'Test Body');

        expect(mockNotificationConstructor).toHaveBeenCalledWith('Test Title', {
          body: 'Test Body',
        });
      });

      it('should not show Web Notification when permission is denied', async () => {
        const mockNotificationConstructor = jest.fn();
        (window as any).Notification = mockNotificationConstructor;
        (window as any).Notification.permission = 'denied';

        await service.showImmediateNotification('Test Title', 'Test Body');

        expect(mockNotificationConstructor).not.toHaveBeenCalled();
      });

      it('should not show Web Notification when API is unavailable', async () => {
        delete (window as any).Notification;

        await service.showImmediateNotification('Test Title', 'Test Body');

        // Should not throw error
      });
    });

    describe('Capacitor mode', () => {
      it('should schedule immediate notification with 1 second delay', async () => {
        const mockNow = Date.now();
        jest.spyOn(Date, 'now').mockReturnValue(mockNow);
        (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

        await service.showImmediateNotification('Immediate Test', 'Immediate Body');

        const call = (LocalNotifications.schedule as jest.Mock).mock.calls.slice(-1)[0];
        const notification = call[0].notifications[0];

        expect(notification.title).toBe('Immediate Test');
        expect(notification.body).toBe('Immediate Body');
        expect(notification.schedule.at).toEqual(new Date(mockNow + 1000));
      });

      it('should use timestamp-based ID for uniqueness', async () => {
        const mockNow = 1701432000000; // Arbitrary timestamp
        jest.spyOn(Date, 'now').mockReturnValue(mockNow);
        (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });

        await service.showImmediateNotification('Test', 'Body');

        const call = (LocalNotifications.schedule as jest.Mock).mock.calls.slice(-1)[0];
        const expectedId = mockNow % 100000;

        expect(call[0].notifications[0].id).toBe(expectedId);
      });

      it('should handle scheduling errors gracefully', async () => {
        const error = new Error('Immediate scheduling failed');
        (LocalNotifications.schedule as jest.Mock).mockRejectedValue(error);

        await service.showImmediateNotification('Test', 'Body');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Notifications',
          'Failed to show notification',
          error
        );
      });
    });
  });

  describe('handleNotificationAction()', () => {
    beforeEach(() => {
      mockPlatform.is.mockReturnValue(true);
      service = TestBed.inject(NotificationService);
    });

    it('should handle reading reminder action', async () => {
      const action: ActionPerformed = {
        actionId: 'tap',
        notification: {
          id: 1001,
          title: 'Glucose Reminder',
          body: 'Check your glucose',
          extra: { type: 'reading_reminder', reminderId: 1 },
        } as any,
      };

      // Trigger the action handler
      const actionHandler = (LocalNotifications.addListener as jest.Mock).mock.calls.find(
        call => call[0] === 'localNotificationActionPerformed'
      )?.[1];

      expect(actionHandler).toBeDefined();
      actionHandler(action);

      expect(mockLogger.info).toHaveBeenCalledWith('Notifications', 'User tapped reading reminder');
      expect(mockNgZone.run).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/add-reading']);
    });

    it('should handle appointment reminder action', async () => {
      const action: ActionPerformed = {
        actionId: 'tap',
        notification: {
          id: 2005,
          title: 'Appointment Reminder',
          body: 'Appointment in 30 minutes',
          extra: { type: 'appointment_reminder', appointmentId: 'appt-123' },
        } as any,
      };

      const actionHandler = (LocalNotifications.addListener as jest.Mock).mock.calls.find(
        call => call[0] === 'localNotificationActionPerformed'
      )?.[1];

      actionHandler(action);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notifications',
        'User tapped appointment reminder',
        { appointmentId: 'appt-123' }
      );
      expect(mockNgZone.run).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/tabs/appointments/appointment-detail/appt-123',
      ]);
    });

    it('should handle unknown notification type', async () => {
      const action: ActionPerformed = {
        actionId: 'tap',
        notification: {
          id: 9999,
          title: 'Unknown',
          body: 'Unknown notification',
          extra: { type: 'unknown_type' },
        } as any,
      };

      const actionHandler = (LocalNotifications.addListener as jest.Mock).mock.calls.find(
        call => call[0] === 'localNotificationActionPerformed'
      )?.[1];

      actionHandler(action);

      expect(mockLogger.debug).toHaveBeenCalledWith('Notifications', 'Unknown notification type', {
        type: 'unknown_type',
      });
    });

    it('should handle action without extra data', async () => {
      const action: ActionPerformed = {
        actionId: 'tap',
        notification: {
          id: 5555,
          title: 'No Extra',
          body: 'Notification without extra',
        } as any,
      };

      const actionHandler = (LocalNotifications.addListener as jest.Mock).mock.calls.find(
        call => call[0] === 'localNotificationActionPerformed'
      )?.[1];

      actionHandler(action);

      // Should log the action performed, but not handle specific notification types
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notifications',
        'Notification action performed',
        {
          actionId: 'tap',
          notificationId: 5555,
        }
      );
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should log when notification is received', async () => {
      const notification: LocalNotificationSchema = {
        id: 1234,
        title: 'Test',
        body: 'Test notification',
      };

      const receivedHandler = (LocalNotifications.addListener as jest.Mock).mock.calls.find(
        call => call[0] === 'localNotificationReceived'
      )?.[1];

      expect(receivedHandler).toBeDefined();
      receivedHandler(notification);

      expect(mockLogger.info).toHaveBeenCalledWith('Notifications', 'Notification received', {
        id: 1234,
      });
    });
  });

  describe('Notification ID Collision Prevention', () => {
    beforeEach(() => {
      mockPlatform.is.mockReturnValue(true);
      (LocalNotifications.schedule as jest.Mock).mockResolvedValue({ notifications: [] });
      service = TestBed.inject(NotificationService);
    });

    it('should use distinct ID ranges for different notification types', async () => {
      const readingReminder: ReadingReminder = {
        id: 50,
        time: '10:00',
        enabled: true,
      };

      const appointmentDate = new Date('2024-12-01T15:00:00Z');
      const appointmentReminder: AppointmentReminder = {
        appointmentId: '0050', // Last 4 chars: '0050' => 80 in decimal
        appointmentDate,
        reminderMinutesBefore: 30,
      };

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-12-01T10:00:00Z'));

      await service.scheduleReadingReminder(readingReminder);
      await service.scheduleAppointmentReminder(appointmentReminder);

      const calls = (LocalNotifications.schedule as jest.Mock).mock.calls;

      const readingId = calls[0][0].notifications[0].id;
      const appointmentId = calls[1][0].notifications[0].id;

      // Reading reminder: 1000 + 50 = 1050
      expect(readingId).toBe(1050);

      // Appointment reminder: 2000 + parseInt('0050', 16) = 2000 + 80 = 2080
      expect(appointmentId).toBe(2080);

      // Ensure no collision
      expect(readingId).not.toBe(appointmentId);

      jest.useRealTimers();
    });
  });
});
