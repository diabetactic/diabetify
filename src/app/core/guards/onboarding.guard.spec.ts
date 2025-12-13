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
import { ProfileService } from '@services/profile.service';
import { UserProfile } from '@core/models';

describe('OnboardingGuard', () => {
  let guard: OnboardingGuard;
  let profileService: jest.Mocked<ProfileService>;
  let router: jest.Mocked<Router>;
  let urlTree: UrlTree;

  const makeSegment = (path: string): UrlSegment =>
    ({ path, parameters: {} }) as unknown as UrlSegment;

  beforeEach(() => {
    urlTree = {} as UrlTree;
    const routerSpy = {
      createUrlTree: jest.fn().mockReturnValue(urlTree),
    } as unknown as jest.Mocked<Router>;

    const profileSpy = {
      getProfile: jest.fn(),
    } as unknown as jest.Mocked<ProfileService>;

    TestBed.configureTestingModule({
      providers: [
        OnboardingGuard,
        { provide: ProfileService, useValue: profileSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    guard = TestBed.inject(OnboardingGuard);
    profileService = TestBed.inject(ProfileService) as jest.Mocked<ProfileService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
  });

  it('allows activation when onboarding is complete', async () => {
    profileService.getProfile.mockResolvedValue({ hasCompletedOnboarding: true } as UserProfile);

    const result = await guard.canActivate(
      {} as ActivatedRouteSnapshot,
      { url: '/tabs/dashboard' } as RouterStateSnapshot
    );

    expect(result).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to welcome when onboarding data is missing', async () => {
    profileService.getProfile.mockResolvedValue(null);

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
    profileService.getProfile.mockResolvedValue({ hasCompletedOnboarding: false } as UserProfile);

    const segments = [makeSegment('tabs'), makeSegment('dashboard')];
    const result = await guard.canMatch({ path: 'tabs' } as Route, segments);

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/welcome'], {
      queryParams: { returnUrl: '/tabs/dashboard' },
    });
  });

  it('omits returnUrl when navigating to the welcome route', async () => {
    profileService.getProfile.mockResolvedValue(null);
    // Note: mockClear() clears call history but preserves mock implementation
    router.createUrlTree.mockClear();
    router.createUrlTree.mockReturnValue(urlTree);

    const result = await guard.canMatch({ path: 'welcome' } as Route, [makeSegment('welcome')]);

    expect(result).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/welcome'], { queryParams: undefined });
  });
});
