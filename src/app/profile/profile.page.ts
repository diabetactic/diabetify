import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AlertController,
  ToastController,
  LoadingController,
  ModalController,
} from '@ionic/angular';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TidepoolAuthService, AuthState } from '@services/tidepool-auth.service';
import { LocalAuthService } from '@services/local-auth.service';
import { ProfileService } from '@services/profile.service';
import { ThemeService } from '@services/theme.service';
import { TranslationService, Language } from '@services/translation.service';
import { NotificationService } from '@services/notification.service';
import { UserProfile, ThemeMode } from '@models/user-profile.model';
import { ROUTES, STORAGE_KEYS } from '@core/constants';
import { ProfileHeaderComponent } from './components/profile-header.component';
import { ProfileFormComponent } from './components/profile-form.component';
import { ProfilePreferencesComponent } from './components/profile-preferences.component';
import { ProfileActionsComponent } from './components/profile-actions.component';
import { ProfileEditComponent } from './profile-edit/profile-edit.component';
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
  @ViewChild('avatarInput') avatarInput?: ElementRef<HTMLInputElement>;
  profile: UserProfile | null = null;
  authState: AuthState | null = null;
  currentTheme: ThemeMode = 'auto';
  currentLanguage!: Language;
  currentGlucoseUnit = 'mg/dL';
  notificationsEnabled = false;
  unitOptions = [
    { value: 'mg/dL', label: 'mg/dL' },
    { value: 'mmol/L', label: 'mmol/L' },
  ];
  private destroy$ = new Subject<void>();

  constructor(
    private authService: TidepoolAuthService,
    private localAuthService: LocalAuthService,
    private profileService: ProfileService,
    private themeService: ThemeService,
    private translationService: TranslationService,
    private notificationService: NotificationService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController
  ) {
    this.currentLanguage = this.translationService.getCurrentLanguage();
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadNotificationSettings();
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
      }
    });
  }

  private subscribeToLanguageChanges(): void {
    this.translationService.currentLanguage$.pipe(takeUntil(this.destroy$)).subscribe(language => {
      this.currentLanguage = language;
    });
  }

  async onThemeChange(event: CustomEvent<{ value: ThemeMode }>): Promise<void> {
    const theme = event.detail.value as ThemeMode;
    await this.themeService.setThemeMode(theme);
    this.currentTheme = theme;
  }

  async onLanguageChange(event: CustomEvent<{ value: Language }>): Promise<void> {
    const language = event.detail.value as Language;
    await this.translationService.setLanguage(language);
    await this.profileService.updatePreferences({ language });
  }

  async onGlucoseUnitChange(event: CustomEvent<{ value: string }>): Promise<void> {
    const unit = event.detail.value as 'mg/dL' | 'mmol/L';
    await this.profileService.updatePreferences({ glucoseUnit: unit });
    this.currentGlucoseUnit = unit;
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
    await this.router.navigate([ROUTES.SETTINGS]);
  }

  async goToAchievements(): Promise<void> {
    await this.router.navigate(['/achievements']);
  }

  triggerAvatarUpload(): void {
    this.avatarInput?.nativeElement.click();
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
    try {
      const imagePath = await this.resizeAndReadImage(file);
      await this.profileService.updateProfile({
        avatar: {
          id: 'custom-avatar',
          name: file.name || 'Custom',
          imagePath,
          category: 'custom',
        },
      });
    } catch {
      await this.presentAvatarError('profile.avatar.updateFailed');
    }
  }

  private async resizeAndReadImage(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 512;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
          } else {
            reject(new Error('Failed to get canvas context'));
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
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
    const settings = {
      enabled: this.notificationsEnabled,
      readingReminders: [],
    };
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
  }
}
