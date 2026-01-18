import { Injectable } from '@angular/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { AlertController } from '@ionic/angular';
import { TranslationService } from '@services/translation.service';
import { createOverlaySafely } from '@core/utils/ionic-overlays';

@Injectable({
  providedIn: 'root',
})
export class BarcodeScannerService {
  constructor(
    private alertController: AlertController,
    private translationService: TranslationService
  ) {}

  async scan(): Promise<string | null> {
    const granted = await this.requestPermissions();
    if (!granted) {
      await this.presentPermissionsAlert();
      return null;
    }

    const { barcodes } = await BarcodeScanner.scan();
    return barcodes.length > 0 ? barcodes[0].displayValue : null;
  }

  private async requestPermissions(): Promise<boolean> {
    const { camera } = await BarcodeScanner.requestPermissions();
    return camera === 'granted' || camera === 'limited';
  }

  private async presentPermissionsAlert(): Promise<void> {
    const alert = await createOverlaySafely(
      () =>
        this.alertController.create({
          header: this.translationService.instant('barcodeScanner.permissionDenied.title'),
          message: this.translationService.instant('barcodeScanner.permissionDenied.message'),
          buttons: [this.translationService.instant('common.ok')],
        }),
      { timeoutMs: 1500 }
    );
    if (!alert) return;
    await alert.present();
  }
}
