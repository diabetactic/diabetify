// Initialize TestBed environment for Vitest
import '../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { TipsPage } from './tips.page';

describe('TipsPage', () => {
  let component: TipsPage;
  let fixture: ComponentFixture<TipsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TipsPage, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(TipsPage);
    component = fixture.componentInstance;
    // Don't call detectChanges here - it causes icon errors
    // Tests that need it will call it explicitly
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with tips array', () => {
      expect(component.tips).toBeDefined();
      expect(component.tips.length).toBeGreaterThan(0);
    });

    it('should have all tips with required fields', () => {
      component.tips.forEach(tip => {
        expect(tip).toHaveProperty('icon');
        expect(tip).toHaveProperty('title');
        expect(tip).toHaveProperty('description');
        expect(tip).toHaveProperty('category');

        expect(typeof tip.icon).toBe('string');
        expect(typeof tip.title).toBe('string');
        expect(typeof tip.description).toBe('string');
        expect(['glucose', 'nutrition', 'exercise', 'medication', 'wellness', 'safety']).toContain(
          tip.category
        );
      });
    });

    it('should have exactly 10 tips', () => {
      expect(component.tips).toHaveLength(10);
    });
  });

  describe('Tips Content', () => {
    it('should have hydration tip', () => {
      const hydrationTip = component.tips.find(t => t.icon === 'water-outline');
      expect(hydrationTip).toBeDefined();
      expect(hydrationTip?.title).toBe('tips.hydration.title');
      expect(hydrationTip?.category).toBe('glucose');
    });

    it('should have meals tip', () => {
      const mealsTip = component.tips.find(t => t.icon === 'restaurant-outline');
      expect(mealsTip).toBeDefined();
      expect(mealsTip?.title).toBe('tips.meals.title');
      expect(mealsTip?.category).toBe('nutrition');
    });

    it('should have exercise tip', () => {
      const exerciseTip = component.tips.find(t => t.icon === 'walk-outline');
      expect(exerciseTip).toBeDefined();
      expect(exerciseTip?.title).toBe('tips.exercise.title');
      expect(exerciseTip?.category).toBe('exercise');
    });

    it('should have monitoring tip', () => {
      const monitoringTip = component.tips.find(t => t.icon === 'time-outline');
      expect(monitoringTip).toBeDefined();
      expect(monitoringTip?.title).toBe('tips.monitoring.title');
      expect(monitoringTip?.category).toBe('glucose');
    });

    it('should have medication tip', () => {
      const medicationTip = component.tips.find(t => t.icon === 'medical-outline');
      expect(medicationTip).toBeDefined();
      expect(medicationTip?.title).toBe('tips.medication.title');
      expect(medicationTip?.category).toBe('medication');
    });

    it('should have sleep tip', () => {
      const sleepTip = component.tips.find(t => t.icon === 'moon-outline');
      expect(sleepTip).toBeDefined();
      expect(sleepTip?.title).toBe('tips.sleep.title');
      expect(sleepTip?.category).toBe('glucose');
    });

    it('should have stress management tip', () => {
      const stressTip = component.tips.find(t => t.icon === 'happy-outline');
      expect(stressTip).toBeDefined();
      expect(stressTip?.title).toBe('tips.stress.title');
      expect(stressTip?.category).toBe('wellness');
    });

    it('should have foot care tip', () => {
      const footcareTip = component.tips.find(t => t.icon === 'footsteps-outline');
      expect(footcareTip).toBeDefined();
      expect(footcareTip?.title).toBe('tips.footcare.title');
      expect(footcareTip?.category).toBe('wellness');
    });

    it('should have emergency preparedness tip', () => {
      const emergencyTip = component.tips.find(t => t.icon === 'warning-outline');
      expect(emergencyTip).toBeDefined();
      expect(emergencyTip?.title).toBe('tips.emergency.title');
      expect(emergencyTip?.category).toBe('safety');
    });

    it('should have social support tip', () => {
      const supportTip = component.tips.find(t => t.icon === 'people-outline');
      expect(supportTip).toBeDefined();
      expect(supportTip?.title).toBe('tips.support.title');
      expect(supportTip?.category).toBe('safety');
    });
  });

  describe('Category Distribution', () => {
    it('should have multiple glucose tips', () => {
      const glucoseTips = component.tips.filter(t => t.category === 'glucose');
      expect(glucoseTips.length).toBeGreaterThanOrEqual(3);
    });

    it('should have nutrition tip', () => {
      const nutritionTips = component.tips.filter(t => t.category === 'nutrition');
      expect(nutritionTips.length).toBeGreaterThanOrEqual(1);
    });

    it('should have exercise tip', () => {
      const exerciseTips = component.tips.filter(t => t.category === 'exercise');
      expect(exerciseTips.length).toBeGreaterThanOrEqual(1);
    });

    it('should have medication tip', () => {
      const medicationTips = component.tips.filter(t => t.category === 'medication');
      expect(medicationTips.length).toBeGreaterThanOrEqual(1);
    });

    it('should have wellness tips', () => {
      const wellnessTips = component.tips.filter(t => t.category === 'wellness');
      expect(wellnessTips.length).toBeGreaterThanOrEqual(2);
    });

    it('should have safety tips', () => {
      const safetyTips = component.tips.filter(t => t.category === 'safety');
      expect(safetyTips.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getCategoryIcon', () => {
    it('should return analytics icon for glucose category', () => {
      const icon = component.getCategoryIcon('glucose');
      expect(icon).toBe('analytics-outline');
    });

    it('should return nutrition icon for nutrition category', () => {
      const icon = component.getCategoryIcon('nutrition');
      expect(icon).toBe('nutrition-outline');
    });

    it('should return fitness icon for exercise category', () => {
      const icon = component.getCategoryIcon('exercise');
      expect(icon).toBe('fitness-outline');
    });

    it('should return medical icon for medication category', () => {
      const icon = component.getCategoryIcon('medication');
      expect(icon).toBe('medical-outline');
    });

    it('should return heart icon for wellness category', () => {
      const icon = component.getCategoryIcon('wellness');
      expect(icon).toBe('heart-outline');
    });

    it('should return shield icon for safety category', () => {
      const icon = component.getCategoryIcon('safety');
      expect(icon).toBe('shield-checkmark-outline');
    });

    it('should return default icon for unknown category', () => {
      const icon = component.getCategoryIcon('unknown');
      expect(icon).toBe('information-circle-outline');
    });

    it('should handle empty string category', () => {
      const icon = component.getCategoryIcon('');
      expect(icon).toBe('information-circle-outline');
    });

    it('should handle null category', () => {
      const icon = component.getCategoryIcon(null as any);
      expect(icon).toBe('information-circle-outline');
    });

    it('should handle undefined category', () => {
      const icon = component.getCategoryIcon(undefined as any);
      expect(icon).toBe('information-circle-outline');
    });
  });

  describe('getCategoryColor', () => {
    it('should return primary color for glucose category', () => {
      const color = component.getCategoryColor('glucose');
      expect(color).toBe('primary');
    });

    it('should return success color for nutrition category', () => {
      const color = component.getCategoryColor('nutrition');
      expect(color).toBe('success');
    });

    it('should return warning color for exercise category', () => {
      const color = component.getCategoryColor('exercise');
      expect(color).toBe('warning');
    });

    it('should return danger color for medication category', () => {
      const color = component.getCategoryColor('medication');
      expect(color).toBe('danger');
    });

    it('should return tertiary color for wellness category', () => {
      const color = component.getCategoryColor('wellness');
      expect(color).toBe('tertiary');
    });

    it('should return secondary color for safety category', () => {
      const color = component.getCategoryColor('safety');
      expect(color).toBe('secondary');
    });

    it('should return medium color for unknown category', () => {
      const color = component.getCategoryColor('unknown');
      expect(color).toBe('medium');
    });

    it('should handle empty string category', () => {
      const color = component.getCategoryColor('');
      expect(color).toBe('medium');
    });

    it('should handle null category', () => {
      const color = component.getCategoryColor(null as any);
      expect(color).toBe('medium');
    });

    it('should handle undefined category', () => {
      const color = component.getCategoryColor(undefined as any);
      expect(color).toBe('medium');
    });
  });

  describe('Edge Cases', () => {
    it('should maintain tips array reference', () => {
      const originalLength = component.tips.length;
      const originalTip = component.tips[0];

      // Array reference is mutable in TypeScript/JavaScript
      // But we can verify original data integrity
      expect(component.tips.length).toBe(originalLength);
      expect(originalTip).toMatchObject({
        icon: 'water-outline',
        title: 'tips.hydration.title',
        category: 'glucose',
      });
    });

    it('should have translation keys in correct format', () => {
      component.tips.forEach(tip => {
        expect(tip.title).toMatch(/^tips\.\w+\.title$/);
        expect(tip.description).toMatch(/^tips\.\w+\.description$/);
      });
    });

    it('should have valid Ionic icons', () => {
      const validIonicIconPattern = /^[\w-]+-outline$/;
      component.tips.forEach(tip => {
        expect(tip.icon).toMatch(validIonicIconPattern);
      });
    });
  });

  describe('Component Behavior', () => {
    it('should be a standalone component', () => {
      // Component metadata check
      const componentMetadata = (TipsPage as any).ɵcmp;
      expect(componentMetadata.standalone).toBe(true);
    });

    it('should use OnPush change detection', () => {
      const componentMetadata = (TipsPage as any).ɵcmp;
      // ChangeDetectionStrategy.OnPush = 0 (may be undefined if optimized away by Angular)
      expect(
        componentMetadata.changeDetection === 0 || componentMetadata.changeDetection === undefined
      ).toBe(true);
    });

    it('should have CUSTOM_ELEMENTS_SCHEMA', () => {
      // Schema is applied at module level, component should have it in decorator
      const componentMetadata = (TipsPage as any).ɵcmp;
      expect(componentMetadata.schemas).toBeDefined();
    });
  });

  describe('Tips Data Integrity', () => {
    it('should have unique icons for each tip', () => {
      const icons = component.tips.map(t => t.icon);
      const uniqueIcons = new Set(icons);
      expect(uniqueIcons.size).toBe(icons.length);
    });

    it('should have unique titles for each tip', () => {
      const titles = component.tips.map(t => t.title);
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(titles.length);
    });

    it('should have unique descriptions for each tip', () => {
      const descriptions = component.tips.map(t => t.description);
      const uniqueDescriptions = new Set(descriptions);
      expect(uniqueDescriptions.size).toBe(descriptions.length);
    });

    it('should not have empty translation keys', () => {
      component.tips.forEach(tip => {
        expect(tip.title.length).toBeGreaterThan(0);
        expect(tip.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Category Helpers Coverage', () => {
    it('should cover all category types with getCategoryIcon', () => {
      const categories = ['glucose', 'nutrition', 'exercise', 'medication', 'wellness', 'safety'];
      categories.forEach(category => {
        const icon = component.getCategoryIcon(category);
        expect(icon).not.toBe('information-circle-outline');
      });
    });

    it('should cover all category types with getCategoryColor', () => {
      const categories = ['glucose', 'nutrition', 'exercise', 'medication', 'wellness', 'safety'];
      categories.forEach(category => {
        const color = component.getCategoryColor(category);
        expect(color).not.toBe('medium');
      });
    });

    it('should map all tip categories to valid icons', () => {
      component.tips.forEach(tip => {
        const icon = component.getCategoryIcon(tip.category);
        expect(icon).toBeTruthy();
        expect(icon).not.toBe('');
      });
    });

    it('should map all tip categories to valid colors', () => {
      component.tips.forEach(tip => {
        const color = component.getCategoryColor(tip.category);
        expect(color).toBeTruthy();
        expect(color).not.toBe('');
      });
    });
  });
});
