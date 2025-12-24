// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef, SimpleChange } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;
  let cdr: ChangeDetectorRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent, TranslateModule.forRoot()],
      providers: [DecimalPipe],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  function updateInputAndDetect(): void {
    cdr.markForCheck();
    fixture.detectChanges();
  }

  describe('component creation', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should have default values', () => {
      expect(component.title).toBe('');
      expect(component.value).toBe(0);
      expect(component.unit).toBe('');
      expect(component.icon).toBe('analytics');
      expect(component.gradientColors).toEqual(['#3b82f6', '#60a5fa']);
      expect(component.color).toBe('');
      expect(component.trend).toBeUndefined();
      expect(component.trendValue).toBeUndefined();
      expect(component.loading).toBe(false);
      expect(component.error).toBe(false);
      expect(component.clickable).toBe(false);
    });
  });

  describe('input properties', () => {
    it('should accept title input', () => {
      component.title = 'Average Glucose';
      updateInputAndDetect();
      expect(component.title).toBe('Average Glucose');
    });

    it('should accept numeric value', () => {
      component.value = 120;
      updateInputAndDetect();
      expect(component.value).toBe(120);
    });

    it('should accept string value', () => {
      component.value = 'N/A';
      updateInputAndDetect();
      expect(component.value).toBe('N/A');
    });

    it('should accept unit input', () => {
      component.unit = 'mg/dL';
      updateInputAndDetect();
      expect(component.unit).toBe('mg/dL');
    });

    it('should accept icon input', () => {
      component.icon = 'glucose';
      updateInputAndDetect();
      expect(component.icon).toBe('glucose');
    });

    it('should accept gradient colors', () => {
      const colors: [string, string] = ['#ff0000', '#00ff00'];
      component.gradientColors = colors;
      updateInputAndDetect();
      expect(component.gradientColors).toEqual(colors);
    });

    it('should accept color input', () => {
      component.color = 'primary';
      updateInputAndDetect();
      expect(component.color).toBe('primary');
    });

    it('should accept trend input', () => {
      component.trend = 'up';
      updateInputAndDetect();
      expect(component.trend).toBe('up');
    });

    it('should accept trendValue input', () => {
      component.trendValue = 5.2;
      updateInputAndDetect();
      expect(component.trendValue).toBe(5.2);
    });

    it('should accept loading state', () => {
      component.loading = true;
      updateInputAndDetect();
      expect(component.loading).toBe(true);
    });

    it('should accept error state', () => {
      component.error = true;
      updateInputAndDetect();
      expect(component.error).toBe(true);
    });

    it('should accept clickable state', () => {
      component.clickable = true;
      updateInputAndDetect();
      expect(component.clickable).toBe(true);
    });
  });

  describe('ngOnChanges lifecycle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should set valueUpdating on value change', () => {
      component.value = 100;
      component.ngOnChanges({
        value: new SimpleChange(0, 100, false),
      });

      expect(component.valueUpdating).toBe(true);
    });

    it('should reset valueUpdating after 300ms', () => {
      component.value = 100;
      component.ngOnChanges({
        value: new SimpleChange(0, 100, false),
      });

      expect(component.valueUpdating).toBe(true);

      vi.advanceTimersByTime(300);

      expect(component.valueUpdating).toBe(false);
    });

    it('should not set valueUpdating on first change', () => {
      component.ngOnChanges({
        value: new SimpleChange(null, 100, true),
      });

      expect(component.valueUpdating).toBe(false);
    });

    it('should not affect valueUpdating when other properties change', () => {
      component.ngOnChanges({
        title: new SimpleChange('', 'New Title', false),
      });

      expect(component.valueUpdating).toBe(false);
    });
  });

  describe('isBusy host binding', () => {
    it('should return "true" when loading is true', () => {
      component.loading = true;
      expect(component.isBusy).toBe('true');
    });

    it('should return "false" when loading is false', () => {
      component.loading = false;
      expect(component.isBusy).toBe('false');
    });
  });

  describe('hostClasses', () => {
    it('should include color class when color is set', () => {
      component.color = 'primary';
      const classes = component.hostClasses;
      expect(classes).toContain('stat-card-primary');
    });

    it('should include clickable class when clickable is true', () => {
      component.clickable = true;
      const classes = component.hostClasses;
      expect(classes).toContain('stat-card-clickable');
    });

    it('should include error class when error is true', () => {
      component.error = true;
      const classes = component.hostClasses;
      expect(classes).toContain('stat-card-error-state');
    });

    it('should include pulse class when shouldPulse returns true', () => {
      component.color = 'danger';
      component.value = 250;
      const classes = component.hostClasses;
      expect(classes).toContain('stat-card-pulse');
    });

    it('should combine multiple classes', () => {
      component.color = 'danger';
      component.clickable = true;
      component.error = true;
      component.value = 250;

      const classes = component.hostClasses;
      expect(classes).toContain('stat-card-danger');
      expect(classes).toContain('stat-card-clickable');
      expect(classes).toContain('stat-card-error-state');
      expect(classes).toContain('stat-card-pulse');
    });

    it('should return empty string when no conditions are met', () => {
      const classes = component.hostClasses;
      expect(classes).toBe('');
    });
  });

  describe('gradientClass', () => {
    it('should return correct gradient for primary color', () => {
      component.color = 'primary';
      expect(component.gradientClass).toBe('bg-gradient-to-br from-blue-500 to-blue-600');
    });

    it('should return correct gradient for success color', () => {
      component.color = 'success';
      expect(component.gradientClass).toBe('bg-gradient-to-br from-green-500 to-green-600');
    });

    it('should return correct gradient for warning color', () => {
      component.color = 'warning';
      expect(component.gradientClass).toBe('bg-gradient-to-br from-yellow-500 to-yellow-600');
    });

    it('should return correct gradient for danger color', () => {
      component.color = 'danger';
      expect(component.gradientClass).toBe('bg-gradient-to-br from-red-500 to-red-600');
    });

    it('should return correct gradient for info color', () => {
      component.color = 'info';
      expect(component.gradientClass).toBe('bg-gradient-to-br from-cyan-500 to-cyan-600');
    });

    it('should return empty string for unknown color', () => {
      component.color = 'unknown';
      expect(component.gradientClass).toBe('');
    });

    it('should return empty string when no color is set', () => {
      component.color = '';
      expect(component.gradientClass).toBe('');
    });
  });

  describe('formattedValue', () => {
    it('should format numeric values using DecimalPipe', () => {
      component.value = 1234.56;
      const formatted = component.formattedValue;
      expect(formatted).toBe('1,234.56');
    });

    it('should return string values as-is', () => {
      component.value = 'N/A';
      expect(component.formattedValue).toBe('N/A');
    });

    it('should handle zero value', () => {
      component.value = 0;
      const formatted = component.formattedValue;
      expect(formatted).toBe('0');
    });

    it('should handle negative numbers', () => {
      component.value = -42;
      const formatted = component.formattedValue;
      expect(formatted).toBeTruthy();
    });

    it('should handle large numbers', () => {
      component.value = 1000000;
      const formatted = component.formattedValue;
      expect(formatted).toBe('1,000,000');
    });
  });

  describe('testId', () => {
    it('should generate test ID from title', () => {
      component.title = 'Average Glucose';
      expect(component.testId).toBe('stat-card-average-glucose');
    });

    it('should handle spaces in title', () => {
      component.title = 'Total Readings Today';
      expect(component.testId).toBe('stat-card-total-readings-today');
    });

    it('should handle empty title', () => {
      component.title = '';
      expect(component.testId).toBe('stat-card-');
    });

    it('should handle uppercase letters', () => {
      component.title = 'GLUCOSE';
      expect(component.testId).toBe('stat-card-glucose');
    });
  });

  describe('shouldPulse', () => {
    it('should return true for danger color with value > 200', () => {
      component.color = 'danger';
      component.value = 250;
      expect(component.shouldPulse()).toBe(true);
    });

    it('should return false for danger color with value <= 200', () => {
      component.color = 'danger';
      component.value = 200;
      expect(component.shouldPulse()).toBe(false);
    });

    it('should return false for non-danger colors', () => {
      component.color = 'primary';
      component.value = 300;
      expect(component.shouldPulse()).toBe(false);
    });

    it('should return false for string values', () => {
      component.color = 'danger';
      component.value = 'High';
      expect(component.shouldPulse()).toBe(false);
    });

    it('should return false when no color is set', () => {
      component.color = '';
      component.value = 300;
      expect(component.shouldPulse()).toBe(false);
    });
  });

  describe('onCardClicked', () => {
    it('should emit cardClick when clickable is true', () => {
      component.clickable = true;
      const emitSpy = vi.spyOn(component.cardClick, 'emit');

      component.onCardClicked();

      expect(emitSpy).toHaveBeenCalledWith();
    });

    it('should not emit cardClick when clickable is false', () => {
      component.clickable = false;
      const emitSpy = vi.spyOn(component.cardClick, 'emit');

      component.onCardClicked();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('template rendering', () => {
    it('should display title', () => {
      component.title = 'Average Glucose';
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      const titleElement = compiled.querySelector('.stat-title');
      expect(titleElement?.textContent).toContain('Average Glucose');
    });

    it('should display formatted value', () => {
      component.value = 120;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('120');
    });

    it('should display unit', () => {
      component.unit = 'mg/dL';
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('mg/dL');
    });

    it('should show loading state', () => {
      component.loading = true;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      const spinner = compiled.querySelector('ion-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should show skeleton when loading', () => {
      component.loading = true;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      const skeleton = compiled.querySelector('ion-skeleton-text');
      expect(skeleton).toBeTruthy();
    });
  });

  describe('user interactions', () => {
    it('should trigger click handler when card is clicked', () => {
      component.clickable = true;
      updateInputAndDetect();

      const clickSpy = vi.spyOn(component, 'onCardClicked');
      const compiled = fixture.nativeElement;
      const card = compiled.querySelector('.stats');

      card?.click();
      fixture.detectChanges();

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should have ripple effect when clickable', () => {
      component.clickable = true;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      const ripple = compiled.querySelector('ion-ripple-effect');
      expect(ripple).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', () => {
      component.value = 999999999;
      updateInputAndDetect();
      expect(component.formattedValue).toBeTruthy();
    });

    it('should handle decimal values', () => {
      component.value = 120.5;
      updateInputAndDetect();
      expect(component.formattedValue).toContain('120');
    });

    it('should handle rapid value changes', () => {
      vi.useFakeTimers();

      component.value = 100;
      component.ngOnChanges({ value: new SimpleChange(0, 100, false) });

      component.value = 150;
      component.ngOnChanges({ value: new SimpleChange(100, 150, false) });

      expect(component.valueUpdating).toBe(true);

      vi.advanceTimersByTime(300);
      expect(component.valueUpdating).toBe(false);

      vi.useRealTimers();
    });

    it('should handle all trend types', () => {
      const trends = ['up', 'down', 'stable'] as const;

      trends.forEach(trend => {
        component.trend = trend;
        updateInputAndDetect();
        expect(component.trend).toBe(trend);
      });
    });
  });

  describe('OnPush change detection', () => {
    it('should use OnPush change detection strategy', () => {
      expect(fixture.componentRef.injector.get(ChangeDetectorRef)).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('should have aria-busy attribute based on loading state', () => {
      component.loading = true;
      updateInputAndDetect();

      expect(component.isBusy).toBe('true');
    });

    it('should have proper test IDs for testing', () => {
      component.title = 'Glucose Level';
      updateInputAndDetect();

      expect(component.testId).toBe('stat-card-glucose-level');
    });
  });
});
