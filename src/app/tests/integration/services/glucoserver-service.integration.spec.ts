/**
 * Glucoserver Service Integration Tests
 *
 * Pruebas de integración para GlucoserverService (API REST de lecturas de glucosa).
 * Verifica operaciones HTTP reales contra HttpTestingController sin mocks de servicio.
 *
 * COBERTURA (15 tests):
 *
 * GET /readings con paginación (3 tests):
 * 1. Obtener lecturas con limit/offset
 * 2. Filtrar por rango de fechas (startDate/endDate)
 * 3. Retry(2) en GET /readings en error transitorio
 *
 * POST /readings/bulk (2 tests):
 * 4. Subir múltiples lecturas en bulk
 * 5. Retry(1) en POST /bulk en error transitorio
 *
 * GET /statistics (2 tests):
 * 6. Obtener estadísticas con rango de fechas
 * 7. Validar estructura de timeInRange y HbA1c
 *
 * GET /trends (1 test):
 * 8. Obtener tendencias con period (day/week/month/year)
 *
 * DELETE /readings/{id} (2 tests):
 * 9. Eliminar lectura por ID
 * 10. Retry(1) en DELETE en error transitorio
 *
 * Export data (CSV/PDF) (2 tests):
 * 11. Exportar como CSV blob
 * 12. Exportar como PDF blob
 *
 * Sync local readings (1 test):
 * 13. Sincronizar lecturas locales con detección de conflictos
 *
 * Error handling (2 tests):
 * 14. Manejar 401 Unauthorized
 * 15. Manejar 404 Not Found
 */

// Inicializar entorno TestBed para Vitest
import '../../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { GlucoserverService, GlucoseReading, GlucoseStatistics } from '@core/services/glucoserver.service';

describe('Glucoserver Service Integration Tests', () => {
  let service: GlucoserverService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:8000/v1';

  beforeEach(() => {
    // Reset TestBed para evitar errores de instanciación
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GlucoserverService,
      ],
    });

    service = TestBed.inject(GlucoserverService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.clearAllMocks();
  });

  /**
   * Helper: Crear lectura de prueba
   */
  const createTestReading = (overrides?: Partial<GlucoseReading>): GlucoseReading => ({
    userId: 'test-user',
    value: 120,
    unit: 'mg/dL',
    timestamp: new Date().toISOString(),
    type: 'smbg',
    ...overrides,
  });

  describe('GET /readings con paginación', () => {
    it('should fetch readings with limit and offset', async () => {
      // ARRANGE
      const mockReadings: GlucoseReading[] = [
        createTestReading({ id: '1', value: 110 }),
        createTestReading({ id: '2', value: 130 }),
      ];
      let response: GlucoseReading[] | undefined;

      // ACT
      service.getReadings(undefined, undefined, 50, 10).subscribe(data => {
        response = data;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.includes('/readings'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('limit')).toBe('50');
      expect(req.request.params.get('offset')).toBe('10');
      req.flush(mockReadings);

      // ASSERT
      expect(response).toEqual(mockReadings);
      expect(response?.length).toBe(2);
    });

    it('should filter readings by date range with startDate and endDate', async () => {
      // ARRANGE
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');
      const mockReadings: GlucoseReading[] = [
        createTestReading({ id: '1', timestamp: '2024-01-15T10:00:00Z', value: 115 }),
      ];
      let response: GlucoseReading[] | undefined;

      // ACT
      service.getReadings(startDate, endDate, 100, 0).subscribe(data => {
        response = data;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.includes('/readings'));
      expect(req.request.params.get('start_date')).toBe(startDate.toISOString());
      expect(req.request.params.get('end_date')).toBe(endDate.toISOString());
      req.flush(mockReadings);

      // ASSERT
      expect(response).toEqual(mockReadings);
    });

    it('should retry GET /readings up to 2 times on transient error', async () => {
      // ARRANGE
      const mockReadings: GlucoseReading[] = [createTestReading({ id: '1' })];
      let response: GlucoseReading[] | undefined;

      // ACT
      service.getReadings().subscribe(data => {
        response = data;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // Primera petición falla
      const req1 = httpMock.expectOne(req => req.url.includes('/readings'));
      req1.flush('Network error', { status: 503, statusText: 'Service Unavailable' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Segunda petición falla (retry 1)
      const req2 = httpMock.expectOne(req => req.url.includes('/readings'));
      req2.flush('Network error', { status: 503, statusText: 'Service Unavailable' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Tercera petición exitosa (retry 2)
      const req3 = httpMock.expectOne(req => req.url.includes('/readings'));
      req3.flush(mockReadings);

      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(response).toEqual(mockReadings);
    });
  });

  describe('POST /readings/bulk', () => {
    it('should upload multiple readings in bulk', async () => {
      // ARRANGE
      const readingsToUpload: Omit<GlucoseReading, 'id'>[] = [
        createTestReading({ value: 110 }),
        createTestReading({ value: 140 }),
        createTestReading({ value: 125 }),
      ];
      const mockResponse: GlucoseReading[] = readingsToUpload.map((r, i) => ({ ...r, id: `bulk-${i}` }));
      let response: GlucoseReading[] | undefined;

      // ACT
      service.bulkUpload(readingsToUpload).subscribe(data => {
        response = data;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.includes('/readings/bulk'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ readings: readingsToUpload });
      req.flush(mockResponse);

      // ASSERT
      expect(response).toEqual(mockResponse);
      expect(response?.length).toBe(3);
    });

    it('should retry POST /bulk up to 1 time on transient error', async () => {
      // ARRANGE
      const readingsToUpload: Omit<GlucoseReading, 'id'>[] = [createTestReading()];
      const mockResponse: GlucoseReading[] = [{ ...readingsToUpload[0], id: 'bulk-1' }];
      let response: GlucoseReading[] | undefined;

      // ACT
      service.bulkUpload(readingsToUpload).subscribe(data => {
        response = data;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // Primera petición falla
      const req1 = httpMock.expectOne(req => req.url.includes('/readings/bulk'));
      req1.flush('Timeout', { status: 504, statusText: 'Gateway Timeout' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Segunda petición exitosa (retry 1)
      const req2 = httpMock.expectOne(req => req.url.includes('/readings/bulk'));
      req2.flush(mockResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(response).toEqual(mockResponse);
    });
  });

  describe('GET /statistics', () => {
    it('should fetch statistics with date range', async () => {
      // ARRANGE
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');
      const mockStats: GlucoseStatistics = {
        average: 125,
        median: 120,
        standardDeviation: 15,
        coefficient_of_variation: 0.12,
        hba1c_estimate: 6.2,
        gmi: 6.1,
        timeInRange: {
          low: 5,
          normal: 75,
          high: 15,
          veryHigh: 5,
        },
        readingsCount: 500,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
      let response: GlucoseStatistics | undefined;

      // ACT
      service.getStatistics(startDate, endDate).subscribe(data => {
        response = data;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.includes('/statistics'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('start_date')).toBe(startDate.toISOString());
      expect(req.request.params.get('end_date')).toBe(endDate.toISOString());
      req.flush(mockStats);

      // ASSERT
      expect(response).toEqual(mockStats);
    });

    it('should validate timeInRange structure and HbA1c estimate', async () => {
      // ARRANGE
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockStats: GlucoseStatistics = {
        average: 140,
        median: 135,
        standardDeviation: 20,
        coefficient_of_variation: 0.14,
        hba1c_estimate: 6.8,
        gmi: 6.7,
        timeInRange: {
          low: 10,
          normal: 65,
          high: 20,
          veryHigh: 5,
        },
        readingsCount: 1000,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
      let response: GlucoseStatistics | undefined;

      // ACT
      service.getStatistics(startDate, endDate).subscribe(data => {
        response = data;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.includes('/statistics'));
      req.flush(mockStats);

      // ASSERT
      expect(response?.timeInRange.low).toBe(10);
      expect(response?.timeInRange.normal).toBe(65);
      expect(response?.timeInRange.high).toBe(20);
      expect(response?.timeInRange.veryHigh).toBe(5);
      expect(response?.hba1c_estimate).toBe(6.8);
      expect(response?.gmi).toBe(6.7);
    });
  });

  describe('GET /trends', () => {
    it('should fetch trends with period handling (day/week/month/year)', async () => {
      // ARRANGE
      const testDate = new Date('2024-06-15T12:00:00Z');
      const mockTrends = {
        period: 'week',
        data: [
          { date: '2024-06-09', average: 120 },
          { date: '2024-06-10', average: 125 },
          { date: '2024-06-11', average: 118 },
        ],
      };
      let response: Record<string, unknown> | undefined;

      // ACT
      service.getTrends('week', testDate).subscribe(data => {
        response = data;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.includes('/trends'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('period')).toBe('week');
      expect(req.request.params.get('date')).toBe(testDate.toISOString());
      req.flush(mockTrends);

      // ASSERT
      expect(response).toEqual(mockTrends);
      expect(response?.period).toBe('week');
    });
  });

  describe('DELETE /readings/{id}', () => {
    it('should delete reading by ID', async () => {
      // ARRANGE
      const readingId = 'reading-123';
      let completed = false;

      // ACT
      service.deleteReading(readingId).subscribe(() => {
        completed = true;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.includes(`/readings/${readingId}`));
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      // ASSERT
      expect(completed).toBe(true);
    });

    it('should retry DELETE up to 1 time on transient error', async () => {
      // ARRANGE
      const readingId = 'reading-456';
      let completed = false;

      // ACT
      service.deleteReading(readingId).subscribe(() => {
        completed = true;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // Primera petición falla
      const req1 = httpMock.expectOne(req => req.url.includes(`/readings/${readingId}`));
      req1.flush('Timeout', { status: 504, statusText: 'Gateway Timeout' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Segunda petición exitosa (retry 1)
      const req2 = httpMock.expectOne(req => req.url.includes(`/readings/${readingId}`));
      req2.flush(null);

      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(completed).toBe(true);
    });
  });

  describe('Export data (CSV/PDF blob)', () => {
    it('should export data as CSV blob', async () => {
      // ARRANGE
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockCsvBlob = new Blob(['id,value,timestamp\n1,120,2024-01-15T10:00:00Z'], { type: 'text/csv' });
      let response: Blob | undefined;

      // ACT
      service.exportData('csv', startDate, endDate).subscribe(data => {
        response = data;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.includes('/export'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('format')).toBe('csv');
      expect(req.request.params.get('start_date')).toBe(startDate.toISOString());
      expect(req.request.params.get('end_date')).toBe(endDate.toISOString());
      expect(req.request.responseType).toBe('blob');
      req.flush(mockCsvBlob);

      // ASSERT
      expect(response).toBeInstanceOf(Blob);
      expect(response?.type).toBe('text/csv');
    });

    it('should export data as PDF blob', async () => {
      // ARRANGE
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockPdfBlob = new Blob(['%PDF-1.4...'], { type: 'application/pdf' });
      let response: Blob | undefined;

      // ACT
      service.exportData('pdf', startDate, endDate).subscribe(data => {
        response = data;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.includes('/export'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('format')).toBe('pdf');
      expect(req.request.responseType).toBe('blob');
      req.flush(mockPdfBlob);

      // ASSERT
      expect(response).toBeInstanceOf(Blob);
      expect(response?.type).toBe('application/pdf');
    });
  });

  describe('Sync local readings con detección de conflictos', () => {
    it('should sync local readings and detect conflicts', async () => {
      // ARRANGE
      const localReadings: GlucoseReading[] = [
        createTestReading({ id: 'local-1', value: 110, synced: false }),
        createTestReading({ id: 'local-2', value: 145, synced: false }),
        createTestReading({ id: 'conflict-1', value: 120, synced: false }),
      ];
      const mockSyncResponse = {
        synced: 2,
        failed: 1,
        conflicts: [
          createTestReading({ id: 'conflict-1', value: 130 }), // Valor diferente en servidor
        ],
      };
      let response:
        | {
            synced: number;
            failed: number;
            conflicts: GlucoseReading[];
          }
        | undefined;

      // ACT
      service.syncReadings(localReadings).subscribe(data => {
        response = data;
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne(req => req.url.includes('/sync'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ readings: localReadings });
      req.flush(mockSyncResponse);

      // ASSERT
      expect(response?.synced).toBe(2);
      expect(response?.failed).toBe(1);
      expect(response?.conflicts.length).toBe(1);
      expect(response?.conflicts[0].id).toBe('conflict-1');
      expect(response?.conflicts[0].value).toBe(130);
    });
  });

  describe('Error handling', () => {
    it('should handle 401 Unauthorized error', async () => {
      // ARRANGE
      let errorCaught: Error | undefined;

      // ACT
      service.getReadings().subscribe({
        next: () => {},
        error: err => {
          errorCaught = err;
        },
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // El retry operator de RxJS reintentalos TODOS los errores (incluyendo 4xx)
      // Por lo tanto, getReadings() con retry(2) reintentará 3 veces
      const req1 = httpMock.expectOne(req => req.url.includes('/readings'));
      req1.flush({ message: 'Unauthorized access' }, { status: 401, statusText: 'Unauthorized' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const req2 = httpMock.expectOne(req => req.url.includes('/readings'));
      req2.flush({ message: 'Unauthorized access' }, { status: 401, statusText: 'Unauthorized' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const req3 = httpMock.expectOne(req => req.url.includes('/readings'));
      req3.flush({ message: 'Unauthorized access' }, { status: 401, statusText: 'Unauthorized' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(errorCaught).toBeDefined();
      expect(errorCaught?.message).toContain('Unauthorized');
    });

    it('should handle 404 Not Found error', async () => {
      // ARRANGE
      const readingId = 'non-existent-reading';
      let errorCaught: Error | undefined;

      // ACT
      service.getReading(readingId).subscribe({
        next: () => {},
        error: err => {
          errorCaught = err;
        },
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      // getReading() también tiene retry(2), así que reintentará 3 veces
      const req1 = httpMock.expectOne(req => req.url.includes(`/readings/${readingId}`));
      req1.flush({ message: 'Reading not found' }, { status: 404, statusText: 'Not Found' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const req2 = httpMock.expectOne(req => req.url.includes(`/readings/${readingId}`));
      req2.flush({ message: 'Reading not found' }, { status: 404, statusText: 'Not Found' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const req3 = httpMock.expectOne(req => req.url.includes(`/readings/${readingId}`));
      req3.flush({ message: 'Reading not found' }, { status: 404, statusText: 'Not Found' });

      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(errorCaught).toBeDefined();
      expect(errorCaught?.message).toContain('Resource not found');
    });
  });
});
