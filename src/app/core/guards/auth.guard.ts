/**
 * AuthGuard - Route protection for authenticated routes
 *
 * Prevents unauthenticated users from accessing protected routes.
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
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { TidepoolAuthService } from '../services/tidepool-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: TidepoolAuthService,
    private router: Router
  ) {}

  /**
   * Determine if route can be activated
   *
   * @param route - Activated route snapshot
   * @param state - Router state snapshot
   * @returns True if user is authenticated, UrlTree to login otherwise
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Check authentication state
    return this.authService.authState.pipe(
      take(1), // Take only the current value
      map(authState => {
        if (authState.isAuthenticated) {
          // User is authenticated, allow access
          return true;
        }

        // User is not authenticated, redirect to tabs (which shows login option)
        // Store the attempted URL for redirecting after login
        const returnUrl = state.url;
        return this.router.createUrlTree(['/tabs'], {
          queryParams: { returnUrl },
        });
      })
    );
  }
}
