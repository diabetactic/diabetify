import { Component, NgZone, OnInit } from '@angular/core';
import { BleClient, ScanResult, numberToUUID, dataViewToText, numbersToDataView } from '@capacitor-community/bluetooth-le';
import { Platform } from '@ionic/angular';

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
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit {
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

  constructor(private ngZone: NgZone, private platform: Platform) {}

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
      console.error('Error scanning for devices:', error);
      this.isScanning = false;
    }
  }

  async stopScan() {
    await BleClient.stopLEScan();
    this.isScanning = false;
  }

  async connectToDevice(device: ScanResult) {
    try {
      await BleClient.connect(device.device.deviceId, (deviceId) => this.onDisconnect(deviceId));
      this.selectedDevice = device;
      await this.getManufacturerName(device.device.deviceId);
      await this.setupGlucoseNotifications(device.device.deviceId);
    } catch (error) {
      console.error('Error connecting to device:', error);
    }
  }

  async getManufacturerName(deviceId: string) {
    const result = await BleClient.read(deviceId, this.DEVICE_INFO_SERVICE, this.MANUFACTURER_NAME);
    this.manufacturer = dataViewToText(result);
    console.log('Manufacturer:', this.manufacturer);
  }

  async setupGlucoseNotifications(deviceId: string) {
    await BleClient.startNotifications(
      deviceId,
      this.GLUCOSE_SERVICE,
      this.RECORDS_CHARACTERISTIC,
      (value) => console.log('Records characteristic changed:', value)
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

    // Request all records after setting up notifications
    await this.requestAllRecords(deviceId);
  }

  async requestAllRecords(deviceId: string) {
    const allRecordsCommand = new Uint8Array([0x01, 0x01]);
    await BleClient.write(deviceId, this.GLUCOSE_SERVICE, this.RECORDS_CHARACTERISTIC, numbersToDataView(Array.from(allRecordsCommand)));
  }

  handleGlucoseReading(value: DataView) {
    console.log('Received glucose reading:', value);
    const reading = this.parseGlucoseReading(value);
    this.ngZone.run(() => {
      this.allReadings.unshift(reading);
      this.results += reading.toString() + '\n';
    });
  }

  handleGlucoseContext(value: DataView) {
    console.log('Received glucose context:', value);
    // You may want to parse and handle context data here
  }

  getReadingTypeString(type: number): string {
    const types = [
      'Reserved',
      'Capillary Whole blood',
      'Capillary Plasma',
      'Venous Whole blood',
      'Venous Plasma',
      'Arterial Whole blood',
      'Arterial Plasma',
      'Undetermined Whole blood',
      'Undetermined Plasma',
      'Interstitial Fluid',
      'Control Solution'
    ];
    return types[type] || 'Unknown';
  }
  
  getSampleLocationString(location: number): string {
    const locations = [
      'Reserved',
      'Finger',
      'Alternate Site Test',
      'Earlobe',
      'Control solution',
      'Subcutaneous tissue',
      'Value not available'
    ];
    return locations[location] || 'Unknown';
  }

  private parseGlucoseReading(value: DataView, device?: string): GlucoseReading {
    if (value.byteLength < 14) {
      throw new Error('Packet length is less than 14 bytes');
    }
  
    const flags = value.getUint8(0);
    const timeOffsetPresent = (flags & 0x01) > 0;
    const typeAndLocationPresent = (flags & 0x02) > 0;
    const concentrationUnitKgL = (flags & 0x04) === 0;
    const sensorStatusAnnunciationPresent = (flags & 0x08) > 0;
    const contextInfoFollows = (flags & 0x10) > 0;
    console.log('Context info follows:', contextInfoFollows)
  
    const sequenceNumber = value.getUint16(1, true);
    const year = value.getUint16(3, true);
    const month = value.getUint8(5);
    const day = value.getUint8(6);
    const hour = value.getUint8(7);
    const minute = value.getUint8(8);
    const second = value.getUint8(9);
  
    let ptr = 10;
    let timeOffset;
    if (timeOffsetPresent) {
      timeOffset = value.getInt16(ptr, true);
      ptr += 2;
    }
  
    let glucoseConcentration: number;
    let unit: string;
    if (concentrationUnitKgL) {
      const kgl = this.getSfloat16(value, ptr);
      glucoseConcentration = kgl * 100000;
      unit = 'mg/dL';
    } else {
      const mol = this.getSfloat16(value, ptr);
      glucoseConcentration = mol * 1000 * this.MMOLL_TO_MGDL;
      unit = 'mmol/L';
    }
    ptr += 2;
  
    let sampleType, sampleLocation;
    if (typeAndLocationPresent) {
      const typeAndLocation = value.getUint8(ptr);
      sampleLocation = (typeAndLocation & 0xF0) >> 4;
      sampleType = typeAndLocation & 0x0F;
      ptr++;
    }
  
    if (sensorStatusAnnunciationPresent) {
      const status = value.getUint8(ptr);
      // You might want to do something with the status
    }
  
    const timestamp = new Date(year, month - 1, day, hour, minute, second);
    if (timeOffset) {
      timestamp.setMinutes(timestamp.getMinutes() + timeOffset);
    }
  
    return {
      sequenceNumber,
      timestamp,
      glucoseConcentration,
      unit,
      type: sampleType,
      sampleLocation,
      timeOffset,
      contextInfoFollows,
      device
    };
  }

  private unsignedByteToInt(b: number): number {
    return b & 0xff;
  }
  
  private unsignedToSigned(unsigned: number, size: number): number {
    if ((unsigned & (1 << (size - 1))) != 0) {
      unsigned = -1 * ((1 << (size - 1)) - (unsigned & ((1 << (size - 1)) - 1)));
    }
    return unsigned;
  }
  
  private getSfloat16(data: DataView, index: number): number {
    // Little-endian ordering
    const b0 = data.getUint8(index);
    const b1 = data.getUint8(index + 1);
  
    const mantissa = this.unsignedToSigned(
      this.unsignedByteToInt(b0) + ((this.unsignedByteToInt(b1) & 0x0f) << 8),
      12
    );
    const exponent = this.unsignedToSigned(this.unsignedByteToInt(b1) >> 4, 4);
    return mantissa * Math.pow(10, exponent);
  }

  async read() {
    if (this.selectedDevice) {
      await this.requestAllRecords(this.selectedDevice.device.deviceId);
    }
  }

  async disconnect() {
    if (this.selectedDevice) {
      const deviceId = this.selectedDevice.device.deviceId;
      await BleClient.stopNotifications(deviceId, this.GLUCOSE_SERVICE, this.RECORDS_CHARACTERISTIC);
      await BleClient.stopNotifications(deviceId, this.GLUCOSE_SERVICE, this.GLUCOSE_CHARACTERISTIC);
      await BleClient.stopNotifications(deviceId, this.GLUCOSE_SERVICE, this.CONTEXT_CHARACTERISTIC);
      await BleClient.disconnect(deviceId);
      this.selectedDevice = null;
      this.manufacturer = '';
      // Keep the readings in allReadings array
    }
  }

  private onDisconnect(deviceId: string) {
    console.log(`Device ${deviceId} disconnected`);
    this.ngZone.run(() => {
      this.selectedDevice = null;
      this.manufacturer = '';
      // Keep the readings in allReadings array
    });
  }

  async initializeBluetooth() {
    //await this.requestPermissions();
    await BleClient.initialize();
  }

  showResults() {
    // In a real app, you might want to display this in the UI instead of an alert
    alert(this.results);
    this.results = '';
  }
}
