import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
} from '@angular/router';

import { OnboardingGuard } from './onboarding.guard';
import { ProfileService } from '../services/profile.service';
import { UserProfile } from '../models';

describe('OnboardingGuard', () => {
  let guard: OnboardingGuard;
  let profileService: jasmine.SpyObj<ProfileService>;
  let router: jasmine.SpyObj<Router>;
  let urlTree: UrlTree;

  const makeSegment = (path: string): UrlSegment =>
    ({ path, parameters: {} }) as unknown as UrlSegment;

  beforeEach(() => {
    urlTree = {} as UrlTree;
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    routerSpy.createUrlTree.and.returnValue(urlTree);

    const profileSpy = jasmine.createSpyObj<ProfileService>('ProfileService', ['getProfile']);

    TestBed.configureTestingModule({
      providers: [
        OnboardingGuard,
        { provide: ProfileService, useValue: profileSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    guard = TestBed.inject(OnboardingGuard);
    profileService = TestBed.inject(ProfileService) as jasmine.SpyObj<ProfileService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('allows activation when onboarding is complete', async () => {
    profileService.getProfile.and.resolveTo({ hasCompletedOnboarding: true } as UserProfile);

    const result = await guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/tabs/dashboard' } as RouterStateSnapshot
    );

    expect(result).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to welcome when onboarding data is missing', async () => {
    profileService.getProfile.and.resolveTo(null);

    const targetUrl = '/tabs/dashboard';
    const result = await guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: targetUrl } as RouterStateSnapshot
    );

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/welcome'], {
      queryParams: { returnUrl: targetUrl },
    });
  });

  it('computes returnUrl from matched segments', async () => {
    profileService.getProfile.and.resolveTo({ hasCompletedOnboarding: false } as UserProfile);

    const segments = [makeSegment('tabs'), makeSegment('dashboard')];
    const result = await guard.canMatch({ path: 'tabs' } as Route, segments);

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/welcome'], {
      queryParams: { returnUrl: '/tabs/dashboard' },
    });
  });

  it('omits returnUrl when navigating to the welcome route', async () => {
    profileService.getProfile.and.resolveTo(null);
    router.createUrlTree.calls.reset();

    const result = await guard.canMatch({ path: 'welcome' } as Route, [makeSegment('welcome')]);

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/welcome'], { queryParams: undefined });
  });
});
