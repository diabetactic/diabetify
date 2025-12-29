import { TestBed } from '@angular/core/testing';
import { WidgetDataService } from './widget-data.service';
import { ReadingsService } from './readings.service';
import { WidgetBridgePlugin } from 'capacitor-widget-bridge';
import { vi } from 'vitest';

vi.mock('capacitor-widget-bridge', () => ({
  WidgetBridgePlugin: {
    setItem: vi.fn(),
    reloadAllTimelines: vi.fn(),
  },
}));

describe('WidgetDataService', () => {
  let service: WidgetDataService;
  let readingsServiceSpy: Partial<ReadingsService>;

  beforeEach(() => {
    readingsServiceSpy = {
      getAllReadings: vi.fn().mockResolvedValue({
        readings: [{ value: 120, units: 'mg/dL', time: new Date().toISOString() }],
      }),
      getStatistics: vi.fn().mockResolvedValue({ timeInRange: 60 }),
    };

    TestBed.configureTestingModule({
      providers: [WidgetDataService, { provide: ReadingsService, useValue: readingsServiceSpy }],
    });
    service = TestBed.inject(WidgetDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update widget data', async () => {
    await service.updateWidgetData();
    expect(WidgetBridgePlugin.setItem).toHaveBeenCalled();
    expect(WidgetBridgePlugin.reloadAllTimelines).toHaveBeenCalled();
  });
});
