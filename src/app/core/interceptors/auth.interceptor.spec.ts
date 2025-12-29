// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { type Mock } from 'vitest';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError, BehaviorSubject, timer, firstValueFrom } from 'rxjs';
import { delay } from 'rxjs/operators';

import { AuthInterceptor } from './auth.interceptor';
import { LocalAuthService, LocalAuthState } from '@services/local-auth.service';

describe('AuthInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: Mock<LocalAuthService>;
  let router: Mock<Router>;
  let interceptor: AuthInterceptor;

  const testUrl = '/api/test-endpoint';
  const mockRefreshToken = 'mock-refresh-token-67890';

  beforeEach(() => {
    const authServiceSpy = {
      refreshAccessToken: vi.fn(),
      logout: vi.fn(),
    } as unknown as Mock<LocalAuthService>;

    const routerSpy = {
      navigate: vi.fn(),
    } as unknown as Mock<Router>;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthInterceptor,
        { provide: LocalAuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: HTTP_INTERCEPTORS,
          useExisting: AuthInterceptor,
          multi: true,
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(LocalAuthService) as Mock<LocalAuthService>;
    router = TestBed.inject(Router) as Mock<Router>;
    interceptor = TestBed.inject(AuthInterceptor);

    // Default logout behavior
    authService.logout.mockResolvedValue();

    // Reset interceptor state to prevent pollution
    // @ts-expect-error - private property access for testing
    interceptor.isRefreshing = false;
    // @ts-expect-error - private property access for testing
    interceptor.refreshTokenSubject = new BehaviorSubject<string | null>(null);
  });

  afterEach(() => {
    httpMock.verify();
    // Reset TestBed to force new interceptor instance
    TestBed.resetTestingModule();
  });

  describe('Basic Request Handling', () => {
    it('should allow successful requests to pass through', () => {
      const mockResponse = { data: 'test' };

      httpClient.get(testUrl).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should not modify non-401 client errors', () => {
      httpClient.get(testUrl).subscribe({
        next: () => fail('should have failed with 400'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(400);
          expect(error.statusText).toBe('Bad Request');
        },
      });

      const req = httpMock.expectOne(testUrl);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should not modify non-HTTP errors', () => {
      const errorMessage = 'Network error';

      httpClient.get(testUrl).subscribe({
        next: () => fail('should have failed'),
        error: error => {
          expect(error.message).toContain(errorMessage);
        },
      });

      const req = httpMock.expectOne(testUrl);
      req.error(new ProgressEvent('error'), { statusText: errorMessage });
    });
  });

  describe('401 Unauthorized Error Handling', () => {
    it('should intercept 401 errors and attempt token refresh', async () => {
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'new-access-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.mockReturnValue(of(newAuthState));

      const mockResponse = { data: 'success after refresh' };

      const promise = firstValueFrom(httpClient.get(testUrl));

      // First request returns 401
      const req1 = httpMock.expectOne(testUrl);
      req1.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      // Retry with new token should succeed
      const req2 = httpMock.expectOne(testUrl);
      expect(req2.request.headers.get('Authorization')).toBe('Bearer new-access-token');
      req2.flush(mockResponse);

      const response = await promise;
      expect(response).toEqual(mockResponse);
      expect(authService.refreshAccessToken).toHaveBeenCalled();
    });

    it('should add Bearer token to retried request', async () => {
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'fresh-token-abc',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.mockReturnValue(of(newAuthState));

      const promise = firstValueFrom(httpClient.get(testUrl));

      const req1 = httpMock.expectOne(testUrl);
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      const req2 = httpMock.expectOne(testUrl);
      expect(req2.request.headers.get('Authorization')).toBe('Bearer fresh-token-abc');
      req2.flush({ data: 'success' });

      await promise;
    });

    it('should logout and redirect on refresh failure', async () => {
      authService.refreshAccessToken.mockReturnValue(
        throwError(() => new Error('Refresh token expired'))
      );

      const promise = firstValueFrom(httpClient.get(testUrl));

      const req = httpMock.expectOne(testUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      await expect(promise).rejects.toThrow('Refresh token expired');
      expect(authService.logout).toHaveBeenCalled();

      // Wait for async logout to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(router.navigate).toHaveBeenCalledWith(['/welcome']);
    });

    it('should handle missing access token after refresh', async () => {
      const authStateWithoutToken: LocalAuthState = {
        isAuthenticated: false,
        user: null,
        accessToken: null, // No token
        refreshToken: null,
        expiresAt: null,
      };

      authService.refreshAccessToken.mockReturnValue(of(authStateWithoutToken));

      const promise = firstValueFrom(httpClient.get(testUrl));

      const req = httpMock.expectOne(testUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      await expect(promise).rejects.toThrow('No access token after refresh');
    });
  });

  describe('Request Queuing During Token Refresh', () => {
    it('should queue multiple requests while refresh is in progress', async () => {
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'shared-new-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      // Add delay to refresh to simulate slow network
      authService.refreshAccessToken.mockReturnValue(of(newAuthState).pipe(delay(100)));

      // Make three requests simultaneously
      const promise1 = firstValueFrom(httpClient.get(`${testUrl}/1`));
      const promise2 = firstValueFrom(httpClient.get(`${testUrl}/2`));
      const promise3 = firstValueFrom(httpClient.get(`${testUrl}/3`));

      // All three initial requests return 401
      const req1 = httpMock.expectOne(`${testUrl}/1`);
      const req2 = httpMock.expectOne(`${testUrl}/2`);
      const req3 = httpMock.expectOne(`${testUrl}/3`);

      req1.flush(null, { status: 401, statusText: 'Unauthorized' });
      req2.flush(null, { status: 401, statusText: 'Unauthorized' });
      req3.flush(null, { status: 401, statusText: 'Unauthorized' });

      // After refresh completes, all three should retry
      await new Promise(resolve => setTimeout(resolve, 150));

      const retryReq1 = httpMock.expectOne(`${testUrl}/1`);
      const retryReq2 = httpMock.expectOne(`${testUrl}/2`);
      const retryReq3 = httpMock.expectOne(`${testUrl}/3`);

      // All should have the same new token
      expect(retryReq1.request.headers.get('Authorization')).toBe('Bearer shared-new-token');
      expect(retryReq2.request.headers.get('Authorization')).toBe('Bearer shared-new-token');
      expect(retryReq3.request.headers.get('Authorization')).toBe('Bearer shared-new-token');

      retryReq1.flush({ data: '1' });
      retryReq2.flush({ data: '2' });
      retryReq3.flush({ data: '3' });

      await Promise.all([promise1, promise2, promise3]);
      expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should prevent token refresh stampede', async () => {
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'stampede-prevention-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.mockReturnValue(of(newAuthState).pipe(delay(50)));

      // Rapidly fire multiple requests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(firstValueFrom(httpClient.get(`${testUrl}/req${i}`)));
      }

      // All return 401
      for (let i = 0; i < 5; i++) {
        const req = httpMock.expectOne(`${testUrl}/req${i}`);
        req.flush(null, { status: 401, statusText: 'Unauthorized' });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Refresh should be called only once
      expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);

      // Clear retries
      for (let i = 0; i < 5; i++) {
        const retry = httpMock.expectOne(`${testUrl}/req${i}`);
        retry.flush({ data: `retry${i}` });
      }

      await Promise.all(promises);
    });
  });

  // No retry for 4xx errors - can use fakeAsync since no timer is created
  describe('No Retry on Client Errors', () => {
    it('should not retry on 4xx client errors', fakeAsync(() => {
      let capturedError: HttpErrorResponse | null = null;

      httpClient.get(testUrl).subscribe({
        next: () => fail('should have failed with 404'),
        error: (error: HttpErrorResponse) => {
          capturedError = error;
        },
      });

      const req = httpMock.expectOne(testUrl);
      req.flush(null, { status: 404, statusText: 'Not Found' });
      flushMicrotasks();

      expect(capturedError).not.toBeNull();
      expect(capturedError!.status).toBe(404);
    }));
  });

  describe('5xx Server Error Retry with Exponential Backoff', () => {
    // Spy on calculateBackoffDelay to return timer(0) for instant retries in tests
    beforeEach(() => {
      vi.spyOn(interceptor as any, 'calculateBackoffDelay').mockReturnValue(timer(0));
    });

    it('should retry on 500 Internal Server Error', fakeAsync(() => {
      const mockResponse = { data: 'success after retry' };
      let response: any = null;

      httpClient.get(testUrl).subscribe(res => {
        response = res;
      });

      // First attempt - 500 error
      const req1 = httpMock.expectOne(testUrl);
      req1.flush(null, { status: 500, statusText: 'Internal Server Error' });

      // Advance timer(0) to trigger retry
      tick(0);

      // Retry succeeds
      const req2 = httpMock.expectOne(testUrl);
      req2.flush(mockResponse);

      tick(0);
      expect(response).toEqual(mockResponse);
    }));

    it('should retry on 502 Bad Gateway', fakeAsync(() => {
      let success = false;

      httpClient.get(testUrl).subscribe({
        next: () => {
          success = true;
        },
      });

      const req1 = httpMock.expectOne(testUrl);
      req1.flush(null, { status: 502, statusText: 'Bad Gateway' });

      tick(0);

      const req2 = httpMock.expectOne(testUrl);
      req2.flush({ data: 'success' });

      tick(0);
      expect(success).toBe(true);
    }));

    it('should retry on 503 Service Unavailable', fakeAsync(() => {
      let success = false;

      httpClient.get(testUrl).subscribe({
        next: () => {
          success = true;
        },
      });

      const req1 = httpMock.expectOne(testUrl);
      req1.flush(null, { status: 503, statusText: 'Service Unavailable' });

      tick(0);

      const req2 = httpMock.expectOne(testUrl);
      req2.flush({ data: 'success' });

      tick(0);
      expect(success).toBe(true);
    }));

    it('should give up after max retries (3 attempts)', fakeAsync(() => {
      let capturedError: HttpErrorResponse | null = null;

      httpClient.get(testUrl).subscribe({
        next: () => fail('should have failed after max retries'),
        error: (error: HttpErrorResponse) => {
          capturedError = error;
        },
      });

      // Initial attempt
      const req1 = httpMock.expectOne(testUrl);
      req1.flush(null, { status: 500, statusText: 'Internal Server Error' });
      tick(0);

      // Retry 1
      const req2 = httpMock.expectOne(testUrl);
      req2.flush(null, { status: 500, statusText: 'Internal Server Error' });
      tick(0);

      // Retry 2
      const req3 = httpMock.expectOne(testUrl);
      req3.flush(null, { status: 500, statusText: 'Internal Server Error' });
      tick(0);

      // Retry 3 (final - maxRetries=3 means 3 retries after the first attempt)
      const req4 = httpMock.expectOne(testUrl);
      req4.flush(null, { status: 500, statusText: 'Internal Server Error' });
      tick(0);

      expect(capturedError).not.toBeNull();
      expect(capturedError!.status).toBe(500);
    }));
  });

  describe('POST/PUT/DELETE Requests', () => {
    it('should handle POST requests with 401 error', async () => {
      const postData = { name: 'Test' };
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'post-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.mockReturnValue(of(newAuthState));

      const promise = firstValueFrom(httpClient.post(testUrl, postData));

      const req1 = httpMock.expectOne(testUrl);
      expect(req1.request.method).toBe('POST');
      expect(req1.request.body).toEqual(postData);
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const req2 = httpMock.expectOne(testUrl);
      expect(req2.request.body).toEqual(postData);
      expect(req2.request.headers.get('Authorization')).toBe('Bearer post-token');
      req2.flush({ success: true });

      await promise;
    });

    it('should handle PUT requests with 401 error', async () => {
      const putData = { id: '123', name: 'Updated' };
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'put-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.mockReturnValue(of(newAuthState));

      const promise = firstValueFrom(httpClient.put(testUrl, putData));

      const req1 = httpMock.expectOne(testUrl);
      expect(req1.request.method).toBe('PUT');
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const req2 = httpMock.expectOne(testUrl);
      expect(req2.request.headers.get('Authorization')).toBe('Bearer put-token');
      req2.flush({ success: true });

      await promise;
    });

    it('should handle DELETE requests with 401 error', async () => {
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'delete-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.mockReturnValue(of(newAuthState));

      const promise = firstValueFrom(httpClient.delete(testUrl));

      const req1 = httpMock.expectOne(testUrl);
      expect(req1.request.method).toBe('DELETE');
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const req2 = httpMock.expectOne(testUrl);
      expect(req2.request.headers.get('Authorization')).toBe('Bearer delete-token');
      req2.flush({ success: true });

      await promise;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty token string', async () => {
      const authStateWithEmptyToken: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: '', // Empty string
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.mockReturnValue(of(authStateWithEmptyToken));

      const promise = firstValueFrom(httpClient.get(testUrl));

      const req = httpMock.expectOne(testUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });

      await expect(promise).rejects.toThrow('No access token after refresh');
    });

    it('should handle concurrent 401 errors from different endpoints', async () => {
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'concurrent-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.mockReturnValue(of(newAuthState).pipe(delay(50)));

      const promise1 = firstValueFrom(httpClient.get('/api/endpoint1'));
      const promise2 = firstValueFrom(httpClient.get('/api/endpoint2'));

      const req1 = httpMock.expectOne('/api/endpoint1');
      const req2 = httpMock.expectOne('/api/endpoint2');

      req1.flush(null, { status: 401, statusText: 'Unauthorized' });
      req2.flush(null, { status: 401, statusText: 'Unauthorized' });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);

      const retryReq1 = httpMock.expectOne('/api/endpoint1');
      const retryReq2 = httpMock.expectOne('/api/endpoint2');

      retryReq1.flush({ data: '1' });
      retryReq2.flush({ data: '2' });

      await Promise.all([promise1, promise2]);
    });
  });
});
