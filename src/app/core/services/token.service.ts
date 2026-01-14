import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { SecureStorageService } from '@services/secure-storage.service';
import { LoggerService } from '@services/logger.service';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'local_access_token',
  REFRESH_TOKEN: 'local_refresh_token',
  EXPIRES_AT: 'local_token_expires',
};

const SECURE_STORAGE_KEYS = [STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN];

export interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private tokenState$ = new BehaviorSubject<TokenState>({
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  });

  private initializationPromise: Promise<void>;
  private initializationResolve!: () => void;

  constructor(
    private secureStorage: SecureStorageService,
    private logger: LoggerService
  ) {
    this.initializationPromise = new Promise<void>(resolve => {
      this.initializationResolve = resolve;
    });
    this.initializeFromStorage();
  }

  private async initializeFromStorage(): Promise<void> {
    try {
      await this.secureStorage.migrateFromPreferences(SECURE_STORAGE_KEYS);

      const [accessToken, refreshToken, expiresAtStr] = await Promise.all([
        this.secureStorage.get(STORAGE_KEYS.ACCESS_TOKEN),
        this.secureStorage.get(STORAGE_KEYS.REFRESH_TOKEN),
        Preferences.get({ key: STORAGE_KEYS.EXPIRES_AT }),
      ]);

      const expiresAt = expiresAtStr.value ? parseInt(expiresAtStr.value, 10) : null;

      if (accessToken) {
        this.tokenState$.next({
          accessToken,
          refreshToken,
          expiresAt,
        });
        this.logger.info('Token', 'Tokens restored from secure storage');
      }
    } catch (error) {
      this.logger.error('Token', 'Failed to initialize tokens', error);
    } finally {
      this.initializationResolve();
    }
  }

  async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  async getAccessToken(): Promise<string | null> {
    await this.initializationPromise;
    return this.tokenState$.value.accessToken;
  }

  async getRefreshToken(): Promise<string | null> {
    await this.initializationPromise;
    return this.tokenState$.value.refreshToken;
  }

  getTokenState(): Observable<TokenState> {
    return this.tokenState$.asObservable();
  }

  isTokenExpired(): boolean {
    const { expiresAt } = this.tokenState$.value;
    if (!expiresAt) return true;
    return Date.now() >= expiresAt;
  }

  getExpiresAt(): number | null {
    return this.tokenState$.value.expiresAt;
  }

  async setTokens(
    accessToken: string,
    refreshToken: string | null,
    expiresInSeconds: number
  ): Promise<void> {
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    this.tokenState$.next({
      accessToken,
      refreshToken,
      expiresAt,
    });

    await Promise.all([
      this.secureStorage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
      refreshToken
        ? this.secureStorage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
        : Promise.resolve(),
      Preferences.set({
        key: STORAGE_KEYS.EXPIRES_AT,
        value: expiresAt.toString(),
      }),
    ]);

    this.logger.info('Token', 'Tokens stored securely', {
      hasAccessToken: true,
      hasRefreshToken: Boolean(refreshToken),
      expiresAt: new Date(expiresAt).toISOString(),
    });
  }

  async clearTokens(): Promise<void> {
    this.tokenState$.next({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });

    await Promise.all([
      this.secureStorage.remove(STORAGE_KEYS.ACCESS_TOKEN),
      this.secureStorage.remove(STORAGE_KEYS.REFRESH_TOKEN),
      Preferences.remove({ key: STORAGE_KEYS.EXPIRES_AT }),
    ]);

    this.logger.info('Token', 'Tokens cleared from secure storage');
  }
}
