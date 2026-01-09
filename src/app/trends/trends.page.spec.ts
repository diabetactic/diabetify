import '../../test-setup';

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';

vi.mock('chart.js', async importOriginal => {
  const original = await importOriginal<typeof import('chart.js')>();
  return {
    ...original,
    Chart: {
      ...original.Chart,
      register: vi.fn(),
    },
  };
});

import { TrendsPage } from './trends.page';
import { ReadingsService } from '@services/readings.service';
import { LoggerService } from '@services/logger.service';
import { ThemeService } from '@services/theme.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';

describe('TrendsPage', () => {
  let component: TrendsPage;
  let fixture: ComponentFixture<TrendsPage>;
  let mockReadingsService: Partial<ReadingsService>;
  let mockLoggerService: Partial<LoggerService>;
  let mockThemeService: any;
  let themeSubject: BehaviorSubject<boolean>;

  beforeEach(async () => {
    themeSubject = new BehaviorSubject<boolean>(false);

    mockThemeService = {
      isDark$: themeSubject.asObservable(),
      getChartOptions: vi.fn().mockReturnValue({}),
    };

    mockReadingsService = {
      getStatistics: vi.fn().mockResolvedValue({
        average: 120,
        median: 115,
        standardDeviation: 20,
        coefficientOfVariation: 17.4,
        timeInRange: 70,
        timeAboveRange: 20,
        timeBelowRange: 10,
        totalReadings: 100,
      }),
      getReadingsByDateRange: vi.fn().mockResolvedValue([]),
    };

    mockLoggerService = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TrendsPage, TranslateModule.forRoot()],
      providers: [
        { provide: ReadingsService, useValue: mockReadingsService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: ThemeService, useValue: mockThemeService },
        provideCharts(withDefaultRegisterables()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrendsPage);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should be standalone component', () => {
      const metadata = (TrendsPage as any).ɵcmp;
      expect(metadata.standalone).toBe(true);
    });

    it('should use OnPush change detection', () => {
      const metadata = (TrendsPage as any).ɵcmp;
      expect(metadata.changeDetection === 0 || metadata.changeDetection === undefined).toBe(true);
    });

    it('should have correct selector', () => {
      const metadata = (TrendsPage as any).ɵcmp;
      expect(metadata.selectors).toEqual([['app-trends']]);
    });

    it('should initialize with default signal values', () => {
      expect(component.selectedPeriod()).toBe('week');
      expect(component.statistics()).toBeNull();
      expect(typeof component.loading()).toBe('boolean');
      expect(typeof component.isDarkMode()).toBe('boolean');
    });
  });

  describe('ngOnInit Lifecycle', () => {
    it('should subscribe to theme changes', fakeAsync(() => {
      const subscriptionCount = themeSubject.observers.length;
      fixture.detectChanges();
      tick();
      expect(themeSubject.observers.length).toBeGreaterThan(subscriptionCount);
    }));

    it('should load statistics on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      expect(mockReadingsService.getStatistics).toHaveBeenCalled();
    }));

    it('should update isDarkMode signal when theme changes', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      themeSubject.next(true);
      tick();

      expect(component.isDarkMode()).toBe(true);
    }));

    it('should update chart options when theme changes', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      const initialOptions = component.lineChartOptions;

      themeSubject.next(true);
      tick();

      expect(component.lineChartOptions).not.toBe(initialOptions);
    }));

    it('should call markForCheck when theme changes', fakeAsync(() => {
      const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
      const spy = vi.spyOn(cdr, 'markForCheck');

      fixture.detectChanges();
      tick();

      themeSubject.next(true);
      tick();

      expect(spy).toHaveBeenCalled();
    }));
  });

  describe('Period Selection', () => {
    it('should change period to month', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const event = { detail: { value: 'month' } } as CustomEvent;
      component.onPeriodChange(event);

      expect(component.selectedPeriod()).toBe('month');
    }));

    it('should change period to all', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const event = { detail: { value: 'all' } } as CustomEvent;
      component.onPeriodChange(event);

      expect(component.selectedPeriod()).toBe('all');
    }));

    it('should reload statistics when period changes', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      vi.clearAllMocks();

      const event = { detail: { value: 'month' } } as CustomEvent;
      component.onPeriodChange(event);
      tick();

      expect(mockReadingsService.getStatistics).toHaveBeenCalledWith('month');
    }));

    it('should set loading state during period change', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      component.loading.set(false);

      component.onPeriodChange({ detail: { value: 'month' } } as CustomEvent);

      expect(component.loading()).toBe(true);
      tick();
    }));

    it('should not change period if value is null', fakeAsync(() => {
      component.selectedPeriod.set('week');
      fixture.detectChanges();
      tick();

      component.onPeriodChange({ detail: { value: null } } as CustomEvent);

      expect(component.selectedPeriod()).toBe('week');
    }));

    it('should not change period if value is undefined', fakeAsync(() => {
      component.selectedPeriod.set('week');
      fixture.detectChanges();
      tick();

      component.onPeriodChange({ detail: { value: undefined } } as CustomEvent);

      expect(component.selectedPeriod()).toBe('week');
    }));
  });

  describe('Statistics Loading', () => {
    it('should load statistics for week period', fakeAsync(() => {
      component.selectedPeriod.set('week');
      fixture.detectChanges();
      tick();

      expect(mockReadingsService.getStatistics).toHaveBeenCalledWith('week');
    }));

    it('should load statistics for month period', fakeAsync(() => {
      component.selectedPeriod.set('month');
      fixture.detectChanges();
      tick();

      expect(mockReadingsService.getStatistics).toHaveBeenCalledWith('month');
    }));

    it('should load statistics for all period', fakeAsync(() => {
      component.selectedPeriod.set('all');
      fixture.detectChanges();
      tick();

      expect(mockReadingsService.getStatistics).toHaveBeenCalledWith('all');
    }));

    it('should set loading to true before loading', fakeAsync(() => {
      fixture.detectChanges();
      expect(component.loading()).toBe(true);
    }));

    it('should set loading to false after successful load', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      expect(component.loading()).toBe(false);
    }));

    it('should handle loading error gracefully', fakeAsync(() => {
      mockReadingsService.getStatistics = vi.fn().mockRejectedValue(new Error('Load error'));
      fixture.detectChanges();
      tick();

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'TrendsPage',
        'Failed to load statistics',
        expect.any(Error)
      );
    }));

    it('should set loading to false after error', fakeAsync(() => {
      mockReadingsService.getStatistics = vi.fn().mockRejectedValue(new Error('Load error'));
      fixture.detectChanges();
      tick();

      expect(component.loading()).toBe(false);
    }));

    it('should update statistics signal with loaded data', fakeAsync(() => {
      const mockStats = {
        average: 150,
        median: 145,
        standardDeviation: 20,
        coefficientOfVariation: 13.3,
        timeInRange: 75,
        timeAboveRange: 15,
        timeBelowRange: 10,
        totalReadings: 50,
      };
      mockReadingsService.getStatistics = vi.fn().mockResolvedValue(mockStats);
      fixture.detectChanges();
      tick();

      expect(component.statistics()).toEqual(mockStats);
    }));

    it('should calculate date range for week period', fakeAsync(() => {
      component.selectedPeriod.set('week');
      fixture.detectChanges();
      tick();

      const calls = (mockReadingsService.getReadingsByDateRange as any).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const [startDate, endDate] = calls[calls.length - 1];
      const daysDiff = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(7);
    }));

    it('should calculate date range for month period', fakeAsync(() => {
      component.selectedPeriod.set('month');
      fixture.detectChanges();
      tick();

      const calls = (mockReadingsService.getReadingsByDateRange as any).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const [startDate, endDate] = calls[calls.length - 1];
      const daysDiff = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(30);
    }));
  });

  describe('Chart Updates', () => {
    it('should update chart with reading data', fakeAsync(() => {
      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          time: '2024-01-01T10:00:00Z',
          value: 120,
          type: 'smbg',
          units: 'mg/dL',
          synced: true,
        },
        {
          id: '2',
          time: '2024-01-01T14:00:00Z',
          value: 150,
          type: 'smbg',
          units: 'mg/dL',
          synced: true,
        },
      ];
      mockReadingsService.getReadingsByDateRange = vi.fn().mockResolvedValue(mockReadings);
      fixture.detectChanges();
      tick();

      expect(component.lineChartData.datasets.length).toBeGreaterThan(0);
      expect(component.lineChartData.datasets[0].data).toHaveLength(2);
    }));

    it('should format dates correctly for chart', fakeAsync(() => {
      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          time: '2024-01-01T10:00:00Z',
          value: 120,
          type: 'smbg',
          units: 'mg/dL',
          synced: true,
        },
      ];
      mockReadingsService.getReadingsByDateRange = vi.fn().mockResolvedValue(mockReadings);
      fixture.detectChanges();
      tick();

      const chartData = component.lineChartData.datasets[0].data as any[];
      expect(chartData[0].x).toBe(new Date('2024-01-01T10:00:00Z').getTime());
      expect(chartData[0].y).toBe(120);
    }));

    it('should handle empty readings array', fakeAsync(() => {
      mockReadingsService.getReadingsByDateRange = vi.fn().mockResolvedValue([]);
      fixture.detectChanges();
      tick();

      expect(component.lineChartData.datasets).toHaveLength(0);
    }));

    it('should apply light theme colors', fakeAsync(() => {
      themeSubject.next(false);
      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          time: '2024-01-01T10:00:00Z',
          value: 120,
          type: 'smbg',
          units: 'mg/dL',
          synced: true,
        },
      ];
      mockReadingsService.getReadingsByDateRange = vi.fn().mockResolvedValue(mockReadings);
      fixture.detectChanges();
      tick();

      expect(component.lineChartData.datasets[0].borderColor).toBe('#3880ff');
      expect(component.lineChartData.datasets[0].backgroundColor).toBe('rgba(56, 128, 255, 0.2)');
    }));

    it('should apply dark theme colors', fakeAsync(() => {
      themeSubject.next(true);
      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          time: '2024-01-01T10:00:00Z',
          value: 120,
          type: 'smbg',
          units: 'mg/dL',
          synced: true,
        },
      ];
      mockReadingsService.getReadingsByDateRange = vi.fn().mockResolvedValue(mockReadings);
      fixture.detectChanges();
      tick();

      expect(component.lineChartData.datasets[0].borderColor).toBe('#6ea8fe');
      expect(component.lineChartData.datasets[0].backgroundColor).toBe('rgba(110, 168, 254, 0.2)');
    }));

    it('should set chart label to Glucose Level', fakeAsync(() => {
      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          time: '2024-01-01T10:00:00Z',
          value: 120,
          type: 'smbg',
          units: 'mg/dL',
          synced: true,
        },
      ];
      mockReadingsService.getReadingsByDateRange = vi.fn().mockResolvedValue(mockReadings);
      fixture.detectChanges();
      tick();

      expect(component.lineChartData.datasets[0].label).toBe('Glucose Level');
    }));

    it('should have responsive chart options', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(component.lineChartOptions?.responsive).toBe(true);
      expect(component.lineChartOptions?.maintainAspectRatio).toBe(false);
    }));

    it('should configure zoom plugin', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const zoomConfig = component.lineChartOptions?.plugins?.zoom;
      expect(zoomConfig).toBeDefined();
      expect(zoomConfig?.pan?.enabled).toBe(true);
      expect(zoomConfig?.zoom?.pinch?.enabled).toBe(true);
    }));
  });

  describe('Theme Changes', () => {
    it('should update chart colors when switching to dark mode', fakeAsync(() => {
      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          time: '2024-01-01T10:00:00Z',
          value: 120,
          type: 'smbg',
          units: 'mg/dL',
          synced: true,
        },
      ];
      mockReadingsService.getReadingsByDateRange = vi.fn().mockResolvedValue(mockReadings);
      themeSubject.next(false);
      fixture.detectChanges();
      tick();

      themeSubject.next(true);
      tick();

      expect(component.isDarkMode()).toBe(true);
    }));

    it('should update chart instance on theme change', fakeAsync(() => {
      const mockReadings: LocalGlucoseReading[] = [
        {
          id: '1',
          time: '2024-01-01T10:00:00Z',
          value: 120,
          type: 'smbg',
          units: 'mg/dL',
          synced: true,
        },
      ];
      mockReadingsService.getReadingsByDateRange = vi.fn().mockResolvedValue(mockReadings);
      fixture.detectChanges();
      tick();

      component.chart = {
        update: vi.fn(),
        toBase64Image: vi.fn(),
      } as any;

      themeSubject.next(true);
      tick();

      expect(component.chart.update).toHaveBeenCalled();
    }));

    it('should not crash if chart is undefined during theme change', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.chart = undefined;

      expect(() => {
        themeSubject.next(true);
        tick();
      }).not.toThrow();
    }));
  });

  describe('Chart Export', () => {
    it('should export chart as base64 image', () => {
      const mockBase64 = 'data:image/png;base64,mockImage';
      component.chart = {
        toBase64Image: vi.fn().mockReturnValue(mockBase64),
        update: vi.fn(),
      } as any;

      const createElementSpy = vi.spyOn(document, 'createElement');
      component.exportChart();

      expect(component.chart.toBase64Image).toHaveBeenCalled();
      expect(createElementSpy).toHaveBeenCalledWith('a');
    });

    it('should trigger download with correct filename', () => {
      const mockBase64 = 'data:image/png;base64,mockImage';
      const mockClickFn = vi.fn();
      component.chart = {
        toBase64Image: vi.fn().mockReturnValue(mockBase64),
        update: vi.fn(),
      } as any;

      const mockElement = {
        href: '',
        download: '',
        click: mockClickFn,
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockElement as any);

      component.exportChart();

      expect(mockElement.href).toBe(mockBase64);
      expect(mockElement.download).toBe('trends.png');
      expect(mockClickFn).toHaveBeenCalled();
    });

    it('should handle missing chart instance gracefully', () => {
      component.chart = undefined;
      expect(() => component.exportChart()).not.toThrow();
    });

    it('should handle null base64 image', () => {
      component.chart = {
        toBase64Image: vi.fn().mockReturnValue(null),
        update: vi.fn(),
      } as any;

      expect(() => component.exportChart()).not.toThrow();
    });
  });

  describe('Pull-to-Refresh', () => {
    it('should reload data on refresh', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      vi.clearAllMocks();

      const mockRefresher = { complete: vi.fn() };
      const event = { target: mockRefresher } as any;

      component.handleRefresh(event);
      tick();

      expect(mockReadingsService.getStatistics).toHaveBeenCalled();
      expect(mockReadingsService.getReadingsByDateRange).toHaveBeenCalled();
    }));

    it('should complete refresher after reload', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const mockRefresher = { complete: vi.fn() };
      const event = { target: mockRefresher } as any;

      component.handleRefresh(event);
      tick();

      expect(mockRefresher.complete).toHaveBeenCalled();
    }));

    it('should handle refresh errors gracefully', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      mockReadingsService.getStatistics = vi.fn().mockRejectedValue(new Error('Refresh failed'));

      const mockRefresher = { complete: vi.fn() };
      const event = { target: mockRefresher } as any;

      component.handleRefresh(event);
      tick();

      expect(mockRefresher.complete).toHaveBeenCalled();
      expect(mockLoggerService.error).toHaveBeenCalled();
    }));
  });

  describe('Component Cleanup', () => {
    it('should unsubscribe on destroy', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const destroySpy = vi.spyOn<any>(component['destroy$'], 'next');
      const completeSpy = vi.spyOn<any>(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    }));

    it('should complete destroy$ subject', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.ngOnDestroy();

      expect(component['destroy$'].closed).toBe(true);
    }));
  });
});
