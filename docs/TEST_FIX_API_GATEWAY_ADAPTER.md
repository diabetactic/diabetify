# API Gateway Adapter Test Fixes

## File: `src/app/core/services/api-gateway-adapter.service.spec.ts`

### Current Issues
- 30 tests failing
- Capacitor platform mocking not working correctly
- Preferences API undefined
- Platform detector returning wrong URLs

### Step-by-Step Fix Instructions

#### 1. Add imports at the top of the file

Replace the existing imports section with:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiGatewayAdapterService } from './api-gateway-adapter.service';
import { PlatformDetectorService } from './platform-detector.service';
import { LoggerService } from './logger.service';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

// Add these new imports
import { setupCapacitorMocks } from '../../tests/helpers/capacitor-mocks';
import { createMockPlatformDetectorService } from '../../tests/helpers/platform-mocks';
```

#### 2. Update the beforeEach block

Replace the entire beforeEach block with:

```typescript
describe('ApiGatewayAdapterService', () => {
  let service: ApiGatewayAdapterService;
  let httpMock: HttpTestingController;
  let loggerSpy: jasmine.SpyObj<LoggerService>;
  let capacitorMocks: ReturnType<typeof setupCapacitorMocks>;
  let platformDetectorSpy: jasmine.SpyObj<PlatformDetectorService>;

  const mockBaseUrl = 'http://10.0.2.2:8000'; // Android emulator URL

  beforeEach(() => {
    // Setup Capacitor mocks FIRST (critical!)
    capacitorMocks = setupCapacitorMocks('android');

    // Create platform detector mock
    platformDetectorSpy = createMockPlatformDetectorService('android');

    // Create logger spy
    loggerSpy = jasmine.createSpyObj('LoggerService', ['debug', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiGatewayAdapterService,
        { provide: PlatformDetectorService, useValue: platformDetectorSpy },
        { provide: LoggerService, useValue: loggerSpy },
      ],
    });

    service = TestBed.inject(ApiGatewayAdapterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    capacitorMocks.clearStorage(); // Clear mock storage after each test
  });
```

#### 3. Fix individual test cases

##### Fix logout() tests

```typescript
describe('logout()', () => {
  it('should clear all tokens on logout', async () => {
    // Pre-set some tokens in mock storage
    await Preferences.set({ key: 'adapter_access_token', value: 'test-token' });
    await Preferences.set({ key: 'adapter_refresh_token', value: 'refresh-token' });

    await service.logout();

    // Verify Preferences.remove was called for each token
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'adapter_access_token' });
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'adapter_refresh_token' });
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'adapter_token_expires_at' });
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'adapter_user_id' });
    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'adapter_session_token' });

    // Verify storage is actually cleared
    const token = await Preferences.get({ key: 'adapter_access_token' });
    expect(token.value).toBeNull();
  });

  it('should not call Preferences on web platform', async () => {
    // Switch to web platform for this test
    capacitorMocks.resetPlatform('web');
    platformDetectorSpy.getApiBaseUrl.and.returnValue('http://localhost:8000');

    // Reset spy calls
    (Preferences.remove as jasmine.Spy).calls.reset();

    await service.logout();

    expect(Preferences.remove).not.toHaveBeenCalled();
  });
});
```

##### Fix token refresh tests

```typescript
describe('shouldRefreshToken()', () => {
  it('should return false on web platform', async () => {
    capacitorMocks.resetPlatform('web');

    const result = await service.shouldRefreshToken();
    expect(result).toBe(false);
    expect(Preferences.get).not.toHaveBeenCalled();
  });

  it('should return true when token expires within 5 minutes', async () => {
    // Ensure we're on Android
    expect(Capacitor.isNativePlatform()).toBe(true);

    // Set token that expires in 4 minutes
    const expiresAt = Date.now() + 4 * 60 * 1000;
    await Preferences.set({
      key: 'adapter_token_expires_at',
      value: expiresAt.toString()
    });

    const result = await service.shouldRefreshToken();
    expect(result).toBe(true);
  });

  it('should return false when token has more than 5 minutes', async () => {
    // Set token that expires in 10 minutes
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await Preferences.set({
      key: 'adapter_token_expires_at',
      value: expiresAt.toString()
    });

    const result = await service.shouldRefreshToken();
    expect(result).toBe(false);
  });
});
```

##### Fix login tests

```typescript
describe('login()', () => {
  it('should store tokens after successful login', fakeAsync(() => {
    const mockResponse = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
      user_id: 'user123',
    };

    service.login('testuser', 'password123').subscribe();

    const req = httpMock.expectOne(`${mockBaseUrl}/api/v1/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      username: 'testuser',
      password: 'password123'
    });

    req.flush(mockResponse);
    tick();

    // Verify tokens were stored
    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'adapter_access_token',
      value: 'new-access-token'
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'adapter_refresh_token',
      value: 'new-refresh-token'
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'adapter_user_id',
      value: 'user123'
    });
  }));
});
```

#### 4. Remove old mocking code

Delete these lines from the original file:

```typescript
// DELETE THIS - No longer needed
Object.defineProperty(Capacitor, 'platform', {
  get: () => 'android',
  configurable: true,
});

// DELETE THIS - Handled by setupCapacitorMocks()
const preferencesSpy = {
  get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ value: null })),
  set: jasmine.createSpy('set').and.returnValue(Promise.resolve()),
  remove: jasmine.createSpy('remove').and.returnValue(Promise.resolve()),
};
```

### Expected Results After Fix
- All 30+ tests should pass
- Platform detection correctly returns Android emulator URL
- Capacitor.isNativePlatform() returns true for Android tests
- Preferences API is properly mocked and functional
