/**
 * TidepoolAuthService - OAuth2/OpenID Connect Authentication
 *
 * Implements the OAuth2 Authorization Code Flow with PKCE for Tidepool API.
 * Uses Capacitor Browser for in-app browser-based authentication flow.
 *
 * @see https://developer.tidepool.org/authentication
 * @see https://tools.ietf.org/html/rfc6749 (OAuth 2.0)
 * @see https://tools.ietf.org/html/rfc7636 (PKCE)
 */

import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Browser } from '@capacitor/browser';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

import { TidepoolAuth, TidepoolTokenResponse } from '@models/tidepool-auth.model';
import { getOAuthConfig, OAuthConfig } from '@core/config/oauth.config';
import { generatePKCEChallenge, generateState, buildAuthorizationUrl } from '@core/utils/pkce.utils';
import { TokenStorageService } from '@services/token-storage.service';
import { LoggerService } from '@services/logger.service';
import { environment } from '@env/environment';

/**
 * Authentication state interface
 */
export interface AuthState {
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;
  /** Loading state during auth operations */
  isLoading: boolean;
  /** Error message if auth failed */
  error: string | null;
  /** Error code for programmatic error handling */
  errorCode?: string | null;
  /** User ID if authenticated */
  userId: string | null;
  /** User email if available */
  email: string | null;
  /** Auth flow step for debugging */
  flowStep?: 'idle' | 'initiating' | 'authorizing' | 'exchanging' | 'refreshing' | 'restoring';
  /** Last successful authentication timestamp */
  lastAuthenticated?: number | null;
}

/**
 * OAuth callback data extracted from redirect URL
 */
interface OAuthCallbackData {
  /** Authorization code */
  code?: string;
  /** State parameter (CSRF protection) */
  state?: string;
  /** Error code if authorization failed */
  error?: string;
  /** Error description */
  errorDescription?: string;
}

/**
 * Authentication error codes for programmatic error handling
 */
export enum AuthErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REFRESH_FAILED = 'REFRESH_FAILED',
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  INVALID_STATE = 'INVALID_STATE',
  USER_CANCELLED = 'USER_CANCELLED',
  BROWSER_ERROR = 'BROWSER_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for authentication errors
 */
export class AuthenticationError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

@Injectable({
  providedIn: 'root',
})
export class TidepoolAuthService implements OnDestroy {
  private readonly oauthConfig: OAuthConfig;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;

  // Temporary storage for OAuth flow state
  private pendingCodeVerifier: string | null = null;
  private pendingState: string | null = null;

  // Deep link listener reference for cleanup
  private deepLinkListener: PluginListenerHandle | null = null;

  // Authentication state observable
  private authState$ = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    errorCode: null,
    userId: null,
    email: null,
    flowStep: 'idle',
    lastAuthenticated: null,
  });

  /** Observable for components to subscribe to auth state changes */
  public readonly authState: Observable<AuthState> = this.authState$.asObservable();

  /** Logging configuration */
  private readonly enableDebugLogging = !environment.production;

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private ngZone: NgZone,
    private logger: LoggerService
  ) {
    this.oauthConfig = getOAuthConfig();
    this.initialize();
  }

  /**
   * Clean up listeners when service is destroyed
   * Prevents memory leaks from Capacitor plugin listeners
   */
  ngOnDestroy(): void {
    if (this.deepLinkListener) {
      this.deepLinkListener.remove();
      this.deepLinkListener = null;
    }
    this.authState$.complete();
  }

  /**
   * Initialize authentication service
   * Sets up app URL listener for OAuth callbacks
   */
  private async initialize(): Promise<void> {
    // Register deep link listener for OAuth callback - store for cleanup
    this.deepLinkListener = await App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      // Capacitor callbacks run outside Angular zone - wrap in ngZone.run
      this.ngZone.run(() => {
        this.handleDeepLink(event.url);
      });
    });

    // Check if we have a stored refresh token and restore session
    await this.restoreSession();
  }

  /**
   * Login with email/password using Tidepool's basic auth endpoint
   * This bypasses OAuth and uses direct authentication.
   *
   * @param email - User email
   * @param password - User password
   * @returns Promise that resolves when login succeeds
   */
  async loginWithCredentials(email: string, password: string): Promise<void> {
    try {
      this.updateAuthState({ isLoading: true, error: null, flowStep: 'authorizing' });

      // Create Basic auth header
      const credentials = btoa(`${email}:${password}`);

      // Call Tidepool's login endpoint using HttpClient with observe: 'response' to get headers
      // With CapacitorHttp auto-patching enabled, HttpClient uses native HTTP on mobile
      const httpResponse = await firstValueFrom(
        this.http.post<Record<string, unknown>>(`https://api.tidepool.org/auth/login`, null, {
          headers: new HttpHeaders({
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
          }),
          observe: 'response',
        })
      );

      this.logger.debug('TidepoolAuth', 'Login response status', { status: httpResponse.status });

      // Extract session token from response headers
      const sessionToken =
        httpResponse.headers.get('x-tidepool-session-token') ||
        httpResponse.headers.get('X-Tidepool-Session-Token');

      if (!sessionToken) {
        throw new Error('No session token received from Tidepool');
      }

      // Get user ID from response body
      const responseBody = httpResponse.body || {};
      const userId = (responseBody['userid'] || responseBody['userId']) as string;
      const userEmail = (responseBody['username'] as string | undefined) || email;

      if (!userId) {
        throw new Error('No user ID received from Tidepool');
      }

      // Store the session token as our access token
      const authData: TidepoolAuth = {
        accessToken: sessionToken as string,
        refreshToken: sessionToken as string, // Tidepool session tokens don't have separate refresh tokens
        tokenType: 'Bearer',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        userId,
        email: userEmail,
        scope: 'data:read data:write profile:read',
      };

      await this.tokenStorage.storeAuth(authData);

      // Update auth state
      this.updateAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId,
        email: userEmail,
        flowStep: 'idle',
        lastAuthenticated: Date.now(),
      });

      this.logger.info('TidepoolAuth', 'Login successful', { userId });
    } catch (error: unknown) {
      this.logger.error('TidepoolAuth', 'Login failed', error);

      const errorObj = error as Record<string, unknown>;
      let errorMessage = 'Login failed';
      if (
        errorObj?.['status'] === 401 ||
        (errorObj?.['message'] as string | undefined)?.includes('401')
      ) {
        errorMessage = 'Invalid email or password';
      } else if (errorObj?.['message']) {
        errorMessage = errorObj['message'] as string;
      }

      this.updateAuthState({
        isLoading: false,
        error: errorMessage,
        flowStep: 'idle',
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Start OAuth login flow
   *
   * Generates PKCE challenge, opens browser for user authentication,
   * and waits for callback with authorization code.
   *
   * @returns Promise that resolves when login flow is initiated
   */
  async login(): Promise<void> {
    try {
      // Update loading state
      this.updateAuthState({ isLoading: true, error: null });

      // In web/browser builds the mobile OAuth redirect (diabetactic://)
      // cannot complete correctly. Instead of trying the PKCE flow here,
      // open the Tidepool web app directly and short-circuit.
      if (!Capacitor.isNativePlatform()) {
        await Browser.open({
          url: 'https://app.tidepool.org',
          presentationStyle: 'popover',
        });

        this.updateAuthState({
          isLoading: false,
          error:
            'La conexión directa con Tidepool solo funciona en la app móvil. Puedes ver tus datos en app.tidepool.org.',
        });
        return;
      }

      // Generate PKCE challenge and state
      const pkceChallenge = await generatePKCEChallenge();
      const state = generateState();

      // Store verifier and state temporarily (needed for token exchange)
      this.pendingCodeVerifier = pkceChallenge.codeVerifier;
      this.pendingState = state;

      // Build authorization URL
      const authUrl = buildAuthorizationUrl(
        this.oauthConfig.authorizationEndpoint,
        this.oauthConfig.clientId,
        this.oauthConfig.redirectUri,
        this.oauthConfig.scopes,
        pkceChallenge,
        state
      );

      // Open browser for user authentication
      await Browser.open({
        url: authUrl,
        presentationStyle: 'popover',
        toolbarColor: '#2196F3',
      });
    } catch (error) {
      this.logger.error('TidepoolAuth', 'Login failed', error);
      this.updateAuthState({
        isLoading: false,
        error: 'Failed to start login process',
      });
      throw error;
    }
  }

  /**
   * Handle deep link callback from OAuth flow
   *
   * @param url - Deep link URL with authorization code or error
   */
  private async handleDeepLink(url: string): Promise<void> {
    // Check if this is an OAuth callback URL
    if (!url.startsWith(this.oauthConfig.redirectUri)) {
      return;
    }

    // Close the browser
    await Browser.close();

    try {
      // Parse callback data from URL
      const callbackData = this.parseCallbackUrl(url);

      // Handle authorization errors
      if (callbackData.error) {
        throw new Error(
          callbackData.errorDescription || `Authorization failed: ${callbackData.error}`
        );
      }

      // Verify state parameter (CSRF protection)
      if (callbackData.state !== this.pendingState) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Exchange authorization code for tokens
      if (callbackData.code && this.pendingCodeVerifier) {
        await this.exchangeCodeForTokens(callbackData.code, this.pendingCodeVerifier);
      } else {
        throw new Error('Missing authorization code or code verifier');
      }

      // Clear temporary OAuth state
      this.clearPendingOAuthData();
    } catch (error) {
      this.logger.error('TidepoolAuth', 'OAuth callback error', error);
      this.updateAuthState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
      this.clearPendingOAuthData();
    }
  }

  /**
   * Parse OAuth callback URL parameters
   *
   * @param url - Callback URL
   * @returns Parsed callback data
   */
  private parseCallbackUrl(url: string): OAuthCallbackData {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    return {
      code: params.get('code') || undefined,
      state: params.get('state') || undefined,
      error: params.get('error') || undefined,
      errorDescription: params.get('error_description') || undefined,
    };
  }

  /**
   * Exchange authorization code for access and refresh tokens
   *
   * @param code - Authorization code from callback
   * @param codeVerifier - PKCE code verifier
   */
  private async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<void> {
    // Prepare token request
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      code,
      code_verifier: codeVerifier,
    });

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    try {
      // Exchange code for tokens
      // With CapacitorHttp auto-patching enabled, HttpClient uses native HTTP on mobile
      const tokenResponse = await firstValueFrom(
        this.http.post<TidepoolTokenResponse>(this.oauthConfig.tokenEndpoint, body.toString(), {
          headers,
        })
      );

      if (!tokenResponse) {
        throw new Error('No token response received');
      }

      // Decode ID token to get user info (if available)
      const userInfo = tokenResponse['id_token']
        ? this.decodeIdToken(tokenResponse['id_token'])
        : null;

      // Store tokens with user info
      await this.storeTokens(tokenResponse, userInfo);

      // Update auth state
      this.updateAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: userInfo?.['sub'] as string,
        email: userInfo?.['email'] as string,
      });
    } catch (error) {
      this.logger.error('TidepoolAuth', 'Token exchange failed', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Store tokens securely using TokenStorageService
   *
   * @param tokenResponse - Token response from Tidepool
   * @param userInfo - User information from decoded ID token
   */
  private async storeTokens(
    tokenResponse: TidepoolTokenResponse,
    userInfo?: Record<string, unknown> | null
  ): Promise<void> {
    const expiryMs = Date.now() + tokenResponse.expires_in * 1000;

    const authData: TidepoolAuth = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: 'Bearer',
      issuedAt: Date.now(),
      expiresAt: expiryMs,
      userId: (userInfo?.['sub'] as string | undefined) || '',
      email: (userInfo?.['email'] as string | undefined) || '',
      scope: tokenResponse.scope,
    };

    await this.tokenStorage.storeAuth(authData);
  }

  /**
   * Decode JWT ID token to extract user information
   *
   * @param idToken - JWT ID token
   * @returns Decoded token payload
   */
  private decodeIdToken(idToken: string): Record<string, unknown> {
    try {
      // JWT structure: header.payload.signature
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Decode base64url payload
      const payload = parts[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));

      return JSON.parse(decodedPayload);
    } catch (error) {
      this.logger.error('TidepoolAuth', 'Failed to decode ID token', error);
      return {};
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * @returns Promise resolving to new access token
   */
  async refreshAccessToken(): Promise<string> {
    try {
      // Get stored refresh token from TokenStorageService
      const refreshToken = await this.tokenStorage.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Prepare token refresh request
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.oauthConfig.clientId,
        refresh_token: refreshToken,
      });

      const headers = new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      });

      // Request new tokens
      // With CapacitorHttp auto-patching enabled, HttpClient uses native HTTP on mobile
      const tokenResponse = await firstValueFrom(
        this.http.post<TidepoolTokenResponse>(this.oauthConfig.tokenEndpoint, body.toString(), {
          headers,
        })
      );

      if (!tokenResponse) {
        throw new Error('No token response received');
      }

      // Decode ID token to get user info (if available)
      const userInfo = tokenResponse['id_token']
        ? this.decodeIdToken(tokenResponse['id_token'])
        : null;

      // Store new tokens
      await this.storeTokens(tokenResponse, userInfo);

      return tokenResponse['access_token'];
    } catch (error) {
      this.logger.error('TidepoolAuth', 'Token refresh failed', error);
      // Clear auth state if refresh fails
      await this.logout();
      throw new Error('Session expired. Please log in again.');
    }
  }

  /**
   * Get current valid access token
   *
   * Automatically refreshes token if expired or near expiry.
   *
   * @returns Promise resolving to valid access token
   */
  async getAccessToken(): Promise<string | null> {
    // Check if we have a valid token
    const hasValidToken = await this.tokenStorage.hasValidAccessToken();

    if (hasValidToken) {
      return await this.tokenStorage.getAccessToken();
    }

    // Try to restore session from stored refresh token
    if (await this.tokenStorage.hasRefreshToken()) {
      try {
        return await this.refreshAccessToken();
      } catch (error) {
        this.logger.error('TidepoolAuth', 'Failed to restore session', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Logout and clear all authentication data
   */
  async logout(): Promise<void> {
    try {
      // Clear all tokens using TokenStorageService
      await this.tokenStorage.clearAll();

      // Clear pending OAuth data
      this.clearPendingOAuthData();

      // Update auth state
      this.updateAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userId: null,
        email: null,
      });
    } catch (error) {
      this.logger.error('TidepoolAuth', 'Logout error', error);
      throw error;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }

  /**
   * Restore session from stored refresh token
   */
  private async restoreSession(): Promise<void> {
    try {
      if (await this.tokenStorage.hasRefreshToken()) {
        this.updateAuthState({ isLoading: true });

        // Try to get a valid access token (will refresh if needed)
        const token = await this.getAccessToken();

        if (token) {
          // Restore user info from stored auth data
          const authData = await this.tokenStorage.getAuthData();

          if (authData) {
            this.updateAuthState({
              isAuthenticated: true,
              isLoading: false,
              userId: authData.userId,
              email: authData.email,
            });
          }
        } else {
          this.updateAuthState({ isLoading: false });
        }
      }
    } catch (error) {
      this.logger.error('TidepoolAuth', 'Session restoration failed', error);
      this.updateAuthState({ isLoading: false });
    }
  }

  /**
   * Clear temporary OAuth flow data
   */
  private clearPendingOAuthData(): void {
    this.pendingCodeVerifier = null;
    this.pendingState = null;
  }

  /**
   * Update authentication state
   */
  private updateAuthState(partialState: Partial<AuthState>): void {
    this.authState$.next({
      ...this.authState$.value,
      ...partialState,
    });
  }
}
