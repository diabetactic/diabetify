/**
 * ProfileService - Manages user profile and preferences
 * Uses Capacitor Preferences API for persistent profile storage
 * Uses @aparajita/capacitor-secure-storage for sensitive credentials
 * (iOS Keychain, Android KeyStore with native encryption)
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import {
  UserProfile,
  CreateUserProfileInput,
  UpdateUserProfileInput,
  DEFAULT_USER_PREFERENCES,
  AccountState,
} from '@models/user-profile.model';
import { TidepoolAuth } from '@models/tidepool-auth.model';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoggerService } from '@services/logger.service';

/**
 * Backend user update payload (PATCH /users/me)
 * Fields from backend User model that can be updated
 */
export interface BackendUserUpdate {
  dni?: string;
  password?: string;
  name?: string;
  surname?: string;
  email?: string;
  tidepool?: string;
  hospital_account?: string;
}

/**
 * Storage keys for Capacitor Preferences
 */
const STORAGE_KEYS = {
  PROFILE: 'diabetactic_user_profile',
  TIDEPOOL_AUTH: 'diabetactic_tidepool_auth',
  SCHEMA_VERSION: 'diabetactic_schema_version',
} as const;

/**
 * Current schema version for migration
 */
const CURRENT_SCHEMA_VERSION = 1;

@Injectable({
  providedIn: 'root',
})
export class ProfileService implements OnDestroy {
  // Reactive profile state
  private _profile$ = new BehaviorSubject<UserProfile | null>(null);
  public readonly profile$ = this._profile$.asObservable();

  // Reactive Tidepool connection status
  private _tidepoolConnected$ = new BehaviorSubject<boolean>(false);
  public readonly tidepoolConnected$ = this._tidepoolConnected$.asObservable();

  constructor(
    private apiGateway: ApiGatewayService,
    private logger: LoggerService
  ) {
    this.initialize();
  }

  /**
   * Clean up subscriptions when service is destroyed
   * Prevents memory leaks from uncompleted BehaviorSubjects
   */
  ngOnDestroy(): void {
    this._profile$.complete();
    this._tidepoolConnected$.complete();
  }

  /**
   * Initialize service and load profile
   */
  private async initialize(): Promise<void> {
    try {
      // Check and run migrations if needed
      await this.runMigrations();

      // Load profile from storage
      const profile = await this.getProfile();

      if (profile) {
        this._profile$.next(profile);
        this._tidepoolConnected$.next(profile.tidepoolConnection.connected);
      }
    } catch (error) {
      this.logger.error('ProfileService', 'Failed to initialize ProfileService', error);
    }
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<UserProfile | null> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEYS.PROFILE });

      if (!value) {
        return null;
      }

      const profile: UserProfile = JSON.parse(value);

      // Ensure profile has all required preferences with defaults
      if (!profile.preferences) {
        profile.preferences = DEFAULT_USER_PREFERENCES;
      } else {
        profile.preferences = {
          ...DEFAULT_USER_PREFERENCES,
          ...profile.preferences,
        };
      }

      return profile;
    } catch (error) {
      this.logger.error('ProfileService', 'Failed to get profile', error);
      return null;
    }
  }

  /**
   * Create a new user profile
   */
  async createProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    const now = new Date().toISOString();

    const profile: UserProfile = {
      id: this.generateUserId(),
      name: input.name,
      email: input.email,
      age: input.age,
      accountState: input.accountState || AccountState.PENDING,
      dateOfBirth: input.dateOfBirth,
      avatar: input.avatar,
      tidepoolConnection: input.tidepoolConnection || {
        connected: false,
      },
      preferences: input.preferences || DEFAULT_USER_PREFERENCES,
      createdAt: now,
      updatedAt: now,
      diagnosisDate: input.diagnosisDate,
      diabetesType: input.diabetesType,
      healthcareProvider: input.healthcareProvider,
      emergencyContact: input.emergencyContact,
      notes: input.notes,
      hasCompletedOnboarding: input.hasCompletedOnboarding ?? false,
    };

    await this.saveProfile(profile);
    return profile;
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: UpdateUserProfileInput): Promise<UserProfile> {
    const currentProfile = await this.getProfile();

    if (!currentProfile) {
      throw new Error('No profile found. Create a profile first.');
    }

    const updatedProfile: UserProfile = {
      ...currentProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.saveProfile(updatedProfile);
    return updatedProfile;
  }

  /**
   * Update user preferences only
   */
  async updatePreferences(prefs: Partial<UserProfile['preferences']>): Promise<UserProfile> {
    const currentProfile = await this.getProfile();

    if (!currentProfile) {
      throw new Error('No profile found. Create a profile first.');
    }

    const updatedProfile: UserProfile = {
      ...currentProfile,
      preferences: {
        ...currentProfile.preferences,
        ...prefs,
      },
      updatedAt: new Date().toISOString(),
    };

    await this.saveProfile(updatedProfile);
    return updatedProfile;
  }

  /**
   * Update user profile on backend via PATCH /users/me
   * Updates name, surname, email fields on the backend
   */
  async updateProfileOnBackend(updates: BackendUserUpdate): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.apiGateway.request('extservices.users.update', {
          body: updates,
        })
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update profile on backend');
      }

      // Clear cache to force re-fetch on next GET /users/me
      this.apiGateway.clearCache('extservices.users.me');
    } catch (error) {
      this.logger.error('ProfileService', 'Failed to update profile on backend', error);
      throw error;
    }
  }

  /**
   * Update user profile on backend (PATCH /users/me)
   * @param updates - Fields to update
   * @returns Updated user data from backend
   */
  async updateBackendProfile(updates: BackendUserUpdate): Promise<BackendUserUpdate> {
    try {
      const response = await firstValueFrom(
        this.apiGateway.request<BackendUserUpdate>('extservices.users.update', {
          body: updates,
        })
      );

      if (response.success && response.data) {
        // Update local profile with new data
        const currentProfile = await this.getProfile();
        if (currentProfile) {
          const updatedProfile = {
            ...currentProfile,
            name: updates.name || currentProfile.name,
            email: updates.email || currentProfile.email,
          };
          await this.saveProfile(updatedProfile);
        }
        return response.data;
      }

      throw new Error(response.error?.message || 'Failed to update profile');
    } catch (error) {
      this.logger.error('ProfileService', 'Failed to update backend profile', error);
      throw error;
    }
  }

  /**
   * Delete user profile
   */
  async deleteProfile(): Promise<void> {
    await Preferences.remove({ key: STORAGE_KEYS.PROFILE });
    await this.clearTidepoolCredentials();
    this._profile$.next(null);
    this._tidepoolConnected$.next(false);
  }

  /**
   * Set Tidepool authentication credentials
   * Stores credentials securely using native platform encryption
   * (iOS Keychain, Android KeyStore)
   */
  async setTidepoolCredentials(auth: TidepoolAuth): Promise<void> {
    try {
      // Store credentials using SecureStorage (native encryption)
      // Cast to Record to satisfy SecureStorage's DataType requirement
      await SecureStorage.set(
        STORAGE_KEYS.TIDEPOOL_AUTH,
        auth as unknown as Record<string, unknown>
      );

      // Update profile connection status
      const profile = await this.getProfile();
      if (profile) {
        profile.tidepoolConnection = {
          connected: true,
          userId: auth.userId,
          email: auth.email,
          connectedAt: new Date().toISOString(),
          lastSyncTime: undefined,
        };
        await this.saveProfile(profile);
      }

      // TODO: Patch backend with Tidepool dashboard link when endpoint is implemented
      // The backend User model has 'tidepool' field (login/app/models/user_model.py:14)
      // but needs PATCH /users/tidepool endpoint to be created
      // Dashboard link format: https://app.tidepool.org/patients/${auth.userId}/data

      this._tidepoolConnected$.next(true);
    } catch (error) {
      this.logger.error('ProfileService', 'Failed to set Tidepool credentials', error);
      throw new Error('Failed to save authentication credentials');
    }
  }

  /**
   * Get Tidepool authentication credentials
   * Retrieves from native secure storage (iOS Keychain, Android KeyStore)
   */
  async getTidepoolCredentials(): Promise<TidepoolAuth | null> {
    try {
      // Retrieve credentials from SecureStorage (native encryption)
      const auth = (await SecureStorage.get(STORAGE_KEYS.TIDEPOOL_AUTH)) as TidepoolAuth | null;

      if (!auth) {
        return null;
      }

      // Check if token is expired
      if (auth.expiresAt && auth.expiresAt < Date.now()) {
        this.logger.warn('ProfileService', 'Tidepool auth token expired');
        // Don't clear automatically - let the auth service handle refresh
      }

      return auth;
    } catch (error) {
      this.logger.error('ProfileService', 'Failed to get Tidepool credentials', error);
      return null;
    }
  }

  /**
   * Clear Tidepool authentication credentials
   * Removes from native secure storage
   */
  async clearTidepoolCredentials(): Promise<void> {
    await SecureStorage.remove(STORAGE_KEYS.TIDEPOOL_AUTH);

    // Update profile connection status
    const profile = await this.getProfile();
    if (profile) {
      profile.tidepoolConnection = {
        connected: false,
      };
      await this.saveProfile(profile);
    }

    this._tidepoolConnected$.next(false);
  }

  /**
   * Update Tidepool last sync time
   */
  async updateLastSyncTime(): Promise<void> {
    const profile = await this.getProfile();
    if (profile?.tidepoolConnection.connected) {
      profile.tidepoolConnection.lastSyncTime = new Date().toISOString();
      await this.saveProfile(profile);
    }
  }

  /**
   * Check if user has a profile
   */
  async hasProfile(): Promise<boolean> {
    const profile = await this.getProfile();
    return profile !== null;
  }

  /**
   * Check if Tidepool is connected
   */
  async isTidepoolConnected(): Promise<boolean> {
    const auth = await this.getTidepoolCredentials();
    return auth !== null && !this.isTokenExpired(auth);
  }

  // === Private Helper Methods ===

  /**
   * Save profile to storage and update observables
   */
  private async saveProfile(profile: UserProfile): Promise<void> {
    const json = JSON.stringify(profile);
    await Preferences.set({
      key: STORAGE_KEYS.PROFILE,
      value: json,
    });

    this._profile$.next(profile);
    this._tidepoolConnected$.next(profile.tidepoolConnection.connected);
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(auth: TidepoolAuth): boolean {
    if (!auth.expiresAt) {
      return false;
    }
    // Add 5 minute buffer
    return auth.expiresAt - 5 * 60 * 1000 < Date.now();
  }

  /**
   * Run schema migrations
   */
  private async runMigrations(): Promise<void> {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.SCHEMA_VERSION });
    const currentVersion = value ? parseInt(value, 10) : 0;

    if (currentVersion < CURRENT_SCHEMA_VERSION) {
      this.logger.info(
        'ProfileService',
        `Running migrations from version ${currentVersion} to ${CURRENT_SCHEMA_VERSION}`
      );

      // Run migrations sequentially
      for (let version = currentVersion + 1; version <= CURRENT_SCHEMA_VERSION; version++) {
        await this.migrate(version);
      }

      // Update schema version
      await Preferences.set({
        key: STORAGE_KEYS.SCHEMA_VERSION,
        value: CURRENT_SCHEMA_VERSION.toString(),
      });
    }
  }

  /**
   * Execute migration for specific version
   */
  private async migrate(toVersion: number): Promise<void> {
    this.logger.info('ProfileService', `Migrating to version ${toVersion}`);

    switch (toVersion) {
      case 1:
        await this.migrateToV1();
        break;
      // Add future migrations here
      default:
        this.logger.warn('ProfileService', `No migration defined for version ${toVersion}`);
    }
  }

  /**
   * Migration to version 1 - Initial schema
   */
  private async migrateToV1(): Promise<void> {
    // Check if there's an old profile format and migrate it
    const profile = await this.getProfile();

    if (profile) {
      // Ensure all new fields exist
      const migratedProfile: UserProfile = {
        ...profile,
        preferences: {
          ...DEFAULT_USER_PREFERENCES,
          ...(profile.preferences || {}),
        },
        tidepoolConnection: profile.tidepoolConnection || {
          connected: false,
        },
      };

      await this.saveProfile(migratedProfile);
      this.logger.info('ProfileService', 'Profile migrated to v1');
    }
  }

  /**
   * Export profile data (for backup/transfer)
   */
  async exportProfile(): Promise<string> {
    const profile = await this.getProfile();
    if (!profile) {
      throw new Error('No profile to export');
    }

    // Don't include credentials in export for security
    const exportData = {
      ...profile,
      tidepoolConnection: {
        connected: false,
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import profile data (from backup/transfer)
   */
  async importProfile(jsonData: string): Promise<UserProfile> {
    try {
      const importedProfile: UserProfile = JSON.parse(jsonData);

      // Validate required fields
      if (!importedProfile.name || !importedProfile.age) {
        throw new Error('Invalid profile data: missing required fields');
      }

      // Generate new IDs and timestamps
      const now = new Date().toISOString();
      const profile: UserProfile = {
        ...importedProfile,
        id: this.generateUserId(),
        createdAt: now,
        updatedAt: now,
        tidepoolConnection: {
          connected: false,
        },
      };

      await this.saveProfile(profile);
      return profile;
    } catch (error) {
      this.logger.error('ProfileService', 'Failed to import profile', error);
      throw new Error('Invalid profile data');
    }
  }
}
