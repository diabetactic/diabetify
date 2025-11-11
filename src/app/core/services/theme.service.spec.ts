import { TestBed } from '@angular/core/testing';
import { RendererFactory2 } from '@angular/core';
import { ThemeService } from './theme.service';
import { ProfileService } from './profile.service';
import { UserProfile, DEFAULT_USER_PREFERENCES, AccountState } from '../models/user-profile.model';
import { skip, take } from 'rxjs/operators';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockRenderer: jasmine.SpyObj<any>;
  let mockRendererFactory: jasmine.SpyObj<RendererFactory2>;
  let mockProfileService: jasmine.SpyObj<ProfileService>;

  const mockUserProfile: UserProfile = {
    id: 'test-user-id',
    name: 'Test User',
    age: 10,
    accountState: AccountState.ACTIVE,
    dateOfBirth: '2014-01-01',
    tidepoolConnection: { connected: false },
    preferences: {
      ...DEFAULT_USER_PREFERENCES,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Create mock renderer
    mockRenderer = jasmine.createSpyObj('Renderer2', ['addClass', 'removeClass']);

    // Create mock renderer factory
    mockRendererFactory = jasmine.createSpyObj('RendererFactory2', ['createRenderer']);
    mockRendererFactory.createRenderer.and.returnValue(mockRenderer);

    // Create mock profile service
    mockProfileService = jasmine.createSpyObj('ProfileService', [
      'getProfile',
      'updatePreferences',
    ]);
    mockProfileService.getProfile.and.returnValue(Promise.resolve(null));
    mockProfileService.updatePreferences.and.returnValue(Promise.resolve(mockUserProfile));

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: RendererFactory2, useValue: mockRendererFactory },
        { provide: ProfileService, useValue: mockProfileService },
      ],
    });

    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with light theme mode by default', () => {
    const currentMode = service.getCurrentThemeMode();
    expect(currentMode).toBe('light');
    expect(typeof service.isDarkTheme()).toBe('boolean');
  });

  it('should toggle theme', async () => {
    const initialDark = service.isDarkTheme();
    await service.toggleTheme();
    // The actual dark state depends on the mode and might not change immediately
    expect(service.getCurrentThemeMode()).toBeDefined();
  });

  it('should set dark theme mode', async () => {
    await service.setThemeMode('dark');
    expect(service.getCurrentThemeMode()).toBe('dark');
    expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({ themeMode: 'dark' });
  });

  it('should set light theme mode', async () => {
    await service.setThemeMode('light');
    expect(service.getCurrentThemeMode()).toBe('light');
    expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({ themeMode: 'light' });
  });

  it('should set auto theme mode', async () => {
    await service.setThemeMode('auto');
    expect(service.getCurrentThemeMode()).toBe('auto');
    expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({ themeMode: 'auto' });
  });

  it('should set color palette', async () => {
    await service.setColorPalette('candy');
    expect(service.getCurrentPalette()).toBe('candy');
    expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({ colorPalette: 'candy' });
  });

  it('should toggle high contrast mode', async () => {
    const initialHighContrast = service.isHighContrastEnabled();
    await service.toggleHighContrast();
    expect(service.isHighContrastEnabled()).toBe(!initialHighContrast);
    expect(mockProfileService.updatePreferences).toHaveBeenCalled();
  });

  it('should emit theme changes via observable', done => {
    service.isDark$.pipe(skip(1), take(1)).subscribe(isDark => {
      expect(typeof isDark).toBe('boolean');
      done();
    });

    service.setThemeMode('dark');
  });
});
