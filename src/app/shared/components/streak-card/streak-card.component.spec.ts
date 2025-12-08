import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { StreakCardComponent } from './streak-card.component';

describe('StreakCardComponent', () => {
  let component: StreakCardComponent;
  let fixture: ComponentFixture<StreakCardComponent>;
  let cdr: ChangeDetectorRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreakCardComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(StreakCardComponent);
    component = fixture.componentInstance;
    cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    fixture.detectChanges();
  });

  // Helper to trigger change detection for OnPush components
  function updateInputAndDetect(): void {
    cdr.markForCheck();
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default values', () => {
    it('should have default streak of 0', () => {
      expect(component.streak).toBe(0);
    });

    it('should have default maxStreak of 0', () => {
      expect(component.maxStreak).toBe(0);
    });

    it('should have default timesMeasured of 0', () => {
      expect(component.timesMeasured).toBe(0);
    });

    it('should have default loading of false', () => {
      expect(component.loading).toBe(false);
    });
  });

  describe('currentLevel', () => {
    it('should return starter level for streak 0', () => {
      component.streak = 0;
      expect(component.currentLevel.key).toBe('starter');
      expect(component.currentLevel.emoji).toBe('💪');
    });

    it('should return starter level for streak 2', () => {
      component.streak = 2;
      expect(component.currentLevel.key).toBe('starter');
    });

    it('should return consistent level for streak 3', () => {
      component.streak = 3;
      expect(component.currentLevel.key).toBe('consistent');
      expect(component.currentLevel.emoji).toBe('✨');
    });

    it('should return consistent level for streak 6', () => {
      component.streak = 6;
      expect(component.currentLevel.key).toBe('consistent');
    });

    it('should return dedicated level for streak 7', () => {
      component.streak = 7;
      expect(component.currentLevel.key).toBe('dedicated');
      expect(component.currentLevel.emoji).toBe('🔥');
    });

    it('should return dedicated level for streak 13', () => {
      component.streak = 13;
      expect(component.currentLevel.key).toBe('dedicated');
    });

    it('should return champion level for streak 14', () => {
      component.streak = 14;
      expect(component.currentLevel.key).toBe('champion');
      expect(component.currentLevel.emoji).toBe('⭐');
    });

    it('should return champion level for streak 29', () => {
      component.streak = 29;
      expect(component.currentLevel.key).toBe('champion');
    });

    it('should return legend level for streak 30', () => {
      component.streak = 30;
      expect(component.currentLevel.key).toBe('legend');
      expect(component.currentLevel.emoji).toBe('🏆');
    });

    it('should return legend level for streak 100', () => {
      component.streak = 100;
      expect(component.currentLevel.key).toBe('legend');
    });
  });

  describe('nextLevel', () => {
    it('should return consistent as next level for starter', () => {
      component.streak = 0;
      expect(component.nextLevel?.key).toBe('consistent');
    });

    it('should return dedicated as next level for consistent', () => {
      component.streak = 5;
      expect(component.nextLevel?.key).toBe('dedicated');
    });

    it('should return champion as next level for dedicated', () => {
      component.streak = 10;
      expect(component.nextLevel?.key).toBe('champion');
    });

    it('should return legend as next level for champion', () => {
      component.streak = 20;
      expect(component.nextLevel?.key).toBe('legend');
    });

    it('should return null at legend level', () => {
      component.streak = 30;
      expect(component.nextLevel).toBeNull();
    });

    it('should return null for very high streak', () => {
      component.streak = 365;
      expect(component.nextLevel).toBeNull();
    });
  });

  describe('progressToNextLevel', () => {
    it('should return 0 at start of level', () => {
      component.streak = 0;
      expect(component.progressToNextLevel).toBe(0);
    });

    it('should return 100 at legend level', () => {
      component.streak = 30;
      expect(component.progressToNextLevel).toBe(100);
    });

    it('should calculate progress correctly within consistent level', () => {
      component.streak = 5; // 2 days into consistent (3-6), progress toward dedicated (7)
      // currentMin = 3, nextMin = 7, streak = 5
      // progress = ((5-3) / (7-3)) * 100 = (2/4) * 100 = 50
      expect(component.progressToNextLevel).toBe(50);
    });

    it('should calculate progress at 75% of level', () => {
      component.streak = 6; // 3 days into consistent (3-6)
      // progress = ((6-3) / (7-3)) * 100 = (3/4) * 100 = 75
      expect(component.progressToNextLevel).toBe(75);
    });

    it('should clamp progress to 0-100 range', () => {
      component.streak = 3; // exactly at consistent start
      const progress = component.progressToNextLevel;
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('daysToNextLevel', () => {
    it('should return 3 days to next level from streak 0', () => {
      component.streak = 0;
      expect(component.daysToNextLevel).toBe(3);
    });

    it('should return 2 days to next level from streak 5', () => {
      component.streak = 5;
      expect(component.daysToNextLevel).toBe(2); // 7 - 5 = 2
    });

    it('should return 0 at legend level', () => {
      component.streak = 30;
      expect(component.daysToNextLevel).toBe(0);
    });
  });

  describe('isNewRecord', () => {
    it('should be false when streak is 0', () => {
      component.streak = 0;
      component.maxStreak = 0;
      expect(component.isNewRecord).toBe(false);
    });

    it('should be false when streak is 1', () => {
      component.streak = 1;
      component.maxStreak = 1;
      expect(component.isNewRecord).toBe(false);
    });

    it('should be true when streak equals maxStreak and > 1', () => {
      component.streak = 5;
      component.maxStreak = 5;
      expect(component.isNewRecord).toBe(true);
    });

    it('should be false when streak < maxStreak', () => {
      component.streak = 3;
      component.maxStreak = 5;
      expect(component.isNewRecord).toBe(false);
    });

    it('should be true when streak equals new high maxStreak', () => {
      component.streak = 10;
      component.maxStreak = 10;
      expect(component.isNewRecord).toBe(true);
    });
  });

  describe('gradientClass', () => {
    it('should return green gradient for starter level', () => {
      component.streak = 0;
      expect(component.gradientClass).toContain('green');
    });

    it('should return cyan/blue gradient for consistent level', () => {
      component.streak = 5;
      expect(component.gradientClass).toContain('cyan');
    });

    it('should return orange/red gradient for dedicated level', () => {
      component.streak = 10;
      expect(component.gradientClass).toContain('orange');
    });

    it('should return purple/pink gradient for champion level', () => {
      component.streak = 20;
      expect(component.gradientClass).toContain('purple');
    });

    it('should return amber/yellow gradient for legend level', () => {
      component.streak = 30;
      expect(component.gradientClass).toContain('amber');
    });
  });

  describe('progressBarClass', () => {
    it('should return progress-success for starter level', () => {
      component.streak = 0;
      expect(component.progressBarClass).toBe('progress-success');
    });

    it('should return progress-info for consistent level', () => {
      component.streak = 5;
      expect(component.progressBarClass).toBe('progress-info');
    });

    it('should return progress-error for dedicated level', () => {
      component.streak = 10;
      expect(component.progressBarClass).toBe('progress-error');
    });

    it('should return progress-secondary for champion level', () => {
      component.streak = 20;
      expect(component.progressBarClass).toBe('progress-secondary');
    });

    it('should return progress-warning for legend level', () => {
      component.streak = 30;
      expect(component.progressBarClass).toBe('progress-warning');
    });
  });

  describe('template rendering', () => {
    it('should display streak value', () => {
      component.streak = 7;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      const streakValue = compiled.querySelector('[data-testid="streak-value"]');
      expect(streakValue?.textContent?.trim()).toBe('7');
    });

    it('should display maxStreak value', () => {
      component.maxStreak = 15;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      const maxStreakValue = compiled.querySelector('[data-testid="max-streak-value"]');
      expect(maxStreakValue?.textContent?.trim()).toBe('15');
    });

    it('should display timesMeasured value', () => {
      component.timesMeasured = 42;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      const timesMeasuredValue = compiled.querySelector('[data-testid="times-measured-value"]');
      expect(timesMeasuredValue?.textContent?.trim()).toBe('42');
    });

    it('should show loading state when loading is true', () => {
      component.loading = true;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      // DaisyUI loading spinner uses 'loading' class
      const loadingSpinner = compiled.querySelector('.loading');
      expect(loadingSpinner).toBeTruthy();
    });

    it('should hide content when loading is true', () => {
      component.loading = true;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      // Content is in ng-template #content, hidden when loading
      const streakValue = compiled.querySelector('[data-testid="streak-value"]');
      expect(streakValue).toBeFalsy();
    });
  });
});
