/**
 * Theme Switching Integration Tests
 * Tests dark mode toggle, persistence, and visual changes
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertController, IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { SettingsPage } from '../../../settings/settings.page';
import { ThemeService } from '../../../core/services/theme.service';
import { ProfileService } from '../../../core/services/profile.service';
import { LocalAuthService } from '../../../core/services/local-auth.service';
import { DemoDataService } from '../../../core/services/demo-data.service';

class MockLoadingOverlay {
  present = jasmine.createSpy('present').and.returnValue(Promise.resolve());
  dismiss = jasmine.createSpy('dismiss').and.returnValue(Promise.resolve());
}

class LoadingControllerStub {
  create = jasmine.createSpy('create').and.callFake(async () => new MockLoadingOverlay());
}

class MockToast {
  present = jasmine.createSpy('present').and.returnValue(Promise.resolve());
}

class ToastControllerStub {
  create = jasmine.createSpy('create').and.callFake(async () => new MockToast());
}

class AlertControllerStub {
  create = jasmine.createSpy('create').and.callFake(async () => ({
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
  }));
}

describe('Theme Switching Integration', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;
  let compiled: HTMLElement;

  let themeService: jasmine.SpyObj<ThemeService>;
  let profileService: jasmine.SpyObj<ProfileService>;
  let authService: jasmine.SpyObj<LocalAuthService>;
  let demoDataService: jasmine.SpyObj<DemoDataService>;

  const renderComponent = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const themeEvent = (value: 'light' | 'dark' | 'auto') => ({
    detail: { value },
  });

  beforeEach(async () => {
    themeService = jasmine.createSpyObj('ThemeService', [
      'setThemeMode',
      'toggleTheme',
      'getCurrentThemeMode',
      'isDarkTheme',
      'setColorPalette',
    ]);
    profileService = jasmine.createSpyObj('ProfileService', ['getProfile']);
    authService = jasmine.createSpyObj('LocalAuthService', ['isAuthenticated', 'getCurrentUser']);
    demoDataService = jasmine.createSpyObj('DemoDataService', ['isDemoMode']);

    themeService.getCurrentThemeMode.and.returnValue('light');
    themeService.isDarkTheme.and.returnValue(false);
    themeService.setThemeMode.and.returnValue(Promise.resolve());
    themeService.toggleTheme.and.returnValue(Promise.resolve());
    themeService.setColorPalette.and.returnValue(Promise.resolve());

    profileService.getProfile.and.returnValue(Promise.resolve(null));
    authService.isAuthenticated.and.returnValue(of(true));
    authService.getCurrentUser.and.returnValue({
      dni: '1000',
      name: 'Test User',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    } as any);
    demoDataService.isDemoMode.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), RouterTestingModule, SettingsPage],
      providers: [
        { provide: ThemeService, useValue: themeService },
        { provide: ProfileService, useValue: profileService },
        { provide: LocalAuthService, useValue: authService },
        { provide: DemoDataService, useValue: demoDataService },
        { provide: LoadingController, useClass: LoadingControllerStub },
        { provide: ToastController, useClass: ToastControllerStub },
        { provide: AlertController, useClass: AlertControllerStub },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
    await renderComponent();
  });

  it('should create settings page', () => {
    expect(component).toBeTruthy();
  });

  it('should display theme select in appearance settings', async () => {
    await renderComponent();
    const themeSelect = compiled.querySelector('ion-select');
    expect(themeSelect).toBeTruthy();
  });

  it('should switch to dark mode when selection changes', async () => {
    await component.onThemeChange(themeEvent('dark'));

    expect(themeService.setThemeMode).toHaveBeenCalledWith('dark');
    expect(component.preferences.theme).toBe('dark');
    expect(component.hasChanges).toBeTrue();
  });

  it('should support auto theme mode selection', async () => {
    await component.onThemeChange(themeEvent('auto'));

    expect(themeService.setThemeMode).toHaveBeenCalledWith('auto');
    expect(component.preferences.theme).toBe('auto');
  });

  it('should keep latest preference when toggling multiple times', async () => {
    await component.onThemeChange(themeEvent('dark'));
    await component.onThemeChange(themeEvent('light'));

    expect(themeService.setThemeMode).toHaveBeenCalledWith('light');
    expect(component.preferences.theme).toBe('light');
  });

  it('should persist preferences when saving settings', async () => {
    component.preferences.theme = 'dark';
    component.glucoseSettings.unit = 'mg/dL';
    component.hasChanges = true;
    const storageSpy = spyOn(Storage.prototype, 'setItem');

    await component.saveSettings();

    expect(storageSpy).toHaveBeenCalledWith('userSettings', jasmine.any(String));
    expect(component.hasChanges).toBeFalse();
  });
});
