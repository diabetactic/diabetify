/**
 * TrendsPage Integration Tests
 *
 * Pruebas de integración para la página de tendencias que verifica:
 * 1. Carga de estadísticas para diferentes períodos (semana, mes, todos)
 * 2. Actualización de datos del gráfico según estadísticas
 * 3. Manejo de errores en carga de datos
 * 4. Formateo de valores de porcentaje
 * 5. Renderizado de gráfico de tiempo en rango
 * 6. Visualización de glucosa promedio
 * 7. Estados de carga
 * 8. Estado de datos vacíos
 *
 * Flujo: Cargar estadísticas -> Actualizar gráfico -> Mostrar datos
 */

// Inicializar entorno TestBed para Vitest
import '../../../../test-setup';

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi, type Mock } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { TrendsPage } from '../../../trends/trends.page';
import { ReadingsService } from '@core/services/readings.service';
import { GlucoseStatistics } from '@core/models/glucose-reading.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

describe('TrendsPage Integration Tests', () => {
  let component: TrendsPage;
  let fixture: ComponentFixture<TrendsPage>;
  let mockReadingsService: {
    getStatistics: Mock;
  };
  let mockTranslateService: {
    instant: Mock;
    use: Mock;
    get: Mock;
    currentLang: string;
    onLangChange: any;
    onTranslationChange: any;
    onDefaultLangChange: any;
  };

  const createMockStatistics = (overrides?: Partial<GlucoseStatistics>): GlucoseStatistics => ({
    average: 145,
    median: 142,
    standardDeviation: 35,
    coefficientOfVariation: 24,
    timeInRange: 65,
    timeAboveRange: 25,
    timeBelowRange: 10,
    totalReadings: 150,
    estimatedA1C: 6.8,
    gmi: 6.8,
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock ReadingsService
    mockReadingsService = {
      getStatistics: vi.fn(),
    };

    // Mock TranslateService
    mockTranslateService = {
      instant: vi.fn((key: string) => key),
      use: vi.fn().mockReturnValue(Promise.resolve()),
      get: vi.fn((key: string) => ({
        subscribe: (fn: (value: string) => void) => {
          fn(key);
          return { unsubscribe: vi.fn() };
        },
      })),
      currentLang: 'es',
      onLangChange: { subscribe: vi.fn() },
      onTranslationChange: { subscribe: vi.fn() },
      onDefaultLangChange: { subscribe: vi.fn() },
    };

    await TestBed.configureTestingModule({
      imports: [TrendsPage, TranslateModule.forRoot()],
      providers: [
        { provide: ReadingsService, useValue: mockReadingsService },
        { provide: TranslateService, useValue: mockTranslateService },
        provideCharts(withDefaultRegisterables()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrendsPage);
    component = fixture.componentInstance;
  });

  describe('Carga de Estadísticas', () => {
    it('debe cargar estadísticas de la semana por defecto al inicializar', async () => {
      const weekStats = createMockStatistics({
        timeInRange: 70,
        timeAboveRange: 20,
        timeBelowRange: 10,
      });

      mockReadingsService.getStatistics.mockResolvedValue(weekStats);

      await component.ngOnInit();

      expect(mockReadingsService.getStatistics).toHaveBeenCalledWith('week');
      expect(component.statistics()).toEqual(weekStats);
      expect(component.loading()).toBe(false);
    });

    it('debe actualizar estadísticas al cambiar a período mes', async () => {
      const weekStats = createMockStatistics();
      const monthStats = createMockStatistics({
        average: 155,
        timeInRange: 60,
        timeAboveRange: 30,
        timeBelowRange: 10,
        totalReadings: 850,
      });

      mockReadingsService.getStatistics
        .mockResolvedValueOnce(weekStats)
        .mockResolvedValueOnce(monthStats);

      // Cargar estadísticas iniciales
      await component.ngOnInit();

      // Cambiar a período mes
      const event = { detail: { value: 'month' } };
      await component.onPeriodChange(event);

      expect(mockReadingsService.getStatistics).toHaveBeenCalledWith('month');
      expect(component.selectedPeriod()).toBe('month');
      expect(component.statistics()).toEqual(monthStats);
    });

    it('debe actualizar estadísticas al cambiar a período todos los tiempos', async () => {
      const weekStats = createMockStatistics();
      const allTimeStats = createMockStatistics({
        average: 150,
        timeInRange: 68,
        timeAboveRange: 22,
        timeBelowRange: 10,
        totalReadings: 5000,
      });

      mockReadingsService.getStatistics
        .mockResolvedValueOnce(weekStats)
        .mockResolvedValueOnce(allTimeStats);

      await component.ngOnInit();

      // Cambiar a todos los tiempos
      const event = { detail: { value: 'all' } };
      await component.onPeriodChange(event);

      expect(mockReadingsService.getStatistics).toHaveBeenCalledWith('all');
      expect(component.selectedPeriod()).toBe('all');
      expect(component.statistics()).toEqual(allTimeStats);
    });
  });

  describe('Actualización de Datos del Gráfico', () => {
    it('debe reflejar porcentajes en los datos del gráfico', async () => {
      const stats = createMockStatistics({
        timeInRange: 65,
        timeAboveRange: 25,
        timeBelowRange: 10,
      });

      mockReadingsService.getStatistics.mockResolvedValue(stats);

      await component.ngOnInit();

      expect(component.doughnutChartData.datasets[0].data).toEqual([65, 25, 10]);
      expect(component.doughnutChartData.labels).toEqual(['In Range', 'Above Range', 'Below Range']);
    });

    it('debe actualizar gráfico cuando cambian las estadísticas', async () => {
      const weekStats = createMockStatistics({
        timeInRange: 70,
        timeAboveRange: 20,
        timeBelowRange: 10,
      });
      const monthStats = createMockStatistics({
        timeInRange: 60,
        timeAboveRange: 30,
        timeBelowRange: 10,
      });

      mockReadingsService.getStatistics
        .mockResolvedValueOnce(weekStats)
        .mockResolvedValueOnce(monthStats);

      await component.ngOnInit();
      expect(component.doughnutChartData.datasets[0].data).toEqual([70, 20, 10]);

      const event = { detail: { value: 'month' } };
      await component.onPeriodChange(event);
      expect(component.doughnutChartData.datasets[0].data).toEqual([60, 30, 10]);
    });

    it('debe mantener colores consistentes del gráfico', async () => {
      const stats = createMockStatistics();
      mockReadingsService.getStatistics.mockResolvedValue(stats);

      await component.ngOnInit();

      const dataset = component.doughnutChartData.datasets[0];
      expect(dataset.backgroundColor).toEqual(['#22c55e', '#fbbf24', '#ef4444']);
      expect(dataset.hoverBackgroundColor).toEqual(['#16a34a', '#f59e0b', '#dc2626']);
      expect(dataset.borderWidth).toBe(0);
    });
  });

  describe('Renderizado de Gráfico de Tiempo en Rango', () => {
    it('debe configurar el gráfico como tipo doughnut', async () => {
      const stats = createMockStatistics();
      mockReadingsService.getStatistics.mockResolvedValue(stats);

      await component.ngOnInit();

      expect(component.doughnutChartType).toBe('doughnut');
    });

    it('debe configurar opciones de gráfico responsivo', async () => {
      const stats = createMockStatistics();
      mockReadingsService.getStatistics.mockResolvedValue(stats);

      await component.ngOnInit();

      expect(component.doughnutChartOptions?.responsive).toBe(true);
      expect(component.doughnutChartOptions?.maintainAspectRatio).toBe(true);
    });

    it('debe configurar leyenda en la parte inferior', async () => {
      const stats = createMockStatistics();
      mockReadingsService.getStatistics.mockResolvedValue(stats);

      await component.ngOnInit();

      const legendOptions = component.doughnutChartOptions?.plugins?.legend;
      expect(legendOptions?.display).toBe(true);
      expect(legendOptions?.position).toBe('bottom');
    });
  });

  describe('Formateo de Valores de Porcentaje', () => {
    it('debe formatear tooltips con un decimal', async () => {
      const stats = createMockStatistics({
        timeInRange: 65.5,
        timeAboveRange: 24.3,
        timeBelowRange: 10.2,
      });

      mockReadingsService.getStatistics.mockResolvedValue(stats);

      await component.ngOnInit();

      const tooltipCallback = component.doughnutChartOptions?.plugins?.tooltip?.callbacks?.label;
      expect(tooltipCallback).toBeDefined();

      if (tooltipCallback) {
        const mockContext = {
          label: 'In Range',
          parsed: 65.5,
        };
        const result = tooltipCallback(mockContext as any);
        expect(result).toBe('In Range: 65.5%');
      }
    });

    it('debe manejar valores enteros en tooltips', async () => {
      const stats = createMockStatistics({
        timeInRange: 70,
        timeAboveRange: 20,
        timeBelowRange: 10,
      });

      mockReadingsService.getStatistics.mockResolvedValue(stats);

      await component.ngOnInit();

      const tooltipCallback = component.doughnutChartOptions?.plugins?.tooltip?.callbacks?.label;

      if (tooltipCallback) {
        const mockContext = {
          label: 'Above Range',
          parsed: 20,
        };
        const result = tooltipCallback(mockContext as any);
        expect(result).toBe('Above Range: 20.0%');
      }
    });
  });

  describe('Visualización de Glucosa Promedio', () => {
    it('debe exponer el valor de glucosa promedio en las estadísticas', async () => {
      const stats = createMockStatistics({
        average: 145,
      });

      mockReadingsService.getStatistics.mockResolvedValue(stats);

      await component.ngOnInit();

      expect(component.statistics()?.average).toBe(145);
    });

    it('debe actualizar glucosa promedio al cambiar período', async () => {
      const weekStats = createMockStatistics({ average: 145 });
      const monthStats = createMockStatistics({ average: 155 });

      mockReadingsService.getStatistics
        .mockResolvedValueOnce(weekStats)
        .mockResolvedValueOnce(monthStats);

      await component.ngOnInit();
      expect(component.statistics()?.average).toBe(145);

      const event = { detail: { value: 'month' } };
      await component.onPeriodChange(event);
      expect(component.statistics()?.average).toBe(155);
    });
  });

  describe('Estados de Carga', () => {
    it('debe establecer loading=true durante la carga inicial', async () => {
      const stats = createMockStatistics();
      let resolvePromise: (value: GlucoseStatistics) => void;
      const promise = new Promise<GlucoseStatistics>((resolve) => {
        resolvePromise = resolve;
      });

      mockReadingsService.getStatistics.mockReturnValue(promise);

      const initPromise = component.ngOnInit();

      // Verificar que está cargando
      expect(component.loading()).toBe(true);

      // Resolver la promesa
      resolvePromise!(stats);
      await initPromise;

      // Verificar que terminó de cargar
      expect(component.loading()).toBe(false);
    });

    it('debe establecer loading=true al cambiar período', async () => {
      const weekStats = createMockStatistics();
      const monthStats = createMockStatistics();

      let resolveMonthPromise: (value: GlucoseStatistics) => void;
      const monthPromise = new Promise<GlucoseStatistics>((resolve) => {
        resolveMonthPromise = resolve;
      });

      mockReadingsService.getStatistics
        .mockResolvedValueOnce(weekStats)
        .mockReturnValue(monthPromise);

      await component.ngOnInit();
      expect(component.loading()).toBe(false);

      // Cambiar período
      const event = { detail: { value: 'month' } };
      const changePromise = component.onPeriodChange(event);

      // Verificar que está cargando
      expect(component.loading()).toBe(true);

      // Resolver la promesa
      resolveMonthPromise!(monthStats);
      await changePromise;

      // Verificar que terminó de cargar
      expect(component.loading()).toBe(false);
    });

    it('debe establecer loading=false después de error', async () => {
      mockReadingsService.getStatistics.mockRejectedValue(new Error('Network error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.ngOnInit();

      expect(component.loading()).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load statistics:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Manejo de Errores', () => {
    it('debe manejar error de carga de estadísticas', async () => {
      const error = new Error('Failed to fetch statistics');
      mockReadingsService.getStatistics.mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.ngOnInit();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load statistics:', error);
      expect(component.loading()).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('debe manejar error de red durante cambio de período', async () => {
      const weekStats = createMockStatistics();
      const networkError = new Error('Network timeout');

      mockReadingsService.getStatistics
        .mockResolvedValueOnce(weekStats)
        .mockRejectedValueOnce(networkError);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.ngOnInit();
      expect(component.statistics()).toEqual(weekStats);

      const event = { detail: { value: 'month' } };
      await component.onPeriodChange(event);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load statistics:', networkError);
      expect(component.loading()).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('debe mantener estadísticas previas si la nueva carga falla', async () => {
      const weekStats = createMockStatistics({ timeInRange: 70 });
      const error = new Error('Server error');

      mockReadingsService.getStatistics
        .mockResolvedValueOnce(weekStats)
        .mockRejectedValueOnce(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.ngOnInit();
      const initialStats = component.statistics();

      const event = { detail: { value: 'month' } };
      await component.onPeriodChange(event);

      // Las estadísticas deben permanecer igual
      expect(component.statistics()).toEqual(initialStats);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Estado de Datos Vacíos', () => {
    it('debe manejar estadísticas con cero lecturas', async () => {
      const emptyStats = createMockStatistics({
        totalReadings: 0,
        average: 0,
        timeInRange: 0,
        timeAboveRange: 0,
        timeBelowRange: 0,
      });

      mockReadingsService.getStatistics.mockResolvedValue(emptyStats);

      await component.ngOnInit();

      expect(component.statistics()?.totalReadings).toBe(0);
      expect(component.doughnutChartData.datasets[0].data).toEqual([0, 0, 0]);
    });

    it('debe inicializar con statistics=null antes de cargar', () => {
      expect(component.statistics()).toBeNull();
    });

    it('debe actualizar statistics de null a datos después de cargar', async () => {
      const stats = createMockStatistics();
      mockReadingsService.getStatistics.mockResolvedValue(stats);

      expect(component.statistics()).toBeNull();

      await component.ngOnInit();

      expect(component.statistics()).toEqual(stats);
    });
  });
});
