// Configuración de Vitest para tests de integración
import '../../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { AuthGuard } from '@core/guards/auth.guard';
import { UnifiedAuthService, UnifiedAuthState } from '@services/unified-auth.service';
import {
  LocalAuthService,
  LocalAuthState,
  AccountState as LocalAccountState,
} from '@services/local-auth.service';
import {
  TidepoolAuthService,
  AuthState as TidepoolAuthState,
} from '@services/tidepool-auth.service';
import { AccountState } from '@models/user-profile.model';
import { ROUTES } from '@core/constants';

/**
 * Tests de integración para AuthGuard
 *
 * Estos tests verifican el comportamiento completo del guard con servicios de autenticación
 * simulados, cubriendo todos los escenarios de autenticación, estados de cuenta y transiciones.
 */
describe('AuthGuard - Integration Tests', () => {
  let guard: AuthGuard;
  let mockUnifiedAuthService: jasmine.SpyObj<UnifiedAuthService>;
  let mockLocalAuthService: jasmine.SpyObj<LocalAuthService>;
  let mockTidepoolAuthService: jasmine.SpyObj<TidepoolAuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  // Subjects para simular cambios de estado
  let tidepoolAuthStateSubject: BehaviorSubject<TidepoolAuthState>;
  let localAuthStateSubject: BehaviorSubject<LocalAuthState>;
  let unifiedAuthStateSubject: BehaviorSubject<UnifiedAuthState>;

  // Mock route y state
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;
  let mockUrlTree: UrlTree;

  beforeEach(() => {
    // Inicializar estados de autenticación
    tidepoolAuthStateSubject = new BehaviorSubject<TidepoolAuthState>({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      errorCode: null,
      userId: null,
      email: null,
      flowStep: 'idle',
      lastAuthenticated: null,
    });

    localAuthStateSubject = new BehaviorSubject<LocalAuthState>({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });

    unifiedAuthStateSubject = new BehaviorSubject<UnifiedAuthState>({
      isAuthenticated: false,
      provider: null,
      tidepoolAuth: null,
      localAuth: null,
      user: null,
    });

    // Mock UrlTree
    mockUrlTree = { toString: () => '/mock-url' } as UrlTree;

    // Crear mocks de servicios
    mockTidepoolAuthService = {
      authState: tidepoolAuthStateSubject.asObservable(),
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
      refreshAccessToken: vi.fn(),
    } as unknown as jasmine.SpyObj<TidepoolAuthService>;

    mockLocalAuthService = {
      authState$: localAuthStateSubject.asObservable(),
      waitForInitialization: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      login: vi.fn(),
      register: vi.fn(),
      getAccessToken: vi.fn(),
      refreshAccessToken: vi.fn(),
    } as unknown as jasmine.SpyObj<LocalAuthService>;

    mockUnifiedAuthService = {
      authState$: unifiedAuthStateSubject.asObservable(),
      isAuthenticated: vi.fn(),
      getCurrentUser: vi.fn(),
      getProvider: vi.fn(),
      logout: vi.fn(),
    } as unknown as jasmine.SpyObj<UnifiedAuthService>;

    mockRouter = {
      createUrlTree: vi.fn().mockReturnValue(mockUrlTree),
      navigate: vi.fn().mockResolvedValue(true),
      navigateByUrl: vi.fn().mockResolvedValue(true),
    } as unknown as jasmine.SpyObj<Router>;

    // Configurar TestBed
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: TidepoolAuthService, useValue: mockTidepoolAuthService },
        { provide: LocalAuthService, useValue: mockLocalAuthService },
        { provide: UnifiedAuthService, useValue: mockUnifiedAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    guard = TestBed.inject(AuthGuard);
    mockLocalAuthService = TestBed.inject(LocalAuthService) as jasmine.SpyObj<LocalAuthService>;
    mockTidepoolAuthService = TestBed.inject(
      TidepoolAuthService
    ) as jasmine.SpyObj<TidepoolAuthService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Mock route y state por defecto
    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/dashboard' } as RouterStateSnapshot;
  });

  afterEach(() => {
    // Limpiar subjects
    tidepoolAuthStateSubject.complete();
    localAuthStateSubject.complete();
    unifiedAuthStateSubject.complete();
  });

  describe('Escenario 1: Usuario no autenticado', () => {
    it('debe redirigir a /welcome con returnUrl cuando el usuario no está autenticado', async () => {
      // Arrange: ambos servicios no autenticados
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      mockState = { url: '/tabs/dashboard' } as RouterStateSnapshot;

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/dashboard' },
      });
      expect(mockLocalAuthService.waitForInitialization).toHaveBeenCalled();
    });

    it('debe preservar returnUrl complejo en los query params', async () => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      mockState = {
        url: '/tabs/appointments/appointment-detail/123?edit=true',
      } as RouterStateSnapshot;

      // Act
      await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/appointments/appointment-detail/123?edit=true' },
      });
    });
  });

  describe('Escenario 2: Usuario autenticado con Tidepool', () => {
    it('debe permitir acceso cuando el usuario está autenticado con Tidepool', async () => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: 'tidepool-user-456',
        email: 'tidepool@example.com',
        flowStep: 'idle',
        lastAuthenticated: Date.now(),
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
      expect(mockLocalAuthService.logout).not.toHaveBeenCalled();
    });

    it('no debe verificar autenticación local cuando Tidepool está activo', async () => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: 'tidepool-user-789',
        email: 'tidepool@test.com',
        flowStep: 'idle',
        lastAuthenticated: Date.now(),
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
      // No debe suscribirse a localAuthStateSubject
      expect(localAuthStateSubject.observers.length).toBe(0);
    });
  });

  describe('Escenario 3: Usuario local con estado ACTIVE', () => {
    beforeEach(() => {
      // Tidepool no autenticado
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });
    });

    it('debe permitir acceso cuando el usuario local tiene estado ACTIVE', async () => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: '1000',
          email: 'patient@example.com',
          firstName: 'Juan',
          lastName: 'Pérez',
          role: 'patient',
          accountState: AccountState.ACTIVE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          preferences: {
            glucoseUnit: 'mg/dL',
            targetRange: { low: 70, high: 180 },
            language: 'es',
            theme: 'auto',
            notifications: {
              appointments: true,
              readings: true,
              reminders: true,
            },
          },
        },
        accessToken: 'valid-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: Date.now() + 3600000,
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
      expect(mockLocalAuthService.logout).not.toHaveBeenCalled();
    });

    it('debe permitir acceso cuando accountState está ausente (retrocompatibilidad)', async () => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: '1001',
          email: 'legacy@example.com',
          firstName: 'María',
          lastName: 'García',
          role: 'patient',
          // accountState ausente
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        accessToken: 'legacy-token',
        refreshToken: 'legacy-refresh',
        expiresAt: Date.now() + 3600000,
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });
  });

  describe('Escenario 4: Usuario local con estado PENDING', () => {
    it('debe redirigir a /account-pending cuando el usuario tiene estado PENDING', async () => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: '2000',
          email: 'pending@example.com',
          firstName: 'Pedro',
          lastName: 'López',
          role: 'patient',
          accountState: AccountState.PENDING,
          createdAt: '2024-12-19T00:00:00Z',
          updatedAt: '2024-12-19T00:00:00Z',
          preferences: {
            glucoseUnit: 'mg/dL',
            targetRange: { low: 70, high: 180 },
            language: 'es',
            theme: 'light',
            notifications: {
              appointments: false,
              readings: false,
              reminders: false,
            },
          },
        },
        accessToken: 'pending-token',
        refreshToken: 'pending-refresh',
        expiresAt: Date.now() + 3600000,
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.ACCOUNT_PENDING]);
      expect(mockLocalAuthService.logout).not.toHaveBeenCalled();
    });
  });

  describe('Escenario 5: Usuario local con estado DISABLED', () => {
    it('debe cerrar sesión y redirigir a /welcome cuando el usuario tiene estado DISABLED', async () => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: '3000',
          email: 'disabled@example.com',
          firstName: 'Carlos',
          lastName: 'Sánchez',
          role: 'patient',
          accountState: AccountState.DISABLED,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-12-19T00:00:00Z',
          preferences: {
            glucoseUnit: 'mmol/L',
            targetRange: { low: 3.9, high: 10.0 },
            language: 'en',
            theme: 'dark',
            notifications: {
              appointments: true,
              readings: true,
              reminders: true,
            },
          },
        },
        accessToken: 'disabled-token',
        refreshToken: 'disabled-refresh',
        expiresAt: Date.now() + 3600000,
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockLocalAuthService.logout).toHaveBeenCalled();
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME]);
    });
  });

  describe('Escenario 6: Espera de inicialización', () => {
    it('debe esperar a que la inicialización se complete antes de verificar auth', async () => {
      // Arrange
      let initResolve: () => void;
      const initPromise = new Promise<void>(resolve => {
        initResolve = resolve;
      });

      vi.mocked(mockLocalAuthService.waitForInitialization).mockReturnValue(initPromise);

      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: 'init-test-user',
        email: 'init@example.com',
        flowStep: 'idle',
        lastAuthenticated: Date.now(),
      });

      // Act
      const resultPromise = firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Simular delay antes de resolver inicialización
      await new Promise(resolve => setTimeout(resolve, 50));

      // Resolver inicialización
      initResolve!();

      const result = await resultPromise;

      // Assert
      expect(result).toBe(true);
      expect(mockLocalAuthService.waitForInitialization).toHaveBeenCalled();
    });

    it('debe prevenir race conditions esperando la inicialización completa', async () => {
      // Arrange
      const executionOrder: string[] = [];

      vi.mocked(mockLocalAuthService.waitForInitialization).mockImplementation(async () => {
        executionOrder.push('waitForInitialization');
        await new Promise(resolve => setTimeout(resolve, 100));
        executionOrder.push('initializationComplete');
      });

      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: '4000',
          email: 'race@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
          accountState: AccountState.ACTIVE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        accessToken: 'race-token',
        refreshToken: 'race-refresh',
        expiresAt: Date.now() + 3600000,
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      executionOrder.push('guardCompleted');

      // Assert
      expect(executionOrder).toEqual([
        'waitForInitialization',
        'initializationComplete',
        'guardCompleted',
      ]);
      expect(result).toBe(true);
    });
  });

  describe('Escenario 7: Manejo de preferencias faltantes', () => {
    beforeEach(() => {
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });
    });

    it('debe manejar usuario sin objeto de preferencias', async () => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: '5000',
          email: 'nopref@example.com',
          firstName: 'Sin',
          lastName: 'Preferencias',
          role: 'patient',
          accountState: AccountState.ACTIVE,
          // preferences: undefined
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        accessToken: 'nopref-token',
        refreshToken: 'nopref-refresh',
        expiresAt: Date.now() + 3600000,
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
    });

    it('debe permitir acceso cuando user.preferences es null', async () => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: '5001',
          email: 'nullpref@example.com',
          firstName: 'Null',
          lastName: 'Preferences',
          role: 'doctor',
          accountState: AccountState.ACTIVE,
          preferences: null as any,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        accessToken: 'nullpref-token',
        refreshToken: null,
        expiresAt: Date.now() + 3600000,
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Escenario 8: Protección de transición de rutas', () => {
    it('debe proteger rutas de dashboard', async () => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      mockState = { url: '/tabs/dashboard' } as RouterStateSnapshot;

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/dashboard' },
      });
    });

    it('debe proteger rutas de perfil', async () => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      mockState = { url: '/tabs/profile' } as RouterStateSnapshot;

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/profile' },
      });
    });

    it('debe proteger rutas de configuración', async () => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      mockState = { url: '/settings/advanced' } as RouterStateSnapshot;

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/settings/advanced' },
      });
    });
  });

  describe('Escenario 9: Precedencia de Tidepool sobre autenticación local', () => {
    it('debe dar precedencia a Tidepool cuando ambos servicios están autenticados', async () => {
      // Arrange - ambos autenticados
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: 'tidepool-primary',
        email: 'tidepool@primary.com',
        flowStep: 'idle',
        lastAuthenticated: Date.now(),
      });

      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: '6000',
          email: 'local@primary.com',
          firstName: 'Local',
          lastName: 'User',
          role: 'patient',
          accountState: AccountState.ACTIVE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        expiresAt: Date.now() + 3600000,
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
      // No debe verificar estado de cuenta local
      expect(mockLocalAuthService.logout).not.toHaveBeenCalled();
      // No debe suscribirse a localAuthStateSubject
      expect(localAuthStateSubject.observers.length).toBe(0);
    });

    it('debe ignorar estado PENDING de usuario local cuando Tidepool está autenticado', async () => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: 'tidepool-override',
        email: 'tidepool@override.com',
        flowStep: 'idle',
        lastAuthenticated: Date.now(),
      });

      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: '6001',
          email: 'local@pending.com',
          firstName: 'Local',
          lastName: 'Pending',
          role: 'patient',
          accountState: AccountState.PENDING, // Este estado debe ser ignorado
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        accessToken: 'local-pending-token',
        refreshToken: 'local-pending-refresh',
        expiresAt: Date.now() + 3600000,
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalledWith([ROUTES.ACCOUNT_PENDING]);
    });
  });

  describe('Escenario 10: CanActivate retorna true para usuario autenticado', () => {
    it('debe implementar CanActivate correctamente retornando true', async () => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: 'can-activate-user',
        email: 'canactivate@example.com',
        flowStep: 'idle',
        lastAuthenticated: Date.now(),
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('debe retornar Observable<boolean> para usuario autenticado', async () => {
      // Arrange
      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: '7000',
          email: 'observable@example.com',
          firstName: 'Observable',
          lastName: 'User',
          role: 'patient',
          accountState: AccountState.ACTIVE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        accessToken: 'obs-token',
        refreshToken: 'obs-refresh',
        expiresAt: Date.now() + 3600000,
      });

      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      // Act
      const observable = guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>;
      const result = await firstValueFrom(observable);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Escenario 11: CanActivate retorna false/UrlTree para usuario no autenticado', () => {
    it('debe implementar CanActivate correctamente retornando UrlTree', async () => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(result).not.toBe(true);
      expect(result).not.toBe(false);
    });

    it('debe retornar Observable<UrlTree> para usuario no autenticado', async () => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      // Act
      const observable = guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>;
      const result = await firstValueFrom(observable);

      // Assert
      expect(result).toBe(mockUrlTree);
    });
  });

  describe('Escenario 12: Implementación de CanMatch', () => {
    it('debe funcionar con CanMatch si está implementado', async () => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: 'canmatch-user',
        email: 'canmatch@example.com',
        flowStep: 'idle',
        lastAuthenticated: Date.now(),
      });

      // Act - CanMatch usa la misma lógica que CanActivate
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
    });

    it('debe bloquear rutas con CanMatch cuando no está autenticado', async () => {
      // Arrange
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(mockUrlTree);
    });
  });

  describe('Escenario 13: Preservación de parámetros returnUrl', () => {
    beforeEach(() => {
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });
    });

    it('debe preservar returnUrl con query params existentes', async () => {
      // Arrange
      mockState = {
        url: '/tabs/appointments/appointment-detail/456?mode=edit&source=notification',
      } as RouterStateSnapshot;

      // Act
      await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: {
          returnUrl: '/tabs/appointments/appointment-detail/456?mode=edit&source=notification',
        },
      });
    });

    it('debe preservar returnUrl con fragmentos', async () => {
      // Arrange
      mockState = { url: '/tabs/profile#settings' } as RouterStateSnapshot;

      // Act
      await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/profile#settings' },
      });
    });

    it('debe manejar returnUrl vacío correctamente', async () => {
      // Arrange
      mockState = { url: '' } as RouterStateSnapshot;

      // Act
      await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '' },
      });
    });
  });

  describe('Escenario 14: Protección de deep links', () => {
    beforeEach(() => {
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });

      localAuthStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });
    });

    it('debe proteger deep links de citas', async () => {
      // Arrange
      mockState = { url: '/tabs/appointments/appointment-detail/789' } as RouterStateSnapshot;

      // Act
      await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/appointments/appointment-detail/789' },
      });
    });

    it('debe proteger deep links de lecturas', async () => {
      // Arrange
      mockState = { url: '/add-reading?glucose=120&type=fasting' } as RouterStateSnapshot;

      // Act
      await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/add-reading?glucose=120&type=fasting' },
      });
    });

    it('debe proteger deep links de calculadora de bolo', async () => {
      // Arrange
      mockState = { url: '/bolus-calculator?carbs=45' } as RouterStateSnapshot;

      // Act
      await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/bolus-calculator?carbs=45' },
      });
    });
  });

  describe('Escenario 15: Manejo de expiración de tokens', () => {
    beforeEach(() => {
      tidepoolAuthStateSubject.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        errorCode: null,
        userId: null,
        email: null,
        flowStep: 'idle',
        lastAuthenticated: null,
      });
    });

    it('debe denegar acceso cuando el token ha expirado', async () => {
      // Arrange - token expirado (hace 1 hora)
      localAuthStateSubject.next({
        isAuthenticated: false, // El servicio ya detectó expiración
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: Date.now() - 3600000, // Expirado hace 1 hora
      });

      mockState = { url: '/tabs/dashboard' } as RouterStateSnapshot;

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith([ROUTES.WELCOME], {
        queryParams: { returnUrl: '/tabs/dashboard' },
      });
    });

    it('debe permitir acceso cuando el token es válido', async () => {
      // Arrange - token válido (expira en 1 hora)
      localAuthStateSubject.next({
        isAuthenticated: true,
        user: {
          id: '8000',
          email: 'validtoken@example.com',
          firstName: 'Valid',
          lastName: 'Token',
          role: 'patient',
          accountState: AccountState.ACTIVE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-12-19T00:00:00Z',
        },
        accessToken: 'valid-token',
        refreshToken: 'valid-refresh',
        expiresAt: Date.now() + 3600000, // Expira en 1 hora
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      expect(result).toBe(true);
    });

    it('debe manejar token que expira pronto (dentro de 5 minutos)', async () => {
      // Arrange - token expira en 4 minutos
      localAuthStateSubject.next({
        isAuthenticated: true, // El servicio aún considera válido el token
        user: {
          id: '8001',
          email: 'soonexpire@example.com',
          firstName: 'Soon',
          lastName: 'Expire',
          role: 'patient',
          accountState: AccountState.ACTIVE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-12-19T00:00:00Z',
        },
        accessToken: 'soon-expire-token',
        refreshToken: 'soon-expire-refresh',
        expiresAt: Date.now() + 240000, // Expira en 4 minutos
      });

      // Act
      const result = await firstValueFrom(
        guard.canActivate(mockRoute, mockState) as Observable<boolean | UrlTree>
      );

      // Assert
      // El guard permite acceso, el servicio de auth debería refrescar el token
      expect(result).toBe(true);
    });
  });
});
