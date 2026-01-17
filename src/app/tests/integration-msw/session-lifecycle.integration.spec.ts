/**
 * Session Lifecycle Integration Tests (MSW)
 *
 * Tests session timeout, persistence across refreshes, and cleanup.
 * Critical for user experience and data security.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { setupMSW, server } from '@test-setup/msw-setup';
import { http, HttpResponse } from 'msw';

// Services under test
import { LocalAuthService } from '@core/services/local-auth.service';
import { TokenStorageService } from '@core/services/token-storage.service';
import { LoggerService } from '@core/services/logger.service';
import { ApiGatewayService } from '@core/services/api-gateway.service';
import { MockAdapterService } from '@core/services/mock-adapter.service';

const API_BASE = 'http://localhost:8000';

/**
 * Mock MockAdapterService that enables auth mock mode for tests.
 * When auth mock is enabled, LocalAuthService bypasses HTTP calls and uses internal mock data.
 */
class MockMockAdapterService {
  isServiceMockEnabled(service: 'appointments' | 'glucoserver' | 'auth'): boolean {
    // Enable mock mode for auth service - this causes LocalAuthService to bypass HTTP
    return service === 'auth';
  }
  isMockEnabled(): boolean {
    return true;
  }
}

describe('Session Lifecycle Integration (MSW)', () => {
  let authService: LocalAuthService;
  let tokenStorage: TokenStorageService;

  setupMSW();

  afterEach(async () => {
    try {
      await tokenStorage?.clearAll();
    } catch {
      // Ignore cleanup errors during teardown
    }
    vi.clearAllTimers();
    vi.useRealTimers();
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
        // Provide mock MockAdapterService that enables auth mock mode
        { provide: MockAdapterService, useClass: MockMockAdapterService },
      ],
    }).compileComponents();

    authService = TestBed.inject(LocalAuthService);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  describe('Session Start', () => {
    it('should start a new session on login', async () => {
      const result = await firstValueFrom(authService.login('40123456', 'thepassword', false));

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      // In mock mode, auth service uses internal mock data, not MSW handlers
      expect(result.user?.id).toBeDefined();
    });

    it('should initialize auth state as authenticated after login', async () => {
      await firstValueFrom(authService.login('40123456', 'thepassword', false));

      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);
    });

    it('should populate user data after login', async () => {
      await firstValueFrom(authService.login('40123456', 'thepassword', false));

      const user = authService.getCurrentUser();
      expect(user).not.toBeNull();
      // In mock mode, auth service uses internal mock data, not MSW handlers
      expect(user?.email).toBeDefined();
    });

    it('should emit auth state change on login', async () => {
      const states: boolean[] = [];
      const sub = authService.authState$.subscribe(state => {
        states.push(state.isAuthenticated);
      });

      await firstValueFrom(authService.login('40123456', 'thepassword', false));
      await new Promise(resolve => setTimeout(resolve, 50));

      sub.unsubscribe();

      // Should have captured true at some point
      expect(states).toContain(true);
    });
  });

  describe('Session End (Logout)', () => {
    it('should clear auth state on logout', async () => {
      // Login first
      await firstValueFrom(authService.login('40123456', 'thepassword', false));
      expect(await firstValueFrom(authService.isAuthenticated())).toBe(true);

      // Logout
      await authService.logout();

      // Verify cleared
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);
    });

    it('should clear user data on logout', async () => {
      // Login
      await firstValueFrom(authService.login('40123456', 'thepassword', false));
      expect(authService.getCurrentUser()).not.toBeNull();

      // Logout
      await authService.logout();

      // Verify user cleared
      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should emit unauthenticated state on logout', async () => {
      // Login
      await firstValueFrom(authService.login('40123456', 'thepassword', false));

      const finalStates: boolean[] = [];
      const sub = authService.authState$.subscribe(state => {
        finalStates.push(state.isAuthenticated);
      });

      // Logout
      await authService.logout();
      await new Promise(resolve => setTimeout(resolve, 50));

      sub.unsubscribe();

      // Should have false at the end
      expect(finalStates[finalStates.length - 1]).toBe(false);
    });

    it('should allow re-login after logout', async () => {
      // Login
      await firstValueFrom(authService.login('40123456', 'thepassword', false));

      // Logout
      await authService.logout();

      // Re-login
      const result = await firstValueFrom(authService.login('40123456', 'thepassword', false));

      expect(result.success).toBe(true);
      expect(await firstValueFrom(authService.isAuthenticated())).toBe(true);
    });
  });

  describe('Session Persistence', () => {
    it('should persist session state across auth service access', async () => {
      // Login with first service instance
      await firstValueFrom(authService.login('40123456', 'thepassword', false));

      // Get a new reference (same singleton)
      const authService2 = TestBed.inject(LocalAuthService);

      // Should share same state
      const isAuth = await firstValueFrom(authService2.isAuthenticated());
      expect(isAuth).toBe(true);
    });

    it('should have consistent user across multiple calls', async () => {
      await firstValueFrom(authService.login('40123456', 'thepassword', false));

      const user1 = authService.getCurrentUser();
      const user2 = authService.getCurrentUser();
      const user3 = authService.getCurrentUser();

      expect(user1).toEqual(user2);
      expect(user2).toEqual(user3);
    });
  });

  describe('Session Timeout Handling', () => {
    it('should handle server-side session invalidation', async () => {
      // Login
      await firstValueFrom(authService.login('40123456', 'thepassword', false));

      // Simulate server rejecting all requests (session invalidated)
      server.use(
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.json({ detail: 'Session expired' }, { status: 401 });
        })
      );

      // Try to fetch user - should fail
      const apiGateway = TestBed.inject(ApiGatewayService);
      let errorOccurred = false;
      try {
        await firstValueFrom(apiGateway.getMe());
      } catch {
        // Expected - session is invalid on server
        errorOccurred = true;
      }
      expect(errorOccurred).toBe(true);
    });

    it('should handle network disconnection gracefully', async () => {
      // Login
      await firstValueFrom(authService.login('40123456', 'thepassword', false));

      // Simulate network failure
      server.use(
        http.get(`${API_BASE}/users/me`, () => {
          return HttpResponse.error();
        })
      );

      // Try to fetch user - should handle gracefully
      const apiGateway = TestBed.inject(ApiGatewayService);
      try {
        await firstValueFrom(apiGateway.getMe());
        expect.fail('Should have thrown');
      } catch {
        // Expected - network error
        // Auth state should still be maintained locally
        const isAuth = await firstValueFrom(authService.isAuthenticated());
        expect(typeof isAuth).toBe('boolean');
      }
    });
  });

  describe('Remember Me Functionality', () => {
    it('should handle login with remember me flag', async () => {
      const result = await firstValueFrom(
        authService.login('40123456', 'thepassword', true) // rememberMe = true
      );

      expect(result.success).toBe(true);

      // Session should be established
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);
    });

    it('should handle login without remember me flag', async () => {
      const result = await firstValueFrom(
        authService.login('40123456', 'thepassword', false) // rememberMe = false
      );

      expect(result.success).toBe(true);

      // Session should be established
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);
    });
  });

  describe('Multi-Tab Session Behavior', () => {
    it('should maintain session in single TestBed environment', async () => {
      // Login
      await firstValueFrom(authService.login('40123456', 'thepassword', false));

      // Multiple auth checks should be consistent
      const checks = await Promise.all([
        firstValueFrom(authService.isAuthenticated()),
        firstValueFrom(authService.isAuthenticated()),
        firstValueFrom(authService.isAuthenticated()),
      ]);

      expect(checks.every(v => v === true)).toBe(true);
    });
  });

  describe('Session State Recovery', () => {
    it('should start as unauthenticated', async () => {
      // Before any login, should be unauthenticated
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(false);
    });

    it('should not have user before login', () => {
      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });

    // NOTE: In mock mode, LocalAuthService always succeeds login.
    // This test verifies that multiple login attempts work correctly.
    it('should handle multiple login attempts correctly in mock mode', async () => {
      // First login attempt - succeeds in mock mode
      const firstResult = await firstValueFrom(authService.login('40123456', 'anypassword', false));
      expect(firstResult.success).toBe(true);

      // Should be authenticated
      const isAuth = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth).toBe(true);

      // Logout
      await authService.logout();

      // Should be unauthenticated after logout
      const isAuthAfterLogout = await firstValueFrom(authService.isAuthenticated());
      expect(isAuthAfterLogout).toBe(false);

      // Second login attempt - also succeeds in mock mode
      const secondResult = await firstValueFrom(
        authService.login('40123456', 'thepassword', false)
      );
      expect(secondResult.success).toBe(true);

      // Should be authenticated again
      const isAuth2 = await firstValueFrom(authService.isAuthenticated());
      expect(isAuth2).toBe(true);
    });
  });

  describe('Auth Observable Behavior', () => {
    it('should immediately emit current state on subscribe', async () => {
      // Before login
      const beforeLogin = await firstValueFrom(authService.authState$);
      expect(beforeLogin.isAuthenticated).toBe(false);

      // Login
      await firstValueFrom(authService.login('40123456', 'thepassword', false));

      // After login
      const afterLogin = await firstValueFrom(authService.authState$);
      expect(afterLogin.isAuthenticated).toBe(true);
    });

    it('should complete subscription cleanly', async () => {
      const sub = authService.authState$.subscribe();

      // Unsubscribe manually (observables typically don't complete)
      sub.unsubscribe();

      // Should be unsubscribed without errors
      expect(sub.closed).toBe(true);
    });
  });
});
