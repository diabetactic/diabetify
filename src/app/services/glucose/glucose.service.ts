import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GlucoseService {
  private readings: any[] = [];

  constructor() { }

  addReading(reading: any) {
    this.readings.unshift(reading);
  }

  getReadings() {
    return this.readings;
  }

  clearReadings() {
    this.readings = [];
  }
}
