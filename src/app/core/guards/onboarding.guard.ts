import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanMatch,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
} from '@angular/router';

import { ProfileService } from '@services/profile.service';
import { LocalAuthService } from '@services/local-auth.service';
import { LoggerService } from '@services/logger.service';
import { ROUTES } from '@core/constants';

/**
 * Prevents access to authenticated sections until BOTH:
 * 1. User is authenticated (has valid access token)
 * 2. User has completed onboarding
 *
 * This ensures users cannot access protected routes after logout
 * even if their onboarding profile persists in local storage.
 *
 * Redirects users back to the welcome screen when either condition is not met.
 */
@Injectable({
  providedIn: 'root',
})
export class OnboardingGuard implements CanActivate, CanMatch {
  constructor(
    private readonly profileService: ProfileService,
    private readonly authService: LocalAuthService,
    private readonly router: Router,
    private readonly logger: LoggerService
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    return this.ensureOnboardingComplete(state.url);
  }

  canMatch(route: Route, segments: UrlSegment[]): Promise<boolean | UrlTree> {
    const attemptedUrl = this.buildUrlFromSegments(route.path ?? '', segments);
    return this.ensureOnboardingComplete(attemptedUrl);
  }

  private async ensureOnboardingComplete(returnUrl: string): Promise<boolean | UrlTree> {
    try {
      await this.authService.waitForInitialization();

      const accessToken = await this.authService.getAccessToken();
      if (!accessToken) {
        this.logger.debug('OnboardingGuard', 'No access token - redirecting to welcome');
        return this.createWelcomeRedirect(returnUrl);
      }

      const profile = await this.profileService.getProfile();
      if (profile?.hasCompletedOnboarding) {
        return true;
      }

      this.logger.debug('OnboardingGuard', 'Onboarding not complete - redirecting to welcome');
      return this.createWelcomeRedirect(returnUrl);
    } catch (error) {
      this.logger.error('OnboardingGuard', 'Failed to check auth/onboarding status', error);
      return this.router.createUrlTree([ROUTES.WELCOME]);
    }
  }

  private createWelcomeRedirect(returnUrl: string): UrlTree {
    const queryParams =
      returnUrl && returnUrl !== '/' && !returnUrl.startsWith(ROUTES.WELCOME)
        ? { returnUrl }
        : undefined;
    return this.router.createUrlTree([ROUTES.WELCOME], { queryParams });
  }

  private buildUrlFromSegments(path: string, segments: UrlSegment[]): string {
    const segmentPath = segments
      .map(segment => segment.path)
      .filter(Boolean)
      .join('/');

    if (segmentPath) {
      return `/${segmentPath}`.replace(/\/{2,}/g, '/');
    }

    return `/${path ?? ''}`.replace(/\/{2,}/g, '/');
  }
}
