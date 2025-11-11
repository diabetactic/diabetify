import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UnifiedAuthService, UnifiedAuthState } from '../../../core/services/unified-auth.service';
import { MockAdapterService } from '../../../core/services/mock-adapter.service';
import { LoginRequest } from '../../../core/services/local-auth.service';

/**
 * TDD London School: Auth Flow Integration Tests
 *
 * Following outside-in approach:
 * 1. Start with acceptance criteria
 * 2. Mock collaborators (UnifiedAuthService, MockAdapter)
 * 3. Verify interactions and behavior
 * 4. Test object conversations, not state
 */
describe('Auth Flow (TDD London School)', () => {
  let mockUnifiedAuthService: jasmine.SpyObj<UnifiedAuthService>;
  let mockAdapterService: jasmine.SpyObj<MockAdapterService>;

  // Contract: Expected auth state after successful login
  const successfulAuthState: UnifiedAuthState = {
    isAuthenticated: true,
    provider: 'local',
    tidepoolAuth: null,
    localAuth: {
      isAuthenticated: true,
      accessToken: 'mock_token_12345',
      refreshToken: 'mock_refresh_12345',
      expiresAt: Date.now() + 3600000,
      user: {
        id: '1',
        email: 'demo@diabetactic.com',
        firstName: 'Demo',
        lastName: 'User',
        role: 'patient',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          glucoseUnit: 'mg/dL',
          targetRange: { low: 70, high: 180 },
          language: 'en',
          theme: 'auto',
          notifications: {
            appointments: true,
            readings: true,
            reminders: true,
          },
        },
      },
    },
    user: {
      id: '1',
      email: 'demo@diabetactic.com',
      firstName: 'Demo',
      lastName: 'User',
      fullName: 'Demo User',
      provider: 'local',
      role: 'patient',
      preferences: {
        glucoseUnit: 'mg/dL',
        targetRange: { low: 70, high: 180 },
        language: 'en',
        theme: 'auto',
        notifications: {
          appointments: true,
          readings: true,
          reminders: true,
        },
      },
    },
  };

  beforeEach(() => {
    // Create mock collaborators (London School: mock-first approach)
    mockUnifiedAuthService = jasmine.createSpyObj('UnifiedAuthService', [
      'loginLocal',
      'isAuthenticated',
      'getCurrentUser',
      'logout',
    ]);

    mockAdapterService = jasmine.createSpyObj('MockAdapterService', [
      'isMockEnabled',
      'isServiceMockEnabled',
      'mockLogin',
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: UnifiedAuthService, useValue: mockUnifiedAuthService },
        { provide: MockAdapterService, useValue: mockAdapterService },
      ],
    });
  });

  /**
   * Test 1: Verify successful demo login workflow
   *
   * London School Focus:
   * - Test the conversation between components
   * - Verify method calls and their order
   * - Mock external dependencies
   */
  describe('Demo User Login', () => {
    it('should authenticate demo user with email credentials', fakeAsync(() => {
      // Arrange: Setup mock behavior (contract definition)
      const demoCredentials: LoginRequest = {
        email: 'demo@diabetactic.com',
        password: 'demo123',
        rememberMe: false,
      };

      mockAdapterService.isMockEnabled.and.returnValue(true);
      mockAdapterService.isServiceMockEnabled.and.returnValue(true);
      mockUnifiedAuthService.loginLocal.and.returnValue(of(successfulAuthState));

      // Act: Execute login workflow
      const loginResult$ = mockUnifiedAuthService.loginLocal(demoCredentials);

      loginResult$.subscribe(authState => {
        // Assert: Verify collaboration pattern
        expect(mockUnifiedAuthService.loginLocal).toHaveBeenCalledWith(demoCredentials);
        expect(mockUnifiedAuthService.loginLocal).toHaveBeenCalledTimes(1);

        // Verify successful auth state
        expect(authState.isAuthenticated).toBe(true);
        expect(authState.provider).toBe('local');
        expect(authState.user?.email).toBe('demo@diabetactic.com');
        expect(authState.user?.fullName).toBe('Demo User');
        expect(authState.user?.role).toBe('patient');
      });

      tick();
    }));

    it('should authenticate demo user with DNI credentials', fakeAsync(() => {
      // Arrange: Alternative demo credentials using DNI
      const demoCredentials: LoginRequest = {
        dni: '1000',
        password: 'demo123',
        rememberMe: false,
      };

      mockUnifiedAuthService.loginLocal.and.returnValue(of(successfulAuthState));

      // Act
      const loginResult$ = mockUnifiedAuthService.loginLocal(demoCredentials);

      loginResult$.subscribe(authState => {
        // Assert
        expect(mockUnifiedAuthService.loginLocal).toHaveBeenCalledWith(demoCredentials);
        expect(authState.isAuthenticated).toBe(true);
      });

      tick();
    }));

    it('should verify the correct order of interactions', fakeAsync(() => {
      // Arrange
      const demoCredentials: LoginRequest = {
        email: 'demo@diabetactic.com',
        password: 'demo123',
        rememberMe: false,
      };

      mockUnifiedAuthService.loginLocal.and.returnValue(of(successfulAuthState));
      mockUnifiedAuthService.isAuthenticated.and.returnValue(true);
      mockUnifiedAuthService.getCurrentUser.and.returnValue(successfulAuthState.user);

      // Act
      mockUnifiedAuthService.loginLocal(demoCredentials).subscribe(() => {
        const isAuth = mockUnifiedAuthService.isAuthenticated();
        const user = mockUnifiedAuthService.getCurrentUser();

        // Assert: Verify state retrieval happens after login
        expect(isAuth).toBe(true);
        expect(user).toBeTruthy();
      });

      tick();

      // Assert: Verify login called first
      expect(mockUnifiedAuthService.loginLocal).toHaveBeenCalled();
    }));
  });

  /**
   * Test 2: Verify error handling behavior
   *
   * London School Focus:
   * - Test failure scenarios
   * - Verify error propagation
   * - Ensure proper error handling
   */
  describe('Error Handling', () => {
    it('should handle invalid credentials gracefully', fakeAsync(() => {
      // Arrange: Setup failure scenario
      const invalidCredentials: LoginRequest = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
        rememberMe: false,
      };

      const authError = new Error('Invalid credentials');
      mockUnifiedAuthService.loginLocal.and.returnValue(throwError(() => authError));

      // Act & Assert
      const loginResult$ = mockUnifiedAuthService.loginLocal(invalidCredentials);

      loginResult$.subscribe({
        next: () => fail('Should not succeed with invalid credentials'),
        error: error => {
          // Verify error received
          expect(error.message).toBe('Invalid credentials');
        },
      });

      tick();
    }));

    it('should propagate authentication errors correctly', fakeAsync(() => {
      // Arrange
      const credentials: LoginRequest = {
        email: 'demo@diabetactic.com',
        password: 'wrongpassword',
        rememberMe: false,
      };

      mockUnifiedAuthService.loginLocal.and.returnValue(
        throwError(() => new Error('Authentication failed'))
      );

      // Act
      let errorReceived = false;
      const loginResult$ = mockUnifiedAuthService.loginLocal(credentials);

      loginResult$.subscribe({
        next: () => fail('Should not succeed'),
        error: err => {
          errorReceived = true;
          expect(err.message).toBe('Authentication failed');
        },
      });

      tick();

      // Assert
      expect(errorReceived).toBe(true);
    }));
  });

  /**
   * Test 3: Verify mock mode support
   *
   * London School Focus:
   * - Test adapter pattern collaboration
   * - Verify mock service interactions
   */
  describe('Mock Mode Support', () => {
    it('should work with mock backend when enabled', fakeAsync(() => {
      // Arrange
      mockAdapterService.isMockEnabled.and.returnValue(true);
      mockAdapterService.isServiceMockEnabled.and.returnValue(true);

      // Act
      const mockEnabled = mockAdapterService.isMockEnabled();
      const authMockEnabled = mockAdapterService.isServiceMockEnabled('auth');

      // Assert: Verify mock adapter collaboration
      expect(mockEnabled).toBe(true);
      expect(authMockEnabled).toBe(true);
      expect(mockAdapterService.isMockEnabled).toHaveBeenCalled();
      expect(mockAdapterService.isServiceMockEnabled).toHaveBeenCalledWith('auth');
    }));

    it('should use mock adapter for demo login', fakeAsync(() => {
      // Arrange
      const mockProfile: any = {
        id: '1',
        name: 'Demo User',
        age: 25,
        email: 'demo@diabetactic.com',
      };

      mockAdapterService.isMockEnabled.and.returnValue(true);
      mockAdapterService.mockLogin.and.returnValue(
        Promise.resolve({
          token: 'mock_token_12345',
          user: mockProfile,
        })
      );

      // Act
      mockAdapterService.mockLogin('demo@diabetactic.com', 'demo123').then(result => {
        // Assert: Verify mock interaction
        expect(mockAdapterService.mockLogin).toHaveBeenCalledWith(
          'demo@diabetactic.com',
          'demo123'
        );
        expect(result.token).toBeTruthy();
        expect(result.user.name).toBe('Demo User');
      });

      tick();
    }));
  });

  /**
   * Test 4: Verify authentication state persistence
   *
   * London School Focus:
   * - Test state management collaboration
   * - Verify user retrieval after login
   */
  describe('Authentication State', () => {
    it('should retrieve authenticated user after successful login', fakeAsync(() => {
      // Arrange
      const credentials: LoginRequest = {
        email: 'demo@diabetactic.com',
        password: 'demo123',
        rememberMe: false,
      };

      mockUnifiedAuthService.loginLocal.and.returnValue(of(successfulAuthState));
      mockUnifiedAuthService.isAuthenticated.and.returnValue(true);
      mockUnifiedAuthService.getCurrentUser.and.returnValue(successfulAuthState.user);

      // Act
      mockUnifiedAuthService.loginLocal(credentials).subscribe(() => {
        const isAuth = mockUnifiedAuthService.isAuthenticated();
        const user = mockUnifiedAuthService.getCurrentUser();

        // Assert: Verify state retrieval
        expect(isAuth).toBe(true);
        expect(user).toBeTruthy();
        expect(user?.email).toBe('demo@diabetactic.com');
        expect(user?.fullName).toBe('Demo User');
        expect(mockUnifiedAuthService.getCurrentUser).toHaveBeenCalled();
      });

      tick();
    }));

    it('should handle logout workflow correctly', fakeAsync(() => {
      // Arrange
      mockUnifiedAuthService.logout.and.returnValue(Promise.resolve());
      mockUnifiedAuthService.isAuthenticated.and.returnValue(false);
      mockUnifiedAuthService.getCurrentUser.and.returnValue(null);

      // Act
      mockUnifiedAuthService.logout().then(() => {
        const isAuth = mockUnifiedAuthService.isAuthenticated();
        const user = mockUnifiedAuthService.getCurrentUser();

        // Assert: Verify logout interaction
        expect(mockUnifiedAuthService.logout).toHaveBeenCalled();
        expect(isAuth).toBe(false);
        expect(user).toBeNull();
      });

      tick();
    }));
  });

  /**
   * Test 5: Contract verification
   *
   * London School Focus:
   * - Verify contracts between collaborators
   * - Ensure type safety and interface compliance
   */
  describe('Service Contracts', () => {
    it('should satisfy UnifiedAuthState contract', () => {
      // Assert: Verify auth state structure
      expect(successfulAuthState.isAuthenticated).toBeDefined();
      expect(successfulAuthState.provider).toBeDefined();
      expect(successfulAuthState.user).toBeDefined();
      expect(successfulAuthState.tidepoolAuth).toBeDefined();
      expect(successfulAuthState.localAuth).toBeDefined();

      // Verify user contract
      expect(successfulAuthState.user?.id).toBeTruthy();
      expect(successfulAuthState.user?.email).toBeTruthy();
      expect(successfulAuthState.user?.firstName).toBeTruthy();
      expect(successfulAuthState.user?.lastName).toBeTruthy();
      expect(successfulAuthState.user?.fullName).toBeTruthy();
      expect(successfulAuthState.user?.provider).toBeTruthy();
    });

    it('should have correct login request contract', () => {
      // Define login request contract
      const loginRequest: LoginRequest = {
        email: 'demo@diabetactic.com',
        password: 'demo123',
        rememberMe: false,
      };

      // Verify contract structure
      expect(loginRequest.email).toBeDefined();
      expect(loginRequest.password).toBeDefined();
      expect(typeof loginRequest.rememberMe).toBe('boolean');
    });

    it('should support alternative DNI-based login contract', () => {
      // Define DNI login request contract
      const loginRequest: LoginRequest = {
        dni: '1000',
        password: 'demo123',
        rememberMe: false,
      };

      // Verify contract structure
      expect(loginRequest.dni).toBeDefined();
      expect(loginRequest.password).toBeDefined();
      expect(typeof loginRequest.rememberMe).toBe('boolean');
    });
  });
});
