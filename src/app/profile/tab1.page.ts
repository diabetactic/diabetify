import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TidepoolAuthService, AuthState } from '../core/services/tidepool-auth.service';
import { ProfileService } from '../core/services/profile.service';
import { ThemeService } from '../core/services/theme.service';
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
  selector: 'app-tab1',
  templateUrl: './profile.html',
  styleUrls: ['./tab1.page.scss'],
})
export class Tab1Page implements OnInit, OnDestroy {
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
  currentLanguage = 'en';
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
    private syncService: TidepoolSyncService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.subscribeToAuthState();
    this.subscribeToProfile();
    this.subscribeToSyncStatus();
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
        this.currentLanguage = profile.preferences.language;
        this.currentGlucoseUnit = profile.preferences.glucoseUnit;
      }
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
          name: state.userId || 'User',
          email: state.email || 'No email',
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
        this.currentLanguage = profile.preferences.language;
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
      return 'Recently joined';
    }

    const createdDate = new Date(this.profile.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return 'Recently joined';
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `Member for ${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `Member for ${years} year${years > 1 ? 's' : ''}`;
    }
  }

  /**
   * Format last sync time
   */
  formatLastSyncTime(): string {
    if (!this.lastSyncTime) {
      return 'Never synced';
    }

    const syncDate = new Date(this.lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
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
    const language = event.detail.value;
    await this.profileService.updatePreferences({ language });
    this.currentLanguage = language;
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
      // Navigate to login or onboarding screen
      // this.router.navigate(['/login']);
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
    // TODO: Implement age edit dialog
    console.log('Edit age...');
  }

  /**
   * Edit username
   */
  async editUsername(): Promise<void> {
    // TODO: Implement username edit dialog
    console.log('Edit username...');
  }
}
