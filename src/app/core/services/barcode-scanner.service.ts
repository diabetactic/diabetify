import { Injectable } from '@angular/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class BarcodeScannerService {

  constructor(private alertController: AlertController) { }

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
    const alert = await this.alertController.create({
      header: 'Permission Denied',
      message: 'Camera permission is required to scan barcodes. Please grant permission in your device settings.',
      buttons: ['OK']
    });
    await alert.present();
  }
}
