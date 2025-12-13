import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AuthGuard } from './auth.guard';
import {
  TidepoolAuthService,
  AuthState as TidepoolAuthState,
} from '@services/tidepool-auth.service';
import { LocalAuthService, LocalAuthState } from '@services/local-auth.service';
import { AccountState } from '@models/user-profile.model';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let localAuthService: jest.Mocked<LocalAuthService>;
  let router: jest.Mocked<Router>;
  let urlTree: UrlTree;

  // Auth state subjects for testing
  let tidepoolAuthStateSubject: BehaviorSubject<TidepoolAuthState>;
  let localAuthStateSubject: BehaviorSubject<LocalAuthState>;

  beforeEach(() => {
    urlTree = {} as UrlTree;

    // Initialize auth state subjects
    tidepoolAuthStateSubject = new BehaviorSubject<TidepoolAuthState>({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      errorCode: null,
      userId: null,
      email: null,
      flowStep: 'idle',
      lastAuthenticated: null,
    });

    localAuthStateSubject = new BehaviorSubject<LocalAuthState>({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });

    // Create spies
    const routerSpy = {
      createUrlTree: jest.fn().mockReturnValue(urlTree),
    } as unknown as jest.Mocked<Router>;

    const tidepoolSpy = {
      authState: tidepoolAuthStateSubject.asObservable(),
    } as unknown as jest.Mocked<TidepoolAuthService>;

    const localSpy = {
      logout: jest.fn(),
      waitForInitialization: jest.fn().mockResolvedValue(undefined),
      authState$: localAuthStateSubject.asObservable(),
    } as unknown as jest.Mocked<LocalAuthService>;

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: TidepoolAuthService, useValue: tidepoolSpy },
        { provide: LocalAuthService, useValue: localSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    guard = TestBed.inject(AuthGuard);
    localAuthService = TestBed.inject(LocalAuthService) as jest.Mocked<LocalAuthService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
  });

  afterEach(() => {
    tidepoolAuthStateSubject.complete();
    localAuthStateSubject.complete();
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('Tidepool Authentication', () => {
    it('should allow access when user is authenticated via Tidepool', done => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: 'tidepool-user-123',
        email: 'tidepool@example.com',
        flowStep: 'idle',
        lastAuthenticated: Date.now(),
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (result instanceof Promise) {
        result.then(canActivate => {
          expect(canActivate).toBeTrue();
          expect(router.createUrlTree).not.toHaveBeenCalled();
          done();
        });
      } else if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(canActivate => {
          expect(canActivate).toBeTrue();
          expect(router.createUrlTree).not.toHaveBeenCalled();
          done();
        });
      }
    });

    it('should not check local auth when Tidepool auth is active', done => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: 'tidepool-user-123',
        email: 'tidepool@example.com',
        flowStep: 'idle',
        lastAuthenticated: Date.now(),
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(canActivate => {
          expect(canActivate).toBeTrue();
          // Local auth state subject should not be consumed
          expect(localAuthStateSubject.observers.length).toBe(0);
          done();
        });
      }
    });
  });

  describe('Local Authentication', () => {
    beforeEach(() => {
      // Ensure Tidepool auth is not active
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });
    });

    it('should redirect to login when user is not authenticated', done => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(canActivate => {
          expect(canActivate).toBe(urlTree);
          expect(router.createUrlTree).toHaveBeenCalledWith(['/tabs'], {
            queryParams: { returnUrl: '/dashboard' },
          });
          done();
        });
      }
    });

    it('should preserve returnUrl in redirect query params', done => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/profile/settings' } as RouterStateSnapshot;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(() => {
          expect(router.createUrlTree).toHaveBeenCalledWith(['/tabs'], {
            queryParams: { returnUrl: '/profile/settings' },
          });
          done();
        });
      }
    });
  });

  describe('Account State Checks', () => {
    beforeEach(() => {
      // Ensure Tidepool auth is not active
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });
    });

    it('should allow access for ACTIVE accounts', done => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          accountState: AccountState.ACTIVE,
          preferences: {},
        } as any,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        expiresAt: Date.now() + 3600000,
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(canActivate => {
          expect(canActivate).toBeTrue();
          expect(router.createUrlTree).not.toHaveBeenCalled();
          done();
        });
      }
    });

    it('should redirect PENDING accounts to account-pending page', done => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          accountState: AccountState.PENDING,
          preferences: {},
        } as any,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        expiresAt: Date.now() + 3600000,
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(canActivate => {
          expect(canActivate).toBe(urlTree);
          expect(router.createUrlTree).toHaveBeenCalledWith(['/account-pending']);
          expect(localAuthService.logout).not.toHaveBeenCalled();
          done();
        });
      }
    });

    it('should logout and redirect DISABLED accounts to welcome page', done => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          accountState: AccountState.DISABLED,
          preferences: {},
        } as any,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        expiresAt: Date.now() + 3600000,
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(canActivate => {
          expect(canActivate).toBe(urlTree);
          expect(localAuthService.logout).toHaveBeenCalled();
          expect(router.createUrlTree).toHaveBeenCalledWith(['/welcome']);
          done();
        });
      }
    });

    it('should allow access when accountState is missing (backwards compatibility)', done => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          // No accountState property
        } as any,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        expiresAt: Date.now() + 3600000,
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(canActivate => {
          expect(canActivate).toBeTrue();
          expect(router.createUrlTree).not.toHaveBeenCalled();
          done();
        });
      }
    });

    it('should allow access when user has no preferences object', done => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          // No preferences property
        } as any,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        expiresAt: Date.now() + 3600000,
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(canActivate => {
          expect(canActivate).toBeTrue();
          done();
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle both auth services being unauthenticated', done => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(canActivate => {
          expect(canActivate).toBe(urlTree);
          expect(router.createUrlTree).toHaveBeenCalledWith(['/tabs'], {
            queryParams: { returnUrl: '/dashboard' },
          });
          done();
        });
      }
    });

    it('should handle null user in local auth state', done => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: true,
        user: null, // Unusual but possible
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        expiresAt: Date.now() + 3600000,
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(canActivate => {
          // Should allow access since no accountState to check
          expect(canActivate).toBeTrue();
          done();
        });
      }
    });

    it('should handle empty returnUrl', done => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '' } as RouterStateSnapshot;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(() => {
          expect(router.createUrlTree).toHaveBeenCalledWith(['/tabs'], {
            queryParams: { returnUrl: '' },
          });
          done();
        });
      }
    });
  });

  describe('Observable Behavior', () => {
    it('should complete after taking first value from auth states', done => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: 'user-123',
        email: 'user@example.com',
        flowStep: 'idle',
        lastAuthenticated: Date.now(),
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      // Track subscription
      let subscriptionCompleted = false;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe({
          next: () => {
            // Should receive value
          },
          complete: () => {
            subscriptionCompleted = true;
            expect(subscriptionCompleted).toBeTrue();
            done();
          },
        });
      }
    });

    it('should not react to subsequent auth state changes', done => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          accountState: AccountState.ACTIVE,
        } as any,
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      });

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      let callCount = 0;

      // Act
      const result = guard.canActivate(route, state);

      // Assert
      if (typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(() => {
          callCount++;

          // Emit new values
          tidepoolAuthStateSubject.next({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            errorCode: null,
            userId: 'new-user',
            email: 'new@example.com',
            flowStep: 'idle',
            lastAuthenticated: Date.now(),
          });

          localAuthStateSubject.next({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
          });

          // Should only be called once due to take(1)
          setTimeout(() => {
            expect(callCount).toBe(1);
            done();
          }, 100);
        });
      }
    });
  });
});
