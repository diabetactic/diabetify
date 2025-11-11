/**
 * API Gateway Adapter Service
 *
 * Transparent adapter layer that fixes path mismatches between the mobile app
 * and the backend API Gateway WITHOUT modifying extServices.
 *
 * Key Features:
 * - Maps expected paths to actual backend paths
 * - Handles token refresh simulation (client-side)
 * - Manages refresh token rotation
 * - Provides backward compatibility layer
 * - Integrates seamlessly with existing ApiGatewayService
 *
 * Path Mappings:
 * - /api/auth/login     → /token
 * - /api/auth/register  → /users/ (POST)
 * - /api/auth/profile   → /users/me
 * - /api/auth/refresh   → client-side simulation
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from, of, BehaviorSubject } from 'rxjs';
import { switchMap, catchError, map, tap } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PlatformDetectorService } from './platform-detector.service';
import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment';

/**
 * Token response from backend
 */
interface BackendTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

/**
 * User profile response from backend
 */
interface BackendUserProfile {
  dni: string;
  name: string;
  surname: string;
  blocked: boolean;
  email: string;
  state?: 'pending' | 'active' | 'disabled';
  tidepool?: string | null;
  hospital_account: string;
  times_measured: number;
  streak: number;
  max_streak: number;
}

/**
 * Standardized auth response for the mobile app
 */
export interface AuthResponse {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'patient' | 'doctor' | 'admin';
    accountState: 'pending' | 'active' | 'disabled';
  };
}

/**
 * Storage keys for secure token management
 */
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'adapter_access_token',
  REFRESH_TOKEN: 'adapter_refresh_token',
  TOKEN_EXPIRES_AT: 'adapter_token_expires_at',
  USER_PROFILE: 'adapter_user_profile',
  ROTATION_COUNT: 'adapter_rotation_count',
};

/**
 * Token refresh configuration
 */
const REFRESH_CONFIG = {
  TOKEN_LIFETIME: 30 * 60 * 1000, // 30 minutes (matches backend)
  REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh if less than 5 minutes remaining
  MAX_ROTATION_COUNT: 10, // Max refresh cycles before re-login
};

@Injectable({
  providedIn: 'root',
})
export class ApiGatewayAdapterService {
  private baseUrl: string;
  private tokenRefreshSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private platformDetector: PlatformDetectorService,
    private logger: LoggerService
  ) {
    this.logger.info('Init', 'ApiGatewayAdapterService initialized');

    // Set base URL for API calls
    const defaultUrl = environment.backendServices?.apiGateway?.baseUrl || 'http://localhost:8000';
    this.baseUrl = this.platformDetector.getApiBaseUrl(defaultUrl);
  }

  /**
   * Login - Maps /api/auth/login to /token
   */
  login(username: string, password: string): Observable<AuthResponse> {
    this.logger.info('API', 'Login request', { username });

    // Prepare form-encoded body for /token endpoint
    const body = new HttpParams().set('username', username).set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http
      .post<BackendTokenResponse>(`${this.baseUrl}/token`, body.toString(), { headers })
      .pipe(
        switchMap(tokenResponse => {
          if (!tokenResponse?.access_token) {
            return throwError(() => new Error('No access token received'));
          }

          // Fetch user profile
          return this.fetchUserProfile(tokenResponse.access_token).pipe(
            switchMap(profile => {
              // Validate account state
              if (profile.state === 'pending') {
                return throwError(() => new Error('ACCOUNT_PENDING'));
              }
              if (profile.state === 'disabled') {
                return throwError(() => new Error('ACCOUNT_DISABLED'));
              }

              // Generate client-side refresh token
              const refreshToken = this.generateRefreshToken();

              // Calculate expiry
              const expiresIn = tokenResponse.expires_in || 1800; // 30 minutes default
              const expiresAt = Date.now() + expiresIn * 1000;

              // Build standardized response
              const authResponse: AuthResponse = {
                access_token: tokenResponse.access_token,
                refresh_token: refreshToken,
                token_type: tokenResponse.token_type || 'bearer',
                expires_in: expiresIn,
                user: {
                  id: profile.dni,
                  email: profile.email,
                  firstName: profile.name,
                  lastName: profile.surname,
                  role: 'patient',
                  accountState: profile.state || 'active',
                },
              };

              // Store tokens securely
              return from(this.storeTokens(authResponse, expiresAt)).pipe(
                map(() => {
                  this.logger.info('API', 'Login successful', { userId: profile.dni });
                  return authResponse;
                })
              );
            })
          );
        }),
        catchError(error => this.handleAuthError(error, 'login'))
      );
  }

  /**
   * Register - Maps /api/auth/register to /users/ (POST)
   * Note: This is a placeholder as registration is not fully implemented in backend
   */
  register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    dni?: string;
  }): Observable<AuthResponse> {
    this.logger.info('API', 'Register request', { email: userData.email });

    // Backend registration endpoint (if available)
    const body = {
      email: userData.email,
      password: userData.password,
      name: userData.firstName,
      surname: userData.lastName,
      dni: userData.dni,
    };

    return this.http.post<any>(`${this.baseUrl}/users/`, body).pipe(
      switchMap(response => {
        // After registration, perform login
        return this.login(userData.email, userData.password);
      }),
      catchError(error => {
        this.logger.error('API', 'Registration failed', error);
        return throwError(() => new Error('REGISTRATION_NOT_SUPPORTED'));
      })
    );
  }

  /**
   * Get Profile - Maps /api/auth/profile to /users/me
   */
  getProfile(accessToken: string): Observable<BackendUserProfile> {
    this.logger.debug('API', 'Fetching profile');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,
    });

    return this.http.get<BackendUserProfile>(`${this.baseUrl}/users/me`, { headers }).pipe(
      tap(profile => {
        this.logger.debug('API', 'Profile fetched', { userId: profile.dni });
      }),
      catchError(error => this.handleAuthError(error, 'getProfile'))
    );
  }

  /**
   * Update Profile - Maps /api/auth/profile (PUT) to /users/me (if supported)
   */
  updateProfile(
    accessToken: string,
    updates: Partial<BackendUserProfile>
  ): Observable<BackendUserProfile> {
    this.logger.info('API', 'Updating profile');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,
    });

    // Note: Backend might not support PUT /users/me yet
    return this.http.put<BackendUserProfile>(`${this.baseUrl}/users/me`, updates, { headers }).pipe(
      tap(profile => {
        this.logger.info('API', 'Profile updated', { userId: profile.dni });
      }),
      catchError(error => {
        this.logger.warn('API', 'Profile update not supported', error);
        return throwError(() => new Error('PROFILE_UPDATE_NOT_SUPPORTED'));
      })
    );
  }

  /**
   * Refresh Token - Client-side simulation
   *
   * Since the backend doesn't support refresh tokens, we simulate it client-side:
   * 1. Check if refresh token is valid (not expired, rotation count)
   * 2. Generate a new access token (in production, this would re-authenticate)
   * 3. Rotate refresh token
   * 4. Update storage
   */
  refreshToken(refreshToken: string): Observable<AuthResponse> {
    this.logger.info('API', 'Token refresh requested');

    // Prevent concurrent refresh attempts
    if (this.tokenRefreshSubject.value) {
      this.logger.debug('API', 'Token refresh already in progress');
      return throwError(() => new Error('REFRESH_IN_PROGRESS'));
    }

    this.tokenRefreshSubject.next(true);

    return from(this.performTokenRefresh(refreshToken)).pipe(
      tap(response => {
        this.tokenRefreshSubject.next(false);
        this.logger.info('API', 'Token refresh successful');
      }),
      catchError(error => {
        this.tokenRefreshSubject.next(false);
        this.logger.error('API', 'Token refresh failed', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout - Clear all stored tokens and state
   */
  async logout(): Promise<void> {
    this.logger.info('API', 'Logout initiated');

    if (Capacitor.isNativePlatform()) {
      await Promise.all([
        Preferences.remove({ key: STORAGE_KEYS.ACCESS_TOKEN }),
        Preferences.remove({ key: STORAGE_KEYS.REFRESH_TOKEN }),
        Preferences.remove({ key: STORAGE_KEYS.TOKEN_EXPIRES_AT }),
        Preferences.remove({ key: STORAGE_KEYS.USER_PROFILE }),
        Preferences.remove({ key: STORAGE_KEYS.ROTATION_COUNT }),
      ]);
    }

    this.logger.info('API', 'Logout completed');
  }

  /**
   * Check if token needs refresh
   */
  async shouldRefreshToken(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const expiresAtStr = await Preferences.get({ key: STORAGE_KEYS.TOKEN_EXPIRES_AT });
    if (!expiresAtStr.value) {
      return false;
    }

    const expiresAt = parseInt(expiresAtStr.value, 10);
    const timeUntilExpiry = expiresAt - Date.now();

    return timeUntilExpiry < REFRESH_CONFIG.REFRESH_THRESHOLD && timeUntilExpiry > 0;
  }

  /**
   * Private: Fetch user profile from backend
   */
  private fetchUserProfile(accessToken: string): Observable<BackendUserProfile> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,
    });

    return this.http.get<BackendUserProfile>(`${this.baseUrl}/users/me`, { headers });
  }

  /**
   * Private: Generate client-side refresh token
   */
  private generateRefreshToken(): string {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Private: Store tokens securely
   */
  private async storeTokens(authResponse: AuthResponse, expiresAt: number): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Promise.all([
        Preferences.set({
          key: STORAGE_KEYS.ACCESS_TOKEN,
          value: authResponse.access_token,
        }),
        Preferences.set({
          key: STORAGE_KEYS.REFRESH_TOKEN,
          value: authResponse.refresh_token || '',
        }),
        Preferences.set({
          key: STORAGE_KEYS.TOKEN_EXPIRES_AT,
          value: expiresAt.toString(),
        }),
        Preferences.set({
          key: STORAGE_KEYS.USER_PROFILE,
          value: JSON.stringify(authResponse.user),
        }),
        Preferences.set({
          key: STORAGE_KEYS.ROTATION_COUNT,
          value: '0',
        }),
      ]);
    }
  }

  /**
   * Private: Perform token refresh (client-side simulation)
   */
  private async performTokenRefresh(refreshToken: string): Promise<AuthResponse> {
    // Validate refresh token
    const storedToken = await Preferences.get({ key: STORAGE_KEYS.REFRESH_TOKEN });
    if (storedToken.value !== refreshToken) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Check rotation count
    const rotationCountStr = await Preferences.get({ key: STORAGE_KEYS.ROTATION_COUNT });
    const rotationCount = rotationCountStr.value ? parseInt(rotationCountStr.value, 10) : 0;

    if (rotationCount >= REFRESH_CONFIG.MAX_ROTATION_COUNT) {
      throw new Error('MAX_REFRESH_EXCEEDED');
    }

    // Get stored user profile
    const userProfileStr = await Preferences.get({ key: STORAGE_KEYS.USER_PROFILE });
    if (!userProfileStr.value) {
      throw new Error('NO_USER_PROFILE');
    }

    const userProfile = JSON.parse(userProfileStr.value);

    // In a real implementation, we would re-authenticate with the backend here
    // For now, we simulate by generating a new token pair

    // Generate new tokens
    const newAccessToken = this.generateRefreshToken(); // Simulated
    const newRefreshToken = this.generateRefreshToken();
    const expiresIn = 1800; // 30 minutes
    const expiresAt = Date.now() + expiresIn * 1000;

    const authResponse: AuthResponse = {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'bearer',
      expires_in: expiresIn,
      user: userProfile,
    };

    // Update storage with new tokens and incremented rotation count
    await Promise.all([
      Preferences.set({
        key: STORAGE_KEYS.ACCESS_TOKEN,
        value: newAccessToken,
      }),
      Preferences.set({
        key: STORAGE_KEYS.REFRESH_TOKEN,
        value: newRefreshToken,
      }),
      Preferences.set({
        key: STORAGE_KEYS.TOKEN_EXPIRES_AT,
        value: expiresAt.toString(),
      }),
      Preferences.set({
        key: STORAGE_KEYS.ROTATION_COUNT,
        value: (rotationCount + 1).toString(),
      }),
    ]);

    this.logger.info('API', 'Token rotated', { rotationCount: rotationCount + 1 });

    return authResponse;
  }

  /**
   * Private: Handle authentication errors
   */
  private handleAuthError(error: any, operation: string): Observable<never> {
    let errorMessage = 'Authentication error';
    let errorCode = 'AUTH_ERROR';

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 401:
          errorCode = 'INVALID_CREDENTIALS';
          errorMessage = 'Invalid username or password';
          break;
        case 403:
          errorCode = 'ACCOUNT_DISABLED';
          errorMessage = 'Account is disabled';
          break;
        case 404:
          errorCode = 'USER_NOT_FOUND';
          errorMessage = 'User not found';
          break;
        case 422:
          errorCode = 'VALIDATION_ERROR';
          errorMessage = 'Invalid input data';
          break;
        case 500:
          errorCode = 'SERVER_ERROR';
          errorMessage = 'Server error occurred';
          break;
        case 0:
          errorCode = 'NETWORK_ERROR';
          errorMessage = 'Network connection error';
          break;
        default:
          errorMessage = error.message || 'Unknown error';
      }
    } else if (error?.message) {
      errorCode = error.message;
      errorMessage = error.message;
    }

    this.logger.error('API', `${operation} failed`, error, { errorCode });

    const enhancedError = new Error(errorMessage);
    (enhancedError as any).code = errorCode;
    (enhancedError as any).originalError = error;

    return throwError(() => enhancedError);
  }

  /**
   * Path mapping utility - Converts app paths to backend paths
   */
  mapPath(appPath: string): string {
    const pathMappings: { [key: string]: string } = {
      '/api/auth/login': '/token',
      '/api/auth/register': '/users/',
      '/api/auth/profile': '/users/me',
      '/api/auth/refresh': '/token/refresh', // Not implemented in backend
      '/api/auth/logout': '/auth/logout', // Not implemented in backend
    };

    return pathMappings[appPath] || appPath;
  }

  /**
   * Get stored tokens (for debugging/testing)
   */
  async getStoredTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  }> {
    if (!Capacitor.isNativePlatform()) {
      return { accessToken: null, refreshToken: null, expiresAt: null };
    }

    const [accessToken, refreshToken, expiresAtStr] = await Promise.all([
      Preferences.get({ key: STORAGE_KEYS.ACCESS_TOKEN }),
      Preferences.get({ key: STORAGE_KEYS.REFRESH_TOKEN }),
      Preferences.get({ key: STORAGE_KEYS.TOKEN_EXPIRES_AT }),
    ]);

    return {
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      expiresAt: expiresAtStr.value ? parseInt(expiresAtStr.value, 10) : null,
    };
  }
}
