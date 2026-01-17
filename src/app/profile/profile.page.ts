import {
  Component,
  OnInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TidepoolAuthService, AuthState } from '@services/tidepool-auth.service';
import { LocalAuthService } from '@services/local-auth.service';
import { ProfileService } from '@services/profile.service';
import { BiometricAuthService } from '@services/biometric-auth.service';

import { TranslationService, Language } from '@services/translation.service';
import { NotificationService } from '@services/notification.service';
import { UserProfile, ThemeMode } from '@models/user-profile.model';
import { ROUTES, STORAGE_KEYS } from '@core/constants';
import { ProfileHeaderComponent } from './components/profile-header.component';
import { ProfileFormComponent } from './components/profile-form.component';
import { ProfilePreferencesComponent } from './components/profile-preferences.component';
import { ProfileActionsComponent } from './components/profile-actions.component';
import { ProfileEditComponent } from './profile-edit/profile-edit.component';
import { AvatarCropperComponent } from './components/avatar-cropper.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    ProfileHeaderComponent,
    ProfileFormComponent,
    ProfilePreferencesComponent,
    ProfileActionsComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProfilePage implements OnInit, OnDestroy {
  profile: UserProfile | null = null;
  authState: AuthState | null = null;
  currentTheme: ThemeMode = 'auto';
  currentLanguage!: Language;
  currentGlucoseUnit = 'mg/dL';
  notificationsEnabled = false;
  biometricEnabled = false;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: TidepoolAuthService,
    private localAuthService: LocalAuthService,
    private profileService: ProfileService,
    private biometricAuthService: BiometricAuthService,
    private translationService: TranslationService,
    private notificationService: NotificationService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {
    this.currentLanguage = this.translationService.getCurrentLanguage();
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadNotificationSettings();
    this.loadBiometricStatus();
    this.subscribeToAuthState();
    this.subscribeToProfile();
    this.subscribeToLanguageChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadUserData(): Promise<void> {
    try {
      const profile = await this.profileService.getProfile();
      if (profile) {
        this.profile = profile;
        this.currentTheme = profile.preferences.themeMode;
        this.currentGlucoseUnit = profile.preferences.glucoseUnit;
      }
      this.currentLanguage = this.translationService.getCurrentLanguage();
    } catch {}
  }

  private loadNotificationSettings(): void {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    if (saved) {
      const settings = JSON.parse(saved);
      this.notificationsEnabled = settings.enabled ?? false;
    } else {
      this.notificationsEnabled = false;
    }
  }

  private async loadBiometricStatus(): Promise<void> {
    try {
      const isAvailable = await this.biometricAuthService.isBiometricAvailable();
      if (isAvailable) {
        // We assume enabled if we have credentials stored (simplified logic)
        // Ideally we check specific state or storage key
        // For now, let's assume false unless we have a robust check
        // Check if we have enrolled
        // Since we don't have an explicit 'isEnrolled' method exposed publicly easily without side effects,
        // we might track this in local storage preference
        const saved = localStorage.getItem('biometric_enabled');
        this.biometricEnabled = saved === 'true';
      } else {
        this.biometricEnabled = false;
      }
      this.cdr.markForCheck();
    } catch {
      this.biometricEnabled = false;
    }
  }

  private subscribeToAuthState(): void {
    this.authService.authState.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.authState = state;
    });
  }

  private subscribeToProfile(): void {
    this.profileService.profile$.pipe(takeUntil(this.destroy$)).subscribe(profile => {
      if (profile) {
        this.profile = profile;
        this.currentTheme = profile.preferences.themeMode;
        this.currentGlucoseUnit = profile.preferences.glucoseUnit;
        this.cdr.markForCheck();
      }
    });
  }

  private subscribeToLanguageChanges(): void {
    this.translationService.currentLanguage$.pipe(takeUntil(this.destroy$)).subscribe(language => {
      this.currentLanguage = language;
    });
  }

  async onNotificationsToggle(event: CustomEvent<{ checked: boolean }>): Promise<void> {
    const enabled = event.detail.checked;
    if (enabled) {
      const granted = await this.notificationService.requestPermissions();
      if (!granted) {
        const toggle = event.target as HTMLIonToggleElement | null;
        if (toggle) {
          toggle.checked = false;
        }
        const toast = await this.toastController.create({
          message: this.translationService.instant('profile.notifications.permissionDenied'),
          duration: 3000,
          color: 'warning',
          position: 'bottom',
        });
        await toast.present();
        return;
      }
    }
    this.notificationsEnabled = enabled;
    this.saveNotificationSettings();
    const toast = await this.toastController.create({
      message: enabled
        ? this.translationService.instant('profile.notifications.enabled')
        : this.translationService.instant('profile.notifications.disabled'),
      duration: 2000,
      color: 'success',
      position: 'bottom',
    });
    await toast.present();
  }

  async onBiometricToggle(event: CustomEvent<{ checked: boolean }>): Promise<void> {
    const enabled = event.detail.checked;
    const toggle = event.target as HTMLIonToggleElement;

    try {
      if (enabled) {
        // To enable, we need to enroll. Typically this requires re-entering password or having current tokens.
        // For simplicity, we'll try to enroll with current session if available.
        const userId = this.localAuthService.getCurrentUser()?.id;
        const accessToken = await this.localAuthService.getAccessToken();

        if (!userId || !accessToken) {
          throw new Error('Not authenticated');
        }

        const result = await this.biometricAuthService.enrollBiometric(userId, accessToken);
        if (result.success) {
          this.biometricEnabled = true;
          localStorage.setItem('biometric_enabled', 'true');
          const toast = await this.toastController.create({
            message: this.translationService.instant('biometric.enrollSuccess'),
            duration: 2000,
            color: 'success',
            position: 'bottom',
          });
          await toast.present();
        } else {
          throw new Error(result.error);
        }
      } else {
        // Disable
        await this.biometricAuthService.clearBiometricEnrollment();
        this.biometricEnabled = false;
        localStorage.setItem('biometric_enabled', 'false');
      }
    } catch (error) {
      this.biometricEnabled = !enabled; // Revert state
      if (toggle) toggle.checked = !enabled;

      const toast = await this.toastController.create({
        message: this.translationService.instant('biometric.error'),
        duration: 3000,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    }
  }

  async onSignOut(): Promise<void> {
    try {
      await Promise.all([this.localAuthService.logout(), this.authService.logout()]);
      await this.profileService.deleteProfile();
      await this.router.navigate([ROUTES.WELCOME], { replaceUrl: true });
    } catch {
      await this.router.navigate([ROUTES.WELCOME], { replaceUrl: true });
    }
  }

  async editAge(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translationService.instant('profile.editAge'),
      inputs: [
        {
          name: 'age',
          type: 'number',
          placeholder: this.translationService.instant('profile.agePlaceholder'),
          value: this.profile?.age || 12,
          min: 1,
          max: 120,
        },
      ],
      buttons: [
        {
          text: this.translationService.instant('common.cancel'),
          role: 'cancel',
        },
        {
          text: this.translationService.instant('common.save'),
          handler: async data => {
            const age = parseInt(data.age, 10);
            if (age && age > 0 && age <= 120) {
              try {
                await this.profileService.updateProfile({ age });
              } catch {}
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async editDiabetesInfo(): Promise<void> {
    const { DiabetesInfoModalComponent } = await import(
      './components/diabetes-info-modal/diabetes-info-modal.component'
    );
    const modal = await this.modalController.create({
      component: DiabetesInfoModalComponent,
      componentProps: { profile: this.profile },
      cssClass: 'profile-edit-modal',
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<{
      diabetesType: 'type1' | 'type2' | 'gestational' | 'other';
      diagnosisDate: string;
    }>();

    if (role === 'confirm' && data) {
      try {
        await this.profileService.updateProfile({
          diabetesType: data.diabetesType,
          diagnosisDate: data.diagnosisDate,
        });
      } catch {
        const toast = await this.toastController.create({
          message: this.translationService.instant('profile.edit.error'),
          duration: 3000,
          color: 'danger',
          position: 'bottom',
        });
        await toast.present();
      }
    }
  }

  async editProfile(): Promise<void> {
    const modal = await this.modalController.create({
      component: ProfileEditComponent,
      cssClass: 'profile-edit-modal',
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ success: boolean }>();
    if (data?.success) {
      // Profile is automatically refreshed via subscription
    }
  }

  async goToSettings(): Promise<void> {
    const { SettingsPage } = await import('../settings/settings.page');
    const modal = await this.modalController.create({
      component: SettingsPage,
      cssClass: 'fullscreen-modal',
    });
    await modal.present();
  }

  async goToAchievements(): Promise<void> {
    await this.router.navigate(['/achievements']);
  }

  async onGoToTips(): Promise<void> {
    await this.router.navigate(['/tips']);
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    input.value = '';
    if (file.size > 3 * 1024 * 1024) {
      await this.presentAvatarError('profile.avatar.tooLarge');
      return;
    }
    await this.openAvatarCropper(file);
  }

  private async openAvatarCropper(file: File): Promise<void> {
    const modal = await this.modalController.create({
      component: AvatarCropperComponent,
      componentProps: { imageFile: file },
      cssClass: 'avatar-cropper-modal',
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss<{ croppedImage: string }>();

    if (role === 'confirm' && data?.croppedImage) {
      try {
        await this.profileService.updateProfile({
          avatar: {
            id: 'custom-avatar',
            name: file.name || 'Custom',
            imagePath: data.croppedImage,
            category: 'custom',
          },
        });
      } catch {
        await this.presentAvatarError('profile.avatar.updateFailed');
      }
    }
  }

  private async presentAvatarError(messageKey: string): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translationService.instant('profile.avatar.errorTitle'),
      message: this.translationService.instant(messageKey),
      buttons: [this.translationService.instant('common.ok')],
    });
    await alert.present();
  }

  private saveNotificationSettings(): void {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    const existingSettings = saved ? JSON.parse(saved) : {};
    const settings = {
      ...existingSettings,
      enabled: this.notificationsEnabled,
    };
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
  }

  async onTestNotification(): Promise<void> {
    const title = this.translationService.instant('profile.notifications.testTitle');
    const body = this.translationService.instant('profile.notifications.testBody');

    await this.notificationService.showImmediateNotification(title, body);

    const toast = await this.toastController.create({
      message: this.translationService.instant('profile.notifications.testSent'),
      duration: 2000,
      color: 'success',
      position: 'bottom',
    });
    await toast.present();
  }
}
