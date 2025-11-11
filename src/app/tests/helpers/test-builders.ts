/**
 * Test Data Builders for Integration Tests
 * Provides builder pattern utilities for creating test data
 */

import { LocalGlucoseReading, GlucoseStatistics } from '../../core/models';

/**
 * Test-only profile type for integration tests
 */
export interface LocalProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  diagnosisDate?: string;
  diabetesType?: 'type1' | 'type2' | 'gestational' | 'other';
  treatmentType?: 'insulin' | 'medication' | 'lifestyle' | 'other';
  glucoseUnit?: 'mg/dL' | 'mmol/L';
  targetGlucoseMin?: number;
  targetGlucoseMax?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Test-only device type for integration tests
 */
export interface TidepoolDevice {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber?: string;
  hardwareVersion?: string;
  softwareVersion?: string;
  createdAt: string;
  lastUploadDate?: string;
  deviceTime?: string;
  firmwareVersion?: string;
}

/**
 * Base Builder class
 */
export abstract class TestBuilder<T> {
  protected object: Partial<T> = {};

  abstract build(): T;

  reset(): this {
    this.object = {};
    return this;
  }
}

/**
 * Glucose Reading Builder
 */
export class GlucoseReadingBuilder extends TestBuilder<LocalGlucoseReading> {
  constructor() {
    super();
    // Set sensible defaults (CBG reading)
    this.object = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'cbg',
      time: new Date().toISOString(),
      value: 95,
      units: 'mg/dL',
      notes: [],
      synced: false,
    };
  }

  withId(id: string): this {
    this.object.id = id;
    return this;
  }

  withValue(value: number): this {
    this.object.value = value;
    return this;
  }

  withUnits(units: 'mg/dL' | 'mmol/L'): this {
    this.object.units = units;
    return this;
  }

  withTimestamp(timestamp: string | Date): this {
    this.object.time = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
    return this;
  }

  withSource(source: 'cbg' | 'smbg'): this {
    this.object.type = source;
    return this;
  }

  withNotes(notes: string): this {
    this.object.notes = [notes];
    return this;
  }

  withSynced(synced: boolean): this {
    this.object.synced = synced;
    return this;
  }

  asHigh(): this {
    this.object.value = 250;
    return this;
  }

  asLow(): this {
    this.object.value = 65;
    return this;
  }

  asNormal(): this {
    this.object.value = 95;
    return this;
  }

  build(): LocalGlucoseReading {
    return this.object as LocalGlucoseReading;
  }

  buildMany(
    count: number,
    modifier?: (builder: GlucoseReadingBuilder, index: number) => void
  ): LocalGlucoseReading[] {
    const readings: LocalGlucoseReading[] = [];
    const baseTimestamp = Date.now();

    for (let i = 0; i < count; i++) {
      const builder = new GlucoseReadingBuilder()
        .withId(`local_${baseTimestamp + i}_${Math.random().toString(36).substr(2, 9)}`)
        .withTimestamp(new Date(baseTimestamp - i * 3600000)); // 1 hour apart

      if (modifier) {
        modifier(builder, i);
      }

      readings.push(builder.build());
    }

    return readings;
  }
}

/**
 * Profile Builder
 */
export class ProfileBuilder extends TestBuilder<LocalProfile> {
  constructor() {
    super();
    this.object = {
      id: 'test_user_id',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      diagnosisDate: '2020-01-01',
      diabetesType: 'type1',
      treatmentType: 'insulin',
      glucoseUnit: 'mg/dL',
      targetGlucoseMin: 70,
      targetGlucoseMax: 180,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  withId(id: string): this {
    this.object.id = id;
    return this;
  }

  withEmail(email: string): this {
    this.object.email = email;
    return this;
  }

  withName(firstName: string, lastName: string): this {
    this.object.firstName = firstName;
    this.object.lastName = lastName;
    return this;
  }

  withDiabetesType(type: 'type1' | 'type2' | 'gestational' | 'other'): this {
    this.object.diabetesType = type;
    return this;
  }

  withGlucoseTargets(min: number, max: number): this {
    this.object.targetGlucoseMin = min;
    this.object.targetGlucoseMax = max;
    return this;
  }

  withGlucoseUnit(unit: 'mg/dL' | 'mmol/L'): this {
    this.object.glucoseUnit = unit;
    return this;
  }

  withTreatmentType(type: 'insulin' | 'medication' | 'lifestyle' | 'other'): this {
    this.object.treatmentType = type;
    return this;
  }

  build(): LocalProfile {
    return this.object as LocalProfile;
  }
}

/**
 * Statistics Builder
 */
export class StatisticsBuilder extends TestBuilder<GlucoseStatistics> {
  constructor() {
    super();
    this.object = {
      average: 120,
      median: 115,
      standardDeviation: 25,
      coefficientOfVariation: 0.21,
      timeInRange: 75,
      timeAboveRange: 15,
      timeBelowRange: 10,
    };
  }

  withAverage(value: number): this {
    this.object.average = value;
    return this;
  }

  withMedian(median: number): this {
    this.object.median = median;
    return this;
  }

  withTimeInRange(tir: number, above: number, below: number): this {
    this.object.timeInRange = tir;
    this.object.timeAboveRange = above;
    this.object.timeBelowRange = below;
    return this;
  }

  build(): GlucoseStatistics {
    return this.object as GlucoseStatistics;
  }
}

/**
 * Tidepool Device Builder
 */
export class DeviceBuilder extends TestBuilder<TidepoolDevice> {
  constructor() {
    super();
    this.object = {
      id: 'device_123',
      serialNumber: 'SN123456',
      manufacturer: 'Dexcom',
      model: 'G6',
      lastUploadDate: new Date().toISOString(),
      deviceTime: new Date().toISOString(),
      firmwareVersion: '1.0.0',
      hardwareVersion: '2.0.0',
    };
  }

  withId(id: string): this {
    this.object.id = id;
    return this;
  }

  withManufacturer(manufacturer: string, model: string): this {
    this.object.manufacturer = manufacturer;
    this.object.model = model;
    return this;
  }

  withLastUpload(date: string | Date): this {
    this.object.lastUploadDate = typeof date === 'string' ? date : date.toISOString();
    return this;
  }

  asDexcomG6(): this {
    return this.withManufacturer('Dexcom', 'G6');
  }

  asFreestyleLibre(): this {
    return this.withManufacturer('Abbott', 'Freestyle Libre');
  }

  asMedtronic(): this {
    return this.withManufacturer('Medtronic', '670G');
  }

  build(): TidepoolDevice {
    return this.object as TidepoolDevice;
  }
}

/**
 * Appointment Builder
 */
export class AppointmentBuilder extends TestBuilder<any> {
  constructor() {
    super();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

    this.object = {
      id: 'appt_123',
      patientId: 'patient_123',
      providerId: 'provider_123',
      dateTime: futureDate.toISOString(),
      duration: 30,
      type: 'follow-up',
      status: 'scheduled',
      notes: '',
      videoCallUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  withId(id: string): this {
    this.object['id'] = id;
    return this;
  }

  withDateTime(date: Date | string): this {
    this.object['dateTime'] = typeof date === 'string' ? date : date.toISOString();
    return this;
  }

  withDuration(minutes: number): this {
    this.object['duration'] = minutes;
    return this;
  }

  withType(type: 'initial' | 'follow-up' | 'emergency' | 'routine'): this {
    this.object['type'] = type;
    return this;
  }

  withStatus(status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'): this {
    this.object['status'] = status;
    return this;
  }

  withVideoCall(url: string): this {
    this.object['videoCallUrl'] = url;
    return this;
  }

  asUpcoming(): this {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.withDateTime(tomorrow).withStatus('confirmed');
  }

  asPast(): this {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.withDateTime(yesterday).withStatus('completed');
  }

  asInProgress(): this {
    return this.withDateTime(new Date())
      .withStatus('in-progress')
      .withVideoCall('https://meet.example.com/room123');
  }

  build(): any {
    return this.object;
  }
}

/**
 * Factory functions for common test scenarios
 */
export class TestDataFactory {
  static createReadingsForTimeRange(
    startDate: Date,
    endDate: Date,
    intervalHours = 4
  ): LocalGlucoseReading[] {
    const readings: LocalGlucoseReading[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const builder = new GlucoseReadingBuilder()
        .withTimestamp(current.toISOString())
        .withValue(this.randomGlucoseValue());

      readings.push(builder.build());
      current.setHours(current.getHours() + intervalHours);
    }

    return readings;
  }

  static createDailyPattern(): LocalGlucoseReading[] {
    const readings: LocalGlucoseReading[] = [];
    const patterns = [
      { hour: 6, value: 110 }, // Fasting
      { hour: 8, value: 140 }, // Post-breakfast
      { hour: 12, value: 95 }, // Pre-lunch
      { hour: 14, value: 160 }, // Post-lunch
      { hour: 18, value: 100 }, // Pre-dinner
      { hour: 20, value: 150 }, // Post-dinner
      { hour: 23, value: 120 }, // Bedtime
    ];

    const today = new Date();
    patterns.forEach(({ hour, value }) => {
      const timestamp = new Date(today);
      timestamp.setHours(hour, 0, 0, 0);

      readings.push(
        new GlucoseReadingBuilder()
          .withTimestamp(timestamp)
          .withValue(value + this.randomVariation())
          .build()
      );
    });

    return readings;
  }

  static createMixedStatusReadings(count = 10): LocalGlucoseReading[] {
    const statuses: Array<'high' | 'low' | 'normal'> = [];

    // Ensure we have at least one of each
    statuses.push('high', 'low', 'normal');

    // Fill the rest randomly
    for (let i = 3; i < count; i++) {
      const rand = Math.random();
      if (rand < 0.15) statuses.push('low');
      else if (rand < 0.35) statuses.push('high');
      else statuses.push('normal');
    }

    return statuses.map((status, index) => {
      const builder = new GlucoseReadingBuilder();
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - index);
      builder.withTimestamp(timestamp);

      switch (status) {
        case 'high':
          builder.asHigh();
          break;
        case 'low':
          builder.asLow();
          break;
        case 'normal':
          builder.asNormal();
          break;
      }

      return builder.build();
    });
  }

  private static randomGlucoseValue(): number {
    // Generate realistic glucose values with normal distribution
    const mean = 120;
    const stdDev = 30;
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const value = Math.round(mean + z0 * stdDev);

    // Clamp to realistic range
    return Math.max(40, Math.min(400, value));
  }

  private static randomVariation(): number {
    return Math.floor(Math.random() * 20) - 10; // ±10 variation
  }
}
