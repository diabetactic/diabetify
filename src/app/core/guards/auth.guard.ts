/**
 * AuthGuard - Route protection for authenticated routes
 *
 * Prevents unauthenticated users from accessing protected routes.
 * Additionally checks account state to enforce pre-enabled account workflow:
 * - PENDING accounts redirect to /account-pending
 * - DISABLED accounts are logged out and denied access
 * - ACTIVE accounts are allowed to proceed
 *
 * Redirects to login page if user is not authenticated.
 *
 * Usage in routing module:
 * ```typescript
 * {
 *   path: 'dashboard',
 *   component: DashboardPage,
 *   canActivate: [AuthGuard]
 * }
 * ```
 */

import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Router,
} from '@angular/router';
import { Observable, from } from 'rxjs';
import { map, take, switchMap } from 'rxjs/operators';
import { TidepoolAuthService } from '@services/tidepool-auth.service';
import { LocalAuthService } from '@services/local-auth.service';
import { AccountState } from '@models/user-profile.model';
import { ROUTES } from '@core/constants';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private tidepoolAuthService: TidepoolAuthService,
    private localAuthService: LocalAuthService,
    private router: Router
  ) {}

  /**
   * Determine if route can be activated
   *
   * Checks:
   * 1. User authentication (Tidepool or Local)
   * 2. Account state (PENDING, ACTIVE, DISABLED)
   *
   * @param route - Activated route snapshot
   * @param state - Router state snapshot
   * @returns True if user can access, UrlTree for redirect otherwise
   */
  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Wait for auth initialization to complete before checking auth state
    // This prevents race conditions where guard runs before auth is restored from storage
    return from(this.localAuthService.waitForInitialization()).pipe(
      switchMap(() => {
        // First check Tidepool authentication
        return this.tidepoolAuthService.authState.pipe(
          take(1),
          switchMap(tidepoolAuthState => {
            if (tidepoolAuthState.isAuthenticated) {
              // Tidepool auth is active, allow access
              return [true];
            }

            // Check local authentication
            return this.localAuthService.authState$.pipe(
              take(1),
              map(localAuthState => {
                if (!localAuthState.isAuthenticated) {
                  const returnUrl = state.url;
                  return this.router.createUrlTree([ROUTES.WELCOME], {
                    queryParams: { returnUrl },
                  });
                }

                const accountState = localAuthState.user?.preferences
                  ? (localAuthState.user as { accountState?: AccountState }).accountState
                  : null;

                if (accountState === AccountState.PENDING) {
                  return this.router.createUrlTree([ROUTES.ACCOUNT_PENDING]);
                }

                if (accountState === AccountState.DISABLED) {
                  this.localAuthService.logout();
                  return this.router.createUrlTree([ROUTES.WELCOME]);
                }

                // Account is ACTIVE, allow access
                return true;
              })
            );
          })
        );
      })
    );
  }
}
