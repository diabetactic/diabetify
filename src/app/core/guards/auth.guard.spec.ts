// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

import { AuthGuard } from './auth.guard';
import { LocalAuthService, LocalAuthState } from '@services/local-auth.service';
import { AccountState } from '@models/user-profile.model';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let localAuthService: Mock<LocalAuthService>;
  let router: Mock<Router>;
  let urlTree: UrlTree;

  // Auth state subjects for testing
  let localAuthStateSubject: BehaviorSubject<LocalAuthState>;

  beforeEach(() => {
    urlTree = {} as UrlTree;

    // Initialize auth state subjects
    localAuthStateSubject = new BehaviorSubject<LocalAuthState>({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });

    // Create spies
    const routerSpy = {
      createUrlTree: vi.fn().mockReturnValue(urlTree),
    } as unknown as Mock<Router>;

    const localSpy = {
      logout: vi.fn(),
      waitForInitialization: vi.fn().mockResolvedValue(undefined),
      authState$: localAuthStateSubject.asObservable(),
    } as unknown as Mock<LocalAuthService>;

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: LocalAuthService, useValue: localSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    guard = TestBed.inject(AuthGuard);
    localAuthService = TestBed.inject(LocalAuthService) as Mock<LocalAuthService>;
    router = TestBed.inject(Router) as Mock<Router>;
  });

  afterEach(() => {
    localAuthStateSubject.complete();
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('Local Authentication', () => {
    it('should redirect to login when user is not authenticated', async () => {
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
      const result = await firstValueFrom(
        guard.canActivate(route, state) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(urlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/welcome'], {
        queryParams: { returnUrl: '/dashboard' },
      });
    });

    it('should preserve returnUrl in redirect query params', async () => {
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
      await firstValueFrom(guard.canActivate(route, state) as Observable<boolean | UrlTree>);

      // Assert
      expect(router.createUrlTree).toHaveBeenCalledWith(['/welcome'], {
        queryParams: { returnUrl: '/profile/settings' },
      });
    });
  });

  describe('Account State Checks', () => {
    it('should allow access for ACTIVE accounts', async () => {
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
      const result = await firstValueFrom(
        guard.canActivate(route, state) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
      expect(router.createUrlTree).not.toHaveBeenCalled();
    });

    it('should logout and redirect DISABLED accounts to welcome page', async () => {
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
      const result = await firstValueFrom(
        guard.canActivate(route, state) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(urlTree);
      expect(localAuthService.logout).toHaveBeenCalled();
      expect(router.createUrlTree).toHaveBeenCalledWith(['/welcome']);
    });

    it('should allow access when accountState is missing (backwards compatibility)', async () => {
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
      const result = await firstValueFrom(
        guard.canActivate(route, state) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
      expect(router.createUrlTree).not.toHaveBeenCalled();
    });

    it('should allow access when user has no preferences object', async () => {
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
      const result = await firstValueFrom(
        guard.canActivate(route, state) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle auth service being unauthenticated', async () => {
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
      const result = await firstValueFrom(
        guard.canActivate(route, state) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(urlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/welcome'], {
        queryParams: { returnUrl: '/dashboard' },
      });
    });

    it('should handle null user in local auth state', async () => {
      // Arrange
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
      const result = await firstValueFrom(
        guard.canActivate(route, state) as Observable<boolean | UrlTree>
      );

      // Assert
      // Should allow access since no accountState to check
      expect(result).toBe(true);
    });

    it('should handle empty returnUrl', async () => {
      // Arrange
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
      await firstValueFrom(guard.canActivate(route, state) as Observable<boolean | UrlTree>);

      // Assert
      expect(router.createUrlTree).toHaveBeenCalledWith(['/welcome'], {
        queryParams: { returnUrl: '' },
      });
    });
  });

  describe('Observable Behavior', () => {
    it('should complete after taking first value from auth states', async () => {
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

      // Track subscription
      let subscriptionCompleted = false;

      // Act
      const result$ = guard.canActivate(route, state) as Observable<boolean | UrlTree>;

      // Subscribe with complete callback
      const promise = new Promise<void>(resolve => {
        result$.subscribe({
          next: () => {
            // Should receive value
          },
          complete: () => {
            subscriptionCompleted = true;
            resolve();
          },
        });
      });

      await promise;

      // Assert
      expect(subscriptionCompleted).toBe(true);
    });

    it('should not react to subsequent auth state changes', async () => {
      // Arrange
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
      const result$ = guard.canActivate(route, state) as Observable<boolean | UrlTree>;

      // Use a promise to track subscription behavior
      const promise = new Promise<void>(resolve => {
        result$.subscribe(() => {
          callCount++;

          // Emit new value
          localAuthStateSubject.next({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
          });

          // Should only be called once due to take(1)
          setTimeout(() => {
            resolve();
          }, 100);
        });
      });

      await promise;

      // Assert
      expect(callCount).toBe(1);
    });
  });
});
