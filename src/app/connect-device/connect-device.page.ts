import { Component, NgZone, OnInit } from '@angular/core';
import { BleClient, ScanResult, dataViewToText, numbersToDataView } from '@capacitor-community/bluetooth-le';
import { Platform, LoadingController, AlertController } from '@ionic/angular';

interface GlucoseReading {
  sequenceNumber: number;
  timestamp: Date;
  glucoseConcentration: number;
  unit: string;
  type?: number;
  sampleLocation?: number;
  timeOffset?: number;
  contextInfoFollows: boolean;
  device?: string;
}

@Component({
  selector: 'app-connect-device',
  templateUrl: 'connect-device.page.html',
  styleUrls: ['connect-device.page.scss']
})
export class ConnectDevicePage implements OnInit {
  private DEVICE_INFO_SERVICE = '0000180a-0000-1000-8000-00805f9b34fb';
  private MANUFACTURER_NAME = '00002a29-0000-1000-8000-00805f9b34fb';
  private GLUCOSE_SERVICE = '00001808-0000-1000-8000-00805f9b34fb';
  private GLUCOSE_CHARACTERISTIC = '00002a18-0000-1000-8000-00805f9b34fb';
  private CONTEXT_CHARACTERISTIC = '00002a34-0000-1000-8000-00805f9b34fb';
  private RECORDS_CHARACTERISTIC = '00002a52-0000-1000-8000-00805f9b34fb';
  private MMOLL_TO_MGDL = 18.0182;

  devices: ScanResult[] = [];
  selectedDevice: ScanResult | null = null;
  allReadings: GlucoseReading[] = [];
  isScanning: boolean = false;
  manufacturer: string = '';
  results: string = '';

  isLoading: boolean = false;

  constructor(
    private ngZone: NgZone,
    private platform: Platform,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  async ngOnInit() {
    await this.initializeBluetooth();
  }

  async scanForDevices() {
    try {
      this.isScanning = true;
      this.devices = [];

      await BleClient.requestLEScan(
        {
          services: [this.GLUCOSE_SERVICE],
        },
        (result) => {
          this.ngZone.run(() => {
            const existingDeviceIndex = this.devices.findIndex(d => d.device.deviceId === result.device.deviceId);
            if (existingDeviceIndex >= 0) {
              this.devices[existingDeviceIndex] = result;
            } else {
              this.devices.push(result);
            }
          });
        }
      );

      setTimeout(async () => {
        await this.stopScan();
      }, 10000);

    } catch (error) {
      console.error('Error al buscar dispositivos:', error);
      this.isScanning = false;
    }
  }

  async stopScan() {
    await BleClient.stopLEScan();
    this.isScanning = false;
  }

  async connectToDevice(device: ScanResult) {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Conectando...',
    });
    await loading.present();

    try {
      await BleClient.connect(device.device.deviceId, (deviceId) => this.onDisconnect(deviceId));
      this.selectedDevice = device;
      await this.getManufacturerName(device.device.deviceId);
      await this.setupGlucoseNotifications(device.device.deviceId);
    } catch (error) {
      console.error('Error al conectar con el dispositivo:', error);
      await this.presentAlert('No se pudo conectar con el dispositivo. Por favor, inténtalo de nuevo.');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  async getManufacturerName(deviceId: string) {
    try {
      const result = await BleClient.read(deviceId, this.DEVICE_INFO_SERVICE, this.MANUFACTURER_NAME);
      this.manufacturer = dataViewToText(result);
      console.log('Fabricante:', this.manufacturer);
    } catch (error) {
      console.error('Error al obtener el nombre del fabricante:', error);
    }
  }

  async setupGlucoseNotifications(deviceId: string) {
    try {
      await BleClient.startNotifications(
        deviceId,
        this.GLUCOSE_SERVICE,
        this.RECORDS_CHARACTERISTIC,
        (value) => console.log('Cambio en la característica de registros:', value)
      );

      await BleClient.startNotifications(
        deviceId,
        this.GLUCOSE_SERVICE,
        this.GLUCOSE_CHARACTERISTIC,
        (value) => this.handleGlucoseReading(value)
      );

      await BleClient.startNotifications(
        deviceId,
        this.GLUCOSE_SERVICE,
        this.CONTEXT_CHARACTERISTIC,
        (value) => this.handleGlucoseContext(value)
      );

      // Solicitar todos los registros después de configurar las notificaciones
      await this.requestAllRecords(deviceId);
    } catch (error) {
      console.error('Error al configurar las notificaciones de glucosa:', error);
    }
  }

  async requestAllRecords(deviceId: string) {
    const allRecordsCommand = new Uint8Array([0x01, 0x01]);
    await BleClient.write(deviceId, this.GLUCOSE_SERVICE, this.RECORDS_CHARACTERISTIC, numbersToDataView(Array.from(allRecordsCommand)));
  }

  handleGlucoseReading(value: DataView) {
    console.log('Lectura de glucosa recibida:', value);
    const reading = this.parseGlucoseReading(value);
    this.ngZone.run(() => {
      this.allReadings.unshift(reading);
      this.results += JSON.stringify(reading) + '\n';
    });
  }

  handleGlucoseContext(value: DataView) {
    console.log('Contexto de glucosa recibido:', value);
    // Puedes manejar los datos de contexto aquí
  }

  getReadingTypeString(type: number): string {
    const types = [
      'Reservado',
      'Sangre capilar total',
      'Plasma capilar',
      'Sangre venosa total',
      'Plasma venoso',
      'Sangre arterial total',
      'Plasma arterial',
      'Sangre total no determinada',
      'Plasma no determinado',
      'Fluido intersticial',
      'Solución de control'
    ];
    return types[type] || 'Desconocido';
  }

  private parseGlucoseReading(value: DataView, device?: string): GlucoseReading {
    // Implementa aquí el análisis de la lectura de glucosa
    // Para simplificar, utilizaremos datos ficticios

    return {
      sequenceNumber: Math.floor(Math.random() * 1000),
      timestamp: new Date(),
      glucoseConcentration: Math.floor(Math.random() * (180 - 70 + 1)) + 70,
      unit: 'mg/dL',
      contextInfoFollows: false,
      device
    };
  }

  async read() {
    if (this.selectedDevice) {
      await this.requestAllRecords(this.selectedDevice.device.deviceId);
    }
  }

  async disconnect() {
    if (this.selectedDevice) {
      const deviceId = this.selectedDevice.device.deviceId;
      try {
        await BleClient.stopNotifications(deviceId, this.GLUCOSE_SERVICE, this.RECORDS_CHARACTERISTIC);
        await BleClient.stopNotifications(deviceId, this.GLUCOSE_SERVICE, this.GLUCOSE_CHARACTERISTIC);
        await BleClient.stopNotifications(deviceId, this.GLUCOSE_SERVICE, this.CONTEXT_CHARACTERISTIC);
      } catch (error) {
        console.error('Error al detener las notificaciones:', error);
      }
      await BleClient.disconnect(deviceId);
      this.selectedDevice = null;
      this.manufacturer = '';
    }
  }

  private onDisconnect(deviceId: string) {
    console.log(`Dispositivo ${deviceId} desconectado`);
    this.ngZone.run(() => {
      this.selectedDevice = null;
      this.manufacturer = '';
    });
  }

  async initializeBluetooth() {
    try {
      await BleClient.initialize();
    } catch (error) {
      console.error('Error al inicializar Bluetooth:', error);
      await this.presentAlert('Por favor, habilita Bluetooth en tu dispositivo.');
    }
  }

  async presentAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Atención',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  showResults() {
    // En una aplicación real, podrías mostrar esto en la interfaz en lugar de una alerta
    this.presentAlert(this.results);
    this.results = '';
  }
}
