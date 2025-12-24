import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import {
  LocalNotifications,
  ScheduleOptions,
  PendingLocalNotificationSchema,
  LocalNotificationSchema,
  ActionPerformed,
} from '@capacitor/local-notifications';
import { PluginListenerHandle } from '@capacitor/core';
import { LoggerService } from '@services/logger.service';
import { ROUTES, appointmentDetailRoute } from '@core/constants';

export interface ReadingReminder {
  id: number;
  time: string; // HH:mm format
  enabled: boolean;
  label?: string;
}

export interface AppointmentReminder {
  appointmentId: string;
  appointmentDate: Date;
  reminderMinutesBefore: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService implements OnDestroy {
  private readonly READING_REMINDER_BASE_ID = 1000;
  private readonly APPOINTMENT_REMINDER_BASE_ID = 2000;
  private hasPermission = false;
  private listenerHandles: PluginListenerHandle[] = [];

  constructor(
    private platform: Platform,
    private logger: LoggerService,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.init();
  }

  private async init() {
    if (!this.platform.is('capacitor')) {
      this.logger.debug('Notifications', 'Running in web mode, notifications limited');
      return;
    }

    // Listen for notification actions - store handles for cleanup
    const receivedHandle = await LocalNotifications.addListener(
      'localNotificationReceived',
      notification => {
        this.logger.info('Notifications', 'Notification received', { id: notification.id });
      }
    );
    this.listenerHandles.push(receivedHandle);

    const actionHandle = await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (action: ActionPerformed) => {
        this.logger.info('Notifications', 'Notification action performed', {
          actionId: action.actionId,
          notificationId: action.notification.id,
        });
        this.handleNotificationAction(action);
      }
    );
    this.listenerHandles.push(actionHandle);
  }

  /**
   * Clean up notification listeners when service is destroyed
   * Prevents memory leaks from Capacitor plugin listeners
   */
  ngOnDestroy(): void {
    for (const handle of this.listenerHandles) {
      handle.remove();
    }
    this.listenerHandles = [];
    this.logger.debug('Notifications', 'Notification listeners removed');
  }

  /**
   * Request notification permissions from the user
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.platform.is('capacitor')) {
      // Use Web Notification API for web
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        this.hasPermission = result === 'granted';
        return this.hasPermission;
      }
      return false;
    }

    try {
      const result = await LocalNotifications.requestPermissions();
      this.hasPermission = result.display === 'granted';
      this.logger.info('Notifications', 'Permission result', { granted: this.hasPermission });
      return this.hasPermission;
    } catch (error) {
      this.logger.error('Notifications', 'Failed to request permissions', error);
      return false;
    }
  }

  /**
   * Check current notification permission status
   */
  async checkPermissions(): Promise<boolean> {
    if (!this.platform.is('capacitor')) {
      if ('Notification' in window) {
        return Notification.permission === 'granted';
      }
      return false;
    }

    try {
      const result = await LocalNotifications.checkPermissions();
      this.hasPermission = result.display === 'granted';
      return this.hasPermission;
    } catch (error) {
      this.logger.error('Notifications', 'Failed to check permissions', error);
      return false;
    }
  }

  /**
   * Schedule a one-time notification
   */
  async scheduleNotification(
    id: number,
    title: string,
    body: string,
    scheduleAt: Date,
    data?: Record<string, unknown>
  ): Promise<void> {
    if (!this.platform.is('capacitor')) {
      this.logger.debug('Notifications', 'Skipping notification in web mode');
      return;
    }

    const notification: LocalNotificationSchema = {
      id,
      title,
      body,
      schedule: { at: scheduleAt },
      sound: 'default',
      extra: data,
    };

    const options: ScheduleOptions = {
      notifications: [notification],
    };

    try {
      await LocalNotifications.schedule(options);
      this.logger.info('Notifications', 'Notification scheduled', { id, scheduleAt });
    } catch (error) {
      this.logger.error('Notifications', 'Failed to schedule notification', error);
      throw error;
    }
  }

  /**
   * Schedule a daily reading reminder
   */
  async scheduleReadingReminder(reminder: ReadingReminder): Promise<void> {
    if (!reminder.enabled) {
      await this.cancelReadingReminder(reminder.id);
      return;
    }

    const [hours, minutes] = reminder.time.split(':').map(Number);
    const now = new Date();
    const scheduleDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    // If time has passed today, schedule for tomorrow
    if (scheduleDate <= now) {
      scheduleDate.setDate(scheduleDate.getDate() + 1);
    }

    const notificationId = this.READING_REMINDER_BASE_ID + reminder.id;

    if (!this.platform.is('capacitor')) {
      this.logger.debug('Notifications', 'Reading reminder scheduled (web mode)', {
        id: notificationId,
      });
      return;
    }

    const notification: LocalNotificationSchema = {
      id: notificationId,
      title: reminder.label || 'Glucose Reading Reminder',
      body: "It's time to check your glucose level!",
      schedule: {
        at: scheduleDate,
        repeats: true,
        every: 'day',
      },
      sound: 'default',
      extra: { type: 'reading_reminder', reminderId: reminder.id },
    };

    try {
      await LocalNotifications.schedule({ notifications: [notification] });
      this.logger.info('Notifications', 'Reading reminder scheduled', {
        id: notificationId,
        time: reminder.time,
      });
    } catch (error) {
      this.logger.error('Notifications', 'Failed to schedule reading reminder', error);
      throw error;
    }
  }

  /**
   * Cancel a reading reminder
   */
  async cancelReadingReminder(reminderId: number): Promise<void> {
    const notificationId = this.READING_REMINDER_BASE_ID + reminderId;
    await this.cancelNotification(notificationId);
  }

  /**
   * Schedule an appointment reminder
   */
  async scheduleAppointmentReminder(reminder: AppointmentReminder): Promise<void> {
    const reminderDate = new Date(reminder.appointmentDate);
    reminderDate.setMinutes(reminderDate.getMinutes() - reminder.reminderMinutesBefore);

    // Don't schedule if reminder time has passed
    if (reminderDate <= new Date()) {
      this.logger.debug('Notifications', 'Appointment reminder time has passed, skipping');
      return;
    }

    const notificationId =
      this.APPOINTMENT_REMINDER_BASE_ID + parseInt(reminder.appointmentId.slice(-4), 16);

    await this.scheduleNotification(
      notificationId,
      'Upcoming Appointment',
      `You have an appointment in ${reminder.reminderMinutesBefore} minutes`,
      reminderDate,
      { type: 'appointment_reminder', appointmentId: reminder.appointmentId }
    );
  }

  /**
   * Cancel a specific notification
   */
  async cancelNotification(id: number): Promise<void> {
    if (!this.platform.is('capacitor')) {
      return;
    }

    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
      this.logger.info('Notifications', 'Notification cancelled', { id });
    } catch (error) {
      this.logger.error('Notifications', 'Failed to cancel notification', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    if (!this.platform.is('capacitor')) {
      return;
    }

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
        this.logger.info('Notifications', 'All notifications cancelled', {
          count: pending.notifications.length,
        });
      }
    } catch (error) {
      this.logger.error('Notifications', 'Failed to cancel all notifications', error);
    }
  }

  /**
   * Get all pending notifications
   */
  async getPendingNotifications(): Promise<PendingLocalNotificationSchema[]> {
    if (!this.platform.is('capacitor')) {
      return [];
    }

    try {
      const result = await LocalNotifications.getPending();
      return result.notifications;
    } catch (error) {
      this.logger.error('Notifications', 'Failed to get pending notifications', error);
      return [];
    }
  }

  /**
   * Show an immediate notification (for testing)
   */
  private showWebNotification(title: string, body: string): void {
    new Notification(title, { body });
  }

  async showImmediateNotification(title: string, body: string): Promise<void> {
    const id = Date.now() % 100000; // Use timestamp as unique ID

    if (!this.platform.is('capacitor')) {
      // Use Web Notification API
      if ('Notification' in window && Notification.permission === 'granted') {
        this.showWebNotification(title, body);
      }
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second delay
          },
        ],
      });
    } catch (error) {
      this.logger.error('Notifications', 'Failed to show notification', error);
    }
  }

  /**
   * Handle notification action (when user taps notification)
   */
  private handleNotificationAction(action: ActionPerformed): void {
    const extra = action.notification.extra as Record<string, unknown> | undefined;

    if (!extra?.['type']) {
      return;
    }

    // Capacitor callbacks run outside Angular zone, so we need to run navigation inside the zone
    this.ngZone.run(() => {
      const type = extra['type'] as string;
      switch (type) {
        case 'reading_reminder':
          this.logger.info('Notifications', 'User tapped reading reminder');
          this.router.navigate([ROUTES.ADD_READING]);
          break;

        case 'appointment_reminder':
          this.logger.info('Notifications', 'User tapped appointment reminder', {
            appointmentId: extra['appointmentId'],
          });
          if (extra['appointmentId']) {
            this.router.navigate([appointmentDetailRoute(extra['appointmentId'] as string)]);
          } else {
            this.router.navigate([ROUTES.TABS_APPOINTMENTS]);
          }
          break;

        default:
          this.logger.debug('Notifications', 'Unknown notification type', { type });
      }
    });
  }
}
