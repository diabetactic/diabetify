import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ProfileService } from '../core/services/profile.service';
import { ThemeService } from '../core/services/theme.service';
import { LocalAuthService } from '../core/services/local-auth.service';
import { DemoDataService } from '../core/services/demo-data.service';
import { LocalUser, UserPreferences } from '../core/services/local-auth.service';
import { DebugPanelComponent } from '../shared/components/debug-panel/debug-panel.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, DebugPanelComponent],
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

  notificationSettings = {
    appointments: true,
    appointmentReminder: 24, // hours before
    readings: true,
    readingReminder: true,
    readingTimes: ['08:00', '13:00', '19:00', '22:00'],
    weeklyReport: true,
    criticalAlerts: true,
  };

  privacySettings = {
    shareDataWithDoctor: true,
    anonymousStatistics: false,
    dataRetentionDays: 365,
    exportFormat: 'pdf' as 'pdf' | 'csv' | 'json',
  };

  syncSettings = {
    autoSync: true,
    syncInterval: 15, // minutes
    wifiOnly: false,
    backgroundSync: true,
  };

  // UI state
  isLoading = false;
  hasChanges = false;
  isDemoMode = false;
  showDebugPanel = false;
  isDevEnvironment = !environment.production;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private profileService: ProfileService,
    private themeService: ThemeService,
    private authService: LocalAuthService,
    private demoDataService: DemoDataService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.isDemoMode = this.demoDataService.isDemoMode();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

          this.notificationSettings.appointments = this.preferences.notifications.appointments;
          this.notificationSettings.readings = this.preferences.notifications.readings;
          this.notificationSettings.readingReminder = this.preferences.notifications.reminders;
        }
      }

      // Load additional settings from local storage or profile service
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        Object.assign(this.privacySettings, settings.privacy || {});
        Object.assign(this.syncSettings, settings.sync || {});
        Object.assign(this.notificationSettings, settings.notifications || {});
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      await this.showToast('Error al cargar los datos del usuario', 'danger');
    }
  }

  /**
   * Handle theme change
   */
  async onThemeChange(event: any) {
    const theme = event.detail.value as 'light' | 'dark' | 'auto';
    this.preferences.theme = theme;
    await this.themeService.setThemeMode(theme);
    this.hasChanges = true;
  }

  /**
   * Handle glucose unit change
   */
  onGlucoseUnitChange(event: any) {
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
  async onLanguageChange(event: any) {
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
   * Toggle notification setting
   */
  onNotificationToggle(type: string) {
    this.hasChanges = true;
  }

  /**
   * Add reading reminder time
   */
  async addReadingReminder() {
    const alert = await this.alertController.create({
      header: 'Agregar Recordatorio',
      inputs: [
        {
          name: 'time',
          type: 'time',
          value: '12:00',
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Agregar',
          handler: data => {
            if (data.time && !this.notificationSettings.readingTimes.includes(data.time)) {
              this.notificationSettings.readingTimes.push(data.time);
              this.notificationSettings.readingTimes.sort();
              this.hasChanges = true;
            }
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Remove reading reminder time
   */
  removeReadingReminder(time: string) {
    const index = this.notificationSettings.readingTimes.indexOf(time);
    if (index > -1) {
      this.notificationSettings.readingTimes.splice(index, 1);
      this.hasChanges = true;
    }
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
          appointments: this.notificationSettings.appointments,
          readings: this.notificationSettings.readings,
          reminders: this.notificationSettings.readingReminder,
        },
      };

      // Save to local storage
      const settings = {
        profile: this.profileSettings,
        glucose: this.glucoseSettings,
        notifications: this.notificationSettings,
        privacy: this.privacySettings,
        sync: this.syncSettings,
        preferences: this.preferences,
      };
      localStorage.setItem('userSettings', JSON.stringify(settings));

      // TODO: Save to backend when API is available
      // await this.profileService.updatePreferences(this.preferences).toPromise();

      this.hasChanges = false;
      await this.showToast('Configuración guardada exitosamente', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      await this.showToast('Error al guardar la configuración', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Export user data
   */
  async exportData() {
    const loading = await this.loadingController.create({
      message: 'Preparando exportación...',
    });
    await loading.present();

    try {
      // TODO: Implement data export
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate export

      await this.showToast(
        `Datos exportados en formato ${this.privacySettings.exportFormat.toUpperCase()}`,
        'success'
      );
    } catch (error) {
      console.error('Error exporting data:', error);
      await this.showToast('Error al exportar los datos', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Delete account
   */
  async deleteAccount() {
    const alert = await this.alertController.create({
      header: 'Eliminar Cuenta',
      message: 'Esta acción es irreversible. Se eliminarán todos tus datos permanentemente.',
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'Contraseña',
        },
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          cssClass: 'danger-button',
          handler: async data => {
            if (data.password) {
              // TODO: Implement account deletion
              await this.showToast('Función no disponible en modo demo', 'warning');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Navigate to advanced settings
   */
  goToAdvancedSettings() {
    this.router.navigate(['/settings/advanced']);
  }

  /**
   * Toggle debug panel (only in non-production environments)
   */
  toggleDebugPanel() {
    if (this.isDevEnvironment) {
      this.showDebugPanel = !this.showDebugPanel;
    }
  }

  /**
   * Navigate to profile page
   */
  goToProfile() {
    this.router.navigate(['/profile']);
  }

  /**
   * Sign out
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
            await this.authService.logout();
            await this.router.navigate(['/login'], { replaceUrl: true });
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
      duration: 2000,
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
}
