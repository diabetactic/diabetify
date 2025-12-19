/**
 * OnboardingGuard Integration Tests
 *
 * Tests the complete onboarding guard flow including:
 * 1. Profile service integration for onboarding status checks
 * 2. Router navigation and URL tree creation
 * 3. Return URL preservation across redirects
 * 4. Error handling and fallback behavior
 * 5. Edge cases (root paths, welcome route recursion, multiple slashes)
 *
 * Flow: Check Profile → Determine Access → Build Redirect URL → Create UrlTree
 */

// Inicializar entorno TestBed para Vitest
import '../../../../test-setup';

import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
} from '@angular/router';
import { vi, type Mock } from 'vitest';
import { OnboardingGuard } from '@core/guards/onboarding.guard';
import { ProfileService } from '@core/services/profile.service';
import { LoggerService } from '@core/services/logger.service';
import { UserProfile } from '@core/models';
import { ROUTES } from '@core/constants';

// Helper para crear objetos mock con Vitest
function createMockObj<T>(methods: string[]): { [K in keyof T]?: Mock } {
  const mock: any = {};
  methods.forEach(method => {
    mock[method] = vi.fn();
  });
  return mock;
}

// Helper para crear URL segments
const makeSegment = (path: string): UrlSegment =>
  ({ path, parameters: {} }) as unknown as UrlSegment;

describe('OnboardingGuard Integration Tests', () => {
  let guard: OnboardingGuard;
  let mockProfileService: {
    getProfile: Mock;
    createProfile: Mock;
    updateProfile: Mock;
  };
  let mockRouter: {
    createUrlTree: Mock;
    navigate: Mock;
  };
  let mockLogger: {
    error: Mock;
    info: Mock;
    warn: Mock;
    debug: Mock;
  };
  let mockUrlTree: UrlTree;

  const createMockProfile = (
    hasCompletedOnboarding: boolean,
    overrides?: Partial<UserProfile>
  ): UserProfile => ({
    name: 'Test User',
    email: 'test@example.com',
    age: 30,
    hasCompletedOnboarding,
    preferences: {
      glucoseUnit: 'mg/dL',
      targetRange: { low: 70, high: 180 },
      language: 'es',
      notifications: {
        appointments: true,
        readings: true,
        reminders: true,
      },
      theme: 'light',
    },
    ...overrides,
  });

  beforeEach(() => {
    // Mock UrlTree
    mockUrlTree = {
      toString: () => '/welcome',
      root: {} as any,
      queryParams: {},
      fragment: null,
    };

    // Crear mocks de servicios
    mockProfileService = {
      getProfile: vi.fn(),
      createProfile: vi.fn(),
      updateProfile: vi.fn(),
    };

    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(mockUrlTree),
      navigate: vi.fn().mockResolvedValue(true),
    };

    mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        OnboardingGuard,
        { provide: ProfileService, useValue: mockProfileService },
        { provide: Router, useValue: mockRouter },
        { provide: LoggerService, useValue: mockLogger },
      ],
    });

    guard = TestBed.inject(OnboardingGuard);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Completed Onboarding Flow', () => {
    it('should allow navigation when onboarding is complete', async () => {
      // ARRANGE: Usuario con onboarding completo
      const profile = createMockProfile(true);
      mockProfileService.getProfile.mockResolvedValue(profile);

      // ACT: Intentar activar la ruta
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/tabs/dashboard' } as RouterStateSnapshot
      );

      // ASSERT: Permitir acceso
      expect(result).toBe(true);
      expect(mockProfileService.getProfile).toHaveBeenCalledTimes(1);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should allow route matching when onboarding is complete', async () => {
      // ARRANGE: Usuario con onboarding completo
      const profile = createMockProfile(true);
      mockProfileService.getProfile.mockResolvedValue(profile);

      // ACT: canMatch para /tabs/readings
      const segments = [makeSegment('tabs'), makeSegment('readings')];
      const result = await guard.canMatch({ path: 'tabs' } as Route, segments);

      // ASSERT: Permitir match
      expect(result).toBe(true);
      expect(mockProfileService.getProfile).toHaveBeenCalledTimes(1);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });
  });

  describe('Incomplete Onboarding Redirect', () => {
    it('should redirect to welcome when onboarding is incomplete', async () => {
      // ARRANGE: Usuario sin onboarding completo
      const profile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(profile);

      // ACT: Intentar acceder a dashboard
      const targetUrl = '/tabs/dashboard';
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: targetUrl } as RouterStateSnapshot
      );

      // ASSERT: Redirigir a welcome con returnUrl
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: targetUrl },
      });
    });

    it('should redirect to welcome when profile is null', async () => {
      // ARRANGE: Sin perfil (usuario no existe)
      mockProfileService.getProfile.mockResolvedValue(null);

      // ACT: Intentar acceder a profile page
      const targetUrl = '/tabs/profile';
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: targetUrl } as RouterStateSnapshot
      );

      // ASSERT: Redirigir a welcome
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: targetUrl },
      });
    });
  });

  describe('ProfileService Error Handling', () => {
    it('should redirect to welcome on ProfileService error', async () => {
      // ARRANGE: Error al obtener perfil
      const error = new Error('Database connection failed');
      mockProfileService.getProfile.mockRejectedValue(error);

      // ACT: Intentar activar ruta
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/tabs/dashboard' } as RouterStateSnapshot
      );

      // ASSERT: Redirigir a welcome sin returnUrl (seguridad)
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'OnboardingGuard',
        'Failed to check onboarding status',
        error
      );
    });

    it('should redirect to welcome on timeout error', async () => {
      // ARRANGE: Timeout al cargar perfil
      const error = new Error('Request timeout');
      mockProfileService.getProfile.mockRejectedValue(error);

      // ACT
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/tabs/readings' } as RouterStateSnapshot
      );

      // ASSERT: Fallback a welcome
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('CanActivate Return URL Preservation', () => {
    it('should preserve returnUrl for protected routes', async () => {
      // ARRANGE
      mockProfileService.getProfile.mockResolvedValue(createMockProfile(false));

      // ACT: Intentar acceder a appointments
      const targetUrl = '/tabs/appointments';
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: targetUrl } as RouterStateSnapshot
      );

      // ASSERT: returnUrl preservado
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: targetUrl },
      });
    });

    it('should preserve returnUrl with query parameters', async () => {
      // ARRANGE
      mockProfileService.getProfile.mockResolvedValue(createMockProfile(false));

      // ACT: URL con query params
      const targetUrl = '/tabs/dashboard?view=weekly&metric=glucose';
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: targetUrl } as RouterStateSnapshot
      );

      // ASSERT: returnUrl completo con query params
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: targetUrl },
      });
    });

    it('should preserve deep nested route URLs', async () => {
      // ARRANGE
      mockProfileService.getProfile.mockResolvedValue(null);

      // ACT: Ruta anidada profunda
      const targetUrl = '/tabs/appointments/appointment-detail/123';
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: targetUrl } as RouterStateSnapshot
      );

      // ASSERT: returnUrl preservado
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: targetUrl },
      });
    });
  });

  describe('CanMatch URL Building', () => {
    it('should build URL from route segments correctly', async () => {
      // ARRANGE
      mockProfileService.getProfile.mockResolvedValue(createMockProfile(false));

      // ACT: canMatch con múltiples segmentos
      const segments = [makeSegment('tabs'), makeSegment('dashboard')];
      const result = await guard.canMatch({ path: 'tabs' } as Route, segments);

      // ASSERT: URL construida correctamente
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/dashboard' },
      });
    });

    it('should handle single segment routes', async () => {
      // ARRANGE
      mockProfileService.getProfile.mockResolvedValue(null);

      // ACT: Un solo segmento
      const segments = [makeSegment('settings')];
      const result = await guard.canMatch({ path: 'settings' } as Route, segments);

      // ASSERT: URL simple construida
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/settings' },
      });
    });

    it('should use route path when segments are empty', async () => {
      // ARRANGE
      mockProfileService.getProfile.mockResolvedValue(createMockProfile(false));

      // ACT: Segmentos vacíos, usar path
      const result = await guard.canMatch({ path: 'tabs/profile' } as Route, []);

      // ASSERT: Usar path del route
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/profile' },
      });
    });
  });

  describe('Root Path Handling', () => {
    it('should omit returnUrl when navigating from root path', async () => {
      // ARRANGE
      mockProfileService.getProfile.mockResolvedValue(null);

      // ACT: Desde raíz '/'
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/' } as RouterStateSnapshot
      );

      // ASSERT: Sin returnUrl para root
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: undefined,
      });
    });

    it('should omit returnUrl for empty URL', async () => {
      // ARRANGE
      mockProfileService.getProfile.mockResolvedValue(createMockProfile(false));

      // ACT: URL vacía
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '' } as RouterStateSnapshot
      );

      // ASSERT: Sin returnUrl
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: undefined,
      });
    });
  });

  describe('Welcome Route Recursion Prevention', () => {
    it('should omit returnUrl when already on welcome page', async () => {
      // ARRANGE: Usuario sin onboarding en welcome
      mockProfileService.getProfile.mockResolvedValue(createMockProfile(false));

      // ACT: Ya en /welcome
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: ROUTES.WELCOME } as RouterStateSnapshot
      );

      // ASSERT: Sin returnUrl para evitar recursión
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: undefined,
      });
    });

    it('should omit returnUrl for welcome subroutes', async () => {
      // ARRANGE
      mockProfileService.getProfile.mockResolvedValue(null);

      // ACT: Subruta de welcome
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/welcome/step2' } as RouterStateSnapshot
      );

      // ASSERT: Sin returnUrl
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: undefined,
      });
    });

    it('should prevent recursion via canMatch', async () => {
      // ARRANGE
      mockProfileService.getProfile.mockResolvedValue(createMockProfile(false));

      // ACT: canMatch en welcome route
      const segments = [makeSegment('welcome')];
      const result = await guard.canMatch({ path: 'welcome' } as Route, segments);

      // ASSERT: Sin returnUrl
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: undefined,
      });
    });
  });

  describe('LoggerService Error Context', () => {
    it('should log errors with proper context information', async () => {
      // ARRANGE: Error específico
      const error = new Error('Network timeout');
      mockProfileService.getProfile.mockRejectedValue(error);

      // ACT
      await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/tabs/dashboard' } as RouterStateSnapshot
      );

      // ASSERT: Logger llamado con contexto correcto
      expect(mockLogger.error).toHaveBeenCalledWith(
        'OnboardingGuard',
        'Failed to check onboarding status',
        error
      );
    });

    it('should log different error types correctly', async () => {
      // ARRANGE: Error de tipo diferente
      const error = { message: 'Invalid response', code: 'ERR_INVALID' };
      mockProfileService.getProfile.mockRejectedValue(error);

      // ACT
      await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/tabs/profile' } as RouterStateSnapshot
      );

      // ASSERT: Error object logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'OnboardingGuard',
        'Failed to check onboarding status',
        error
      );
    });
  });

  describe('Multiple Slash Normalization', () => {
    it('should normalize multiple consecutive slashes in URL', async () => {
      // ARRANGE
      mockProfileService.getProfile.mockResolvedValue(createMockProfile(false));

      // ACT: canMatch con segmentos que podrían causar slashes dobles
      const segments = [makeSegment('tabs'), makeSegment(''), makeSegment('dashboard')];
      const result = await guard.canMatch({ path: 'tabs' } as Route, segments);

      // ASSERT: URL normalizada (sin slashes dobles)
      expect(result).toBe(mockUrlTree);
      // La implementación normaliza '/tabs//dashboard' a '/tabs/dashboard'
      const createUrlTreeCall = mockRouter.createUrlTree.mock.calls[0];
      expect(createUrlTreeCall[1]?.queryParams?.returnUrl).toMatch(/^\/[^/].*[^/]$/); // No empieza/termina con //
    });

    it('should handle route path with trailing slash', async () => {
      // ARRANGE
      mockProfileService.getProfile.mockResolvedValue(null);

      // ACT: Path con trailing slash
      const segments = [makeSegment('settings')];
      const result = await guard.canMatch({ path: 'settings/' } as Route, segments);

      // ASSERT: Normalizado sin slashes dobles
      expect(result).toBe(mockUrlTree);
      const createUrlTreeCall = mockRouter.createUrlTree.mock.calls[0];
      expect(createUrlTreeCall[1]?.queryParams?.returnUrl).not.toContain('//');
    });
  });

  describe('First-Time User Handling', () => {
    it('should redirect first-time user to welcome', async () => {
      // ARRANGE: Usuario sin perfil (primera vez)
      mockProfileService.getProfile.mockResolvedValue(null);

      // ACT: Intentar acceder a cualquier ruta
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/tabs/dashboard' } as RouterStateSnapshot
      );

      // ASSERT: Redirigir a welcome para onboarding
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/dashboard' },
      });
    });

    it('should handle user with incomplete profile data', async () => {
      // ARRANGE: Perfil sin campo hasCompletedOnboarding
      const incompleteProfile = {
        name: 'Test',
        email: 'test@example.com',
      } as UserProfile;
      mockProfileService.getProfile.mockResolvedValue(incompleteProfile);

      // ACT
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/tabs/readings' } as RouterStateSnapshot
      );

      // ASSERT: Tratar como onboarding incompleto
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/readings' },
      });
    });
  });

  describe('Profile Not Loaded State', () => {
    it('should wait for profile loading before deciding', async () => {
      // ARRANGE: Simular carga lenta de perfil
      let resolveProfile: (value: UserProfile) => void;
      const profilePromise = new Promise<UserProfile>(resolve => {
        resolveProfile = resolve;
      });
      mockProfileService.getProfile.mockReturnValue(profilePromise);

      // ACT: Iniciar guard check
      const resultPromise = guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/tabs/dashboard' } as RouterStateSnapshot
      );

      // ASSERT: No debe resolver inmediatamente
      let resolved = false;
      resultPromise.then(() => {
        resolved = true;
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(resolved).toBe(false);

      // Resolver perfil
      resolveProfile!(createMockProfile(true));
      const result = await resultPromise;

      // Ahora debe permitir acceso
      expect(result).toBe(true);
    });

    it('should handle slow profile service gracefully', async () => {
      // ARRANGE: Servicio lento pero exitoso
      mockProfileService.getProfile.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve(createMockProfile(true)), 100);
          })
      );

      // ACT
      const start = Date.now();
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/tabs/profile' } as RouterStateSnapshot
      );
      const duration = Date.now() - start;

      // ASSERT: Esperar carga y permitir acceso
      expect(result).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Onboarding Status Check Edge Cases', () => {
    it('should treat undefined hasCompletedOnboarding as incomplete', async () => {
      // ARRANGE: Perfil sin el campo hasCompletedOnboarding
      const profile = {
        name: 'Test',
        email: 'test@example.com',
        age: 25,
      } as UserProfile;
      mockProfileService.getProfile.mockResolvedValue(profile);

      // ACT
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/tabs/dashboard' } as RouterStateSnapshot
      );

      // ASSERT: Redirigir porque hasCompletedOnboarding es undefined (falsy)
      expect(result).toBe(mockUrlTree);
    });

    it('should allow access when hasCompletedOnboarding is explicitly true', async () => {
      // ARRANGE: hasCompletedOnboarding = true
      const profile = createMockProfile(true);
      mockProfileService.getProfile.mockResolvedValue(profile);

      // ACT
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/tabs/appointments' } as RouterStateSnapshot
      );

      // ASSERT: Permitir acceso
      expect(result).toBe(true);
    });

    it('should deny access when hasCompletedOnboarding is false', async () => {
      // ARRANGE: hasCompletedOnboarding = false
      const profile = createMockProfile(false);
      mockProfileService.getProfile.mockResolvedValue(profile);

      // ACT
      const result = await guard.canActivate(
        {} as ActivatedRouteSnapshot,
        { url: '/tabs/trends' } as RouterStateSnapshot
      );

      // ASSERT: Redirigir
      expect(result).toBe(mockUrlTree);
    });
  });

  describe('Multiple Concurrent Guard Checks', () => {
    it('should handle concurrent canActivate calls', async () => {
      // ARRANGE: Múltiples verificaciones simultáneas
      mockProfileService.getProfile.mockResolvedValue(createMockProfile(true));

      // ACT: Llamadas concurrentes
      const results = await Promise.all([
        guard.canActivate({} as ActivatedRouteSnapshot, {
          url: '/tabs/dashboard',
        } as RouterStateSnapshot),
        guard.canActivate({} as ActivatedRouteSnapshot, {
          url: '/tabs/readings',
        } as RouterStateSnapshot),
        guard.canActivate({} as ActivatedRouteSnapshot, {
          url: '/tabs/profile',
        } as RouterStateSnapshot),
      ]);

      // ASSERT: Todas deben permitir acceso
      expect(results).toEqual([true, true, true]);
      expect(mockProfileService.getProfile).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed concurrent checks with different results', async () => {
      // ARRANGE: Cambiar respuesta entre llamadas
      let callCount = 0;
      mockProfileService.getProfile.mockImplementation(() => {
        callCount++;
        return Promise.resolve(createMockProfile(callCount % 2 === 0));
      });

      // ACT
      const results = await Promise.all([
        guard.canActivate({} as ActivatedRouteSnapshot, {
          url: '/tabs/dashboard',
        } as RouterStateSnapshot),
        guard.canActivate({} as ActivatedRouteSnapshot, {
          url: '/tabs/readings',
        } as RouterStateSnapshot),
      ]);

      // ASSERT: Resultados diferentes
      expect(results[0]).toBe(mockUrlTree); // Primera: false -> redirect
      expect(results[1]).toBe(true); // Segunda: true -> allow
    });
  });
});
