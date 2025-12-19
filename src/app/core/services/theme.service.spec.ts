// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { RendererFactory2 } from '@angular/core';
import { ThemeService } from '@services/theme.service';
import { ProfileService } from '@services/profile.service';
import { LoggerService } from '@services/logger.service';
import { UserProfile, DEFAULT_USER_PREFERENCES, AccountState } from '@models/user-profile.model';
import { skip, take } from 'rxjs/operators';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockRenderer: { addClass: Mock; removeClass: Mock };
  let mockRendererFactory: Mock<RendererFactory2>;
  let mockProfileService: Mock<ProfileService>;
  let mockLoggerService: Mock<LoggerService>;
  let mockBody: HTMLElement;
  let mockHtml: HTMLElement;

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

    // Mock document.body and document.documentElement
    mockBody = document.createElement('div');
    mockHtml = document.createElement('html');

    Object.defineProperty(document, 'body', {
      writable: true,
      configurable: true,
      value: mockBody,
    });

    Object.defineProperty(document, 'documentElement', {
      writable: true,
      configurable: true,
      value: mockHtml,
    });

    // Create mock renderer
    mockRenderer = {
      addClass: vi.fn((element: HTMLElement, className: string) => {
        element.classList.add(className);
      }),
      removeClass: vi.fn((element: HTMLElement, className: string) => {
        element.classList.remove(className);
      }),
    };

    // Create mock renderer factory
    mockRendererFactory = {
      createRenderer: vi.fn().mockReturnValue(mockRenderer),
    } as unknown as Mock<RendererFactory2>;

    // Create mock profile service
    mockProfileService = {
      getProfile: vi.fn(),
      updatePreferences: vi.fn(),
    } as unknown as Mock<ProfileService>;
    mockProfileService.getProfile.mockReturnValue(Promise.resolve(null));
    mockProfileService.updatePreferences.mockReturnValue(Promise.resolve(mockUserProfile));

    // Create mock logger service
    mockLoggerService = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Mock<LoggerService>;

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: RendererFactory2, useValue: mockRendererFactory },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: LoggerService, useValue: mockLoggerService },
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

  it('should emit theme changes via observable', () =>
    new Promise<void>(resolve => {
      service.isDark$.pipe(skip(1), take(1)).subscribe(isDark => {
        expect(typeof isDark).toBe('boolean');
        resolve();
      });

      service.setThemeMode('dark');
    }));

  describe('Theme Persistence (E2E Coverage)', () => {
    it('should apply dark theme CSS classes to document', async () => {
      await service.setThemeMode('dark');

      // Verificar que se aplicaron las clases CSS correctas
      expect(mockBody.classList.contains('dark')).toBe(true);
      expect(mockHtml.classList.contains('dark')).toBe(true);
      expect(mockHtml.classList.contains('ion-palette-dark')).toBe(true);
      expect(mockHtml.getAttribute('data-theme')).toBe('dark');
    });

    it('should apply light theme CSS classes to document', async () => {
      // Primero aplicar dark para asegurar que se limpie
      await service.setThemeMode('dark');
      await service.setThemeMode('light');

      // Verificar que se aplicaron las clases CSS correctas
      expect(mockBody.classList.contains('light')).toBe(true);
      expect(mockHtml.classList.contains('light')).toBe(true);
      expect(mockHtml.classList.contains('ion-palette-dark')).toBe(false);
      expect(mockHtml.getAttribute('data-theme')).toBe('diabetactic');
    });

    it('should persist dark theme to profile service', async () => {
      await service.setThemeMode('dark');

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        themeMode: 'dark',
      });
    });

    it('should persist light theme to profile service', async () => {
      await service.setThemeMode('light');

      expect(mockProfileService.updatePreferences).toHaveBeenCalledWith({
        themeMode: 'light',
      });
    });

    it('should restore theme from profile on initialization', async () => {
      // Simular perfil con tema oscuro guardado previamente
      const profileWithDarkTheme = {
        ...mockUserProfile,
        preferences: {
          ...DEFAULT_USER_PREFERENCES,
          themeMode: 'dark' as const,
        },
      };

      // Crear nuevo mock de ProfileService que retorne el perfil con tema oscuro
      const newMockProfileService = {
        getProfile: vi.fn().mockResolvedValue(profileWithDarkTheme),
        updatePreferences: vi.fn().mockResolvedValue(mockUserProfile),
      };

      // Crear nuevo mock de LoggerService
      const newMockLoggerService = {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      // Configurar nuevo TestBed con el perfil que tiene tema oscuro
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThemeService,
          { provide: RendererFactory2, useValue: mockRendererFactory },
          { provide: ProfileService, useValue: newMockProfileService },
          { provide: LoggerService, useValue: newMockLoggerService },
        ],
      });

      // Crear nueva instancia del servicio
      const newService = TestBed.inject(ThemeService);

      // Esperar a que se complete la inicialización asíncrona
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verificar que se restauró el tema desde el perfil
      expect(newService.getCurrentThemeMode()).toBe('dark');
    });

    it('should toggle between light and dark themes', async () => {
      // Iniciar en light (predeterminado)
      expect(service.getCurrentThemeMode()).toBe('light');

      // Cambiar a dark
      await service.toggleTheme();
      expect(service.getCurrentThemeMode()).toBe('dark');
      expect(mockBody.classList.contains('dark')).toBe(true);

      // Cambiar de vuelta a light
      await service.toggleTheme();
      expect(service.getCurrentThemeMode()).toBe('light');
      expect(mockBody.classList.contains('light')).toBe(true);
    });

    it('should apply color palette classes to document', async () => {
      await service.setColorPalette('candy');

      expect(mockBody.classList.contains('palette-candy')).toBe(true);
    });

    it('should apply high contrast classes when enabled', async () => {
      await service.toggleHighContrast();

      expect(mockBody.classList.contains('high-contrast')).toBe(true);
    });

    it('should remove high contrast classes when disabled', async () => {
      // Activar primero
      await service.toggleHighContrast();
      expect(mockBody.classList.contains('high-contrast')).toBe(true);

      // Desactivar
      await service.toggleHighContrast();
      expect(mockBody.classList.contains('high-contrast')).toBe(false);
    });

    it('should apply CSS custom properties for color palette', async () => {
      await service.setColorPalette('candy');

      // Verificar que se aplicaron las propiedades CSS personalizadas
      const primaryColor = mockHtml.style.getPropertyValue('--ion-color-primary');
      const secondaryColor = mockHtml.style.getPropertyValue('--ion-color-secondary');

      expect(primaryColor).toBeTruthy();
      expect(secondaryColor).toBeTruthy();
    });

    it('should migrate legacy localStorage theme on initialization', async () => {
      // Configurar tema legacy en localStorage
      localStorage.setItem('diabetactic-theme', 'dark');

      // Crear nuevo mock de ProfileService que no retorne perfil
      const newMockProfileService = {
        getProfile: vi.fn().mockResolvedValue(null),
        updatePreferences: vi.fn().mockResolvedValue(mockUserProfile),
      };

      // Crear nuevo mock de LoggerService
      const newMockLoggerService = {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      // Configurar nuevo TestBed sin perfil
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThemeService,
          { provide: RendererFactory2, useValue: mockRendererFactory },
          { provide: ProfileService, useValue: newMockProfileService },
          { provide: LoggerService, useValue: newMockLoggerService },
        ],
      });

      // Crear nueva instancia del servicio
      const newService = TestBed.inject(ThemeService);

      // Esperar a que se complete la inicialización asíncrona
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verificar que se migró el tema desde localStorage legacy
      expect(newService.getCurrentThemeMode()).toBe('dark');

      // Verificar que se eliminó el tema legacy de localStorage
      expect(localStorage.getItem('diabetactic-theme')).toBeNull();
    });
  });

  describe('System Theme Detection', () => {
    let matchMediaMock: Mock;

    beforeEach(() => {
      // Mock window.matchMedia para pruebas de tema del sistema
      matchMediaMock = vi.fn();
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: matchMediaMock,
      });
    });

    it('should detect system dark theme preference when mode is auto', async () => {
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      await service.setThemeMode('auto');

      // En modo auto con preferencia oscura del sistema, debería aplicar tema oscuro
      expect(service.isDarkTheme()).toBe(true);
    });

    it('should detect system light theme preference when mode is auto', async () => {
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      await service.setThemeMode('auto');

      // En modo auto con preferencia clara del sistema, debería aplicar tema claro
      expect(service.isDarkTheme()).toBe(false);
    });

    it('should listen for system theme changes when in auto mode', async () => {
      const mockMediaQuery = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      matchMediaMock.mockReturnValue(mockMediaQuery);

      // Crear nuevo mock de ProfileService
      const newMockProfileService = {
        getProfile: vi.fn().mockResolvedValue(null),
        updatePreferences: vi.fn().mockResolvedValue(mockUserProfile),
      };

      // Crear nuevo mock de LoggerService
      const newMockLoggerService = {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      // Reinicializar TestBed para crear un nuevo servicio
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThemeService,
          { provide: RendererFactory2, useValue: mockRendererFactory },
          { provide: ProfileService, useValue: newMockProfileService },
          { provide: LoggerService, useValue: newMockLoggerService },
        ],
      });

      // Crear nueva instancia del servicio que configurará el listener
      const newService = TestBed.inject(ThemeService);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verificar que se configuró el listener para cambios en el tema del sistema
      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('Observable Streams', () => {
    it('should emit theme mode changes through themeMode$ observable', () =>
      new Promise<void>(resolve => {
        service.themeMode$.pipe(skip(1), take(1)).subscribe(mode => {
          expect(mode).toBe('dark');
          resolve();
        });

        service.setThemeMode('dark');
      }));

    it('should emit color palette changes through colorPalette$ observable', () =>
      new Promise<void>(resolve => {
        service.colorPalette$.pipe(skip(1), take(1)).subscribe(palette => {
          expect(palette).toBe('nature');
          resolve();
        });

        service.setColorPalette('nature');
      }));

    it('should emit high contrast changes through highContrast$ observable', () =>
      new Promise<void>(resolve => {
        service.highContrast$.pipe(skip(1), take(1)).subscribe(highContrast => {
          expect(highContrast).toBe(true);
          resolve();
        });

        service.toggleHighContrast();
      }));

    it('should emit isDark changes through isDark$ observable', () =>
      new Promise<void>(resolve => {
        service.isDark$.pipe(skip(1), take(1)).subscribe(isDark => {
          expect(isDark).toBe(true);
          resolve();
        });

        service.setThemeMode('dark');
      }));
  });

  describe('Cleanup', () => {
    it('should complete all observables on destroy', () => {
      const themeModeSpy = vi.spyOn(service['_themeMode$'], 'complete');
      const colorPaletteSpy = vi.spyOn(service['_colorPalette$'], 'complete');
      const highContrastSpy = vi.spyOn(service['_highContrast$'], 'complete');
      const isDarkSpy = vi.spyOn(service['_isDark$'], 'complete');

      service.ngOnDestroy();

      expect(themeModeSpy).toHaveBeenCalled();
      expect(colorPaletteSpy).toHaveBeenCalled();
      expect(highContrastSpy).toHaveBeenCalled();
      expect(isDarkSpy).toHaveBeenCalled();
    });
  });
});
