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
import {
  AlertController,
  LoadingController,
  ModalController,
  Platform,
  ToastController,
} from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonButton,
  IonContent,
  IonLabel,
  IonList,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonCard,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonRange,
} from '@ionic/angular/standalone';
import { Subject, Subscription } from 'rxjs';

import { ProfileService } from '@services/profile.service';
import { ReadingsService } from '@services/readings.service';
import { ThemeService } from '@services/theme.service';
import { LocalAuthService, LocalUser } from '@services/local-auth.service';
import {
  PreferencesService,
  UserPreferences,
  DEFAULT_PREFERENCES,
} from '@services/preferences.service';
import { DemoDataService } from '@services/demo-data.service';
import { NotificationService, ReadingReminder } from '@services/notification.service';
import { TranslationService, Language } from '@services/translation.service';
import { environment } from '@env/environment';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';
import { LoggerService } from '@services/logger.service';
import { ROUTES, TIMEOUTS } from '@core/constants';

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
    IonTitle,
    IonButton,
    IonContent,
    IonLabel,
    IonList,
    IonItem,

    IonSelect,
    IonSelectOption,
    IonToggle,
    IonCard,
    IonDatetime,
    IonDatetimeButton,
    IonModal,
    IonRange,
    AppIconComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SettingsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // User profile data
  user: LocalUser | null = null;
  preferences: UserPreferences = { ...DEFAULT_PREFERENCES };

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
    private preferencesService: PreferencesService,
    private demoDataService: DemoDataService,
    private notificationService: NotificationService,
    private translate: TranslateService,
    private translationService: TranslationService,
    private logger: LoggerService,
    private readingsService: ReadingsService,
    private modalController: ModalController
  ) {
    this.isWebPlatform = !this.platform.is('capacitor');
  }

  async dismiss(): Promise<void> {
    const modal = await this.modalController.getTop();
    if (modal) {
      await modal.dismiss();
    } else {
      await this.router.navigate(['/tabs/profile']);
    }
  }

  ngOnInit() {
    this.initializeReadingReminders();
    this.loadUserData(); // Also loads notification settings after preferences are ready
    this.isDemoMode = this.demoDataService.isDemoMode();
    this.checkNotificationPermission();
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

  private async loadUserData() {
    try {
      this.user = this.authService.getCurrentUser();

      if (this.user) {
        this.profileSettings = {
          name: `${this.user.firstName} ${this.user.lastName}`,
          email: this.user.email,
          phone: this.user.phone || '',
          dateOfBirth: this.user.dateOfBirth || '',
          diabetesType: this.user.diabetesType || '2',
          diagnosisDate: this.user.diagnosisDate || '',
        };
      }

      await this.preferencesService.waitForInit();
      this.preferences = this.preferencesService.getCurrentPreferences();

      this.glucoseSettings = {
        unit: this.preferences.glucoseUnit,
        targetLow: this.preferences.targetRange.low,
        targetHigh: this.preferences.targetRange.high,
        hypoglycemiaThreshold: this.preferences.targetRange.low,
        hyperglycemiaThreshold: this.preferences.targetRange.high,
      };
      this.safetySettings = {
        maxBolus: this.preferences.safety.maxBolus,
        lowGlucoseThreshold: this.preferences.safety.lowGlucoseThreshold,
      };

      // Load notification settings AFTER preferences are ready
      this.loadNotificationSettings();
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
      await this.preferencesService.updatePreferences({
        glucoseUnit: this.glucoseSettings.unit,
        targetRange: {
          low: this.glucoseSettings.targetLow,
          high: this.glucoseSettings.targetHigh,
        },
        safety: {
          maxBolus: this.safetySettings.maxBolus,
          lowGlucoseThreshold: this.safetySettings.lowGlucoseThreshold,
        },
        language: this.preferences.language, // Persist language setting
      });

      // Also update TranslationService so it persists in its own storage key
      // This ensures language is correctly loaded on next app start
      await this.translationService.setLanguage(this.preferences.language as Language);

      this.preferences = this.preferencesService.getCurrentPreferences();

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
  async goToAdvancedSettings() {
    const { AdvancedPage } = await import('./advanced/advanced.page');
    const modal = await this.modalController.create({
      component: AdvancedPage,
    });
    await modal.present();
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
   * If permission is denied, force notificationsEnabled off to keep UI consistent
   */
  private async checkNotificationPermission() {
    this.notificationPermissionGranted = await this.notificationService.checkPermissions();
    // If permission denied but notifications preference was enabled, force it off
    // This prevents UI showing enabled toggle when notifications can't actually work
    if (!this.notificationPermissionGranted && this.notificationsEnabled) {
      this.notificationsEnabled = false;
    }
  }

  private loadNotificationSettings() {
    this.notificationsEnabled = this.preferences.notifications.enabled;
  }

  private async saveNotificationSettings() {
    await this.preferencesService.setNotifications({
      enabled: this.notificationsEnabled,
    });
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
    let timeValue = event.detail.value;

    if (Array.isArray(timeValue)) {
      timeValue = timeValue[0];
    }

    if (timeValue && typeof timeValue === 'string') {
      if (timeValue.includes('T')) {
        const date = new Date(timeValue);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        reminder.time = `${hours}:${minutes}`;
      } else {
        reminder.time = timeValue.substring(0, 5);
      }

      this.hasChanges = true;

      if (reminder.enabled) {
        await this.notificationService.scheduleReadingReminder(reminder);
      }

      this.saveNotificationSettings();
    }
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
  trackByReminder(_index: number, reminder: ReadingReminder): number {
    return reminder.id;
  }
}
