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

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Browser } from '@capacitor/browser';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { BehaviorSubject, Observable, throwError, from, timer, of, firstValueFrom } from 'rxjs';
import { catchError, map, switchMap, tap, retryWhen, delay, take, concatMap } from 'rxjs/operators';

import { TidepoolAuth, TidepoolTokenResponse } from '../models/tidepool-auth.model';
import { getOAuthConfig, OAuthConfig, OAUTH_CONSTANTS } from '../config/oauth.config';
import {
  generatePKCEChallenge,
  generateState,
  buildAuthorizationUrl,
  PKCEChallenge,
} from '../utils/pkce.utils';
import { TokenStorageService } from './token-storage.service';
import { CapacitorHttpService } from './capacitor-http.service';
import { environment } from '../../../environments/environment';

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
    public details?: any
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

@Injectable({
  providedIn: 'root',
})
export class TidepoolAuthService {
  private readonly oauthConfig: OAuthConfig;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;

  // Temporary storage for OAuth flow state
  private pendingCodeVerifier: string | null = null;
  private pendingState: string | null = null;

  // Deep link listener reference for cleanup
  private deepLinkListener: any = null;

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
    private capacitorHttp: CapacitorHttpService,
    private tokenStorage: TokenStorageService
  ) {
    this.oauthConfig = getOAuthConfig();
    this.initialize();
  }

  /**
   * Initialize authentication service
   * Sets up app URL listener for OAuth callbacks
   */
  private async initialize(): Promise<void> {
    // Register deep link listener for OAuth callback
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.handleDeepLink(event.url);
    });

    // Check if we have a stored refresh token and restore session
    await this.restoreSession();
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
      console.error('Login failed:', error);
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
      console.error('OAuth callback error:', error);
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
      code: code,
      code_verifier: codeVerifier,
    });

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    try {
      // Exchange code for tokens using CapacitorHttp (bypasses CORS)
      const tokenResponse = await firstValueFrom(
        this.capacitorHttp.post<TidepoolTokenResponse>(
          this.oauthConfig.tokenEndpoint,
          body.toString(),
          { headers }
        )
      );

      if (!tokenResponse) {
        throw new Error('No token response received');
      }

      // Decode ID token to get user info (if available)
      const userInfo = tokenResponse.id_token ? this.decodeIdToken(tokenResponse.id_token) : null;

      // Store tokens with user info
      await this.storeTokens(tokenResponse, userInfo);

      // Update auth state
      this.updateAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: userInfo.sub,
        email: userInfo.email,
      });
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Store tokens securely using TokenStorageService
   *
   * @param tokenResponse - Token response from Tidepool
   * @param userInfo - User information from decoded ID token
   */
  private async storeTokens(tokenResponse: TidepoolTokenResponse, userInfo?: any): Promise<void> {
    const expiryMs = Date.now() + tokenResponse.expires_in * 1000;

    const authData: TidepoolAuth = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: 'Bearer',
      issuedAt: Date.now(),
      expiresAt: expiryMs,
      userId: userInfo?.sub || '',
      email: userInfo?.email || '',
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
  private decodeIdToken(idToken: string): any {
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
      console.error('Failed to decode ID token:', error);
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

      // Request new tokens using CapacitorHttp (bypasses CORS)
      const tokenResponse = await firstValueFrom(
        this.capacitorHttp.post<TidepoolTokenResponse>(
          this.oauthConfig.tokenEndpoint,
          body.toString(),
          { headers }
        )
      );

      if (!tokenResponse) {
        throw new Error('No token response received');
      }

      // Decode ID token to get user info (if available)
      const userInfo = tokenResponse.id_token ? this.decodeIdToken(tokenResponse.id_token) : null;

      // Store new tokens
      await this.storeTokens(tokenResponse, userInfo);

      return tokenResponse.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
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
        console.error('Failed to restore session:', error);
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
      console.error('Logout error:', error);
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
      console.error('Session restoration failed:', error);
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
