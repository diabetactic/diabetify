import { Injectable } from '@angular/core';
import { LoggerService } from '@services/logger.service';
import { Preferences } from '@capacitor/preferences';

/**
 * SecureStorageService - Hardware-backed secure storage for sensitive data
 *
 * Uses @aparajita/capacitor-secure-storage which provides:
 * - Android: Keystore-backed EncryptedSharedPreferences (AES-256-GCM)
 * - iOS: Keychain with kSecAttrAccessibleAfterFirstUnlock
 * - Web: Falls back to localStorage (with warning)
 *
 * SECURITY: This service should be used for ALL sensitive data including:
 * - Access tokens
 * - Refresh tokens
 * - User credentials
 * - PHI (Protected Health Information)
 */
@Injectable({
  providedIn: 'root',
})
export class SecureStorageService {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  // Migration flags
  private readonly MIGRATION_COMPLETE_KEY = 'secure_storage_migration_v1';

  constructor(private logger: LoggerService) {
    this.initPromise = this.initialize();
  }

  /**
   * Initialize secure storage plugin
   * Dynamically imports to avoid issues on web platform
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');

      // Test that secure storage is working
      const testKey = '__secure_storage_test__';
      await SecureStorage.set(testKey, 'test');
      await SecureStorage.remove(testKey);

      this.isInitialized = true;
      this.logger.info('SecureStorage', 'Initialized successfully with hardware-backed encryption');
    } catch (error) {
      this.logger.warn(
        'SecureStorage',
        'Hardware-backed storage unavailable, using fallback',
        error
      );
      // On web or if plugin fails, we'll fall back to Preferences
      // This is less secure but maintains functionality
      this.isInitialized = true;
    }
  }

  /**
   * Wait for initialization to complete
   */
  async waitForInit(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Set a value in secure storage
   * @param key Storage key
   * @param value Value to store (will be JSON stringified if object)
   */
  async set(key: string, value: string | object): Promise<void> {
    await this.waitForInit();

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    try {
      const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
      await SecureStorage.set(key, stringValue);
      this.logger.debug('SecureStorage', `Set key: ${key} (encrypted)`);
    } catch {
      // Fallback to Preferences on web
      this.logger.warn('SecureStorage', `Fallback to Preferences for key: ${key}`);
      await Preferences.set({ key, value: stringValue });
    }
  }

  /**
   * Get a value from secure storage
   * @param key Storage key
   * @returns The stored value or null if not found
   */
  async get(key: string): Promise<string | null> {
    await this.waitForInit();

    try {
      const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
      const value = await SecureStorage.get(key);
      // SecureStorage.get returns DataType (string | number | boolean | object) | null
      // We always store strings, so convert to string if not null
      if (value === null || value === undefined) return null;
      return typeof value === 'string' ? value : String(value);
    } catch {
      // Fallback to Preferences on web
      const { value } = await Preferences.get({ key });
      return value ?? null;
    }
  }

  /**
   * Get and parse a JSON value from secure storage
   * @param key Storage key
   * @returns Parsed object or null if not found/invalid
   */
  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      this.logger.warn('SecureStorage', `Failed to parse JSON for key: ${key}`);
      return null;
    }
  }

  /**
   * Remove a value from secure storage
   * @param key Storage key
   */
  async remove(key: string): Promise<void> {
    await this.waitForInit();

    try {
      const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
      await SecureStorage.remove(key);
    } catch {
      // Fallback to Preferences
      await Preferences.remove({ key });
    }

    this.logger.debug('SecureStorage', `Removed key: ${key}`);
  }

  /**
   * Check if a key exists in secure storage
   * @param key Storage key
   * @returns True if key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Clear all secure storage data
   * WARNING: This will delete ALL stored credentials
   */
  async clear(): Promise<void> {
    await this.waitForInit();

    try {
      const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
      await SecureStorage.clear();
    } catch {
      // Cannot clear all Preferences as it may contain non-auth data
      this.logger.warn('SecureStorage', 'Clear not available on fallback storage');
    }

    this.logger.info('SecureStorage', 'Cleared all secure storage');
  }

  /**
   * Migrate data from insecure Preferences to SecureStorage
   * This is a one-time migration for existing installations
   *
   * @param keys Array of keys to migrate
   * @returns True if migration was performed, false if already migrated
   */
  async migrateFromPreferences(keys: string[]): Promise<boolean> {
    await this.waitForInit();

    // Check if migration already completed
    const migrationComplete = await Preferences.get({ key: this.MIGRATION_COMPLETE_KEY });
    if (migrationComplete.value === 'true') {
      this.logger.debug('SecureStorage', 'Migration already completed');
      return false;
    }

    this.logger.info('SecureStorage', 'Starting migration from Preferences', {
      keyCount: keys.length,
    });

    let migratedCount = 0;

    for (const key of keys) {
      try {
        // Read from old insecure storage
        const { value } = await Preferences.get({ key });

        if (value) {
          // Write to secure storage
          await this.set(key, value);

          // Remove from insecure storage
          await Preferences.remove({ key });

          migratedCount++;
          this.logger.debug('SecureStorage', `Migrated key: ${key}`);
        }
      } catch (error) {
        this.logger.error('SecureStorage', `Failed to migrate key: ${key}`, error);
        // Continue with other keys even if one fails
      }
    }

    // Mark migration as complete
    await Preferences.set({ key: this.MIGRATION_COMPLETE_KEY, value: 'true' });

    this.logger.info('SecureStorage', 'Migration completed', {
      migratedCount,
      totalKeys: keys.length,
    });
    return true;
  }

  /**
   * Check if running on a platform with hardware-backed secure storage
   * @returns True if hardware encryption is available
   */
  async isHardwareBackedAvailable(): Promise<boolean> {
    try {
      const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
      // Test write/read to verify functionality
      const testKey = '__hw_test__';
      await SecureStorage.set(testKey, 'test');
      const result = await SecureStorage.get(testKey);
      await SecureStorage.remove(testKey);
      return result === 'test';
    } catch {
      return false;
    }
  }
}
