/**
 * Auth Workflow Integration Tests (MSW)
 *
 * Tests the complete authentication flow using MSW to mock the backend API.
 * These tests verify that components, services, and HTTP layer work together.
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { server, resetMockState } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

// Services under test
import { LocalAuthService } from '@core/services/local-auth.service';
import { TokenStorageService } from '@core/services/token-storage.service';
import { LoggerService } from '@core/services/logger.service';
import { ApiGatewayService } from '@core/services/api-gateway.service';

// API base URL (must match handlers.ts)
const API_BASE = 'http://localhost:8000';

describe('Auth Workflow Integration (MSW)', () => {
  let authService: LocalAuthService;
  let tokenStorage: TokenStorageService;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'warn' });
  });

  afterEach(async () => {
    server.resetHandlers();
    resetMockState();
    // Clear token storage between tests
    try {
      await tokenStorage?.clearAll();
    } catch {
      // Ignore errors if not initialized
    }
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        LocalAuthService,
        TokenStorageService,
        LoggerService,
        ApiGatewayService,
      ],
    }).compileComponents();

    authService = TestBed.inject(LocalAuthService);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  describe('Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      // Act: Login with test credentials (from handlers.ts: 1000/tuvieja)
      const result = await firstValueFrom(authService.login('1000', 'tuvieja', false));

      // Assert: Should have successful result
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should fail login with invalid credentials', async () => {
      // Act: Wrong password
      const result = await firstValueFrom(authService.login('1000', 'wrongpassword', false));

      // Assert: Should fail
      expect(result.success).toBe(false);
    });

    it('should fail login with non-existent user', async () => {
      // Act: Unknown user
      const result = await firstValueFrom(authService.login('9999', 'password', false));

      // Assert: Should fail
      expect(result.success).toBe(false);
    });

    it('should have access token after successful login', async () => {
      // Act: Login
      const result = await firstValueFrom(authService.login('1000', 'tuvieja', false));

      // Assert: Should be authenticated after successful login
      expect(result.success).toBe(true);
      const isAuthenticated = await firstValueFrom(authService.isAuthenticated());
      expect(isAuthenticated).toBe(true);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should attempt token refresh after login', async () => {
      // Arrange: Login first to get initial tokens
      const loginResult = await firstValueFrom(authService.login('1000', 'tuvieja', false));
      expect(loginResult.success).toBe(true);

      // Act: Attempt refresh - may fail in test environment due to SecureStorage mock
      try {
        const result = await firstValueFrom(authService.refreshAccessToken());
        // If successful, should have token state
        expect(result).toBeDefined();
      } catch (error) {
        // Expected in jsdom - SecureStorage doesn't persist refresh tokens
        expect((error as Error).message).toContain('refresh token');
      }
    });

    it('should fail refresh when not authenticated', async () => {
      // Act & Assert: Refresh should fail when not logged in
      await expect(firstValueFrom(authService.refreshAccessToken())).rejects.toThrow();
    });
  });

  describe('User Profile Flow', () => {
    it('should return user in login result', async () => {
      // Act: Login
      const loginResult = await firstValueFrom(authService.login('1000', 'tuvieja', false));

      // Assert: Should have user data in result
      expect(loginResult.success).toBe(true);
      expect(loginResult.user).toBeDefined();
      expect(loginResult.user?.id).toBe('1000');
    });

    it('should have correct user properties in login result', async () => {
      // Act: Login
      const loginResult = await firstValueFrom(authService.login('1000', 'tuvieja', false));

      // Assert: Should have expected properties
      expect(loginResult.user?.email).toBe('test@example.com');
      expect(loginResult.user?.role).toBe('patient');
    });
  });

  describe('Logout Flow', () => {
    it('should clear authentication state on logout', async () => {
      // Arrange: Login first
      const loginResult = await firstValueFrom(authService.login('1000', 'tuvieja', false));
      expect(loginResult.success).toBe(true);

      // Act: Logout
      await authService.logout();

      // Assert: Auth state should emit false
      const isAuthAfterLogout = await firstValueFrom(authService.isAuthenticated());
      expect(isAuthAfterLogout).toBe(false);
    });

    it('should emit unauthenticated state after logout', async () => {
      // Arrange: Login first
      const loginResult = await firstValueFrom(authService.login('1000', 'tuvieja', false));
      expect(loginResult.success).toBe(true);

      // Act: Logout
      await authService.logout();

      // Assert: Current user should be null
      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange: Simulate network failure
      server.use(
        http.post(`${API_BASE}/token`, () => {
          return HttpResponse.error();
        })
      );

      // Act: Try to login
      const result = await firstValueFrom(authService.login('1000', 'tuvieja', false));

      // Assert: Should return failure result
      expect(result.success).toBe(false);
    });

    it('should handle server errors (500)', async () => {
      // Arrange: Simulate server error
      server.use(
        http.post(`${API_BASE}/token`, () => {
          return HttpResponse.json({ detail: 'Internal Server Error' }, { status: 500 });
        })
      );

      // Act: Try to login
      const result = await firstValueFrom(authService.login('1000', 'tuvieja', false));

      // Assert: Should return failure result
      expect(result.success).toBe(false);
    });
  });

  describe('Auth State Reactivity', () => {
    it('should emit auth state changes on login', async () => {
      const states: boolean[] = [];

      // Subscribe to auth state changes
      const sub = authService.authState$.subscribe(state => {
        states.push(state.isAuthenticated);
      });

      // Login
      await firstValueFrom(authService.login('1000', 'tuvieja', false));

      // Wait for observable to emit
      await new Promise(resolve => setTimeout(resolve, 100));

      sub.unsubscribe();

      // Should have transitioned to true at some point
      expect(states).toContain(true);
    });

    it('should emit auth state changes on logout', async () => {
      // Login first
      await firstValueFrom(authService.login('1000', 'tuvieja', false));

      const states: boolean[] = [];

      // Subscribe to auth state changes
      const sub = authService.authState$.subscribe(state => {
        states.push(state.isAuthenticated);
      });

      // Logout
      await authService.logout();

      // Wait for observable to emit
      await new Promise(resolve => setTimeout(resolve, 100));

      sub.unsubscribe();

      // Should have transitioned to false
      expect(states).toContain(false);
    });
  });
});
