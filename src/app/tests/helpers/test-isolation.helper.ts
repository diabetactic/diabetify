/**
 * Test Isolation Utilities
 * Prevents BehaviorSubject and cache state pollution between tests
 *
 * @module tests/helpers/test-isolation
 */

import { BehaviorSubject } from 'rxjs';

/**
 * Reset BehaviorSubject to initial state
 * Clears all subscribers and restarts with initial value
 *
 * @example
 * beforeEach(() => {
 *   resetBehaviorSubject(service.authState$, { authenticated: false });
 * });
 */
export function resetBehaviorSubject<T>(subject: BehaviorSubject<T>, initialValue: T): void {
  subject.next(initialValue);
}

/**
 * Clear all internal service caches
 * Handles common cache property patterns
 *
 * @example
 * beforeEach(() => {
 *   clearServiceCache(service);
 * });
 */
export function clearServiceCache(service: any): void {
  // Common cache property patterns
  const cacheProps = ['cache', '_cache', 'inMemoryCache', 'readingCache', 'appointmentCache'];

  cacheProps.forEach(prop => {
    if (service[prop]) {
      if (typeof service[prop].clear === 'function') {
        service[prop].clear();
      } else if (service[prop] instanceof Map) {
        service[prop].clear();
      } else if (Array.isArray(service[prop])) {
        service[prop].length = 0;
      }
    }
  });
}

/**
 * Reset Capacitor storage mocks
 * Resets Preferences and SecureStorage to initial state
 *
 * @example
 * beforeEach(() => {
 *   resetCapacitorMocks();
 * });
 */
export async function resetCapacitorMocks(): Promise<void> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');

    // Reset mocks to default behavior
    if (jest.isMockFunction(Preferences.get)) {
      (Preferences.get as jest.Mock).mockResolvedValue({ value: null });
    }
    if (jest.isMockFunction(Preferences.set)) {
      (Preferences.set as jest.Mock).mockResolvedValue(undefined);
    }
    if (jest.isMockFunction(Preferences.remove)) {
      (Preferences.remove as jest.Mock).mockResolvedValue(undefined);
    }
    if (jest.isMockFunction(Preferences.clear)) {
      (Preferences.clear as jest.Mock).mockResolvedValue(undefined);
    }

    if (jest.isMockFunction(SecureStorage.get)) {
      (SecureStorage.get as jest.Mock).mockResolvedValue(null);
    }
    if (jest.isMockFunction(SecureStorage.set)) {
      (SecureStorage.set as jest.Mock).mockResolvedValue(undefined);
    }
    if (jest.isMockFunction(SecureStorage.remove)) {
      (SecureStorage.remove as jest.Mock).mockResolvedValue(undefined);
    }
    if (jest.isMockFunction(SecureStorage.clear)) {
      (SecureStorage.clear as jest.Mock).mockResolvedValue(undefined);
    }
  } catch {
    // Silently fail if modules not available (e.g., in some test contexts)
  }
}

/**
 * Reset HTTP client mock to clean state
 * Clears all call history and resets expectations
 *
 * @example
 * beforeEach(() => {
 *   resetHttpClientMock(mockHttpClient);
 * });
 */
export function resetHttpClientMock(httpMock: any): void {
  if (jest.isMockFunction(httpMock.get)) {
    httpMock.get.mockReset();
  }
  if (jest.isMockFunction(httpMock.post)) {
    httpMock.post.mockReset();
  }
  if (jest.isMockFunction(httpMock.put)) {
    httpMock.put.mockReset();
  }
  if (jest.isMockFunction(httpMock.patch)) {
    httpMock.patch.mockReset();
  }
  if (jest.isMockFunction(httpMock.delete)) {
    httpMock.delete.mockReset();
  }
}

/**
 * Reset all mocks in TestBed
 * Complete reset of all injected mock services
 *
 * @example
 * beforeEach(() => {
 *   resetAllMocks();
 * });
 */
export function resetAllMocks(): void {
  jest.clearAllMocks();
  jest.resetAllMocks();
}

/**
 * Generic test data factory for common domain objects
 * Provides consistent mock data with overridable properties
 */
export class TestDataFactory {
  /**
   * Create mock LocalUser with default values
   */
  static mockLocalUser(overrides?: Partial<any>): any {
    return {
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'patient',
      accountState: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Create mock UserProfile with default values
   */
  static mockUserProfile(overrides?: Partial<any>): any {
    return {
      id: 'user_123',
      name: 'Test User',
      age: 10,
      accountState: 'active',
      dateOfBirth: '2014-01-01',
      diabetesType: 'type1',
      treatmentType: 'insulin',
      preferences: {
        glucoseUnit: 'mg/dL',
        language: 'en',
        theme: 'light',
        notifications: {
          appointments: true,
          readings: true,
          reminders: true,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Create mock LocalGlucoseReading with default values
   */
  static mockGlucoseReading(overrides?: Partial<any>): any {
    return {
      id: `reading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'cbg',
      time: new Date().toISOString(),
      value: 120,
      units: 'mg/dL',
      synced: false,
      ...overrides,
    };
  }

  /**
   * Create mock Appointment with default values
   */
  static mockAppointment(overrides?: Partial<any>): any {
    const now = new Date();
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

    return {
      appointment_id: `apt_${Date.now()}`,
      user_id: '1000',
      doctor_id: 'doc_123',
      doctor_name: 'Dr. Smith',
      appointment_type: 'routine',
      status: 'pending',
      date_time: future.toISOString(),
      reason: 'Regular checkup',
      location: 'Hospital A',
      notes: '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ...overrides,
    };
  }

  /**
   * Create mock API response with common envelope
   */
  static mockApiResponse(data: any, overrides?: Partial<any>): any {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
      },
      ...overrides,
    };
  }

  /**
   * Create mock API error response
   */
  static mockApiError(status: number, message: string, details?: any): any {
    return {
      success: false,
      error: {
        code: status,
        message,
        details: details || null,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Create mock token response
   */
  static mockTokenResponse(overrides?: Partial<any>): any {
    return {
      access_token: `token_${Date.now()}`,
      refresh_token: `refresh_${Date.now()}`,
      token_type: 'Bearer',
      expires_in: 3600,
      ...overrides,
    };
  }

  /**
   * Create mock readings array for a date range
   */
  static mockReadingsForDateRange(days: number = 30, overrides?: Partial<any>): any[] {
    const readings = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

      // Multiple readings per day (morning, afternoon, evening)
      for (let j = 0; j < 3; j++) {
        readings.push(
          this.mockGlucoseReading({
            time: new Date(date.getTime() + j * 8 * 60 * 60 * 1000).toISOString(),
            value: 70 + Math.random() * 120, // 70-190 range
            ...overrides,
          })
        );
      }
    }

    return readings;
  }

  /**
   * Create mock HTTP error response
   */
  static mockHttpErrorResponse(status: number, message: string, details?: any): any {
    return {
      status,
      statusText: this.getStatusText(status),
      error: {
        message,
        details: details || null,
      },
      headers: {},
      url: 'http://localhost:8000/api/test',
    };
  }

  /**
   * Get HTTP status text for code
   */
  private static getStatusText(status: number): string {
    const statusMap: { [key: number]: string } = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
      503: 'Service Unavailable',
    };
    return statusMap[status] || 'Unknown Error';
  }
}

/**
 * Async test helpers
 */
export class AsyncTestHelpers {
  /**
   * Wait for a condition to be true (polling)
   * Useful for testing async state changes
   *
   * @example
   * await waitForCondition(() => service.isLoading === false, 5000);
   */
  static async waitForCondition(
    condition: () => boolean,
    timeout: number = 5000,
    interval: number = 50
  ): Promise<void> {
    const start = Date.now();

    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error(`Condition not met after ${timeout}ms`);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  /**
   * Wait for observable to emit
   * Useful for testing observable streams
   *
   * @example
   * const value = await waitForEmission(service.data$, 5000);
   */
  static async waitForEmission<T>(observable: any, timeout: number = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(
        () => reject(new Error(`Observable did not emit within ${timeout}ms`)),
        timeout
      );

      const subscription = observable.subscribe({
        next: (value: T) => {
          clearTimeout(timeoutHandle);
          subscription.unsubscribe();
          resolve(value);
        },
        error: (error: any) => {
          clearTimeout(timeoutHandle);
          reject(error);
        },
      });
    });
  }

  /**
   * Simulate passage of time (fake timer)
   * Useful for testing timeout and interval-based logic
   *
   * @example
   * jest.useFakeTimers();
   * service.scheduleRefresh(3600000); // 1 hour
   * await tickTimer(3600000);
   * expect(service.hasRefreshed).toBe(true);
   * jest.useRealTimers();
   */
  static async tickTimer(ms: number): Promise<void> {
    jest.advanceTimersByTime(ms);
    // Allow microtasks to process
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

/**
 * DOM testing helpers for component tests
 */
export class DOMTestHelpers {
  /**
   * Find element by CSS selector
   */
  static querySelector(fixture: any, selector: string): HTMLElement | null {
    return fixture.debugElement.query(selector)?.nativeElement || null;
  }

  /**
   * Find all elements matching selector
   */
  static querySelectorAll(fixture: any, selector: string): HTMLElement[] {
    const debugElements = fixture.debugElement.queryAll(selector);
    return debugElements.map((el: any) => el.nativeElement);
  }

  /**
   * Get text content of element
   */
  static getTextContent(fixture: any, selector: string): string {
    const el = this.querySelector(fixture, selector);
    return el?.textContent?.trim() || '';
  }

  /**
   * Trigger click event on element
   */
  static click(fixture: any, selector: string): void {
    const el = this.querySelector(fixture, selector);
    if (el) {
      el.click();
      fixture.detectChanges();
    }
  }

  /**
   * Set input value and trigger change event
   */
  static setInputValue(fixture: any, selector: string, value: string): void {
    const input = this.querySelector(fixture, selector) as HTMLInputElement;
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    }
  }

  /**
   * Check if element exists in DOM
   */
  static hasElement(fixture: any, selector: string): boolean {
    return this.querySelector(fixture, selector) !== null;
  }

  /**
   * Check if element has class
   */
  static hasClass(fixture: any, selector: string, className: string): boolean {
    const el = this.querySelector(fixture, selector);
    return el?.classList.contains(className) || false;
  }
}
