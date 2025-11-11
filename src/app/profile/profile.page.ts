import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, AlertController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TidepoolAuthService, AuthState } from '../core/services/tidepool-auth.service';
import { ProfileService } from '../core/services/profile.service';
import { ThemeService } from '../core/services/theme.service';
import { TranslationService, Language } from '../core/services/translation.service';
import { TidepoolSyncService } from '../core/services/tidepool-sync.service';
import { UserProfile, ThemeMode } from '../core/models/user-profile.model';
import { SyncStatus } from '../core/models/tidepool-sync.model';
interface ProfileDisplayData {
  name: string;
  email: string;
  memberSince: string;
  avatarUrl?: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FormsModule, TranslateModule],
})
export class ProfilePage implements OnInit, OnDestroy {
  // User data
  profileData: ProfileDisplayData | null = null;
  profile: UserProfile | null = null;
  authState: AuthState | null = null;

  // Tidepool connection
  isConnected = false;
  lastSyncTime: string | null = null;
  syncStatus: SyncStatus | null = null;

  // Preferences
  currentTheme: ThemeMode = 'auto';
  currentLanguage!: Language;
  currentGlucoseUnit = 'mg/dL';

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
    private syncService: TidepoolSyncService,
    private router: Router,
    private alertController: AlertController
  ) {
    this.currentLanguage = this.translationService.getCurrentLanguage();
  }

  ngOnInit(): void {
    this.loadUserData();
    this.subscribeToAuthState();
    this.subscribeToProfile();
    this.subscribeToSyncStatus();
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
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }

  /**
   * Subscribe to authentication state changes
   */
  private subscribeToAuthState(): void {
    this.authService.authState.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.authState = state;
      this.isConnected = state.isAuthenticated;

      if (state.isAuthenticated) {
        this.profileData = {
          name: state.userId || this.translationService.instant('profile.defaultName'),
          email: state.email || this.translationService.instant('profile.noEmail'),
          memberSince: this.formatMemberSince(),
          avatarUrl: this.profile?.avatar?.imagePath,
        };
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
      }
    });
  }

  /**
   * Subscribe to sync status changes
   */
  private subscribeToSyncStatus(): void {
    this.syncService.syncStatus$.pipe(takeUntil(this.destroy$)).subscribe(status => {
      this.syncStatus = status;
      if (status.lastSyncTime) {
        this.lastSyncTime = status.lastSyncTime;
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
   */
  get emailText(): string {
    const email = this.profileData?.email ?? this.profile?.tidepoolConnection?.email ?? '';
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
  async onThemeChange(event: any): Promise<void> {
    const theme = event.detail.value as ThemeMode;
    await this.themeService.setThemeMode(theme);
    this.currentTheme = theme;
  }

  /**
   * Handle language change
   */
  async onLanguageChange(event: any): Promise<void> {
    const language = event.detail.value as Language;
    // Update translation service (this will also save to preferences)
    await this.translationService.setLanguage(language);
    await this.profileService.updatePreferences({ language });
  }

  /**
   * Handle glucose unit change
   */
  async onGlucoseUnitChange(event: any): Promise<void> {
    const unit = event.detail.value;
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
   * Connect to Tidepool
   */
  private async connectToTidepool(): Promise<void> {
    try {
      await this.authService.login();
    } catch (error) {
      console.error('Failed to connect to Tidepool:', error);
    }
  }

  /**
   * Disconnect from Tidepool
   */
  private async disconnectFromTidepool(): Promise<void> {
    try {
      await this.authService.logout();
      await this.profileService.clearTidepoolCredentials();
    } catch (error) {
      console.error('Failed to disconnect from Tidepool:', error);
    }
  }

  /**
   * Handle sign out
   */
  async onSignOut(): Promise<void> {
    try {
      await this.authService.logout();
      await this.profileService.deleteProfile();
      await this.router.navigate(['/welcome'], { replaceUrl: true });
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }

  /**
   * Open Terms of Service
   */
  openTermsOfService(): void {
    // TODO: Implement navigation to terms page or open in browser
    console.log('Opening Terms of Service...');
  }

  /**
   * Open Privacy Policy
   */
  openPrivacyPolicy(): void {
    // TODO: Implement navigation to privacy page or open in browser
    console.log('Opening Privacy Policy...');
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
          value: this.profile?.age || 10,
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
              } catch (error) {
                console.error('Failed to update age:', error);
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
    // TODO: Implement username edit dialog
    console.log('Edit username...');
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
    } catch (error) {
      console.warn('Failed to format date value', error);
      return null;
    }
  }
}
