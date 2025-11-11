/**
 * StatCard Component DOM Integration Tests
 * Tests component inputs, outputs, DOM updates, and user interactions
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';

import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import {
  clickElement,
  getElementText,
  hasClass,
  isVisible,
  getComputedStyle,
  waitForElement,
} from '../../helpers/dom-utils';

/**
 * Test host component to properly test inputs/outputs
 */
@Component({
  standalone: true,
  imports: [StatCardComponent, IonicModule],
  template: `
    <app-stat-card
      [title]="title"
      [value]="value"
      [unit]="unit"
      [icon]="icon"
      [color]="color"
      [trend]="trend"
      [trendValue]="trendValue"
      [loading]="loading"
      [error]="error"
      [clickable]="clickable"
      (cardClick)="onCardClick($event)"
    ></app-stat-card>
  `,
})
class TestHostComponent {
  title = 'Average Glucose';
  value: string | number = 120;
  unit = 'mg/dL';
  icon = 'analytics-outline';
  color = 'primary';
  trend: 'up' | 'down' | 'stable' | undefined = 'stable';
  trendValue?: number;
  loading = false;
  error = false;
  clickable = true;

  onCardClick(event: any): void {
    // Handle click
  }
}

describe('StatCard Component DOM Integration', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let statCardElement: DebugElement;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    statCardElement = fixture.debugElement.query(By.directive(StatCardComponent));
    compiled = statCardElement.nativeElement;
  });

  describe('Basic Rendering', () => {
    it('should render with all input properties', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      // Check title
      const title = compiled.querySelector('.title');
      expect(getElementText(title as HTMLElement)).toBe('Average Glucose');

      // Check value
      const value = compiled.querySelector('.stat-card-value');
      expect(getElementText(value as HTMLElement)).toContain('120');

      // Check unit
      const unit = compiled.querySelector('.stat-card-unit');
      expect(getElementText(unit as HTMLElement)).toBe('mg/dL');

      // Check icon
      const icon = compiled.querySelector('ion-icon');
      expect(icon?.getAttribute('name')).toBe('analytics-outline');
    }));

    it('should update DOM when inputs change', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      // Change value
      hostComponent.value = 150;
      fixture.detectChanges();
      tick();

      const value = compiled.querySelector('.stat-card-value');
      expect(getElementText(value as HTMLElement)).toContain('150');

      // Change color
      hostComponent.color = 'danger';
      fixture.detectChanges();
      tick();

      expect(hasClass(compiled, 'stat-card-danger')).toBe(true);
    }));

    it('should format large numbers correctly', fakeAsync(() => {
      hostComponent.value = 1234567;
      fixture.detectChanges();
      tick();

      const value = compiled.querySelector('.stat-card-value');
      expect(getElementText(value as HTMLElement)).toContain('1,234,567');
    }));

    it('should handle string values', fakeAsync(() => {
      hostComponent.value = '75%';
      fixture.detectChanges();
      tick();

      const value = compiled.querySelector('.stat-card-value');
      expect(getElementText(value as HTMLElement)).toBe('75%');
    }));
  });

  describe('Trend Indicators', () => {
    it('should show upward trend with arrow and color', fakeAsync(() => {
      hostComponent.trend = 'up';
      hostComponent.trendValue = 5;
      fixture.detectChanges();
      tick();

      const trendElement = compiled.querySelector('.stat-card-trend');
      expect(trendElement).toBeTruthy();

      const trendIcon = trendElement?.querySelector('ion-icon');
      expect(trendIcon?.getAttribute('name')).toContain('arrow-up');

      expect(hasClass(trendElement as HTMLElement, 'trend-up')).toBe(true);

      const trendText = trendElement?.querySelector('.trend-value');
      expect(getElementText(trendText as HTMLElement)).toContain('+5');
    }));

    it('should show downward trend', fakeAsync(() => {
      hostComponent.trend = 'down';
      hostComponent.trendValue = -3;
      fixture.detectChanges();
      tick();

      const trendElement = compiled.querySelector('.stat-card-trend');
      const trendIcon = trendElement?.querySelector('ion-icon');
      expect(trendIcon?.getAttribute('name')).toContain('arrow-down');

      expect(hasClass(trendElement as HTMLElement, 'trend-down')).toBe(true);

      const trendText = trendElement?.querySelector('.trend-value');
      expect(getElementText(trendText as HTMLElement)).toContain('-3');
    }));

    it('should show stable trend', fakeAsync(() => {
      hostComponent.trend = 'stable';
      fixture.detectChanges();
      tick();

      const trendElement = compiled.querySelector('.stat-card-trend');
      const trendIcon = trendElement?.querySelector('ion-icon');
      expect(trendIcon?.getAttribute('name')).toContain('remove');

      expect(hasClass(trendElement as HTMLElement, 'trend-stable')).toBe(true);
    }));

    it('should hide trend when not provided', fakeAsync(() => {
      hostComponent.trend = undefined;
      fixture.detectChanges();
      tick();

      const trendElement = compiled.querySelector('.stat-card-trend');
      expect(trendElement).toBeFalsy();
    }));
  });

  describe('Loading State', () => {
    it('should show loading spinner', fakeAsync(() => {
      hostComponent.loading = true;
      fixture.detectChanges();
      tick();

      const spinner = compiled.querySelector('ion-spinner');
      expect(spinner).toBeTruthy();
      expect(isVisible(spinner as HTMLElement)).toBe(true);

      // Inner content should be hidden
      const innerContent = compiled.querySelector('.stat-card-inner');
      expect(innerContent).toBeFalsy();
    }));

    it('should show skeleton loader for text', fakeAsync(() => {
      hostComponent.loading = true;
      fixture.detectChanges();
      tick();

      const skeletons = compiled.querySelectorAll('ion-skeleton-text');
      expect(skeletons.length).toBeGreaterThan(0);

      // Check skeleton animation
      const skeleton = skeletons[0] as HTMLElement;
      const animation = getComputedStyle(skeleton, 'animation-name');
      expect(animation).toBeTruthy();
    }));

    it('should transition from loading to loaded', fakeAsync(() => {
      hostComponent.loading = true;
      fixture.detectChanges();
      tick();

      expect(compiled.querySelector('ion-spinner')).toBeTruthy();

      hostComponent.loading = false;
      hostComponent.value = 125;
      fixture.detectChanges();
      tick();

      expect(compiled.querySelector('ion-spinner')).toBeFalsy();

      const value = compiled.querySelector('.stat-card-value');
      expect(getElementText(value as HTMLElement)).toContain('125');
    }));
  });

  describe('Error State', () => {
    it('should show error message', fakeAsync(() => {
      hostComponent.error = true;
      fixture.detectChanges();
      tick();

      const errorElement = compiled.querySelector('.stat-card-error');
      expect(errorElement).toBeTruthy();
      expect(getElementText(errorElement as HTMLElement)).toContain('Unable to load');

      // Error icon should be visible
      const errorIcon = errorElement?.querySelector('ion-icon');
      expect(errorIcon?.getAttribute('name')).toContain('alert');
    }));

    it('should apply error styling', fakeAsync(() => {
      hostComponent.error = true;
      fixture.detectChanges();
      tick();

      expect(hasClass(compiled, 'stat-card-error-state')).toBe(true);

      // Check if error state styling is applied
      const card = compiled.querySelector('ion-card');
      expect(card).toBeTruthy();
    }));

    it('should show retry button in error state', fakeAsync(() => {
      hostComponent.error = true;
      hostComponent.clickable = true;
      fixture.detectChanges();
      tick();

      const retryButton = compiled.querySelector('.retry-button');
      expect(retryButton).toBeTruthy();
      expect(getElementText(retryButton as HTMLElement)).toContain('Retry');
    }));
  });

  describe('Click Interactions', () => {
    it('should emit click event when clickable', fakeAsync(() => {
      hostComponent.clickable = true;
      fixture.detectChanges();
      tick();

      spyOn(hostComponent, 'onCardClick');

      clickElement(compiled, fixture);
      tick();

      expect(hostComponent.onCardClick).toHaveBeenCalled();
    }));

    it('should show hover effect when clickable', fakeAsync(() => {
      hostComponent.clickable = true;
      fixture.detectChanges();
      tick();

      expect(hasClass(compiled, 'stat-card-clickable')).toBe(true);

      const cursor = getComputedStyle(compiled, 'cursor');
      expect(cursor).toBe('pointer');
    }));

    it('should not emit click when not clickable', fakeAsync(() => {
      hostComponent.clickable = false;
      fixture.detectChanges();
      tick();

      spyOn(hostComponent, 'onCardClick');

      clickElement(compiled, fixture);
      tick();

      expect(hostComponent.onCardClick).not.toHaveBeenCalled();
    }));

    it('should show ripple effect on click', fakeAsync(() => {
      hostComponent.clickable = true;
      fixture.detectChanges();
      tick();

      const ripple = compiled.querySelector('ion-ripple-effect');
      expect(ripple).toBeTruthy();
    }));
  });

  describe('Color Themes', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'dark', 'light'];

    colors.forEach(color => {
      it(`should apply ${color} color theme`, fakeAsync(() => {
        hostComponent.color = color;
        fixture.detectChanges();
        tick();

        expect(hasClass(compiled, `stat-card-${color}`)).toBe(true);

        // Check if color CSS variable is applied
        const colorValue = getComputedStyle(compiled, `--ion-color-${color}`);
        expect(colorValue).toBeTruthy();
      }));
    });

    it('should change icon color based on theme', fakeAsync(() => {
      hostComponent.color = 'success';
      fixture.detectChanges();
      tick();

      const icon = compiled.querySelector('ion-icon');
      expect(icon?.getAttribute('color')).toBe('success');
    }));
  });

  describe('Animations', () => {
    it('should animate value changes', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const valueElement = compiled.querySelector('.stat-card-value') as HTMLElement;

      // Trigger value change
      hostComponent.value = 150;
      fixture.detectChanges();
      tick();

      // Check for animation class on the value element
      const updatedValueElement = compiled.querySelector('.stat-card-value') as HTMLElement;
      expect(hasClass(updatedValueElement, 'value-updating')).toBe(true);

      tick(301); // Animation duration + 1ms
      fixture.detectChanges();

      // Animation should have completed
      expect(hasClass(updatedValueElement, 'value-updating')).toBe(false);
    }));

    it('should pulse on important updates', fakeAsync(() => {
      hostComponent.value = 250; // High value
      hostComponent.color = 'danger';
      fixture.detectChanges();
      tick();

      expect(hasClass(compiled, 'stat-card-pulse')).toBe(true);

      // Check pulse animation
      const animation = getComputedStyle(compiled, 'animation-name');
      expect(animation).toContain('pulse');
    }));
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for small screens', fakeAsync(() => {
      // Simulate small viewport
      (compiled as any).style.width = '200px';
      fixture.detectChanges();
      tick();

      // Title and value should exist
      const title = compiled.querySelector('.stat-card-title') as HTMLElement;
      const value = compiled.querySelector('.stat-card-value') as HTMLElement;

      expect(title).toBeTruthy();
      expect(value).toBeTruthy();
    }));

    it('should truncate long titles with ellipsis', fakeAsync(() => {
      hostComponent.title = 'This is a very long title that should be truncated';
      fixture.detectChanges();
      tick();

      const title = compiled.querySelector('.stat-card-title') as HTMLElement;
      const overflow = getComputedStyle(title, 'text-overflow');
      expect(overflow).toBe('ellipsis');

      const whiteSpace = getComputedStyle(title, 'white-space');
      expect(whiteSpace).toBe('nowrap');
    }));

    it('should show tooltip for truncated text', fakeAsync(() => {
      hostComponent.title = 'This is a very long title that should be truncated';
      fixture.detectChanges();
      tick();

      const title = compiled.querySelector('.title') as HTMLElement;
      expect(title.getAttribute('title')).toBe(hostComponent.title);
    }));
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const ionCard = compiled.querySelector('ion-card');
      expect(ionCard?.getAttribute('role')).toBe('article');
      expect(ionCard?.getAttribute('aria-label')).toContain('Average Glucose');

      const value = compiled.querySelector('.stat-card-value');
      expect(value?.getAttribute('aria-live')).toBe('polite');
    }));

    it('should be keyboard accessible when clickable', fakeAsync(() => {
      hostComponent.clickable = true;
      fixture.detectChanges();
      tick();

      const ionCard = compiled.querySelector('ion-card') as HTMLElement;
      expect(ionCard?.getAttribute('tabindex')).toBe('0');

      ionCard.focus();
      fixture.detectChanges();
      tick();

      // Simulate Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(hostComponent, 'onCardClick');

      ionCard?.dispatchEvent(enterEvent);
      fixture.detectChanges();
      tick();

      expect(hostComponent.onCardClick).toHaveBeenCalled();
    }));

    it('should announce value changes to screen readers', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const value = compiled.querySelector('.stat-card-value');
      expect(value?.getAttribute('aria-live')).toBe('polite');

      hostComponent.value = 150;
      fixture.detectChanges();
      tick();

      expect(value?.getAttribute('aria-label')).toContain('150');
    }));

    it('should indicate loading state to screen readers', fakeAsync(() => {
      hostComponent.loading = true;
      fixture.detectChanges();
      tick();

      // aria-busy is set on the component host element
      const componentElement = fixture.debugElement.query(
        By.directive(StatCardComponent)
      ).nativeElement;
      expect(componentElement.getAttribute('aria-busy')).toBe('true');

      const loadingText = compiled.querySelector('.sr-only');
      expect(getElementText(loadingText as HTMLElement)).toContain('Loading');
    }));
  });

  describe('Custom Content Projection', () => {
    beforeEach(async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [IonicModule.forRoot(), TestHostComponent],
      })
        .overrideTemplate(
          TestHostComponent,
          `
        <app-stat-card [title]="title" [value]="value">
          <div class="custom-footer" slot="footer">
            <button>View Details</button>
          </div>
        </app-stat-card>
      `
        )
        .compileComponents();

      fixture = TestBed.createComponent(TestHostComponent);
      hostComponent = fixture.componentInstance;
      statCardElement = fixture.debugElement.query(By.directive(StatCardComponent));
      compiled = statCardElement.nativeElement;
    });

    it('should support custom footer content', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const footer = fixture.nativeElement.querySelector('.custom-footer');
      expect(footer).toBeTruthy();
      expect(footer.querySelector('button')).toBeTruthy();
    }));
  });

  describe('Performance', () => {
    it('should debounce rapid value changes', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const valueElement = compiled.querySelector('.stat-card-value');
      const initialRenders = 1;

      // Rapid value changes
      for (let i = 0; i < 10; i++) {
        hostComponent.value = 100 + i;
        fixture.detectChanges();
      }

      tick(300); // Debounce delay

      // Should only render final value
      expect(getElementText(valueElement as HTMLElement)).toContain('109');
    }));
  });

  afterEach(() => {
    fixture.destroy();
  });
});
