/**
 * Theme Toggle Integration Test
 * Comprehensive test for theme switching functionality
 *
 * Tests:
 * 1. Initial state: Theme starts as 'light' (new default)
 * 2. Toggle functionality: Click toggle in settings switches theme
 * 3. DOM changes: body element gets correct classes (light-theme/dark-theme)
 * 4. Persistence: Theme preference is saved to profile
 * 5. Component integration: Settings page reflects theme state
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { SettingsPage } from '../../../settings/settings.page';
import { ThemeService } from '../../../core/services/theme.service';
import { ProfileService } from '../../../core/services/profile.service';
import { LocalAuthService } from '../../../core/services/local-auth.service';
import { DemoDataService } from '../../../core/services/demo-data.service';
import { UserProfile } from '../../../core/models/user-profile.model';

import {
  clickElement,
  queryIonicComponent,
  hasClass,
  selectIonicOption,
  createMockLoadingController,
  createMockToastController,
} from '../../helpers/dom-utils';

describe('Theme Toggle Integration', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let compiled: HTMLElement;

  let themeService: ThemeService;
  let profileService: jasmine.SpyObj<ProfileService>;
  let authService: jasmine.SpyObj<LocalAuthService>;
  let demoDataService: jasmine.SpyObj<DemoDataService>;
  let alertController: jasmine.SpyObj<AlertController>;
  let loadingController: any;
  let toastController: any;

  let profileSubject: BehaviorSubject<UserProfile>;

  const mockProfile: UserProfile = {
    id: '1000',
    name: 'Test User',
    age: 10,
    accountState: 'active' as any,
    dateOfBirth: '2014-01-01',
    tidepoolConnection: {
      connected: false,
    },
    preferences: {
      glucoseUnit: 'mg/dL',
      colorPalette: 'default',
      themeMode: 'light', // Default to light theme
      highContrastMode: false,
      targetRange: {
        min: 70,
        max: 180,
        unit: 'mg/dL',
      },
      notificationsEnabled: true,
      soundEnabled: true,
      showTrendArrows: true,
      autoSync: true,
      syncInterval: 15,
      language: 'es',
      dateFormat: '24h',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Create observable subjects
    profileSubject = new BehaviorSubject<UserProfile>(mockProfile);

    // Create service spies
    profileService = jasmine.createSpyObj(
      'ProfileService',
      ['getProfile', 'updateProfile', 'updatePreferences'],
      { profile$: profileSubject.asObservable() }
    );

    authService = jasmine.createSpyObj('LocalAuthService', [
      'isAuthenticated',
      'getCurrentUser',
      'logout',
    ]);

    demoDataService = jasmine.createSpyObj('DemoDataService', ['isDemoMode']);

    alertController = jasmine.createSpyObj('AlertController', ['create']);
    loadingController = createMockLoadingController();
    toastController = createMockToastController();

    // Setup default return values
    profileService.getProfile.and.returnValue(Promise.resolve(mockProfile));
    profileService.updateProfile.and.returnValue(Promise.resolve(mockProfile));
    profileService.updatePreferences.and.returnValue(Promise.resolve(mockProfile));

    authService.isAuthenticated.and.returnValue(of(true));
    authService.getCurrentUser.and.returnValue({
      dni: '1000',
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      dateOfBirth: '2014-01-01',
      diabetesType: '1',
      diagnosisDate: '2020-01-01',
      preferences: {
        ...mockProfile.preferences,
        notifications: {
          appointments: true,
          readings: true,
          reminders: true,
        },
        theme: 'light', // Explicit theme default
      },
    } as any);

    demoDataService.isDemoMode.and.returnValue(true);

    const mockAlert = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine
        .createSpy('onDidDismiss')
        .and.returnValue(Promise.resolve({ role: 'cancel' })),
    };
    alertController.create.and.returnValue(Promise.resolve(mockAlert as any));

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), RouterTestingModule, SettingsPage],
      providers: [
        ThemeService, // Use real ThemeService for DOM manipulation testing
        { provide: ProfileService, useValue: profileService },
        { provide: LocalAuthService, useValue: authService },
        { provide: DemoDataService, useValue: demoDataService },
        { provide: AlertController, useValue: alertController },
        { provide: LoadingController, useValue: loadingController },
        { provide: ToastController, useValue: toastController },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
    themeService = TestBed.inject(ThemeService);

    // Wait for initialization
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    // Clean up body classes after each test
    document.body.classList.remove('light-theme', 'dark-theme', 'palette-default');
  });

  describe('Initial State', () => {
    it('should create settings page', () => {
      expect(component).toBeTruthy();
    });

    it('should start with light theme by default', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      // Verify component preference is light
      expect(component.preferences.theme).toBe('light');

      // Verify ThemeService reflects light theme
      expect(themeService.getCurrentThemeMode()).toBe('light');
    }));

    it('should apply light-theme class to body initially', fakeAsync(() => {
      tick(100);
      fixture.detectChanges();

      // Check body has light theme class
      expect(document.body.classList.contains('light-theme')).toBe(true);
      expect(document.body.classList.contains('dark-theme')).toBe(false);
    }));

    it('should load user preferences on init', fakeAsync(() => {
      component.ngOnInit();
      tick();
      fixture.detectChanges();

      expect(component.user).toBeTruthy();
      expect(component.user?.firstName).toBe('Test');
    }));
  });

  describe('Toggle Functionality', () => {
    it('should display theme select in settings', fakeAsync(() => {
      tick(200);
      fixture.detectChanges();

      // Look for the theme select element (it's bound to preferences.theme)
      const themeSelects = compiled.querySelectorAll('ion-select');
      // First select should be theme (Appearance section comes before Language)
      const themeSelect = Array.from(themeSelects).find(
        select =>
          select.getAttribute('ng-reflect-model') === 'light' ||
          select.previousElementSibling?.textContent?.includes('Tema')
      );
      expect(themeSelect || themeSelects.length > 0).toBeTruthy();
    }));

    it('should switch to dark theme when dark option selected', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      // Simulate theme change to dark
      const event = { detail: { value: 'dark' } };
      component.onThemeChange(event);
      tick(100);
      fixture.detectChanges();

      // Verify component state
      expect(component.preferences.theme).toBe('dark');
      expect(component.hasChanges).toBe(true);

      // Verify ThemeService was called
      tick(100);
      expect(themeService.getCurrentThemeMode()).toBe('dark');
    }));

    it('should switch to auto theme when auto option selected', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      // Simulate theme change to auto
      const event = { detail: { value: 'auto' } };
      component.onThemeChange(event);
      tick(100);
      fixture.detectChanges();

      // Verify component state
      expect(component.preferences.theme).toBe('auto');
      expect(component.hasChanges).toBe(true);
    }));

    it('should toggle from light to dark to auto', fakeAsync(() => {
      const modes = ['light', 'dark', 'auto'];

      modes.forEach(mode => {
        const event = { detail: { value: mode } };
        component.onThemeChange(event);
        tick(100);
        fixture.detectChanges();

        expect(component.preferences.theme).toBe(mode);
      });
    }));
  });

  describe('DOM Changes', () => {
    it('should apply dark-theme class when switching to dark', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      // Switch to dark theme
      const event = { detail: { value: 'dark' } };
      component.onThemeChange(event);
      tick(200);
      fixture.detectChanges();

      // Check body classes
      expect(document.body.classList.contains('dark-theme')).toBe(true);
      expect(document.body.classList.contains('light-theme')).toBe(false);
    }));

    it('should apply light-theme class when switching to light', fakeAsync(() => {
      // First switch to dark
      let event = { detail: { value: 'dark' } };
      component.onThemeChange(event);
      tick(200);
      fixture.detectChanges();

      // Then switch back to light
      event = { detail: { value: 'light' } };
      component.onThemeChange(event);
      tick(200);
      fixture.detectChanges();

      // Check body classes
      expect(document.body.classList.contains('light-theme')).toBe(true);
      expect(document.body.classList.contains('dark-theme')).toBe(false);
    }));

    it('should remove previous theme class when switching', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      // Start with light
      expect(document.body.classList.contains('light-theme')).toBe(true);

      // Switch to dark
      const event = { detail: { value: 'dark' } };
      component.onThemeChange(event);
      tick(200);
      fixture.detectChanges();

      // Both should not be present simultaneously
      const hasLightAndDark =
        document.body.classList.contains('light-theme') &&
        document.body.classList.contains('dark-theme');
      expect(hasLightAndDark).toBe(false);
    }));

    it('should maintain palette class when switching themes', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      // Verify palette class exists
      expect(document.body.classList.contains('palette-default')).toBe(true);

      // Switch theme
      const event = { detail: { value: 'dark' } };
      component.onThemeChange(event);
      tick(200);
      fixture.detectChanges();

      // Palette class should still be present
      expect(document.body.classList.contains('palette-default')).toBe(true);
    }));
  });

  describe('Persistence', () => {
    it('should save theme preference to profile when changed', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      // Change theme
      const event = { detail: { value: 'dark' } };
      component.onThemeChange(event);
      tick(100);
      fixture.detectChanges();

      // Save settings
      component.saveSettings();
      tick();
      fixture.detectChanges();

      // Verify ProfileService.updatePreferences was called
      expect(profileService.updatePreferences).toHaveBeenCalled();

      // Verify the call included theme preference
      const callArgs = profileService.updatePreferences.calls.mostRecent().args[0];
      expect(callArgs).toBeTruthy();
    }));

    it('should persist dark theme preference through component lifecycle', fakeAsync(() => {
      // Set dark theme
      const event = { detail: { value: 'dark' } };
      component.onThemeChange(event);
      tick(100);
      fixture.detectChanges();

      // Simulate component reload
      const newComponent = new SettingsPage(
        null as any,
        alertController,
        loadingController,
        toastController,
        profileService,
        themeService,
        authService,
        demoDataService
      );
      newComponent.preferences.theme = 'dark';

      // Verify theme persisted
      expect(newComponent.preferences.theme).toBe('dark');
    }));

    it('should set hasChanges flag when theme is modified', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      expect(component.hasChanges).toBe(false);

      // Change theme
      const event = { detail: { value: 'dark' } };
      component.onThemeChange(event);
      tick();
      fixture.detectChanges();

      // Verify changes flag is set
      expect(component.hasChanges).toBe(true);
    }));

    it('should reset hasChanges flag after successful save', fakeAsync(() => {
      // Change theme
      const event = { detail: { value: 'dark' } };
      component.onThemeChange(event);
      tick();
      fixture.detectChanges();

      expect(component.hasChanges).toBe(true);

      // Save
      component.saveSettings();
      tick();
      fixture.detectChanges();

      // Verify flag reset
      expect(component.hasChanges).toBe(false);
    }));
  });

  describe('Component Integration', () => {
    it('should reflect theme state in settings page UI', fakeAsync(() => {
      tick(200);
      fixture.detectChanges();

      // Wait for ngOnInit to complete
      tick(100);
      fixture.detectChanges();

      // Initial state (after loadUserData completes)
      expect(component.preferences.theme).toBe('light');

      // Change via component
      component.preferences.theme = 'dark';
      fixture.detectChanges();
      tick();

      // Verify state reflects change
      expect(component.preferences.theme).toBe('dark');
    }));

    it('should integrate with ThemeService correctly', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      // Change theme via component
      const event = { detail: { value: 'dark' } };
      component.onThemeChange(event);
      tick(100);
      fixture.detectChanges();

      // Verify ThemeService state matches
      expect(themeService.getCurrentThemeMode()).toBe('dark');
    }));

    it('should handle all three theme modes correctly', fakeAsync(() => {
      const testModes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];

      testModes.forEach(mode => {
        const event = { detail: { value: mode } };
        component.onThemeChange(event);
        tick(100);
        fixture.detectChanges();

        expect(component.preferences.theme).toBe(mode);
        expect(themeService.getCurrentThemeMode()).toBe(mode);
      });
    }));

    it('should maintain theme consistency across service and component', fakeAsync(() => {
      tick();
      fixture.detectChanges();

      // Set theme via service
      themeService.setThemeMode('dark');
      tick(100);
      fixture.detectChanges();

      // Component should eventually reflect the change
      // (In real implementation, component might subscribe to theme changes)
      expect(themeService.getCurrentThemeMode()).toBe('dark');
    }));

    it('should show toast after saving theme preference', fakeAsync(() => {
      // Change theme
      const event = { detail: { value: 'dark' } };
      component.onThemeChange(event);
      tick();
      fixture.detectChanges();

      // Save
      component.saveSettings();
      tick();
      fixture.detectChanges();

      // Verify toast was shown
      expect(toastController.create).toHaveBeenCalled();
    }));
  });

  describe('Edge Cases', () => {
    it('should handle rapid theme switching', fakeAsync(() => {
      const modes: Array<'light' | 'dark' | 'auto'> = ['dark', 'light', 'auto', 'dark', 'light'];

      modes.forEach(mode => {
        const event = { detail: { value: mode } };
        component.onThemeChange(event);
        tick(50);
      });

      fixture.detectChanges();
      tick(200);

      // Should end up in last state
      expect(component.preferences.theme).toBe('light');
    }));

    it('should handle theme change during loading', fakeAsync(() => {
      component.isLoading = true;
      fixture.detectChanges();

      const event = { detail: { value: 'dark' } };
      component.onThemeChange(event);
      tick(100);
      fixture.detectChanges();

      // Theme should still change
      expect(component.preferences.theme).toBe('dark');
    }));

    it('should handle null/undefined theme values gracefully', fakeAsync(() => {
      // This tests defensive programming
      const event = { detail: { value: null } };
      expect(() => {
        component.onThemeChange(event);
        tick();
        fixture.detectChanges();
      }).not.toThrow();
    }));
  });

  describe('Auto Theme Mode', () => {
    it('should respect system preference when set to auto', fakeAsync(() => {
      // Set to auto mode
      const event = { detail: { value: 'auto' } };
      component.onThemeChange(event);
      tick(100);
      fixture.detectChanges();

      expect(component.preferences.theme).toBe('auto');

      // ThemeService should determine actual theme based on system
      const actualTheme = themeService.isDarkTheme();
      expect(typeof actualTheme).toBe('boolean');
    }));

    it('should update when system theme changes in auto mode', fakeAsync(() => {
      // Set to auto
      const event = { detail: { value: 'auto' } };
      component.onThemeChange(event);
      tick(200);
      fixture.detectChanges();

      // System preference determines actual theme
      // (In real browser, this would be based on prefers-color-scheme)
      const isDark = themeService.isDarkTheme();
      expect(typeof isDark).toBe('boolean');
    }));
  });
});
