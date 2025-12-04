import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Platform } from '@ionic/angular';
import { CapacitorHttp } from '@capacitor/core';

import { CapacitorHttpService } from './capacitor-http.service';

// Mock CapacitorHttp
jest.mock('@capacitor/core', () => ({
  CapacitorHttp: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
  },
}));

describe('CapacitorHttpService', () => {
  let service: CapacitorHttpService;
  let httpClient: jest.Mocked<HttpClient>;
  let platform: jest.Mocked<Platform>;

  const mockResponse = { id: 1, name: 'Test' };

  beforeEach(() => {
    jest.clearAllMocks();

    httpClient = {
      get: jest.fn().mockReturnValue(of(mockResponse)),
      post: jest.fn().mockReturnValue(of(mockResponse)),
      put: jest.fn().mockReturnValue(of(mockResponse)),
      delete: jest.fn().mockReturnValue(of(mockResponse)),
      patch: jest.fn().mockReturnValue(of(mockResponse)),
    } as unknown as jest.Mocked<HttpClient>;

    platform = {
      is: jest.fn(),
    } as unknown as jest.Mocked<Platform>;

    TestBed.configureTestingModule({
      providers: [
        CapacitorHttpService,
        { provide: HttpClient, useValue: httpClient },
        { provide: Platform, useValue: platform },
      ],
    });

    service = TestBed.inject(CapacitorHttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('shouldUseNativeHttp (via method behavior)', () => {
    it('should use Angular HttpClient on web platform', done => {
      platform.is.mockImplementation((p: string) => {
        if (p === 'capacitor') return false;
        if (p === 'mobileweb') return false;
        return false;
      });

      service.get<typeof mockResponse>('http://api.test.com/data').subscribe(result => {
        expect(result).toEqual(mockResponse);
        expect(httpClient.get).toHaveBeenCalledWith('http://api.test.com/data', undefined);
        done();
      });
    });

    it('should use Angular HttpClient on mobileweb (PWA)', done => {
      platform.is.mockImplementation((p: string) => {
        if (p === 'capacitor') return true;
        if (p === 'mobileweb') return true;
        return false;
      });

      service.get<typeof mockResponse>('http://api.test.com/data').subscribe(result => {
        expect(result).toEqual(mockResponse);
        expect(httpClient.get).toHaveBeenCalled();
        done();
      });
    });

    it('should use CapacitorHttp on native platform', done => {
      platform.is.mockImplementation((p: string) => {
        if (p === 'capacitor') return true;
        if (p === 'mobileweb') return false;
        return false;
      });

      (CapacitorHttp.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: mockResponse,
      });

      service.get<typeof mockResponse>('http://api.test.com/data').subscribe(result => {
        expect(result).toEqual(mockResponse);
        expect(CapacitorHttp.get).toHaveBeenCalled();
        expect(httpClient.get).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('GET requests', () => {
    describe('Web mode', () => {
      beforeEach(() => {
        platform.is.mockReturnValue(false);
      });

      it('should make GET request with Angular HttpClient', done => {
        service.get<typeof mockResponse>('http://api.test.com/users').subscribe(result => {
          expect(result).toEqual(mockResponse);
          expect(httpClient.get).toHaveBeenCalledWith('http://api.test.com/users', undefined);
          done();
        });
      });

      it('should pass headers to Angular HttpClient', done => {
        const headers = new HttpHeaders({ Authorization: 'Bearer token' });

        service.get<typeof mockResponse>('http://api.test.com/users', { headers }).subscribe(() => {
          expect(httpClient.get).toHaveBeenCalledWith('http://api.test.com/users', { headers });
          done();
        });
      });

      it('should pass params to Angular HttpClient', done => {
        const params = new HttpParams().set('page', '1');

        service.get<typeof mockResponse>('http://api.test.com/users', { params }).subscribe(() => {
          expect(httpClient.get).toHaveBeenCalledWith('http://api.test.com/users', { params });
          done();
        });
      });
    });

    describe('Native mode', () => {
      beforeEach(() => {
        platform.is.mockImplementation((p: string) => {
          if (p === 'capacitor') return true;
          if (p === 'mobileweb') return false;
          return false;
        });
      });

      it('should make GET request with CapacitorHttp', done => {
        (CapacitorHttp.get as jest.Mock).mockResolvedValue({
          status: 200,
          data: mockResponse,
        });

        service.get<typeof mockResponse>('http://api.test.com/users').subscribe(result => {
          expect(result).toEqual(mockResponse);
          expect(CapacitorHttp.get).toHaveBeenCalledWith({
            url: 'http://api.test.com/users',
            headers: {},
          });
          done();
        });
      });

      it('should convert HttpParams to query string for native requests', done => {
        (CapacitorHttp.get as jest.Mock).mockResolvedValue({
          status: 200,
          data: mockResponse,
        });

        const params = new HttpParams().set('page', '1').set('limit', '10');

        service.get<typeof mockResponse>('http://api.test.com/users', { params }).subscribe(() => {
          expect(CapacitorHttp.get).toHaveBeenCalledWith({
            url: 'http://api.test.com/users?page=1&limit=10',
            headers: {},
          });
          done();
        });
      });

      it('should convert Record params to query string', done => {
        (CapacitorHttp.get as jest.Mock).mockResolvedValue({
          status: 200,
          data: mockResponse,
        });

        const params = { page: '1', status: 'active' };

        service.get<typeof mockResponse>('http://api.test.com/users', { params }).subscribe(() => {
          expect(CapacitorHttp.get).toHaveBeenCalledWith({
            url: expect.stringContaining('page=1'),
            headers: {},
          });
          done();
        });
      });

      it('should handle array params in query string', done => {
        (CapacitorHttp.get as jest.Mock).mockResolvedValue({
          status: 200,
          data: mockResponse,
        });

        const params = { tags: ['a', 'b'] };

        service.get<typeof mockResponse>('http://api.test.com/items', { params }).subscribe(() => {
          expect(CapacitorHttp.get).toHaveBeenCalledWith({
            url: expect.stringContaining('tags=a&tags=b'),
            headers: {},
          });
          done();
        });
      });

      it('should convert HttpHeaders to plain object for native requests', done => {
        (CapacitorHttp.get as jest.Mock).mockResolvedValue({
          status: 200,
          data: mockResponse,
        });

        const headers = new HttpHeaders({
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        });

        service.get<typeof mockResponse>('http://api.test.com/users', { headers }).subscribe(() => {
          expect(CapacitorHttp.get).toHaveBeenCalledWith({
            url: 'http://api.test.com/users',
            headers: {
              Authorization: 'Bearer token',
              'Content-Type': 'application/json',
            },
          });
          done();
        });
      });

      it('should throw error on non-2xx response', done => {
        (CapacitorHttp.get as jest.Mock).mockResolvedValue({
          status: 404,
          data: { error: 'Not found' },
        });

        service.get('http://api.test.com/users').subscribe({
          error: error => {
            expect(error.status).toBe(404);
            expect(error.error).toEqual({ error: 'Not found' });
            done();
          },
        });
      });
    });
  });

  describe('POST requests', () => {
    const postData = { name: 'John', email: 'john@test.com' };

    describe('Web mode', () => {
      beforeEach(() => {
        platform.is.mockReturnValue(false);
      });

      it('should make POST request with Angular HttpClient', done => {
        service
          .post<typeof mockResponse>('http://api.test.com/users', postData)
          .subscribe(result => {
            expect(result).toEqual(mockResponse);
            expect(httpClient.post).toHaveBeenCalledWith(
              'http://api.test.com/users',
              postData,
              undefined
            );
            done();
          });
      });

      it('should pass headers to Angular HttpClient', done => {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        service
          .post<typeof mockResponse>('http://api.test.com/users', postData, { headers })
          .subscribe(() => {
            expect(httpClient.post).toHaveBeenCalledWith('http://api.test.com/users', postData, {
              headers,
            });
            done();
          });
      });
    });

    describe('Native mode', () => {
      beforeEach(() => {
        platform.is.mockImplementation((p: string) => {
          if (p === 'capacitor') return true;
          if (p === 'mobileweb') return false;
          return false;
        });
      });

      it('should make POST request with CapacitorHttp', done => {
        (CapacitorHttp.post as jest.Mock).mockResolvedValue({
          status: 201,
          data: mockResponse,
        });

        service
          .post<typeof mockResponse>('http://api.test.com/users', postData)
          .subscribe(result => {
            expect(result).toEqual(mockResponse);
            expect(CapacitorHttp.post).toHaveBeenCalledWith({
              url: 'http://api.test.com/users',
              headers: { 'Content-Type': 'application/json' },
              data: postData,
            });
            done();
          });
      });

      it('should handle form-urlencoded content type', done => {
        (CapacitorHttp.post as jest.Mock).mockResolvedValue({
          status: 200,
          data: { access_token: 'token123' },
        });

        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        const formData = 'username=test&password=secret';

        service.post('http://api.test.com/token', formData, { headers }).subscribe(() => {
          expect(CapacitorHttp.post).toHaveBeenCalledWith({
            url: 'http://api.test.com/token',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: formData,
          });
          done();
        });
      });

      it('should throw error on non-2xx response', done => {
        (CapacitorHttp.post as jest.Mock).mockResolvedValue({
          status: 400,
          data: { error: 'Bad request' },
        });

        service.post('http://api.test.com/users', postData).subscribe({
          error: error => {
            expect(error.status).toBe(400);
            done();
          },
        });
      });
    });
  });

  describe('PUT requests', () => {
    const putData = { id: 1, name: 'Updated' };

    describe('Web mode', () => {
      beforeEach(() => {
        platform.is.mockReturnValue(false);
      });

      it('should make PUT request with Angular HttpClient', done => {
        service
          .put<typeof mockResponse>('http://api.test.com/users/1', putData)
          .subscribe(result => {
            expect(result).toEqual(mockResponse);
            expect(httpClient.put).toHaveBeenCalledWith(
              'http://api.test.com/users/1',
              putData,
              undefined
            );
            done();
          });
      });
    });

    describe('Native mode', () => {
      beforeEach(() => {
        platform.is.mockImplementation((p: string) => {
          if (p === 'capacitor') return true;
          if (p === 'mobileweb') return false;
          return false;
        });
      });

      it('should make PUT request with CapacitorHttp', done => {
        (CapacitorHttp.put as jest.Mock).mockResolvedValue({
          status: 200,
          data: mockResponse,
        });

        service
          .put<typeof mockResponse>('http://api.test.com/users/1', putData)
          .subscribe(result => {
            expect(result).toEqual(mockResponse);
            expect(CapacitorHttp.put).toHaveBeenCalledWith({
              url: 'http://api.test.com/users/1',
              headers: { 'Content-Type': 'application/json' },
              data: putData,
            });
            done();
          });
      });
    });
  });

  describe('DELETE requests', () => {
    describe('Web mode', () => {
      beforeEach(() => {
        platform.is.mockReturnValue(false);
      });

      it('should make DELETE request with Angular HttpClient', done => {
        service.delete<typeof mockResponse>('http://api.test.com/users/1').subscribe(result => {
          expect(result).toEqual(mockResponse);
          expect(httpClient.delete).toHaveBeenCalledWith('http://api.test.com/users/1', undefined);
          done();
        });
      });

      it('should pass params to DELETE request', done => {
        const params = new HttpParams().set('force', 'true');

        service
          .delete<typeof mockResponse>('http://api.test.com/users/1', { params })
          .subscribe(() => {
            expect(httpClient.delete).toHaveBeenCalledWith('http://api.test.com/users/1', {
              params,
            });
            done();
          });
      });
    });

    describe('Native mode', () => {
      beforeEach(() => {
        platform.is.mockImplementation((p: string) => {
          if (p === 'capacitor') return true;
          if (p === 'mobileweb') return false;
          return false;
        });
      });

      it('should make DELETE request with CapacitorHttp', done => {
        (CapacitorHttp.delete as jest.Mock).mockResolvedValue({
          status: 204,
          data: null,
        });

        service.delete('http://api.test.com/users/1').subscribe(result => {
          expect(result).toBeNull();
          expect(CapacitorHttp.delete).toHaveBeenCalledWith({
            url: 'http://api.test.com/users/1',
            headers: {},
          });
          done();
        });
      });

      it('should append query params to DELETE URL', done => {
        (CapacitorHttp.delete as jest.Mock).mockResolvedValue({
          status: 204,
          data: null,
        });

        const params = { force: 'true' };

        service.delete('http://api.test.com/users/1', { params }).subscribe(() => {
          expect(CapacitorHttp.delete).toHaveBeenCalledWith({
            url: 'http://api.test.com/users/1?force=true',
            headers: {},
          });
          done();
        });
      });
    });
  });

  describe('PATCH requests', () => {
    const patchData = { name: 'Partial Update' };

    describe('Web mode', () => {
      beforeEach(() => {
        platform.is.mockReturnValue(false);
      });

      it('should make PATCH request with Angular HttpClient', done => {
        service
          .patch<typeof mockResponse>('http://api.test.com/users/1', patchData)
          .subscribe(result => {
            expect(result).toEqual(mockResponse);
            expect(httpClient.patch).toHaveBeenCalledWith(
              'http://api.test.com/users/1',
              patchData,
              undefined
            );
            done();
          });
      });
    });

    describe('Native mode', () => {
      beforeEach(() => {
        platform.is.mockImplementation((p: string) => {
          if (p === 'capacitor') return true;
          if (p === 'mobileweb') return false;
          return false;
        });
      });

      it('should make PATCH request with CapacitorHttp', done => {
        (CapacitorHttp.patch as jest.Mock).mockResolvedValue({
          status: 200,
          data: mockResponse,
        });

        service
          .patch<typeof mockResponse>('http://api.test.com/users/1', patchData)
          .subscribe(result => {
            expect(result).toEqual(mockResponse);
            expect(CapacitorHttp.patch).toHaveBeenCalledWith({
              url: 'http://api.test.com/users/1',
              headers: { 'Content-Type': 'application/json' },
              data: patchData,
            });
            done();
          });
      });
    });
  });

  describe('request() method (raw request with headers)', () => {
    it('should return full response with data, headers, and status', async () => {
      (CapacitorHttp.request as jest.Mock).mockResolvedValue({
        status: 200,
        data: { userId: 'abc123' },
        headers: { 'x-tidepool-session-token': 'session-token-123' },
      });

      const result = await service.request({
        method: 'POST',
        url: 'http://api.tidepool.org/auth/login',
        headers: { 'Content-Type': 'application/json' },
        data: { username: 'test', password: 'secret' },
      });

      expect(result.data).toEqual({ userId: 'abc123' });
      expect(result.headers['x-tidepool-session-token']).toBe('session-token-123');
      expect(result.status).toBe(200);
    });

    it('should throw error on non-2xx response', async () => {
      (CapacitorHttp.request as jest.Mock).mockResolvedValue({
        status: 401,
        data: { error: 'Unauthorized' },
        headers: {},
      });

      await expect(
        service.request({
          method: 'POST',
          url: 'http://api.tidepool.org/auth/login',
          data: { username: 'wrong', password: 'wrong' },
        })
      ).rejects.toEqual({
        status: 401,
        error: { error: 'Unauthorized' },
        headers: {},
        message: 'HTTP 401',
      });
    });

    it('should handle missing headers in response', async () => {
      (CapacitorHttp.request as jest.Mock).mockResolvedValue({
        status: 200,
        data: { ok: true },
      });

      const result = await service.request({
        method: 'GET',
        url: 'http://api.test.com/health',
      });

      expect(result.headers).toEqual({});
    });
  });

  describe('Error handling', () => {
    describe('Web mode', () => {
      beforeEach(() => {
        platform.is.mockReturnValue(false);
      });

      it('should propagate Angular HttpClient errors', done => {
        const httpError = { status: 500, message: 'Server Error' };
        httpClient.get.mockReturnValue(throwError(() => httpError));

        service.get('http://api.test.com/error').subscribe({
          error: error => {
            expect(error).toEqual(httpError);
            done();
          },
        });
      });
    });

    describe('Native mode', () => {
      beforeEach(() => {
        platform.is.mockImplementation((p: string) => {
          if (p === 'capacitor') return true;
          if (p === 'mobileweb') return false;
          return false;
        });
      });

      it('should propagate CapacitorHttp errors', done => {
        const nativeError = new Error('Network error');
        (CapacitorHttp.get as jest.Mock).mockRejectedValue(nativeError);

        service.get('http://api.test.com/error').subscribe({
          error: error => {
            expect(error).toEqual(nativeError);
            done();
          },
        });
      });

      it('should convert non-2xx status to error', done => {
        (CapacitorHttp.get as jest.Mock).mockResolvedValue({
          status: 500,
          data: { message: 'Internal Server Error' },
        });

        service.get('http://api.test.com/error').subscribe({
          error: error => {
            expect(error.status).toBe(500);
            expect(error.message).toBe('HTTP 500');
            done();
          },
        });
      });
    });
  });

  describe('Header conversion', () => {
    beforeEach(() => {
      platform.is.mockImplementation((p: string) => {
        if (p === 'capacitor') return true;
        if (p === 'mobileweb') return false;
        return false;
      });
    });

    it('should handle undefined headers', done => {
      (CapacitorHttp.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: mockResponse,
      });

      service.get('http://api.test.com/data').subscribe(() => {
        expect(CapacitorHttp.get).toHaveBeenCalledWith({
          url: 'http://api.test.com/data',
          headers: {},
        });
        done();
      });
    });

    it('should convert Record headers directly', done => {
      (CapacitorHttp.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: mockResponse,
      });

      const headers = { Authorization: 'Bearer abc', 'X-Custom': 'value' };

      service.get('http://api.test.com/data', { headers }).subscribe(() => {
        expect(CapacitorHttp.get).toHaveBeenCalledWith({
          url: 'http://api.test.com/data',
          headers: { Authorization: 'Bearer abc', 'X-Custom': 'value' },
        });
        done();
      });
    });
  });
});
