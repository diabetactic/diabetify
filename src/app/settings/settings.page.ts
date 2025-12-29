import {
  Component,
  OnInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, Platform, ToastController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonButton,
  IonContent,
  IonListHeader,
  IonLabel,
  IonList,
  IonItem,
  IonAvatar,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonCard,
  IonCardContent,
  IonDatetime,
  IonRange,
} from '@ionic/angular/standalone';
import { Subject, Subscription } from 'rxjs';

import { ProfileService } from '@services/profile.service';
import { ReadingsService } from '@services/readings.service';
import { ThemeService } from '@services/theme.service';
import { LocalAuthService, LocalUser, UserPreferences } from '@services/local-auth.service';
import { DemoDataService } from '@services/demo-data.service';
import { NotificationService, ReadingReminder } from '@services/notification.service';
import { environment } from '@env/environment';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { LoggerService } from '@services/logger.service';
import { ROUTES, STORAGE_KEYS, TIMEOUTS } from '@core/constants';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonContent,
    IonListHeader,
    IonLabel,
    IonList,
    IonItem,
    IonAvatar,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonCard,
    IonCardContent,
    IonDatetime,
    IonRange,
    AppIconComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SettingsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // User profile data
  user: LocalUser | null = null;
  preferences: UserPreferences = {
    glucoseUnit: 'mg/dL',
    targetRange: { low: 70, high: 180 },
    language: 'es',
    notifications: {
      appointments: true,
      readings: true,
      reminders: true,
    },
    theme: 'light', // Changed from 'auto' to 'light' as default
  };

  // Settings sections
  profileSettings = {
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    diabetesType: '' as '1' | '2' | 'gestational' | 'other',
    diagnosisDate: '',
  };

  glucoseSettings = {
    unit: 'mg/dL' as 'mg/dL' | 'mmol/L',
    targetLow: 70,
    targetHigh: 180,
    hypoglycemiaThreshold: 70,
    hyperglycemiaThreshold: 180,
  };

  safetySettings = {
    maxBolus: 15,
    lowGlucoseThreshold: 70,
  };

  // UI state
  isLoading = false;
  hasChanges = false;
  isDemoMode = false;
  isDevEnvironment = !environment.production;

  // Notification settings
  notificationsEnabled = false;
  notificationPermissionGranted = false;
  readingReminders: ReadingReminder[] = [];

  // Platform detection for web notification warning
  isWebPlatform = false;

  public pendingConflicts = 0;
  private pendingConflictsSubscription: Subscription | undefined;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private platform: Platform,
    private profileService: ProfileService,
    private themeService: ThemeService,
    private authService: LocalAuthService,
    private demoDataService: DemoDataService,
    private notificationService: NotificationService,
    private translate: TranslateService,
    private logger: LoggerService,
    private readingsService: ReadingsService
  ) {
    // Detect if running on web (not native)
    this.isWebPlatform = !this.platform.is('capacitor');
  }

  ngOnInit() {
    this.initializeReadingReminders();
    this.loadUserData();
    this.isDemoMode = this.demoDataService.isDemoMode();
    this.checkNotificationPermission();
    this.loadNotificationSettings();
    this.pendingConflictsSubscription = this.readingsService.pendingConflicts$.subscribe(count => {
      this.pendingConflicts = count;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.pendingConflictsSubscription?.unsubscribe();
  }

  /**
   * Initialize reading reminders with translated labels
   */
  private initializeReadingReminders() {
    this.readingReminders = [
      {
        id: 1,
        time: '08:00',
        enabled: false,
        label: this.translate.instant('settings.notifications.morningCheck'),
      },
      {
        id: 2,
        time: '12:00',
        enabled: false,
        label: this.translate.instant('settings.notifications.lunchCheck'),
      },
      {
        id: 3,
        time: '18:00',
        enabled: false,
        label: this.translate.instant('settings.notifications.dinnerCheck'),
      },
    ];
  }

  /**
   * Load user data and preferences
   */
  private async loadUserData() {
    try {
      this.user = this.authService.getCurrentUser();

      if (this.user) {
        // Load profile data
        this.profileSettings = {
          name: `${this.user.firstName} ${this.user.lastName}`,
          email: this.user.email,
          phone: this.user.phone || '',
          dateOfBirth: this.user.dateOfBirth || '',
          diabetesType: this.user.diabetesType || '2',
          diagnosisDate: this.user.diagnosisDate || '',
        };

        // Load preferences
        if (this.user.preferences) {
          this.preferences = this.user.preferences;
          this.glucoseSettings = {
            unit: this.preferences.glucoseUnit,
            targetLow: this.preferences.targetRange.low,
            targetHigh: this.preferences.targetRange.high,
            hypoglycemiaThreshold: this.preferences.targetRange.low,
            hyperglycemiaThreshold: this.preferences.targetRange.high,
          };
          this.safetySettings = {
            maxBolus: this.preferences.maxBolus || 15,
            lowGlucoseThreshold: this.preferences.lowGlucoseThreshold || 70,
          };
        }
      }
    } catch (error) {
      this.logger.error('Settings', 'Error loading user data', error);
      await this.showToast('Error al cargar los datos del usuario', 'danger');
    }
  }

  /**
   * Handle theme change
   */
  async onThemeChange(event: CustomEvent<{ value: string }>) {
    const theme = event.detail.value as 'light' | 'dark' | 'auto';
    this.preferences.theme = theme;
    await this.themeService.setThemeMode(theme);
    this.hasChanges = true;
  }

  /**
   * Handle glucose unit change
   */
  onGlucoseUnitChange(event: CustomEvent<{ value: string }>) {
    const unit = event.detail.value as 'mg/dL' | 'mmol/L';
    this.glucoseSettings.unit = unit;

    // Convert values if unit changed
    if (unit === 'mmol/L' && this.preferences.glucoseUnit === 'mg/dL') {
      this.glucoseSettings.targetLow = Math.round((this.glucoseSettings.targetLow / 18) * 10) / 10;
      this.glucoseSettings.targetHigh =
        Math.round((this.glucoseSettings.targetHigh / 18) * 10) / 10;
    } else if (unit === 'mg/dL' && this.preferences.glucoseUnit === 'mmol/L') {
      this.glucoseSettings.targetLow = Math.round(this.glucoseSettings.targetLow * 18);
      this.glucoseSettings.targetHigh = Math.round(this.glucoseSettings.targetHigh * 18);
    }

    this.preferences.glucoseUnit = unit;
    this.hasChanges = true;
  }

  /**
   * Handle language change
   */
  async onLanguageChange(event: CustomEvent<{ value: string }>) {
    const language = event.detail.value as 'en' | 'es';
    this.preferences.language = language;
    this.hasChanges = true;

    // Show confirmation to reload app for language change
    const alert = await this.alertController.create({
      header: language === 'es' ? 'Cambio de idioma' : 'Language Change',
      message:
        language === 'es'
          ? 'La aplicación se recargará para aplicar el cambio de idioma.'
          : 'The app will reload to apply the language change.',
      buttons: [
        {
          text: language === 'es' ? 'Cancelar' : 'Cancel',
          role: 'cancel',
        },
        {
          text: 'OK',
          handler: () => {
            this.saveSettings().then(() => {
              window.location.reload();
            });
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Save all settings
   */
  async saveSettings() {
    const loading = await this.loadingController.create({
      message: 'Guardando configuración...',
    });
    await loading.present();

    try {
      // Update preferences object
      this.preferences = {
        ...this.preferences,
        glucoseUnit: this.glucoseSettings.unit,
        targetRange: {
          low: this.glucoseSettings.targetLow,
          high: this.glucoseSettings.targetHigh,
        },
        notifications: {
          appointments: true,
          readings: true,
          reminders: true,
        },
        maxBolus: this.safetySettings.maxBolus,
        lowGlucoseThreshold: this.safetySettings.lowGlucoseThreshold,
      };

      // Save to local storage
      const settings = {
        profile: this.profileSettings,
        glucose: this.glucoseSettings,
        preferences: this.preferences,
      };
      localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));

      // Save to backend API - convert to profile service format
      await this.profileService.updatePreferences({
        glucoseUnit: this.preferences.glucoseUnit,
        targetRange: {
          min: this.glucoseSettings.targetLow,
          max: this.glucoseSettings.targetHigh,
          unit: this.preferences.glucoseUnit,
        },
      });

      this.hasChanges = false;
      await this.showToast('Configuración guardada exitosamente', 'success');
    } catch (error) {
      this.logger.error('Settings', 'Error saving settings', error);
      await this.showToast('Error al guardar la configuración', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Navigate to advanced settings
   */
  goToAdvancedSettings() {
    this.router.navigate([ROUTES.SETTINGS_ADVANCED]);
  }

  /**
   * Navigate to profile page
   */
  goToProfile() {
    this.router.navigate([ROUTES.TABS_PROFILE]);
  }

  /**
   * Sign out with proper error handling
   */
  async signOut() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          handler: async () => {
            try {
              await this.authService.logout();
              await this.router.navigate([ROUTES.LOGIN], { replaceUrl: true });
            } catch (error) {
              this.logger.error('Settings', 'Failed to logout', error);
              // Even if logout fails, still navigate to login page
              // This ensures user can re-authenticate
              await this.showToast('Error al cerrar sesión', 'warning');
              await this.router.navigate([ROUTES.LOGIN], { replaceUrl: true });
            }
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: TIMEOUTS.TOAST_SHORT,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  /**
   * Check if user can leave page with unsaved changes
   */
  async canDeactivate(): Promise<boolean> {
    if (!this.hasChanges) {
      return true;
    }

    const alert = await this.alertController.create({
      header: 'Cambios sin guardar',
      message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Salir sin guardar',
          handler: () => true,
        },
      ],
    });

    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role !== 'cancel';
  }

  /**
   * Check notification permission status
   */
  private async checkNotificationPermission() {
    this.notificationPermissionGranted = await this.notificationService.checkPermissions();
    this.notificationsEnabled = this.notificationPermissionGranted;
  }

  /**
   * Load notification settings from storage
   */
  private loadNotificationSettings() {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    if (saved) {
      const settings = JSON.parse(saved);
      this.readingReminders = settings.readingReminders || this.readingReminders;
      this.notificationsEnabled = settings.enabled ?? false;
    }
  }

  /**
   * Save notification settings
   */
  private saveNotificationSettings() {
    const settings = {
      enabled: this.notificationsEnabled,
      readingReminders: this.readingReminders,
    };
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
  }

  /**
   * Toggle notifications master switch
   */
  async onNotificationsToggle(event: CustomEvent<{ checked: boolean }>) {
    const enabled = event.detail.checked;

    if (enabled && !this.notificationPermissionGranted) {
      const granted = await this.notificationService.requestPermissions();
      if (!granted) {
        const toggle = event.target as HTMLIonToggleElement | null;
        if (toggle) {
          toggle.checked = false;
        }
        await this.showToast('Notification permission denied', 'warning');
        return;
      }
      this.notificationPermissionGranted = true;
    }

    this.notificationsEnabled = enabled;
    this.hasChanges = true;

    // Enable/disable all reminders based on master switch
    if (!enabled) {
      for (const reminder of this.readingReminders) {
        if (reminder.enabled) {
          reminder.enabled = false;
          await this.notificationService.cancelReadingReminder(reminder.id);
        }
      }
    }

    this.saveNotificationSettings();
  }

  /**
   * Toggle individual reading reminder
   */
  async onReminderToggle(reminder: ReadingReminder, event: CustomEvent<{ checked: boolean }>) {
    reminder.enabled = event.detail.checked;
    this.hasChanges = true;

    if (reminder.enabled) {
      await this.notificationService.scheduleReadingReminder(reminder);
    } else {
      await this.notificationService.cancelReadingReminder(reminder.id);
    }

    this.saveNotificationSettings();
  }

  /**
   * Update reminder time
   */
  async onReminderTimeChange(reminder: ReadingReminder, event: CustomEvent) {
    reminder.time = event.detail.value as string;
    this.hasChanges = true;

    if (reminder.enabled) {
      // Reschedule with new time
      await this.notificationService.scheduleReadingReminder(reminder);
    }

    this.saveNotificationSettings();
  }

  /**
   * Test notification - sends a sample notification to preview how it looks
   */
  async testNotification() {
    const notificationTypes = [
      {
        title: 'Diabetactic',
        body: 'Time to check your glucose levels!',
      },
      {
        title: 'Appointment Reminder',
        body: 'You have a medical appointment in 30 minutes',
      },
      {
        title: 'Daily Check',
        body: 'Remember to log your morning glucose reading',
      },
    ];

    // Rotate through notification types for variety
    const randomIndex = Math.floor(Math.random() * notificationTypes.length);
    const { title, body } = notificationTypes[randomIndex];

    await this.notificationService.showImmediateNotification(title, body);
    await this.showToast('Test notification sent', 'success');
  }

  // trackBy function for reading reminders ngFor
  trackByReminder(index: number, reminder: ReadingReminder): number {
    return reminder.id;
  }
}
