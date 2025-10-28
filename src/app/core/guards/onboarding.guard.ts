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
    private readonly router: Router
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
    const profile = await this.profileService.getProfile();
    if (profile?.hasCompletedOnboarding) {
      return true;
    }

    const queryParams =
      returnUrl && returnUrl !== '/' && !returnUrl.startsWith('/welcome')
        ? { returnUrl }
        : undefined;

    return this.router.createUrlTree(['/welcome'], { queryParams });
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
