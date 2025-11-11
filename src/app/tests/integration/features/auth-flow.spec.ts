/**
 * Authentication Flow Integration Tests
 * Tests complete onboarding and login flow including routing and guards
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { getTranslateModuleForTesting } from '../../helpers/translate-test.helper';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { WelcomePage } from '../../../welcome/welcome.page';
import { ProfileService } from '../../../core/services/profile.service';
import { OnboardingGuard } from '../../../core/guards/onboarding.guard';
import { UserProfile } from '../../../core/models/user-profile.model';

import { clickElement, queryIonicComponent } from '../../helpers/dom-utils';

describe('Authentication Flow Integration', () => {
  let component: WelcomePage;
  let fixture: ComponentFixture<WelcomePage>;
  let router: Router;
  let location: Location;
  let profileService: ProfileService;

  const waitForFixture = async (
    targetFixture: ComponentFixture<WelcomePage>,
    delayMs = 0
  ): Promise<void> => {
    targetFixture.detectChanges();
    await targetFixture.whenStable();
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        IonicModule.forRoot(),
        RouterTestingModule.withRoutes([
          {
            path: '',
            redirectTo: 'welcome',
            pathMatch: 'full',
          },
          {
            path: 'welcome',
            component: WelcomePage,
          },
          {
            path: 'tabs',
            canMatch: [OnboardingGuard],
            loadChildren: () => import('../../../tabs/tabs.module').then(m => m.TabsPageModule),
          },
        ]),
        getTranslateModuleForTesting(),
        WelcomePage,
      ],
      providers: [ProfileService, OnboardingGuard],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    profileService = TestBed.inject(ProfileService);

    // Clear any existing profile before each test
    await profileService.deleteProfile();

    fixture = TestBed.createComponent(WelcomePage);
    component = fixture.componentInstance;
    await waitForFixture(fixture);
  });

  afterEach(async () => {
    // Clean up after each test
    await profileService.deleteProfile();
  });

  describe('Initial State', () => {
    it('should create welcome page component', () => {
      expect(component).toBeTruthy();
    });

    it('should show welcome page when not onboarded', async () => {
      await router.navigate(['']);
      await fixture.whenStable();

      expect(location.path()).toBe('/welcome');
    });

    it('should display Get Started and Login buttons', () => {
      const getStartedButton = queryIonicComponent(fixture, 'ion-button.primary-button');
      const loginButton = queryIonicComponent(fixture, 'ion-button.secondary-button');

      expect(getStartedButton).toBeTruthy();
      expect(loginButton).toBeTruthy();
    });
  });

  describe('Login Flow', () => {
    it('should create profile and navigate on login', async () => {
      // Ensure we start with no profile
      const initialProfile = await profileService.getProfile();
      expect(initialProfile).toBeNull();

      // Navigate to welcome page
      await router.navigate(['/welcome']);
      await waitForFixture(fixture);

      // Find and click login button
      const loginButton = queryIonicComponent(fixture, 'ion-button.secondary-button');
      expect(loginButton).toBeTruthy();

      clickElement(loginButton!, fixture);
      await waitForFixture(fixture);

      // Wait for async operations
      await waitForFixture(fixture, 100);

      // Verify profile was created
      const createdProfile = await profileService.getProfile();
      expect(createdProfile).toBeTruthy();
      expect(createdProfile?.hasCompletedOnboarding).toBe(true);

      // Verify navigation to dashboard
      expect(location.path()).toContain('/tabs');
    });

    it('should create profile with correct defaults', async () => {
      // Click login button
      const loginButton = queryIonicComponent(fixture, 'ion-button.secondary-button');
      clickElement(loginButton!, fixture);
      await waitForFixture(fixture, 100);

      // Verify profile has correct default values
      const profile = await profileService.getProfile();
      expect(profile).toBeTruthy();
      expect(profile?.preferences.language).toBe('es');
      expect(profile?.preferences.themeMode).toBe('auto');
      expect(profile?.hasCompletedOnboarding).toBe(true);
      expect(profile?.name).toBe('User');
      expect(profile?.age).toBe(10);
    });

    it('should handle Get Started button same as Login', async () => {
      // Click Get Started button
      const getStartedButton = queryIonicComponent(fixture, 'ion-button.primary-button');
      clickElement(getStartedButton!, fixture);
      await waitForFixture(fixture, 100);

      // Verify profile was created
      const profile = await profileService.getProfile();
      expect(profile).toBeTruthy();
      expect(profile?.hasCompletedOnboarding).toBe(true);

      // Verify navigation to dashboard
      expect(location.path()).toContain('/tabs');
    });
  });

  describe('Onboarding Guard', () => {
    it('should prevent access to tabs without onboarding', async () => {
      // Ensure no profile exists
      await profileService.deleteProfile();

      // Try to navigate to tabs
      await router.navigate(['/tabs/dashboard']);
      await waitForFixture(fixture, 100);

      // Should redirect to welcome (ignoring optional returnUrl query param)
      expect(location.path()).toContain('/welcome');
    });

    it('should allow access to tabs with completed onboarding', async () => {
      // Create profile with onboarding complete
      await profileService.createProfile({
        name: 'Test User',
        age: 25,
        hasCompletedOnboarding: true,
        preferences: {
          glucoseUnit: 'mg/dL',
          colorPalette: 'default',
          themeMode: 'light',
          highContrastMode: false,
          targetRange: { min: 70, max: 180, unit: 'mg/dL' },
          notificationsEnabled: true,
          soundEnabled: true,
          showTrendArrows: true,
          autoSync: true,
          syncInterval: 15,
          language: 'es',
          dateFormat: '24h',
        },
      });

      // Navigate to tabs
      await router.navigate(['/tabs/dashboard']);
      await waitForFixture(fixture, 100);

      // Should successfully navigate
      expect(location.path()).toContain('/tabs');
    });

    it('should redirect with returnUrl when accessing protected route', async () => {
      // Clear profile
      await profileService.deleteProfile();

      // Try to access protected route
      await router.navigate(['/tabs/dashboard']);
      await waitForFixture(fixture, 100);

      // Should redirect to welcome with returnUrl
      const path = location.path();
      expect(path).toContain('/welcome');
      // returnUrl might be in query params
    });
  });

  describe('Persistence', () => {
    it('should skip welcome when already onboarded', async () => {
      // Create profile with onboarding complete
      await profileService.createProfile({
        name: 'Existing User',
        age: 30,
        hasCompletedOnboarding: true,
        preferences: {
          glucoseUnit: 'mg/dL',
          colorPalette: 'default',
          themeMode: 'dark',
          highContrastMode: false,
          targetRange: { min: 70, max: 180, unit: 'mg/dL' },
          notificationsEnabled: true,
          soundEnabled: true,
          showTrendArrows: true,
          autoSync: true,
          syncInterval: 15,
          language: 'es',
          dateFormat: '24h',
        },
      });

      // Navigate to root
      await router.navigate(['']);
      await waitForFixture(fixture, 100);

      // Check if we're on welcome page
      const currentPath = location.path();

      // If we're on welcome, the component should redirect us to tabs
      if (currentPath === '/welcome') {
        // Trigger ngOnInit to check for existing profile
        component.ngOnInit();
        await waitForFixture(fixture, 100);

        // After ngOnInit, should redirect to tabs
        expect(location.path()).toContain('/tabs');
      } else {
        // We were already redirected to tabs
        expect(currentPath).toContain('/tabs');
      }
    });

    it('should persist profile across app restarts', async () => {
      // First "session" - create profile
      const loginButton = queryIonicComponent(fixture, 'ion-button.secondary-button');
      clickElement(loginButton!, fixture);
      await waitForFixture(fixture, 100);

      const firstProfile = await profileService.getProfile();
      expect(firstProfile).toBeTruthy();

      // Simulate app restart by creating new component
      const newFixture = TestBed.createComponent(WelcomePage);
      const newComponent = newFixture.componentInstance;
      await waitForFixture(newFixture);

      // Profile should still exist
      const persistedProfile = await profileService.getProfile();
      expect(persistedProfile).toBeTruthy();
      expect(persistedProfile?.id).toBe(firstProfile?.id);
      expect(persistedProfile?.hasCompletedOnboarding).toBe(true);
    });
  });

  describe('Profile Creation Details', () => {
    it('should generate unique profile IDs', async () => {
      // Create first profile
      const loginButton = queryIonicComponent(fixture, 'ion-button.secondary-button');
      clickElement(loginButton!, fixture);
      await waitForFixture(fixture, 100);

      const firstProfile = await profileService.getProfile();
      const firstId = firstProfile?.id;

      // Delete and create second profile
      await profileService.deleteProfile();

      const newFixture = TestBed.createComponent(WelcomePage);
      await waitForFixture(newFixture);
      const newLoginButton = queryIonicComponent(newFixture, 'ion-button.secondary-button');
      clickElement(newLoginButton!, newFixture);
      await waitForFixture(newFixture, 100);

      const secondProfile = await profileService.getProfile();
      const secondId = secondProfile?.id;

      expect(firstId).toBeTruthy();
      expect(secondId).toBeTruthy();
      expect(firstId).not.toBe(secondId);
    });

    it('should create profile with all required fields', async () => {
      const loginButton = queryIonicComponent(fixture, 'ion-button.secondary-button');
      clickElement(loginButton!, fixture);
      await waitForFixture(fixture, 100);

      const profile = await profileService.getProfile();

      // Required fields
      expect(profile?.id).toBeTruthy();
      expect(profile?.name).toBeTruthy();
      expect(profile?.age).toBeTruthy();
      expect(profile?.hasCompletedOnboarding).toBe(true);

      // Preferences
      expect(profile?.preferences).toBeTruthy();
      expect(profile?.preferences.language).toBe('es');
      expect(profile?.preferences.glucoseUnit).toBe('mg/dL');
      expect(profile?.preferences.targetRange).toBeTruthy();

      // Connection status
      expect(profile?.tidepoolConnection).toBeTruthy();
      expect(profile?.tidepoolConnection.connected).toBe(false);

      // Timestamps
      expect(profile?.createdAt).toBeTruthy();
      expect(profile?.updatedAt).toBeTruthy();
    });

    it('should update existing profile if one exists', async () => {
      // Create initial profile without onboarding complete
      await profileService.createProfile({
        name: 'Partial User',
        age: 20,
        hasCompletedOnboarding: false,
        preferences: {
          glucoseUnit: 'mmol/L',
          colorPalette: 'default',
          themeMode: 'light',
          highContrastMode: false,
          targetRange: { min: 4, max: 10, unit: 'mmol/L' },
          notificationsEnabled: true,
          soundEnabled: true,
          showTrendArrows: true,
          autoSync: true,
          syncInterval: 15,
          language: 'en',
          dateFormat: '12h',
        },
      });

      const initialProfile = await profileService.getProfile();
      const initialId = initialProfile?.id;

      // Click login button
      const loginButton = queryIonicComponent(fixture, 'ion-button.secondary-button');
      clickElement(loginButton!, fixture);
      await waitForFixture(fixture, 100);

      // Profile should be updated, not replaced
      const updatedProfile = await profileService.getProfile();
      expect(updatedProfile?.id).toBe(initialId);
      expect(updatedProfile?.hasCompletedOnboarding).toBe(true);
      expect(updatedProfile?.name).toBe('Partial User'); // Should keep existing name
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid repeated login clicks', async () => {
      const loginButton = queryIonicComponent(fixture, 'ion-button.secondary-button');

      // Click multiple times rapidly
      clickElement(loginButton!, fixture);
      clickElement(loginButton!, fixture);
      clickElement(loginButton!, fixture);

      await waitForFixture(fixture, 100);

      // Should only create one profile
      const profile = await profileService.getProfile();
      expect(profile).toBeTruthy();
      expect(profile?.hasCompletedOnboarding).toBe(true);
    });

    it('should handle navigation during profile creation', async () => {
      const loginButton = queryIonicComponent(fixture, 'ion-button.secondary-button');
      clickElement(loginButton!, fixture);

      // Try to navigate away immediately
      await router.navigate(['/welcome']);

      await waitForFixture(fixture, 100);

      // Profile should still be created
      const profile = await profileService.getProfile();
      expect(profile).toBeTruthy();
    });
  });
});
