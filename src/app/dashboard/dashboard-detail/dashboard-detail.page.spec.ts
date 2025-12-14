// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { DashboardDetailPage } from './dashboard-detail.page';
import { ReadingsService } from '@core/services/readings.service';
import { ProfileService } from '@core/services/profile.service';
import { TranslationService } from '@core/services/translation.service';

describe('DashboardDetailPage', () => {
  let component: DashboardDetailPage;
  let fixture: ComponentFixture<DashboardDetailPage>;

  const mockReadingsService = {
    getStatistics: jest.fn().mockResolvedValue({
      average: 120,
      standardDeviation: 25,
      coefficientOfVariation: 20.8,
      timeInRange: 70,
      estimatedHbA1c: 6.5,
      gmi: 6.8,
      readingsCount: 100,
    }),
    performFullSync: jest.fn().mockResolvedValue({ pushed: 5, fetched: 10, failed: 0 }),
  };

  const mockProfileService = {
    profile$: new BehaviorSubject({
      preferences: { glucoseUnit: 'mg/dL' },
    }),
  };

  const mockTranslationService = {
    getCurrentConfig: jest.fn().mockReturnValue({ glucoseUnit: 'mg/dL' }),
    getCurrentLanguage: jest.fn().mockReturnValue('en'),
    instant: jest.fn((key: string) => key),
  };

  const mockRouter = {
    navigate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [DashboardDetailPage, TranslateModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(DashboardDetailPage, {
        set: {
          imports: [TranslateModule],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .overrideProvider(ReadingsService, { useValue: mockReadingsService })
      .overrideProvider(ProfileService, { useValue: mockProfileService })
      .overrideProvider(TranslationService, { useValue: mockTranslationService })
      .overrideProvider(Router, { useValue: mockRouter })
      .compileComponents();

    fixture = TestBed.createComponent(DashboardDetailPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default values', () => {
    it('should have null statistics initially', () => {
      expect(component.statistics).toBeNull();
    });

    it('should have isLoading true initially', () => {
      expect(component.isLoading).toBe(true);
    });

    it('should have isSyncing false initially', () => {
      expect(component.isSyncing).toBe(false);
    });

    it('should have null backendSyncResult initially', () => {
      expect(component.backendSyncResult).toBeNull();
    });
  });

  describe('gradients', () => {
    it('should have hba1c gradient', () => {
      expect(component.gradients.hba1c).toEqual(['#60a5fa', '#3b82f6']);
    });

    it('should have timeInRange gradient', () => {
      expect(component.gradients.timeInRange).toEqual(['#c084fc', '#a855f7']);
    });

    it('should have avgGlucose gradient', () => {
      expect(component.gradients.avgGlucose).toEqual(['#4ade80', '#22c55e']);
    });

    it('should have gmi gradient', () => {
      expect(component.gradients.gmi).toEqual(['#fbbf24', '#f59e0b']);
    });

    it('should have stdDev gradient', () => {
      expect(component.gradients.stdDev).toEqual(['#f87171', '#ef4444']);
    });

    it('should have cv gradient', () => {
      expect(component.gradients.cv).toEqual(['#fb923c', '#f97316']);
    });
  });

  describe('icons', () => {
    it('should have hba1c icon', () => {
      expect(component.icons.hba1c).toBe('star');
    });

    it('should have timeInRange icon', () => {
      expect(component.icons.timeInRange).toBe('track_changes');
    });

    it('should have avgGlucose icon', () => {
      expect(component.icons.avgGlucose).toBe('favorite');
    });

    it('should have gmi icon', () => {
      expect(component.icons.gmi).toBe('monitoring');
    });

    it('should have stdDev icon', () => {
      expect(component.icons.stdDev).toBe('analytics');
    });

    it('should have cv icon', () => {
      expect(component.icons.cv).toBe('trending_up');
    });
  });

  describe('formatPercentage', () => {
    it('should format number as percentage', () => {
      const result = component.formatPercentage(75.5);
      expect(result).toContain('75');
      expect(result).toContain('%');
    });

    it('should handle undefined', () => {
      const result = component.formatPercentage(undefined);
      expect(result).toContain('0');
      expect(result).toContain('%');
    });

    it('should handle zero', () => {
      const result = component.formatPercentage(0);
      expect(result).toContain('0');
      expect(result).toContain('%');
    });
  });

  describe('formatGlucose', () => {
    it('should format glucose value', () => {
      const result = component.formatGlucose(120);
      expect(result).toBeTruthy();
    });

    it('should handle undefined', () => {
      const result = component.formatGlucose(undefined);
      expect(result).toBe('0');
    });

    it('should handle zero', () => {
      const result = component.formatGlucose(0);
      expect(result).toBe('0');
    });
  });

  describe('getCurrentGlucoseUnit', () => {
    it('should return preferred glucose unit', () => {
      component.preferredGlucoseUnit = 'mg/dL';
      expect(component.getCurrentGlucoseUnit()).toBe('mg/dL');
    });

    it('should return mmol/L when set', () => {
      component.preferredGlucoseUnit = 'mmol/L';
      expect(component.getCurrentGlucoseUnit()).toBe('mmol/L');
    });
  });

  describe('getSyncStatusText', () => {
    it('should return syncing text when syncing', () => {
      component.isSyncing = true;
      component.getSyncStatusText();
      expect(mockTranslationService.instant).toHaveBeenCalledWith('dashboard.syncStatus.syncing');
    });

    it('should return idle text when no sync result', () => {
      component.isSyncing = false;
      component.backendSyncResult = null;
      component.getSyncStatusText();
      expect(mockTranslationService.instant).toHaveBeenCalledWith('dashboard.syncStatus.idle');
    });

    it('should return failed text when there are failures', () => {
      component.isSyncing = false;
      component.backendSyncResult = { pushed: 0, fetched: 0, failed: 3 };
      component.getSyncStatusText();
      expect(mockTranslationService.instant).toHaveBeenCalledWith('dashboard.syncStatus.failed', {
        count: 3,
      });
    });

    it('should return success text when items synced', () => {
      component.isSyncing = false;
      component.backendSyncResult = { pushed: 5, fetched: 10, failed: 0 };
      component.getSyncStatusText();
      expect(mockTranslationService.instant).toHaveBeenCalledWith('dashboard.syncStatus.success', {
        count: 15,
      });
    });

    it('should return idle when no items synced', () => {
      component.isSyncing = false;
      component.backendSyncResult = { pushed: 0, fetched: 0, failed: 0 };
      component.getSyncStatusText();
      expect(mockTranslationService.instant).toHaveBeenCalledWith('dashboard.syncStatus.idle');
    });
  });

  describe('goBack', () => {
    it('should navigate to dashboard', () => {
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalled();
    });
  });

  describe('onSync', () => {
    it('should set isSyncing true during sync', fakeAsync(() => {
      const syncPromise = component.onSync();
      expect(component.isSyncing).toBe(true);
      tick();
      syncPromise.then(() => {
        expect(component.isSyncing).toBe(false);
      });
      tick();
    }));

    it('should call performFullSync', fakeAsync(() => {
      component.onSync();
      tick();
      expect(mockReadingsService.performFullSync).toHaveBeenCalled();
    }));
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy$ subject', () => {
      const nextSpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');
      component.ngOnDestroy();
      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
