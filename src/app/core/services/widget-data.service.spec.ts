import { TestBed } from '@angular/core/testing';
import { WidgetDataService } from './widget-data.service';
import { ReadingsService } from './readings.service';
import { WidgetBridgePlugin } from 'capacitor-widget-bridge';
import { vi } from 'vitest';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { Statistics } from '@models/statistics.model';

// Explicitly mock the 'capacitor-widget-bridge' module
vi.mock('capacitor-widget-bridge', () => ({
  WidgetBridgePlugin: {
    setItem: vi.fn(() => Promise.resolve()),
    reloadAllTimelines: vi.fn(() => Promise.resolve()),
  },
}));

describe('WidgetDataService', () => {
  let service: WidgetDataService;
  let readingsServiceMock: Partial<ReadingsService>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    readingsServiceMock = {
      getAllReadings: vi.fn(),
      getStatistics: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [WidgetDataService, { provide: ReadingsService, useValue: readingsServiceMock }],
    });

    service = TestBed.inject(WidgetDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateTrend', () => {
    it('should return an up arrow when the trend is rising', () => {
      const readings = [{ value: 100 }, { value: 90 }] as LocalGlucoseReading[];
       
      const trend = (service as any).calculateTrend(readings);
      expect(trend).toBe('↑');
    });

    it('should return a down arrow when the trend is falling', () => {
      const readings = [{ value: 90 }, { value: 100 }] as LocalGlucoseReading[];
       
      const trend = (service as any).calculateTrend(readings);
      expect(trend).toBe('↓');
    });

    it('should return a right arrow when the trend is stable', () => {
      const readings = [{ value: 100 }, { value: 100 }] as LocalGlucoseReading[];
       
      const trend = (service as any).calculateTrend(readings);
      expect(trend).toBe('→');
    });

    it('should return a right arrow when there is insufficient data', () => {
      const readings = [{ value: 100 }] as LocalGlucoseReading[];
       
      const trend = (service as any).calculateTrend(readings);
      expect(trend).toBe('→');
    });
  });

  describe('formatTimeAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "just now" for times less than a minute ago', () => {
      const timestamp = new Date('2024-01-01T11:59:31Z').toISOString();
       
      const formattedTime = (service as any).formatTimeAgo(timestamp);
      expect(formattedTime).toBe('just now');
    });

    it('should return minutes ago for times less than an hour ago', () => {
      const timestamp = new Date('2024-01-01T11:30:00Z').toISOString();
       
      const formattedTime = (service as any).formatTimeAgo(timestamp);
      expect(formattedTime).toBe('30 min ago');
    });

    it('should return hours ago for times less than a day ago', () => {
      const timestamp = new Date('2024-01-01T08:00:00Z').toISOString();
       
      const formattedTime = (service as any).formatTimeAgo(timestamp);
      expect(formattedTime).toBe('4h ago');
    });

    it('should return days ago for times more than a day ago', () => {
      const timestamp = new Date('2023-12-30T12:00:00Z').toISOString();
       
      const formattedTime = (service as any).formatTimeAgo(timestamp);
      expect(formattedTime).toBe('2d ago');
    });
  });

  describe('updateWidgetData', () => {
    it('should update the widget with the latest data', async () => {
      const readings = {
        readings: [
          { value: 100, units: 'mg/dL', time: new Date().toISOString(), status: 'Normal' },
          { value: 90, units: 'mg/dL', time: new Date().toISOString(), status: 'Normal' },
        ] as LocalGlucoseReading[],
      };
      const stats: Statistics = { timeInRange: '85%' } as Statistics;

      (readingsServiceMock.getAllReadings as vi.Mock).mockResolvedValue(readings);
      (readingsServiceMock.getStatistics as vi.Mock).mockResolvedValue(stats);

      await service.updateWidgetData();

      expect(readingsServiceMock.getAllReadings).toHaveBeenCalledWith(2);
      expect(readingsServiceMock.getStatistics).toHaveBeenCalledWith('day');

      expect(WidgetBridgePlugin.setItem).toHaveBeenCalledWith({
        key: 'widgetData',
        value: expect.any(String),
        group: 'group.io.diabetactic.app',
      });

      const widgetData = JSON.parse((WidgetBridgePlugin.setItem as vi.Mock).mock.calls[0][0].value);
      expect(widgetData.glucoseValue).toBe('100 mg/dL');
      expect(widgetData.trendArrow).toBe('↑');
      expect(widgetData.timeInRange).toBe('85%');

      expect(WidgetBridgePlugin.reloadAllTimelines).toHaveBeenCalled();
    });

    it('should not update the widget if there are no readings', async () => {
      (readingsServiceMock.getAllReadings as vi.Mock).mockResolvedValue({ readings: [] });

      await service.updateWidgetData();

      expect(WidgetBridgePlugin.setItem).not.toHaveBeenCalled();
      expect(WidgetBridgePlugin.reloadAllTimelines).not.toHaveBeenCalled();
    });
  });
});
