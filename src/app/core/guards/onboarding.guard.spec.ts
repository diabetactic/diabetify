/**
 * OnboardingGuard - Unit Tests
 * Tests para el guard que previene acceso a secciones autenticadas
 * hasta que se complete el onboarding
 */

import { TestBed } from '@angular/core/testing';
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlSegment,
  Route,
  UrlTree,
} from '@angular/router';
import { OnboardingGuard } from './onboarding.guard';
import { ProfileService } from '@services/profile.service';
import { LocalAuthService } from '@services/local-auth.service';
import { LoggerService } from '@services/logger.service';
import { UserProfile } from '@models/user-profile.model';
import { ROUTES } from '@core/constants';

describe('OnboardingGuard', () => {
  let guard: OnboardingGuard;
  let mockProfileService: {
    getProfile: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    waitForInitialization: ReturnType<typeof vi.fn>;
    getAccessToken: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };

  // Helper para crear un perfil de usuario mock
  const createMockProfile = (hasCompletedOnboarding: boolean): UserProfile =>
    ({
      id: '40123456',
      name: 'Test User',
      email: 'test@example.com',
      hasCompletedOnboarding,
      tidepoolConnection: {
        connected: false,
      },
      preferences: {
        language: 'es',
        notificationsEnabled: true,
        theme: 'light',
        glucoseUnit: 'mg/dL',
        timeFormat: '24h',
      },
    }) as UserProfile;

  beforeEach(() => {
    mockProfileService = {
      getProfile: vi.fn(),
    };

    mockAuthService = {
      waitForInitialization: vi.fn().mockResolvedValue(undefined),
      getAccessToken: vi.fn().mockResolvedValue('valid-token'),
    };

    mockRouter = {
      createUrlTree: vi.fn(),
    };

    mockLogger = {
      error: vi.fn(),
      debug: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        OnboardingGuard,
        { provide: ProfileService, useValue: mockProfileService },
        { provide: LocalAuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    guard = TestBed.inject(OnboardingGuard);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canActivate', () => {
    it('debe permitir navegación cuando el usuario completó onboarding', async () => {
      // Arrange
      const mockProfile = createMockProfile(true);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/tabs/dashboard' } as RouterStateSnapshot;

      // Act
      const result = await guard.canActivate(route, state);

      // Assert
      expect(result).toBe(true);
      expect(mockProfileService.getProfile).toHaveBeenCalledOnce();
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });

    it('debe redirigir a /welcome cuando el usuario NO completó onboarding', async () => {
      // Arrange
      const mockProfile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/tabs/dashboard' } as RouterStateSnapshot;

      // Act
      const result = await guard.canActivate(route, state);

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/dashboard' },
      });
    });

    it('debe incluir returnUrl en queryParams cuando la URL intentada no es raíz', async () => {
      // Arrange
      const mockProfile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/tabs/profile' } as RouterStateSnapshot;

      // Act
      await guard.canActivate(route, state);

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/profile' },
      });
    });

    it('NO debe incluir returnUrl cuando la URL es raíz (/)', async () => {
      // Arrange
      const mockProfile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/' } as RouterStateSnapshot;

      // Act
      await guard.canActivate(route, state);

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: undefined,
      });
    });

    it('NO debe incluir returnUrl cuando la URL ya es /welcome', async () => {
      // Arrange
      const mockProfile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/welcome' } as RouterStateSnapshot;

      // Act
      await guard.canActivate(route, state);

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: undefined,
      });
    });

    it('debe manejar profile null o undefined redirigiendo a /welcome', async () => {
      // Arrange
      mockProfileService.getProfile.mockResolvedValue(null);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/tabs/dashboard' } as RouterStateSnapshot;

      // Act
      const result = await guard.canActivate(route, state);

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/dashboard' },
      });
    });

    it('debe redirigir a /welcome y registrar error cuando getProfile falla', async () => {
      // Arrange
      const error = new Error('Network error');
      mockProfileService.getProfile.mockRejectedValue(error);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/tabs/dashboard' } as RouterStateSnapshot;

      // Act
      const result = await guard.canActivate(route, state);

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'OnboardingGuard',
        'Failed to check auth/onboarding status',
        error
      );
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME]);
    });

    it('debe manejar profile sin hasCompletedOnboarding como no completado', async () => {
      // Arrange - profile sin la propiedad hasCompletedOnboarding
      const mockProfile = createMockProfile(false);
      delete mockProfile.hasCompletedOnboarding;
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/tabs/dashboard' } as RouterStateSnapshot;

      // Act
      const result = await guard.canActivate(route, state);

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalled();
    });
  });

  describe('canMatch', () => {
    it('debe permitir match cuando el usuario completó onboarding', async () => {
      // Arrange
      const mockProfile = createMockProfile(true);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const route = { path: 'tabs' } as Route;
      const segments: UrlSegment[] = [new UrlSegment('tabs', {}), new UrlSegment('dashboard', {})];

      // Act
      const result = await guard.canMatch(route, segments);

      // Assert
      expect(result).toBe(true);
      expect(mockProfileService.getProfile).toHaveBeenCalledOnce();
    });

    it('debe redirigir a /welcome cuando el usuario NO completó onboarding', async () => {
      // Arrange
      const mockProfile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = { path: 'tabs' } as Route;
      const segments: UrlSegment[] = [new UrlSegment('tabs', {}), new UrlSegment('dashboard', {})];

      // Act
      const result = await guard.canMatch(route, segments);

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/dashboard' },
      });
    });

    it('debe construir correctamente la URL desde segments múltiples', async () => {
      // Arrange
      const mockProfile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = { path: '' } as Route;
      const segments: UrlSegment[] = [
        new UrlSegment('tabs', {}),
        new UrlSegment('appointments', {}),
        new UrlSegment('create', {}),
      ];

      // Act
      await guard.canMatch(route, segments);

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/appointments/create' },
      });
    });

    it('debe usar route.path cuando segments está vacío', async () => {
      // Arrange
      const mockProfile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = { path: 'settings' } as Route;
      const segments: UrlSegment[] = [];

      // Act
      await guard.canMatch(route, segments);

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/settings' },
      });
    });

    it('debe manejar route sin path', async () => {
      // Arrange
      const mockProfile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = {} as Route;
      const segments: UrlSegment[] = [];

      // Act
      await guard.canMatch(route, segments);

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: undefined,
      });
    });

    it('debe normalizar múltiples slashes en la URL', async () => {
      // Arrange
      const mockProfile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = { path: '//tabs' } as Route;
      const segments: UrlSegment[] = [new UrlSegment('', {}), new UrlSegment('dashboard', {})];

      // Act
      await guard.canMatch(route, segments);

      // Assert
      const callArgs = mockRouter.createUrlTree.mock.calls[0];
      const returnUrl = callArgs[1]?.queryParams?.returnUrl;
      expect(returnUrl).toBeDefined();
      // Verificar que no hay múltiples slashes consecutivos
      expect(returnUrl).not.toMatch(/\/{2,}/);
    });

    it('debe filtrar segments vacíos', async () => {
      // Arrange
      const mockProfile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = { path: '' } as Route;
      const segments: UrlSegment[] = [
        new UrlSegment('tabs', {}),
        new UrlSegment('', {}), // Segment vacío
        new UrlSegment('dashboard', {}),
      ];

      // Act
      await guard.canMatch(route, segments);

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/dashboard' },
      });
    });
  });

  describe('Authentication Check', () => {
    it('debe redirigir a /welcome cuando no hay token de acceso', async () => {
      mockAuthService.getAccessToken.mockResolvedValue(null);
      const mockProfile = createMockProfile(true);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/tabs/dashboard' } as RouterStateSnapshot;

      const result = await guard.canActivate(route, state);

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/dashboard' },
      });
      expect(mockProfileService.getProfile).not.toHaveBeenCalled();
    });

    it('debe verificar auth antes de onboarding', async () => {
      mockAuthService.getAccessToken.mockResolvedValue('valid-token');
      const mockProfile = createMockProfile(true);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/tabs/dashboard' } as RouterStateSnapshot;

      const result = await guard.canActivate(route, state);

      expect(result).toBe(true);
      expect(mockAuthService.waitForInitialization).toHaveBeenCalled();
      expect(mockAuthService.getAccessToken).toHaveBeenCalled();
      expect(mockProfileService.getProfile).toHaveBeenCalled();
    });

    it('debe esperar inicialización de auth antes de verificar token', async () => {
      const initOrder: string[] = [];
      mockAuthService.waitForInitialization.mockImplementation(async () => {
        initOrder.push('waitForInitialization');
      });
      mockAuthService.getAccessToken.mockImplementation(async () => {
        initOrder.push('getAccessToken');
        return 'valid-token';
      });
      mockProfileService.getProfile.mockResolvedValue(createMockProfile(true));

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/tabs/dashboard' } as RouterStateSnapshot;

      await guard.canActivate(route, state);

      expect(initOrder).toEqual(['waitForInitialization', 'getAccessToken']);
    });
  });

  describe('Edge Cases', () => {
    it('debe manejar múltiples llamadas concurrentes correctamente', async () => {
      // Arrange
      const mockProfile = createMockProfile(true);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const route = {} as ActivatedRouteSnapshot;
      const state1 = { url: '/tabs/dashboard' } as RouterStateSnapshot;
      const state2 = { url: '/tabs/profile' } as RouterStateSnapshot;
      const state3 = { url: '/tabs/readings' } as RouterStateSnapshot;

      // Act - llamadas concurrentes
      const results = await Promise.all([
        guard.canActivate(route, state1),
        guard.canActivate(route, state2),
        guard.canActivate(route, state3),
      ]);

      // Assert
      expect(results).toEqual([true, true, true]);
      expect(mockProfileService.getProfile).toHaveBeenCalledTimes(3);
    });

    it('debe manejar hasCompletedOnboarding = false explícitamente', async () => {
      // Arrange - asegurar que false es tratado correctamente vs undefined
      const mockProfile = createMockProfile(false);
      mockProfile.hasCompletedOnboarding = false; // Explícitamente false
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/tabs/dashboard' } as RouterStateSnapshot;

      // Act
      const result = await guard.canActivate(route, state);

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalled();
    });

    it('debe preservar caracteres especiales en returnUrl', async () => {
      // Arrange
      const mockProfile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(mockProfile);

      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree.mockReturnValue(mockUrlTree);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/tabs/readings?filter=recent&sort=desc' } as RouterStateSnapshot;

      // Act
      await guard.canActivate(route, state);

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/readings?filter=recent&sort=desc' },
      });
    });
  });
});
