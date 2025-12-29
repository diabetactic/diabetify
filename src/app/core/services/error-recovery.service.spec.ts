// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';
import { Network } from '@capacitor/network';
import { NetworkStatus } from '@capacitor/network';

import { ErrorRecoveryService } from './error-recovery.service';

describe('ErrorRecoveryService', () => {
  let service: ErrorRecoveryService;
  let toastControllerMock: {
    create: ReturnType<typeof vi.fn>;
  };
  let networkStatusCallback: (status: NetworkStatus) => void;

  beforeEach(() => {
    toastControllerMock = {
      create: vi.fn(),
    };

    vi.spyOn(Network, 'addListener').mockImplementation((eventName, callback) => {
      if (eventName === 'networkStatusChange') {
        networkStatusCallback = callback as (status: NetworkStatus) => void;
      }
      return Promise.resolve({ remove: vi.fn() });
    });

    TestBed.configureTestingModule({
      providers: [
        ErrorRecoveryService,
        { provide: ToastController, useValue: toastControllerMock },
      ],
    });

    service = TestBed.inject(ErrorRecoveryService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show a retry toast', async () => {
    const presentSpy = vi.fn();
    toastControllerMock.create.mockResolvedValue({ present: presentSpy });

    const retryAction = vi.fn();
    await service.showRetryToast('Could not save', retryAction);

    expect(toastControllerMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Could not save',
        buttons: [
          { text: 'Retry', handler: retryAction },
          { text: 'Dismiss', role: 'cancel' },
        ],
      })
    );
    expect(presentSpy).toHaveBeenCalled();
  });

  it('should show offline banner when network is disconnected', () => {
    return new Promise<void>(resolve => {
      service.offlineBannerVisible$.subscribe(visible => {
        if (visible) {
          expect(visible).toBe(true);
          resolve();
        }
      });
      networkStatusCallback({ connected: false, connectionType: 'none' });
    });
  });

  it('should hide offline banner when network is connected', () => {
    return new Promise<void>(resolve => {
      // Set initial state to offline
      service.showOfflineBanner();

      service.offlineBannerVisible$.subscribe(visible => {
        if (!visible) {
          expect(visible).toBe(false);
          resolve();
        }
      });
      networkStatusCallback({ connected: true, connectionType: 'wifi' });
    });
  });

  // ============================================
  // Circuit Breaker Pattern Tests
  // ============================================

  describe('Circuit Breaker', () => {
    it('should start in CLOSED state', () => {
      expect(service.getCircuitState()).toBe('CLOSED');
    });

    it('should allow requests when circuit is CLOSED', () => {
      expect(service.canMakeRequest()).toBe(true);
    });

    it('should remain CLOSED after failures below threshold', () => {
      // Record 4 failures (threshold is 5)
      for (let i = 0; i < 4; i++) {
        service.recordFailure();
      }
      expect(service.getCircuitState()).toBe('CLOSED');
      expect(service.canMakeRequest()).toBe(true);
    });

    it('should transition to OPEN after reaching failure threshold', () => {
      // Record 5 failures (threshold is 5)
      for (let i = 0; i < 5; i++) {
        service.recordFailure();
      }
      expect(service.getCircuitState()).toBe('OPEN');
    });

    it('should block requests when circuit is OPEN', () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        service.recordFailure();
      }
      expect(service.canMakeRequest()).toBe(false);
    });

    it('should transition to HALF_OPEN after recovery timeout', () => {
      vi.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        service.recordFailure();
      }
      expect(service.getCircuitState()).toBe('OPEN');
      expect(service.canMakeRequest()).toBe(false);

      // Advance time by recovery timeout (30 seconds)
      vi.advanceTimersByTime(30000);

      // Next request check should transition to HALF_OPEN
      expect(service.canMakeRequest()).toBe(true);
      expect(service.getCircuitState()).toBe('HALF_OPEN');

      vi.useRealTimers();
    });

    it('should allow one test request in HALF_OPEN state', () => {
      vi.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        service.recordFailure();
      }

      // Wait for recovery timeout
      vi.advanceTimersByTime(30000);
      service.canMakeRequest(); // Transitions to HALF_OPEN

      expect(service.getCircuitState()).toBe('HALF_OPEN');
      expect(service.canMakeRequest()).toBe(true);

      vi.useRealTimers();
    });

    it('should transition from HALF_OPEN to CLOSED on success', () => {
      vi.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        service.recordFailure();
      }

      // Wait for recovery timeout and transition to HALF_OPEN
      vi.advanceTimersByTime(30000);
      service.canMakeRequest();
      expect(service.getCircuitState()).toBe('HALF_OPEN');

      // Record success
      service.recordSuccess();
      expect(service.getCircuitState()).toBe('CLOSED');
      expect(service.canMakeRequest()).toBe(true);

      vi.useRealTimers();
    });

    it('should reset circuit on network reconnection', () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        service.recordFailure();
      }
      expect(service.getCircuitState()).toBe('OPEN');

      // Simulate network reconnection
      networkStatusCallback({ connected: true, connectionType: 'wifi' });

      expect(service.getCircuitState()).toBe('CLOSED');
      expect(service.canMakeRequest()).toBe(true);
    });

    it('should reset failure count on success', () => {
      // Record some failures
      service.recordFailure();
      service.recordFailure();
      service.recordFailure();

      // Record success
      service.recordSuccess();

      // Circuit should be CLOSED and reset
      expect(service.getCircuitState()).toBe('CLOSED');

      // Should need 5 more failures to open
      for (let i = 0; i < 4; i++) {
        service.recordFailure();
      }
      expect(service.getCircuitState()).toBe('CLOSED');

      service.recordFailure();
      expect(service.getCircuitState()).toBe('OPEN');
    });

    it('should explicitly reset circuit via resetCircuit()', () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        service.recordFailure();
      }
      expect(service.getCircuitState()).toBe('OPEN');

      // Reset
      service.resetCircuit();
      expect(service.getCircuitState()).toBe('CLOSED');
      expect(service.canMakeRequest()).toBe(true);
    });
  });
});
