import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Devices Page - BLE Integration Placeholder
 *
 * STATUS: NOT IMPLEMENTED
 *
 * Placeholder para funcionalidad futura de Bluetooth Low Energy (BLE).
 *
 * Funcionalidades planificadas:
 * - Escaneo de medidores de glucosa BLE
 * - Conexión mediante Glucose Service UUID (00001808-...)
 * - Lectura de mediciones de dispositivos conectados
 * - Parseo de formato SFLOAT16
 * - Sincronización con almacenamiento local y Tidepool
 *
 * Dependencias (instaladas pero no utilizadas):
 * - @capacitor-community/bluetooth-le
 *
 * TODO: Implementar funcionalidad BLE
 */
@Component({
  selector: 'app-devices',
  templateUrl: './devices.html',
  styleUrls: ['./devices.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
})
export class DevicesPage {
  constructor() {}
}
