import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, AlertController, ToastController, LoadingController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, firstValueFrom } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import { TidepoolAuthService, AuthState } from '../core/services/tidepool-auth.service';
import { ProfileService } from '../core/services/profile.service';
import { ThemeService } from '../core/services/theme.service';
import { TranslationService, Language } from '../core/services/translation.service';
import { CapacitorHttpService } from '../core/services/capacitor-http.service';
import { NotificationService } from '../core/services/notification.service';
import { UserProfile, ThemeMode } from '../core/models/user-profile.model';
import { environment } from '../../environments/environment';
import { ROUTES, STORAGE_KEYS } from '../core/constants';
import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';
interface ProfileDisplayData {
  name: string;
  email: string;
  memberSince: string;
  avatarUrl?: string;
}

/** Tidepool profile data from /metadata/{userId}/profile */
interface TidepoolProfile {
  fullName?: string;
  patient?: {
    birthday?: string;
    diagnosisDate?: string;
    targetTimezone?: string;
    targetDevices?: string[];
    isOtherPerson?: boolean;
    about?: string;
  };
  emails?: string[];
}

/** Tidepool data source from /v1/users/{userId}/data_sources */
interface TidepoolDataSource {
  id?: string;
  providerType?: string;
  providerName?: string;
  providerSessionId?: string;
  state?: string;
  createdTime?: string;
  modifiedTime?: string;
}

/** Combined Tidepool user data */
interface TidepoolUserData {
  profile: TidepoolProfile | null;
  dataSources: TidepoolDataSource[];
  dataSourcesCount: number;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, AppIconComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProfilePage implements OnInit, OnDestroy {
  @ViewChild('avatarInput') avatarInput?: ElementRef<HTMLInputElement>;
  // User data
  profileData: ProfileDisplayData | null = null;
  profile: UserProfile | null = null;
  authState: AuthState | null = null;

  // Tidepool connection
  isConnected = false;
  lastSyncTime: string | null = null;

  // Preferences
  currentTheme: ThemeMode = 'auto';
  currentLanguage!: Language;
  currentGlucoseUnit = 'mg/dL';
  notificationsEnabled = false;

  // App info
  appVersion = '0.0.1';

  // Theme options
  themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'System' },
  ];

  languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
  ];

  unitOptions = [
    { value: 'mg/dL', label: 'mg/dL' },
    { value: 'mmol/L', label: 'mmol/L' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: TidepoolAuthService,
    private profileService: ProfileService,
    private themeService: ThemeService,
    private translationService: TranslationService,
    private capacitorHttp: CapacitorHttpService,
    private notificationService: NotificationService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
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

  /**
   * Load initial user data
   */
  private async loadUserData(): Promise<void> {
    try {
      const profile = await this.profileService.getProfile();
      if (profile) {
        this.profile = profile;
        this.currentTheme = profile.preferences.themeMode;
        this.currentGlucoseUnit = profile.preferences.glucoseUnit;
      }
      this.currentLanguage = this.translationService.getCurrentLanguage();
    } catch {
      // User data load failed - handled gracefully with default values
    }
  }

  /**
   * Load notification settings from storage
   */
  private loadNotificationSettings(): void {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    if (saved) {
      const settings = JSON.parse(saved);
      this.notificationsEnabled = settings.enabled ?? false;
    } else {
      this.notificationsEnabled = false;
    }
  }

  /**
   * Handle notifications toggle
   */
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

  /**
   * Save notification settings to storage
   */
  private saveNotificationSettings(): void {
    const settings = {
      enabled: this.notificationsEnabled,
      readingReminders: [],
    };
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
  }

  /**
   * Subscribe to authentication state changes
   */
  private subscribeToAuthState(): void {
    this.authService.authState.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.authState = state;
      this.isConnected = state.isAuthenticated;

      if (state.isAuthenticated) {
        this.refreshProfileDisplay();
      }
    });
  }

  /**
   * Subscribe to profile changes
   */
  private subscribeToProfile(): void {
    this.profileService.profile$.pipe(takeUntil(this.destroy$)).subscribe(profile => {
      if (profile) {
        this.profile = profile;
        this.isConnected = profile.tidepoolConnection.connected;
        this.lastSyncTime = profile.tidepoolConnection.lastSyncTime || null;
        this.currentTheme = profile.preferences.themeMode;
        this.currentGlucoseUnit = profile.preferences.glucoseUnit;
        this.refreshProfileDisplay();
      }
    });
  }

  /**
   * Format member since date
   */
  private formatMemberSince(): string {
    if (!this.profile?.createdAt) {
      return this.translationService.instant('profile.memberSince.recent');
    }

    const createdDate = new Date(this.profile.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return this.translationService.instant('profile.memberSince.recent');
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      const key = months === 1 ? 'profile.memberSince.month' : 'profile.memberSince.months';
      return this.translationService.instant(key, { count: months });
    } else {
      const years = Math.floor(diffDays / 365);
      const key = years === 1 ? 'profile.memberSince.year' : 'profile.memberSince.years';
      return this.translationService.instant(key, { count: years });
    }
  }

  /**
   * Human friendly member since label used in the header.
   */
  get memberSinceText(): string {
    if (this.profileData?.memberSince) {
      return this.profileData.memberSince;
    }
    return this.formatMemberSince();
  }

  /**
   * Friendly greeting using the user's first name when available.
   */
  get greeting(): string {
    return this.translationService.instant('profile.greeting', {
      name: this.getFirstName(),
    });
  }

  /**
   * Email text for the header section.
   * Priority: 1) Backend email (from profile) 2) Tidepool email 3) Display data email
   */
  get emailText(): string {
    const email =
      this.profile?.email ??
      this.profile?.tidepoolConnection?.email ??
      this.profileData?.email ??
      '';
    if (email.trim()) {
      return email;
    }
    return this.translationService.instant('profile.notAvailable');
  }

  /**
   * Avatar image URL if available.
   */
  get avatarUrl(): string | undefined {
    return this.profileData?.avatarUrl || this.profile?.avatar?.imagePath;
  }

  /**
   * Age description card text.
   */
  get ageDescription(): string {
    if (this.profile?.age) {
      return `${this.profile.age} ${this.translationService.instant('profile.yearsOld')}`;
    }
    return this.translationService.instant('profile.notSet');
  }

  /**
   * Diabetes overview card text.
   */
  get diabetesSummary(): string {
    const pieces: string[] = [];

    const typeLabel = this.getDiabetesTypeLabel();
    if (typeLabel) {
      pieces.push(typeLabel);
    }

    const diagnosisLabel = this.getDiagnosisLabel();
    if (diagnosisLabel) {
      pieces.push(diagnosisLabel);
    }

    if (!pieces.length) {
      return this.translationService.instant('profile.notSet');
    }

    return pieces.join(' - ');
  }

  /**
   * Emergency contact card text.
   */
  get emergencySummary(): string {
    const emergency = this.profile?.emergencyContact;
    if (!emergency) {
      return this.translationService.instant('profile.emergencyContactPlaceholder');
    }

    const parts: string[] = [];
    if (emergency.name) {
      if (emergency.relationship) {
        parts.push(
          this.translationService.instant('profile.emergencyContactWithRelationship', {
            name: emergency.name,
            relationship: emergency.relationship,
          })
        );
      } else {
        parts.push(emergency.name);
      }
    }

    if (emergency.phone) {
      parts.push(
        this.translationService.instant('profile.emergencyContactPhone', {
          phone: emergency.phone,
        })
      );
    }

    if (!parts.length) {
      return this.translationService.instant('profile.emergencyContactPlaceholder');
    }

    return parts.join(' - ');
  }

  /**
   * Determine if emergency contact data exists.
   */
  get hasEmergencyContact(): boolean {
    return !!this.profile?.emergencyContact;
  }

  /**
   * Format last sync time
   */
  formatLastSyncTime(): string {
    if (!this.lastSyncTime) {
      return this.translationService.instant('profile.lastSyncStatus.never');
    }

    const syncDate = new Date(this.lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) {
      return this.translationService.instant('profile.lastSyncStatus.justNow');
    } else if (diffMins < 60) {
      const key =
        diffMins === 1 ? 'profile.lastSyncStatus.oneMinute' : 'profile.lastSyncStatus.manyMinutes';
      return this.translationService.instant(key, { count: diffMins });
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      const key =
        hours === 1 ? 'profile.lastSyncStatus.oneHour' : 'profile.lastSyncStatus.manyHours';
      return this.translationService.instant(key, { count: hours });
    } else {
      const days = Math.floor(diffMins / 1440);
      const key = days === 1 ? 'profile.lastSyncStatus.oneDay' : 'profile.lastSyncStatus.manyDays';
      return this.translationService.instant(key, { count: days });
    }
  }

  /**
   * Handle theme change
   */
  async onThemeChange(event: CustomEvent<{ value: ThemeMode }>): Promise<void> {
    const theme = event.detail.value as ThemeMode;
    await this.themeService.setThemeMode(theme);
    this.currentTheme = theme;
  }

  /**
   * Handle language change
   */
  async onLanguageChange(event: CustomEvent<{ value: Language }>): Promise<void> {
    const language = event.detail.value as Language;
    // Update translation service (this will also save to preferences)
    await this.translationService.setLanguage(language);
    await this.profileService.updatePreferences({ language });
  }

  /**
   * Handle glucose unit change
   */
  async onGlucoseUnitChange(event: CustomEvent<{ value: string }>): Promise<void> {
    const unit = event.detail.value as 'mg/dL' | 'mmol/L';
    await this.profileService.updatePreferences({ glucoseUnit: unit });
    this.currentGlucoseUnit = unit;
  }

  /**
   * Handle Tidepool connection/disconnection
   */
  async onToggleTidepoolConnection(): Promise<void> {
    if (this.isConnected) {
      await this.disconnectFromTidepool();
    } else {
      await this.connectToTidepool();
    }
  }

  /**
   * Connect to Tidepool - Shows login dialog for email/password auth
   */
  private async connectToTidepool(): Promise<void> {
    const alert = await this.alertController.create({
      header:
        this.translationService.instant('profile.tidepoolLoginDialog.title') ||
        'Connect to Tidepool',
      message:
        this.translationService.instant('profile.tidepoolLoginDialog.message') ||
        'Enter your Tidepool credentials',
      cssClass: 'tidepool-login-alert',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder:
            this.translationService.instant('profile.tidepoolLoginDialog.email') || 'Email',
        },
        {
          name: 'password',
          type: 'password',
          placeholder:
            this.translationService.instant('profile.tidepoolLoginDialog.password') || 'Password',
        },
      ],
      buttons: [
        {
          text: this.translationService.instant('common.cancel') || 'Cancel',
          role: 'cancel',
        },
        {
          text: this.translationService.instant('profile.tidepoolLoginDialog.connect') || 'Connect',
          handler: data => {
            if (!data.email || !data.password) {
              return false; // Don't close the dialog
            }
            // Close dialog first, then perform login
            // Using setTimeout to let dialog close before showing loading
            const email = data.email;
            const password = data.password;
            setTimeout(() => {
              this.performTidepoolLogin(email, password).catch(() => {
                // Error handled in performTidepoolLogin
              });
            }, 100);
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Perform Tidepool login with credentials
   */
  private async performTidepoolLogin(email: string, password: string): Promise<void> {
    try {
      await this.authService.loginWithCredentials(email, password);

      // Update local profile with Tidepool connection status
      if (this.profile) {
        await this.profileService.updateProfile({
          tidepoolConnection: {
            connected: true,
            userId: this.authState?.userId || '',
          },
        });
        this.isConnected = true;
      }

      // Show success toast
      const toast = await this.toastController.create({
        message:
          this.translationService.instant('profile.tidepoolLoginDialog.success') ||
          'Connected to Tidepool!',
        duration: 3000,
        position: 'top',
        color: 'success',
      });
      await toast.present();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed. Please check your credentials.';

      // Show error alert
      const errorAlert = await this.alertController.create({
        header: this.translationService.instant('common.error') || 'Error',
        message: errorMessage,
        buttons: ['OK'],
      });
      await errorAlert.present();
    }
  }

  /**
   * Disconnect from Tidepool
   */
  private async disconnectFromTidepool(): Promise<void> {
    try {
      await this.authService.logout();
      await this.profileService.clearTidepoolCredentials();
    } catch {
      // Disconnect errors are non-critical - continue silently
    }
  }

  /**
   * Handle sign out
   */
  async onSignOut(): Promise<void> {
    try {
      await this.authService.logout();
      await this.profileService.deleteProfile();
      await this.router.navigate([ROUTES.WELCOME], { replaceUrl: true });
    } catch {
      // Sign out failed - navigate to welcome anyway
    }
  }

  /**
   * Open Tidepool Dashboard
   */
  openTidepoolDashboard(): void {
    this.authService.authState.pipe(take(1)).subscribe(state => {
      if (state.userId) {
        const dashboardUrl = `https://app.tidepool.org/patients/${state.userId}/data`;
        window.open(dashboardUrl, '_blank');
      }
    });
  }

  /**
   * Show Tidepool info popup with REAL data from Tidepool API
   */
  async showTidepoolInfo(): Promise<void> {
    if (!this.isConnected || !this.authState) {
      const alert = await this.alertController.create({
        header: this.translationService.instant('profile.tidepoolInfo.title'),
        message: this.translationService.instant('profile.tidepoolInfo.notConnectedMessage'),
        cssClass: 'tidepool-info-alert',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    // Check token validity and try to refresh if needed
    let accessToken = await this.authService.getAccessToken();

    // If no token, try to refresh it
    if (!accessToken) {
      try {
        accessToken = await this.authService.refreshAccessToken();
      } catch {
        // Token refresh failed - user needs to re-authenticate
        const alert = await this.alertController.create({
          header: this.translationService.instant('profile.tidepoolInfo.title'),
          message:
            this.translationService.instant('profile.tidepoolInfo.sessionExpired') ||
            'Session expired. Please disconnect and reconnect to Tidepool.',
          cssClass: 'tidepool-info-alert',
          buttons: ['OK'],
        });
        await alert.present();
        return;
      }
    }

    // Show loading while fetching real data from Tidepool
    const loading = await this.loadingController.create({
      message: this.translationService.instant('common.loading'),
      spinner: 'crescent',
    });
    await loading.present();

    try {
      // Fetch real data from Tidepool API
      const tidepoolData = await this.fetchTidepoolUserData();

      await loading.dismiss();

      // Build message with Tidepool profile data
      const details = this.buildTidepoolInfoMessage(tidepoolData);

      const alert = await this.alertController.create({
        header: this.translationService.instant('profile.tidepoolInfo.title'),
        message: details,
        cssClass: 'tidepool-info-alert',
        buttons: [
          {
            text: this.translationService.instant('profile.tidepoolInfo.learnMore'),
            handler: () => {
              window.open('https://www.tidepool.org/', '_blank');
            },
          },
          {
            text: 'OK',
            role: 'cancel',
          },
        ],
      });
      await alert.present();
    } catch {
      await loading.dismiss();

      // Show error message
      const alert = await this.alertController.create({
        header: this.translationService.instant('profile.tidepoolInfo.title'),
        message: this.translationService.instant('profile.tidepoolInfo.fetchError'),
        cssClass: 'tidepool-info-alert',
        buttons: ['OK'],
      });
      await alert.present();
    }
  }

  /**
   * Fetch real user data from Tidepool API
   */
  private async fetchTidepoolUserData(): Promise<TidepoolUserData> {
    const accessToken = await this.authService.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const userId = this.authState?.userId;
    const baseUrl = environment.tidepool.baseUrl;
    const headers = { Authorization: `Bearer ${accessToken}` };

    const result: TidepoolUserData = {
      profile: null,
      dataSources: [],
      dataSourcesCount: 0,
    };

    // Fetch user profile from /metadata/{userId}/profile
    try {
      if (userId) {
        const profileUrl = `${baseUrl}/metadata/${userId}/profile`;
        result.profile = await firstValueFrom(
          this.capacitorHttp.get<TidepoolProfile>(profileUrl, { headers })
        );
      }
    } catch {
      // Profile fetch failed - continue with empty profile
    }

    // Fetch data sources from /v1/users/{userId}/data_sources
    try {
      if (userId) {
        const dataSourcesUrl = `${baseUrl}/data/v1/users/${userId}/data_sources`;
        const sources = await firstValueFrom(
          this.capacitorHttp.get<TidepoolDataSource[]>(dataSourcesUrl, { headers })
        );
        result.dataSources = sources || [];
        result.dataSourcesCount = result.dataSources.length;
      }
    } catch {
      // Data sources fetch failed - continue with empty array
    }

    return result;
  }

  /**
   * Build info message with Tidepool profile data
   */
  private buildTidepoolInfoMessage(tidepoolData: TidepoolUserData): string {
    const lines: string[] = [];

    // Status
    lines.push(
      `${this.translationService.instant('profile.tidepoolInfo.status')}: ${this.translationService.instant('profile.connected')}`
    );

    // User ID
    if (this.authState?.userId) {
      lines.push(
        `${this.translationService.instant('profile.tidepoolInfo.userId')}: ${this.authState.userId}`
      );
    }

    // Profile info from Tidepool
    if (tidepoolData.profile) {
      if (tidepoolData.profile.fullName) {
        lines.push(
          `${this.translationService.instant('profile.tidepoolInfo.fullName')}: ${tidepoolData.profile.fullName}`
        );
      }
      if (tidepoolData.profile.patient?.birthday) {
        lines.push(
          `${this.translationService.instant('profile.tidepoolInfo.birthday')}: ${tidepoolData.profile.patient.birthday}`
        );
      }
      if (tidepoolData.profile.patient?.diagnosisDate) {
        lines.push(
          `${this.translationService.instant('profile.tidepoolInfo.diagnosisDate')}: ${tidepoolData.profile.patient.diagnosisDate}`
        );
      }
      if (tidepoolData.profile.patient?.targetTimezone) {
        lines.push(
          `${this.translationService.instant('profile.tidepoolInfo.timezone')}: ${tidepoolData.profile.patient.targetTimezone}`
        );
      }
    }

    // Data sources from Tidepool (informational only)
    if (tidepoolData.dataSourcesCount > 0) {
      lines.push(
        `${this.translationService.instant('profile.tidepoolInfo.dataSources')}: ${tidepoolData.dataSourcesCount}`
      );
      const sourceNames = tidepoolData.dataSources
        .map(s => s.providerName || s.providerType || 'Unknown')
        .slice(0, 3)
        .join(', ');
      lines.push(
        `${this.translationService.instant('profile.tidepoolInfo.providers')}: ${sourceNames}`
      );
    }

    return lines.join('\n\n');
  }

  /**
   * Open Terms of Service
   */
  async openTermsOfService(): Promise<void> {
    const toast = await this.toastController.create({
      message: this.translationService.instant('common.comingSoon'),
      duration: 2000,
      position: 'bottom',
      color: 'medium',
    });
    await toast.present();
  }

  /**
   * Open Privacy Policy
   */
  async openPrivacyPolicy(): Promise<void> {
    const toast = await this.toastController.create({
      message: this.translationService.instant('common.comingSoon'),
      duration: 2000,
      position: 'bottom',
      color: 'medium',
    });
    await toast.present();
  }

  /**
   * Edit user age
   */
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
              } catch {
                // Age update failed - handled silently
              }
            }
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Edit username
   */
  async editUsername(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translationService.instant('profile.username'),
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: this.translationService.instant('profile.firstName'),
          value: this.profile?.name || '',
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
            const name = data.name?.trim();
            if (name) {
              try {
                await this.profileService.updateProfile({ name });
                this.refreshProfileDisplay();
              } catch {
                // Name update failed - handled silently
              }
            }
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Edit profile - update name, surname, email on backend
   */
  async editProfile(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translationService.instant('profile.editProfile'),
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: this.translationService.instant('profile.editForm.name'),
          value: this.profile?.name || '',
        },
        {
          name: 'surname',
          type: 'text',
          placeholder: this.translationService.instant('profile.editForm.surname'),
          value: '', // Backend doesn't store surname in local profile
        },
        {
          name: 'email',
          type: 'email',
          placeholder: this.translationService.instant('profile.editForm.email'),
          value: this.profile?.email || '',
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
            const updates: Record<string, string> = {};

            if (data.name?.trim()) {
              updates['name'] = data.name.trim();
            }
            if (data.surname?.trim()) {
              updates['surname'] = data.surname.trim();
            }
            if (data.email?.trim()) {
              updates['email'] = data.email.trim();
            }

            if (Object.keys(updates).length === 0) {
              return; // No changes
            }

            // Show loading
            const loading = await this.loadingController.create({
              message: this.translationService.instant('common.saving'),
            });
            await loading.present();

            try {
              // Update on backend
              await this.profileService.updateProfileOnBackend(updates);

              // Update local profile (name and email only)
              const localUpdates: Record<string, string> = {};
              if (updates['name']) localUpdates['name'] = updates['name'];
              if (updates['email']) localUpdates['email'] = updates['email'];

              if (Object.keys(localUpdates).length > 0) {
                await this.profileService.updateProfile(localUpdates);
              }

              await loading.dismiss();

              // Show success
              const toast = await this.toastController.create({
                message: this.translationService.instant('profile.editForm.success'),
                duration: 2000,
                color: 'success',
                position: 'bottom',
              });
              await toast.present();

              this.refreshProfileDisplay();
            } catch (error) {
              await loading.dismiss();

              // Show error
              const errorAlert = await this.alertController.create({
                header: this.translationService.instant('common.error'),
                message: this.translationService.instant('profile.editForm.error'),
                buttons: ['OK'],
              });
              await errorAlert.present();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Listen for language changes emitted by the translation service
   */
  private subscribeToLanguageChanges(): void {
    this.translationService.currentLanguage$.pipe(takeUntil(this.destroy$)).subscribe(language => {
      this.currentLanguage = language;
    });
  }

  private getFirstName(): string {
    const name = this.profile?.name || this.profileData?.name || '';
    const trimmed = name.trim();
    if (!trimmed) {
      return this.translationService.instant('profile.defaultName');
    }

    const [first] = trimmed.split(' ');
    return first || trimmed;
  }

  private getDiabetesTypeLabel(): string | null {
    if (!this.profile?.diabetesType) {
      return null;
    }
    const key = `profile.${this.profile.diabetesType}`;
    return this.translationService.instant(key);
  }

  private getDiagnosisLabel(): string | null {
    if (!this.profile?.diagnosisDate) {
      return null;
    }

    const formatted = this.formatDateValue(this.profile.diagnosisDate);
    if (!formatted) {
      return null;
    }

    return this.translationService.instant('profile.diagnosisSummary', {
      date: formatted,
    });
  }

  private formatDateValue(value: string): string | null {
    if (!value) {
      return null;
    }

    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return null;
      }

      const locale = this.currentLanguage === 'es' ? 'es-ES' : 'en-US';
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch {
      return null;
    }
  }

  triggerAvatarUpload(): void {
    this.avatarInput?.nativeElement.click();
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }

    // Reset the input so selecting the same file again still triggers change event
    input.value = '';

    if (file.size > 3 * 1024 * 1024) {
      await this.presentAvatarError('profile.avatar.tooLarge');
      return;
    }

    try {
      const imagePath = await this.resizeAndReadImage(file);
      const updatedProfile = await this.profileService.updateProfile({
        avatar: {
          id: 'custom-avatar',
          name: file.name || 'Custom',
          imagePath,
          category: 'custom',
        },
      });
      this.profile = updatedProfile;
      this.refreshProfileDisplay();
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

  private refreshProfileDisplay(): void {
    if (this.profile) {
      this.profileData = {
        name: this.profile.name || this.translationService.instant('profile.defaultName'),
        email:
          this.profile.tidepoolConnection.email ||
          this.translationService.instant('profile.noEmail'),
        memberSince: this.formatMemberSince(),
        avatarUrl: this.profile.avatar?.imagePath,
      };
    } else if (this.authState?.isAuthenticated) {
      this.profileData = {
        name: this.authState.userId || this.translationService.instant('profile.defaultName'),
        email: this.authState.email || this.translationService.instant('profile.noEmail'),
        memberSince: this.translationService.instant('profile.memberSince.recent'),
        avatarUrl: undefined,
      };
    }
  }
}
