import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse } from '@angular/common/http';

import { RetryInterceptor } from './retry.interceptor';
import { ErrorHandlerService, AppError } from '@services/error-handler.service';

describe('RetryInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let errorHandlerService: ErrorHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ErrorHandlerService,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: RetryInterceptor,
          multi: true,
        },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    errorHandlerService = TestBed.inject(ErrorHandlerService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should not retry on success', () => {
    httpClient.get('/api/data').subscribe(response => {
      expect(response).toBeTruthy();
    });

    const req = httpMock.expectOne('/api/data');
    req.flush({ data: 'success' });
  });

  it('should retry a retryable error 3 times with exponential backoff and jitter', fakeAsync(() => {
    const error = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
    const appError: AppError = {
      message: 'Server error',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
      timestamp: 'some-timestamp',
    };

    spyOn(errorHandlerService, 'isRetryable').and.returnValue(true);
    spyOn(errorHandlerService, 'parseHttpError').and.returnValue(appError);
    spyOn(errorHandlerService, 'handleError').and.callThrough();

    httpClient.get('/api/data').subscribe({
      next: () => fail('should have failed with an error'),
      error: err => {
        expect(err).toEqual(appError);
      },
    });

    let req = httpMock.expectOne('/api/data');
    req.flush(null, error);

    // First retry: base delay 1000ms + up to 30% jitter = max 1300ms
    tick(1300);
    req = httpMock.expectOne('/api/data');
    req.flush(null, error);

    // Second retry: base delay 2000ms + up to 30% jitter = max 2600ms
    tick(2600);
    req = httpMock.expectOne('/api/data');
    req.flush(null, error);

    // Third retry: base delay 4000ms + up to 30% jitter = max 5200ms
    tick(5200);
    req = httpMock.expectOne('/api/data');
    req.flush(null, error);

    // After max retries, no more requests
    tick(10000);
    httpMock.expectNone('/api/data');

    expect(errorHandlerService.isRetryable).toHaveBeenCalledTimes(3);
    expect(errorHandlerService.handleError).toHaveBeenCalledTimes(1);
  }));

  it('should not retry a non-retryable error', fakeAsync(() => {
    const error = new HttpErrorResponse({ status: 400, statusText: 'Bad Request' });
    const appError: AppError = {
      message: 'Bad Request',
      code: 'BAD_REQUEST',
      statusCode: 400,
      timestamp: 'some-timestamp',
    };

    spyOn(errorHandlerService, 'isRetryable').and.returnValue(false);
    spyOn(errorHandlerService, 'parseHttpError').and.returnValue(appError);
    spyOn(errorHandlerService, 'handleError').and.callThrough();

    httpClient.get('/api/data').subscribe({
      next: () => fail('should have failed with an error'),
      error: err => {
        expect(err).toEqual(appError);
      },
    });

    const req = httpMock.expectOne('/api/data');
    req.flush(null, error);

    tick(1000);
    httpMock.expectNone('/api/data');

    expect(errorHandlerService.isRetryable).toHaveBeenCalledTimes(1);
    expect(errorHandlerService.handleError).toHaveBeenCalledTimes(1);
  }));
});
