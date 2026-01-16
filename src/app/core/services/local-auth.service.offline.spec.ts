/* eslint-disable */
import '../../../test-setup';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { LocalAuthService, LocalAuthState, LocalUser, AccountState } from './local-auth.service';
import { PlatformDetectorService } from './platform-detector.service';
import { LoggerService } from './logger.service';
import { MockAdapterService } from './mock-adapter.service';
import { SecureStorageService } from './secure-storage.service';
import { TokenService } from './token.service';
import { EnvironmentConfigService } from '../config/environment-config.service';

// Mock Capacitor plugins
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn(),
    addListener: vi.fn(),
  },
}));

describe('LocalAuthService - Offline Optimistic Auth', () => {
  let service: LocalAuthService;
  let tokenService: {
    waitForInitialization: Mock;
    getAccessToken: Mock;
    getRefreshToken: Mock;
    isTokenExpired: Mock;
    getExpiresAt: Mock;
    setTokens: Mock;
    clearTokens: Mock;
  };
  let logger: LoggerService;
  let httpMock: { post: Mock; get: Mock };

  const mockUser: LocalUser = {
    id: 'test-user-offline',
    email: 'test@example.com',
    firstName: 'Offline',
    lastName: 'User',
    role: 'patient',
    accountState: AccountState.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockEnvConfig = {
    backendMode: 'cloud',
    isMockMode: false,
    devToolsEnabled: false,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Network.getStatus).mockResolvedValue({ connected: true, connectionType: 'wifi' });

    tokenService = {
      waitForInitialization: vi.fn().mockResolvedValue(undefined),
      getAccessToken: vi.fn().mockResolvedValue(null),
      getRefreshToken: vi.fn().mockResolvedValue(null),
      isTokenExpired: vi.fn().mockReturnValue(true),
      getExpiresAt: vi.fn().mockReturnValue(null),
      setTokens: vi.fn().mockResolvedValue(undefined),
      clearTokens: vi.fn().mockResolvedValue(undefined),
    };

    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as LoggerService;

    httpMock = {
      post: vi.fn(),
      get: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        LocalAuthService,
        { provide: PlatformDetectorService, useValue: { getApiBaseUrl: () => 'http://api' } },
        { provide: LoggerService, useValue: logger },
        { provide: MockAdapterService, useValue: { isServiceMockEnabled: () => false } },
        { provide: TokenService, useValue: tokenService },
        { provide: SecureStorageService, useValue: { migrateFromPreferences: vi.fn() } },
        { provide: EnvironmentConfigService, useValue: mockEnvConfig },
        { provide: HttpClient, useValue: httpMock },
      ],
    });
  });

  it('should restore session optimistically when offline with expired token but valid refresh token', async () => {
    // 1. Setup Storage with User
    vi.mocked(Preferences.get).mockImplementation(async ({ key }) => {
      if (key === 'local_user') return { value: JSON.stringify(mockUser) };
      return { value: null };
    });

    // 2. Setup TokenService (Expired Access, Valid Refresh)
    tokenService.getAccessToken.mockResolvedValue('expired-access-token');
    tokenService.getRefreshToken.mockResolvedValue('valid-refresh-token');
    tokenService.isTokenExpired.mockReturnValue(true); // Access token is expired

    // 3. Setup Network (Offline)
    vi.mocked(Network.getStatus).mockResolvedValue({ connected: false, connectionType: 'none' });

    // 4. Instantiate Service
    service = TestBed.inject(LocalAuthService);
    // @ts-expect-error - access private
    await service.initializationPromise;

    // 5. Verify State
    const state = await new Promise<LocalAuthState>(resolve => {
      service.authState$.subscribe(resolve);
    });

    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('expired-access-token');

    // 6. Verify NO refresh attempt was made
    expect(httpMock.post).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'Auth',
      expect.stringContaining('Offline mode: Access token expired'),
      expect.anything()
    );
  });

  it('should FAIL to restore session when online with expired token (refresh fails)', async () => {
    // 1. Setup Storage with User
    vi.mocked(Preferences.get).mockImplementation(async ({ key }) => {
      if (key === 'local_user') return { value: JSON.stringify(mockUser) };
      return { value: null };
    });

    // 2. Setup TokenService (Expired Access, Valid Refresh)
    tokenService.getAccessToken.mockResolvedValue('expired-access-token');
    tokenService.getRefreshToken.mockResolvedValue('valid-refresh-token');
    tokenService.isTokenExpired.mockReturnValue(true);

    // 3. Setup Network (ONLINE)
    vi.mocked(Network.getStatus).mockResolvedValue({ connected: true, connectionType: 'wifi' });

    // 4. Mock HTTP Refresh Failure
    httpMock.post.mockReturnValue(throwError(() => new Error('Refresh Failed')));

    service = TestBed.inject(LocalAuthService);
    // @ts-expect-error - access private
    await service.initializationPromise;

    // 5. Verify it attempted refresh and cleared tokens
    expect(httpMock.post).toHaveBeenCalled(); // It SHOULD attempt refresh
    expect(tokenService.clearTokens).toHaveBeenCalled(); // And clear tokens on failure

    // 6. Verify State is NOT authenticated
    const state = await new Promise<LocalAuthState>(resolve => {
      service.authState$.subscribe(resolve);
    });
    expect(state.isAuthenticated).toBe(false);
  });
});
