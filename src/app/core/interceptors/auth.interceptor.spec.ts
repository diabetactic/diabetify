import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError, BehaviorSubject, timer } from 'rxjs';
import { delay } from 'rxjs/operators';

import { AuthInterceptor } from './auth.interceptor';
import { LocalAuthService, LocalAuthState } from '../services/local-auth.service';

describe('AuthInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<LocalAuthService>;
  let router: jasmine.SpyObj<Router>;
  let interceptor: AuthInterceptor;

  const testUrl = '/api/test-endpoint';
  const mockRefreshToken = 'mock-refresh-token-67890';

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj<LocalAuthService>('LocalAuthService', [
      'refreshAccessToken',
      'logout',
    ]);

    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

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
    authService = TestBed.inject(LocalAuthService) as jasmine.SpyObj<LocalAuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    interceptor = TestBed.inject(AuthInterceptor);

    // Default logout behavior
    authService.logout.and.returnValue(Promise.resolve());

    // Reset interceptor state to prevent pollution
    (interceptor as any).isRefreshing = false;
    (interceptor as any).refreshTokenSubject = new BehaviorSubject<string | null>(null);
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
    it('should intercept 401 errors and attempt token refresh', done => {
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'new-access-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.and.returnValue(of(newAuthState));

      const mockResponse = { data: 'success after refresh' };

      httpClient.get(testUrl).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(authService.refreshAccessToken).toHaveBeenCalled();
        done();
      });

      // First request returns 401
      const req1 = httpMock.expectOne(testUrl);
      req1.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      // Retry with new token should succeed
      const req2 = httpMock.expectOne(testUrl);
      expect(req2.request.headers.get('Authorization')).toBe('Bearer new-access-token');
      req2.flush(mockResponse);
    });

    it('should add Bearer token to retried request', done => {
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'fresh-token-abc',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.and.returnValue(of(newAuthState));

      httpClient.get(testUrl).subscribe(() => {
        done();
      });

      const req1 = httpMock.expectOne(testUrl);
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      const req2 = httpMock.expectOne(testUrl);
      expect(req2.request.headers.get('Authorization')).toBe('Bearer fresh-token-abc');
      req2.flush({ data: 'success' });
    });

    it('should logout and redirect on refresh failure', done => {
      authService.refreshAccessToken.and.returnValue(
        throwError(() => new Error('Refresh token expired'))
      );

      httpClient.get(testUrl).subscribe({
        next: () => fail('should have failed'),
        error: error => {
          expect(error.message).toBe('Refresh token expired');
          expect(authService.logout).toHaveBeenCalled();

          // Wait for async logout to complete
          setTimeout(() => {
            expect(router.navigate).toHaveBeenCalledWith(['/welcome']);
            done();
          }, 50);
        },
      });

      const req = httpMock.expectOne(testUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle missing access token after refresh', done => {
      const authStateWithoutToken: LocalAuthState = {
        isAuthenticated: false,
        user: null,
        accessToken: null, // No token
        refreshToken: null,
        expiresAt: null,
      };

      authService.refreshAccessToken.and.returnValue(of(authStateWithoutToken));

      httpClient.get(testUrl).subscribe({
        next: () => fail('should have failed'),
        error: error => {
          expect(error.message).toBe('No access token after refresh');
          done();
        },
      });

      const req = httpMock.expectOne(testUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('Request Queuing During Token Refresh', () => {
    it('should queue multiple requests while refresh is in progress', done => {
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'shared-new-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      // Add delay to refresh to simulate slow network
      authService.refreshAccessToken.and.returnValue(of(newAuthState).pipe(delay(100)));

      let completedRequests = 0;

      // Make three requests simultaneously
      httpClient.get(`${testUrl}/1`).subscribe(() => {
        completedRequests++;
        if (completedRequests === 3) {
          expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);
          done();
        }
      });

      httpClient.get(`${testUrl}/2`).subscribe(() => {
        completedRequests++;
        if (completedRequests === 3) {
          expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);
          done();
        }
      });

      httpClient.get(`${testUrl}/3`).subscribe(() => {
        completedRequests++;
        if (completedRequests === 3) {
          expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);
          done();
        }
      });

      // All three initial requests return 401
      const req1 = httpMock.expectOne(`${testUrl}/1`);
      const req2 = httpMock.expectOne(`${testUrl}/2`);
      const req3 = httpMock.expectOne(`${testUrl}/3`);

      req1.flush(null, { status: 401, statusText: 'Unauthorized' });
      req2.flush(null, { status: 401, statusText: 'Unauthorized' });
      req3.flush(null, { status: 401, statusText: 'Unauthorized' });

      // After refresh completes, all three should retry
      setTimeout(() => {
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
      }, 150);
    });

    it('should prevent token refresh stampede', done => {
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'stampede-prevention-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.and.returnValue(of(newAuthState).pipe(delay(50)));

      // Rapidly fire multiple requests
      for (let i = 0; i < 5; i++) {
        httpClient.get(`${testUrl}/req${i}`).subscribe();
      }

      // All return 401
      for (let i = 0; i < 5; i++) {
        const req = httpMock.expectOne(`${testUrl}/req${i}`);
        req.flush(null, { status: 401, statusText: 'Unauthorized' });
      }

      setTimeout(() => {
        // Refresh should be called only once
        expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);

        // Clear retries
        for (let i = 0; i < 5; i++) {
          const retry = httpMock.expectOne(`${testUrl}/req${i}`);
          retry.flush({ data: `retry${i}` });
        }

        done();
      }, 100);
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
      spyOn(interceptor as any, 'calculateBackoffDelay').and.returnValue(timer(0));
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
    it('should handle POST requests with 401 error', done => {
      const postData = { name: 'Test' };
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'post-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.and.returnValue(of(newAuthState));

      httpClient.post(testUrl, postData).subscribe(() => {
        done();
      });

      const req1 = httpMock.expectOne(testUrl);
      expect(req1.request.method).toBe('POST');
      expect(req1.request.body).toEqual(postData);
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      setTimeout(() => {
        const req2 = httpMock.expectOne(testUrl);
        expect(req2.request.body).toEqual(postData);
        expect(req2.request.headers.get('Authorization')).toBe('Bearer post-token');
        req2.flush({ success: true });
      }, 100);
    });

    it('should handle PUT requests with 401 error', done => {
      const putData = { id: '123', name: 'Updated' };
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'put-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.and.returnValue(of(newAuthState));

      httpClient.put(testUrl, putData).subscribe(() => {
        done();
      });

      const req1 = httpMock.expectOne(testUrl);
      expect(req1.request.method).toBe('PUT');
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      setTimeout(() => {
        const req2 = httpMock.expectOne(testUrl);
        expect(req2.request.headers.get('Authorization')).toBe('Bearer put-token');
        req2.flush({ success: true });
      }, 100);
    });

    it('should handle DELETE requests with 401 error', done => {
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'delete-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.and.returnValue(of(newAuthState));

      httpClient.delete(testUrl).subscribe(() => {
        done();
      });

      const req1 = httpMock.expectOne(testUrl);
      expect(req1.request.method).toBe('DELETE');
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      setTimeout(() => {
        const req2 = httpMock.expectOne(testUrl);
        expect(req2.request.headers.get('Authorization')).toBe('Bearer delete-token');
        req2.flush({ success: true });
      }, 100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty token string', done => {
      const authStateWithEmptyToken: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: '', // Empty string
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.and.returnValue(of(authStateWithEmptyToken));

      httpClient.get(testUrl).subscribe({
        next: () => fail('should have failed with empty token'),
        error: error => {
          expect(error.message).toBe('No access token after refresh');
          done();
        },
      });

      const req = httpMock.expectOne(testUrl);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle concurrent 401 errors from different endpoints', done => {
      const newAuthState: LocalAuthState = {
        isAuthenticated: true,
        user: { id: 'user-123', email: 'user@example.com' } as any,
        accessToken: 'concurrent-token',
        refreshToken: mockRefreshToken,
        expiresAt: Date.now() + 3600000,
      };

      authService.refreshAccessToken.and.returnValue(of(newAuthState).pipe(delay(50)));

      let completedCount = 0;

      httpClient.get('/api/endpoint1').subscribe(() => {
        if (++completedCount === 2) done();
      });

      httpClient.get('/api/endpoint2').subscribe(() => {
        if (++completedCount === 2) done();
      });

      const req1 = httpMock.expectOne('/api/endpoint1');
      const req2 = httpMock.expectOne('/api/endpoint2');

      req1.flush(null, { status: 401, statusText: 'Unauthorized' });
      req2.flush(null, { status: 401, statusText: 'Unauthorized' });

      setTimeout(() => {
        expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);

        const retryReq1 = httpMock.expectOne('/api/endpoint1');
        const retryReq2 = httpMock.expectOne('/api/endpoint2');

        retryReq1.flush({ data: '1' });
        retryReq2.flush({ data: '2' });
      }, 100);
    });
  });
});
