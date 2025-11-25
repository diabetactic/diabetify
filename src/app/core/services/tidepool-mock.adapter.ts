/**
 * Tidepool Mock Adapter
 *
 * Provides mock Tidepool data for testing and development without requiring
 * actual Tidepool credentials or network access. Reads from JSON fixtures
 * and normalizes to LocalGlucoseReading format.
 *
 * Usage: Toggle via environment.features.useTidepoolMock flag
 */

import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { LocalGlucoseReading } from '../models/glucose-reading.model';

/**
 * Tidepool CGM data point (simplified schema)
 */
export interface TidepoolDataPoint {
  time: string; // ISO 8601
  value: number; // mg/dL or mmol/L
  type: 'cbg' | 'smbg'; // CGM or self-monitoring blood glucose
  units?: 'mg/dL' | 'mmol/L';
  uploadId?: string;
  deviceId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TidepoolMockAdapter {
  private readonly FIXTURE_PATH = 'assets/mocks/tidepool/readings_30d.json';
  private readonly MMOL_TO_MGDL = 18.0182;

  constructor(private http: HttpClient) {}

  /**
   * Fetch mock glucose data from fixture file
   * Simulates network delay for realistic testing
   *
   * @param startDate ISO 8601 start date
   * @param endDate ISO 8601 end date
   * @returns Observable of LocalGlucoseReading array
   */
  fetchGlucoseData(startDate: string, endDate: string): Observable<LocalGlucoseReading[]> {
    return this.http.get<TidepoolDataPoint[]>(this.FIXTURE_PATH).pipe(
      // Simulate network delay (500ms)
      delay(500),
      // Filter by date range
      map(data =>
        data.filter(reading => {
          const readingTime = new Date(reading.time).getTime();
          const start = new Date(startDate).getTime();
          const end = new Date(endDate).getTime();
          return readingTime >= start && readingTime <= end;
        })
      ),
      // Normalize to app DTO
      map(data => this.normalizeToAppDTO(data))
    );
  }

  /**
   * Normalize Tidepool data points to LocalGlucoseReading format
   *
   * @param tidepoolData Array of Tidepool data points
   * @returns Array of LocalGlucoseReading
   */
  normalizeToAppDTO(tidepoolData: TidepoolDataPoint[]): LocalGlucoseReading[] {
    return tidepoolData.map(item => {
      // Convert mmol/L to mg/dL if necessary
      let valueMgDl = item.value;
      if (item.units === 'mmol/L') {
        valueMgDl = item.value * this.MMOL_TO_MGDL;
      }

      const reading: LocalGlucoseReading = {
        id: `tidepool-${item.uploadId || item.deviceId || 'local'}-${item.time}`,
        type: item.type,
        time: item.time,
        value: Math.round(valueMgDl), // Round to integer
        units: 'mg/dL',
        notes: [item.type === 'cbg' ? 'CGM reading' : 'Manual SMBG'],
        synced: true,
        deviceId: item.deviceId,
        localStoredAt: new Date().toISOString(),
      } as LocalGlucoseReading;

      return reading;
    });
  }

  /**
   * Read fixture directly (for testing or seeding)
   *
   * @param fixtureName Name of fixture file (without extension)
   * @returns Observable of raw Tidepool data
   */
  readFixture(fixtureName: string): Observable<TidepoolDataPoint[]> {
    const path = `assets/mocks/tidepool/${fixtureName}.json`;
    return this.http.get<TidepoolDataPoint[]>(path).pipe(delay(500));
  }
}
