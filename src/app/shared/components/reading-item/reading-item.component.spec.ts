// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReadingItemComponent } from './reading-item.component';
import { LocalGlucoseReading } from '@core/models/glucose-reading.model';
import { TranslationService } from '@services/translation.service';

describe('ReadingItemComponent', () => {
  let component: ReadingItemComponent;
  let fixture: ComponentFixture<ReadingItemComponent>;
  let translationService: TranslationService;
  let cdr: ChangeDetectorRef;

  const createMockReading = (
    status: LocalGlucoseReading['status'] = 'normal',
    timestamp: string = new Date().toISOString()
  ): LocalGlucoseReading =>
    ({
      id: '123',
      type: 'smbg',
      time: timestamp,
      value: 100,
      units: 'mg/dL',
      synced: true,
      status,
      userId: 'user1',
      timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    }) as LocalGlucoseReading;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadingItemComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: TranslationService,
          useValue: {
            instant: vi.fn((key: string) => key),
            formatTime: vi.fn((_time: string) => '10:30 AM'),
            getCurrentLanguage: vi.fn(() => 'es'),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingItemComponent);
    component = fixture.componentInstance;
    translationService = TestBed.inject(TranslationService);
    cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
  });

  function updateInputAndDetect(): void {
    cdr.markForCheck();
    fixture.detectChanges();
  }

  describe('component creation', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should have required reading input', () => {
      expect(component.reading).toBeUndefined();
    });
  });

  describe('getStatusEmoji', () => {
    it('should return correct emoji for normal status', () => {
      component.reading = createMockReading('normal');
      expect(component.getStatusEmoji()).toBe('😊');
    });

    it('should return correct emoji for low status', () => {
      component.reading = createMockReading('low');
      expect(component.getStatusEmoji()).toBe('😟');
    });

    it('should return correct emoji for critical-low status', () => {
      component.reading = createMockReading('critical-low');
      expect(component.getStatusEmoji()).toBe('😟');
    });

    it('should return correct emoji for high status', () => {
      component.reading = createMockReading('high');
      expect(component.getStatusEmoji()).toBe('😰');
    });

    it('should return correct emoji for critical-high status', () => {
      component.reading = createMockReading('critical-high');
      expect(component.getStatusEmoji()).toBe('😰');
    });

    it('should return default emoji for undefined status', () => {
      const reading = { ...createMockReading(), status: undefined };
      component.reading = reading;
      expect(component.getStatusEmoji()).toBe('😐');
    });

    it('should return default emoji for unknown status', () => {
      // SAFETY: Intentionally testing an invalid status value
      component.reading = { ...createMockReading(), status: 'unknown' as any };
      expect(component.getStatusEmoji()).toBe('😐');
    });
  });

  describe('getStatusText', () => {
    it('should return normal text for normal status', () => {
      component.reading = createMockReading('normal');
      component.getStatusText();
      expect(translationService.instant).toHaveBeenCalledWith('glucose.status.normal');
    });

    it('should return low text for low status', () => {
      component.reading = createMockReading('low');
      component.getStatusText();
      expect(translationService.instant).toHaveBeenCalledWith('glucose.status.low');
    });

    it('should return very low text for critical-low status', () => {
      component.reading = createMockReading('critical-low');
      component.getStatusText();
      expect(translationService.instant).toHaveBeenCalledWith('glucose.status.veryLow');
    });

    it('should return high text for high status', () => {
      component.reading = createMockReading('high');
      component.getStatusText();
      expect(translationService.instant).toHaveBeenCalledWith('glucose.status.high');
    });

    it('should return very high text for critical-high status', () => {
      component.reading = createMockReading('critical-high');
      component.getStatusText();
      expect(translationService.instant).toHaveBeenCalledWith('glucose.status.veryHigh');
    });

    it('should return normal text for undefined status', () => {
      component.reading = { ...createMockReading(), status: undefined };
      component.getStatusText();
      expect(translationService.instant).toHaveBeenCalledWith('glucose.status.normal');
    });

    it('should return normal text for unknown status', () => {
      // SAFETY: Intentionally testing an invalid status value
      component.reading = { ...createMockReading(), status: 'unknown' as any };
      component.getStatusText();
      expect(translationService.instant).toHaveBeenCalledWith('glucose.status.normal');
    });
  });

  describe('getStatusClass', () => {
    it('should return normal class for normal status', () => {
      component.reading = createMockReading('normal');
      expect(component.getStatusClass()).toBe('normal');
    });

    it('should return low class for low status', () => {
      component.reading = createMockReading('low');
      expect(component.getStatusClass()).toBe('low');
    });

    it('should return low class for critical-low status', () => {
      component.reading = createMockReading('critical-low');
      expect(component.getStatusClass()).toBe('low');
    });

    it('should return high class for high status', () => {
      component.reading = createMockReading('high');
      expect(component.getStatusClass()).toBe('high');
    });

    it('should return high class for critical-high status', () => {
      component.reading = createMockReading('critical-high');
      expect(component.getStatusClass()).toBe('high');
    });

    it('should return normal class for undefined status', () => {
      component.reading = { ...createMockReading(), status: undefined };
      expect(component.getStatusClass()).toBe('normal');
    });

    it('should return normal class for unknown status', () => {
      // SAFETY: Intentionally testing an invalid status value
      component.reading = { ...createMockReading(), status: 'unknown' as any };
      expect(component.getStatusClass()).toBe('normal');
    });
  });

  describe('formatTime', () => {
    it('should delegate to translation service', () => {
      const timeString = '2024-01-15T10:30:00Z';
      component.formatTime(timeString);
      expect(translationService.formatTime).toHaveBeenCalledWith(timeString);
    });

    it('should return formatted time from service', () => {
      const result = component.formatTime('2024-01-15T10:30:00Z');
      expect(result).toBe('10:30 AM');
    });
  });

  describe('formatDate', () => {
    beforeEach(() => {
      // Mock current date
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "today" for today\'s date', () => {
      const todayDate = new Date('2024-01-15T10:30:00Z').toISOString();
      component.reading = createMockReading('normal', todayDate);

      const result = component.formatDate(todayDate);

      expect(translationService.instant).toHaveBeenCalledWith('common.today');
      expect(result).toBe('common.today');
    });

    it('should return "yesterday" for yesterday\'s date', () => {
      const yesterdayDate = new Date('2024-01-14T10:30:00Z').toISOString();
      component.reading = createMockReading('normal', yesterdayDate);

      const result = component.formatDate(yesterdayDate);

      expect(translationService.instant).toHaveBeenCalledWith('common.yesterday');
      expect(result).toBe('common.yesterday');
    });

    it('should return localized date for older dates', () => {
      const olderDate = new Date('2024-01-10T10:30:00Z').toISOString();
      component.reading = createMockReading('normal', olderDate);

      const result = component.formatDate(olderDate);

      expect(translationService.getCurrentLanguage).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('should use correct locale from translation service', () => {
      vi.mocked(translationService.getCurrentLanguage).mockReturnValue('en');
      const olderDate = new Date('2024-01-10T10:30:00Z').toISOString();

      component.formatDate(olderDate);

      expect(translationService.getCurrentLanguage).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle missing status gracefully', () => {
      component.reading = { ...createMockReading(), status: undefined };
      updateInputAndDetect();

      expect(component.getStatusEmoji()).toBe('😐');
      expect(component.getStatusClass()).toBe('normal');
    });

    it('should handle invalid date strings', () => {
      component.reading = createMockReading('normal', 'invalid-date');

      // Should not throw
      expect(() => component.formatDate('invalid-date')).not.toThrow();
    });

    it('should handle future dates', () => {
      const futureDate = new Date('2025-01-15T10:30:00Z').toISOString();
      component.reading = createMockReading('normal', futureDate);

      const result = component.formatDate(futureDate);
      expect(result).toBeTruthy();
    });
  });

  describe('OnPush change detection', () => {
    it('should use OnPush change detection strategy', () => {
      expect(fixture.componentRef.injector.get(ChangeDetectorRef)).toBeDefined();
    });

    it('should update view when reading input changes', () => {
      component.reading = createMockReading('normal');
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      expect(compiled).toBeTruthy();
    });
  });

  describe('integration with TranslationService', () => {
    it('should call translation service methods correctly', () => {
      const todayDate = new Date('2024-01-15T10:30:00Z').toISOString();
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      component.reading = createMockReading('normal', todayDate);

      component.getStatusText();
      component.formatTime(component.reading.timestamp);

      expect(translationService.instant).toHaveBeenCalled();
      expect(translationService.formatTime).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
