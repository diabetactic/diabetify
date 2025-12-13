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

import { ProfileService } from '../services/profile.service';
import { LoggerService } from '../services/logger.service';
import { ROUTES } from '../constants';

/**
 * Prevents access to authenticated sections until onboarding is complete.
 * Redirects users back to the welcome screen when onboarding data is missing.
 */
@Injectable({
  providedIn: 'root',
})
export class OnboardingGuard implements CanActivate, CanMatch {
  constructor(
    private readonly profileService: ProfileService,
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
      const profile = await this.profileService.getProfile();
      if (profile?.hasCompletedOnboarding) {
        return true;
      }

      const queryParams =
        returnUrl && returnUrl !== '/' && !returnUrl.startsWith(ROUTES.WELCOME)
          ? { returnUrl }
          : undefined;

      return this.router.createUrlTree([ROUTES.WELCOME], { queryParams });
    } catch (error) {
      this.logger.error('OnboardingGuard', 'Failed to check onboarding status', error);
      // On error, redirect to welcome page to allow re-authentication
      return this.router.createUrlTree([ROUTES.WELCOME]);
    }
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
