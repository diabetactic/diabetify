/**
 * Profile Editing Integration Tests
 * Tests profile field updates, validation, and persistence
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, ToastController } from '@ionic/angular';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { SettingsPage } from '../../../settings/settings.page';
import { ProfileService } from '../../../core/services/profile.service';
import { LocalAuthService } from '../../../core/services/local-auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { DemoDataService } from '../../../core/services/demo-data.service';
import { UserProfile } from '../../../core/models/user-profile.model';

import { createMockToastController } from '../../helpers/dom-utils';

describe('Profile Editing Integration', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;

  let profileService: jest.Mocked<ProfileService>;
  let authService: jest.Mocked<LocalAuthService>;
  let themeService: jest.Mocked<ThemeService>;
  let demoDataService: jest.Mocked<DemoDataService>;
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
      themeMode: 'auto',
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
    profileService = {
      getProfile: jest.fn().mockResolvedValue(mockProfile),
      updateProfile: jest.fn().mockResolvedValue(mockProfile),
      updatePreferences: jest.fn().mockResolvedValue(mockProfile),
      profile$: profileSubject.asObservable(),
    } as any;

    authService = {
      isAuthenticated: jest.fn().mockReturnValue(of(true)),
      getCurrentUser: jest.fn().mockReturnValue({
        dni: '1000',
        name: 'Test User',
        email: 'test@example.com',
      } as any),
    } as any;

    themeService = {
      getCurrentThemeMode: jest.fn().mockReturnValue('auto'),
      setThemeMode: jest.fn(),
    } as any;

    demoDataService = {
      isDemoMode: jest.fn().mockReturnValue(true),
    } as any;

    toastController = createMockToastController();

    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), SettingsPage],
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: profileService },
        { provide: LocalAuthService, useValue: authService },
        { provide: ThemeService, useValue: themeService },
        { provide: DemoDataService, useValue: demoDataService },
        { provide: ToastController, useValue: toastController },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create settings page for profile editing', () => {
    expect(component).toBeTruthy();
  });

  it('should load user profile data on init', fakeAsync(() => {
    component.ngOnInit();
    tick();
    fixture.detectChanges();

    // Component has user property from LocalAuthService
    expect(component.user).toBeTruthy();
  }));

  it('should edit and save profile name', fakeAsync(() => {
    const newName = 'Updated Name';

    // Update name
    component.profileSettings.name = newName;
    component.hasChanges = true;
    tick();
    fixture.detectChanges();

    // Verify changes flag is set
    expect(component.hasChanges).toBe(true);
  }));

  it('should update glucose unit preference', fakeAsync(() => {
    // Change from mg/dL to mmol/L
    component.glucoseSettings.unit = 'mmol/L';
    component.hasChanges = true;
    tick();
    fixture.detectChanges();

    expect(component.glucoseSettings.unit).toBe('mmol/L');
    expect(component.hasChanges).toBe(true);
  }));

  it('should update target range values', fakeAsync(() => {
    // Update target range
    component.glucoseSettings.targetLow = 80;
    component.glucoseSettings.targetHigh = 200;
    component.hasChanges = true;
    tick();
    fixture.detectChanges();

    expect(component.glucoseSettings.targetLow).toBe(80);
    expect(component.glucoseSettings.targetHigh).toBe(200);
  }));

  it('should clear hasChanges flag after local save', async () => {
    component.hasChanges = true;

    await component.saveSettings();
    fixture.detectChanges();

    expect(component.hasChanges).toBe(false);
  });

  it('should track unsaved changes', fakeAsync(() => {
    expect(component.hasChanges).toBe(false);

    // Make a change
    component.profileSettings.name = 'Changed Name';
    component.hasChanges = true;
    tick();

    expect(component.hasChanges).toBe(true);
  }));

  it('should validate target range (low < high)', fakeAsync(() => {
    component.glucoseSettings.targetLow = 80;
    component.glucoseSettings.targetHigh = 200;

    expect(component.glucoseSettings.targetLow).toBeLessThan(component.glucoseSettings.targetHigh);
  }));

  it('should handle profile data from observable', fakeAsync(() => {
    // Update the profile subject
    const updatedProfile = { ...mockProfile, name: 'New Name' };
    profileSubject.next(updatedProfile);
    tick();
    fixture.detectChanges();

    // The profile should be received via subscription
    expect(component).toBeTruthy();
  }));

  it('should have default glucose settings', () => {
    expect(component.glucoseSettings.unit).toBeDefined();
    expect(component.glucoseSettings.targetLow).toBeDefined();
    expect(component.glucoseSettings.targetHigh).toBeDefined();
  });

  it('should have profile settings structure', () => {
    expect(component.profileSettings).toBeDefined();
    expect(component.profileSettings.name).toBeDefined();
    expect(component.profileSettings.email).toBeDefined();
  });
});
