
import { Injectable } from '@angular/core';
import { ToastController, ToastOptions } from '@ionic/angular';
import { Network } from '@capacitor/network';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * ErrorRecoveryService - Manages UI for error recovery
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorRecoveryService {
  private offlineBannerVisible = new BehaviorSubject<boolean>(false);
  offlineBannerVisible$: Observable<boolean> = this.offlineBannerVisible.asObservable();

  constructor(private readonly toastController: ToastController) {
    Network.addListener('networkStatusChange', status => {
      if (status.connected) {
        this.hideOfflineBanner();
      } else {
        this.showOfflineBanner();
      }
    });
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
    const toast = await this.toastController.create(options);
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
