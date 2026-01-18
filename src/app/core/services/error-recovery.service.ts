import { Injectable, OnDestroy } from '@angular/core';
import { ToastController, ToastOptions } from '@ionic/angular';
import { Network } from '@capacitor/network';
import { BehaviorSubject, Observable } from 'rxjs';
import { PluginListenerHandle } from '@capacitor/core';
import { createOverlaySafely } from '@core/utils/ionic-overlays';

/**
 * Circuit breaker states for resilience pattern
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * ErrorRecoveryService - Manages UI for error recovery with circuit breaker pattern
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorRecoveryService implements OnDestroy {
  private offlineBannerVisible = new BehaviorSubject<boolean>(false);
  offlineBannerVisible$: Observable<boolean> = this.offlineBannerVisible.asObservable();

  // Circuit breaker state for API resilience
  private circuitState: CircuitState = 'CLOSED';
  private failureCount = 0;
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 30000; // 30 seconds
  private lastFailureTime = 0;
  private networkListener: PluginListenerHandle | null = null;

  constructor(private readonly toastController: ToastController) {
    this.initNetworkListener();
  }

  private async initNetworkListener(): Promise<void> {
    this.networkListener = await Network.addListener('networkStatusChange', status => {
      if (status.connected) {
        this.hideOfflineBanner();
        // Reset circuit breaker on reconnection
        this.resetCircuit();
      } else {
        this.showOfflineBanner();
      }
    });
  }

  ngOnDestroy(): void {
    this.networkListener?.remove();
  }

  /**
   * Check if circuit breaker allows request
   */
  canMakeRequest(): boolean {
    if (this.circuitState === 'CLOSED') return true;
    if (this.circuitState === 'OPEN') {
      // Check if recovery timeout has passed
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
        this.circuitState = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    // HALF_OPEN: allow one test request
    return true;
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.failureCount = 0;
    this.circuitState = 'CLOSED';
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.circuitState = 'OPEN';
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  resetCircuit(): void {
    this.circuitState = 'CLOSED';
    this.failureCount = 0;
  }

  /**
   * Get current circuit state
   */
  getCircuitState(): CircuitState {
    return this.circuitState;
  }

  /**
   * Show a toast notification with a retry option
   */
  async showRetryToast(message: string, retryAction: () => void): Promise<void> {
    const options: ToastOptions = {
      message,
      duration: 5000,
      position: 'bottom',
      buttons: [
        {
          text: 'Retry',
          handler: retryAction,
        },
        {
          text: 'Dismiss',
          role: 'cancel',
        },
      ],
    };
    const toast = await createOverlaySafely(() => this.toastController.create(options), {
      timeoutMs: 1500,
    });
    if (!toast) return;
    await toast.present();
  }

  /**
   * Show the offline banner
   */
  showOfflineBanner(): void {
    this.offlineBannerVisible.next(true);
  }

  /**
   * Hide the offline banner
   */
  hideOfflineBanner(): void {
    this.offlineBannerVisible.next(false);
  }
}
