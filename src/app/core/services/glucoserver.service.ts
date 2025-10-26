import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Glucose reading interface for Glucoserver API
 */
export interface GlucoseReading {
  id?: string;
  userId: string;
  value: number;
  unit: 'mg/dL' | 'mmol/L';
  timestamp: string;
  type?: 'smbg' | 'cbg' | 'cgm';
  mealTag?: 'before_meal' | 'after_meal' | 'fasting';
  notes?: string;
  deviceId?: string;
  synced?: boolean;
}

/**
 * Glucose statistics response from Glucoserver
 */
export interface GlucoseStatistics {
  average: number;
  median: number;
  standardDeviation: number;
  coefficient_of_variation: number;
  hba1c_estimate: number;
  gmi: number;
  timeInRange: {
    low: number;
    normal: number;
    high: number;
    veryHigh: number;
  };
  readingsCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class GlucoserverService {
  private readonly baseUrl: string;
  private readonly apiPath: string;
  private readonly fullUrl: string;

  constructor(private http: HttpClient) {
    const config = environment.backendServices.glucoserver;
    this.baseUrl = config.baseUrl;
    this.apiPath = config.apiPath;
    this.fullUrl = `${this.baseUrl}${this.apiPath}`;
  }

  /**
   * Get all glucose readings for the current user
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @param limit - Maximum number of results
   * @param offset - Pagination offset
   */
  getReadings(
    startDate?: Date,
    endDate?: Date,
    limit = 100,
    offset = 0
  ): Observable<GlucoseReading[]> {
    let params = new HttpParams().set('limit', limit.toString()).set('offset', offset.toString());

    if (startDate) {
      params = params.set('start_date', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('end_date', endDate.toISOString());
    }

    return this.http
      .get<GlucoseReading[]>(`${this.fullUrl}/readings`, { params })
      .pipe(retry(2), catchError(this.handleError));
  }

  /**
   * Get a single glucose reading by ID
   */
  getReading(id: string): Observable<GlucoseReading> {
    return this.http
      .get<GlucoseReading>(`${this.fullUrl}/readings/${id}`)
      .pipe(retry(2), catchError(this.handleError));
  }

  /**
   * Create a new glucose reading
   */
  createReading(reading: Omit<GlucoseReading, 'id'>): Observable<GlucoseReading> {
    return this.http
      .post<GlucoseReading>(`${this.fullUrl}/readings`, reading)
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Update an existing glucose reading
   */
  updateReading(id: string, reading: Partial<GlucoseReading>): Observable<GlucoseReading> {
    return this.http
      .put<GlucoseReading>(`${this.fullUrl}/readings/${id}`, reading)
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Delete a glucose reading
   */
  deleteReading(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.fullUrl}/readings/${id}`)
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Bulk upload glucose readings
   */
  bulkUpload(readings: Omit<GlucoseReading, 'id'>[]): Observable<GlucoseReading[]> {
    return this.http
      .post<GlucoseReading[]>(`${this.fullUrl}/readings/bulk`, { readings })
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Get glucose statistics for a date range
   */
  getStatistics(startDate: Date, endDate: Date): Observable<GlucoseStatistics> {
    const params = new HttpParams()
      .set('start_date', startDate.toISOString())
      .set('end_date', endDate.toISOString());

    return this.http
      .get<GlucoseStatistics>(`${this.fullUrl}/statistics`, { params })
      .pipe(retry(2), catchError(this.handleError));
  }

  /**
   * Get glucose trends data for charting
   */
  getTrends(period: 'day' | 'week' | 'month' | 'year', date?: Date): Observable<any> {
    const params = new HttpParams()
      .set('period', period)
      .set('date', (date || new Date()).toISOString());

    return this.http
      .get(`${this.fullUrl}/trends`, { params })
      .pipe(retry(2), catchError(this.handleError));
  }

  /**
   * Export glucose data as CSV or PDF
   */
  exportData(format: 'csv' | 'pdf', startDate: Date, endDate: Date): Observable<Blob> {
    const params = new HttpParams()
      .set('format', format)
      .set('start_date', startDate.toISOString())
      .set('end_date', endDate.toISOString());

    return this.http
      .get(`${this.fullUrl}/export`, {
        params,
        responseType: 'blob',
      })
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Sync local readings with the server
   */
  syncReadings(localReadings: GlucoseReading[]): Observable<{
    synced: number;
    failed: number;
    conflicts: GlucoseReading[];
  }> {
    return this.http.post<any>(`${this.fullUrl}/sync`, { readings: localReadings }).pipe(
      retry(1),
      map(response => ({
        synced: response.synced || 0,
        failed: response.failed || 0,
        conflicts: response.conflicts || [],
      })),
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;

      if (error.status === 401) {
        errorMessage = 'Unauthorized. Please log in again.';
      } else if (error.status === 404) {
        errorMessage = 'Resource not found.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    }

    console.error('GlucoserverService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
