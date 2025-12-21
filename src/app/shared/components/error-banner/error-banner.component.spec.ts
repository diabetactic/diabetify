// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ErrorBannerComponent, ErrorSeverity } from './error-banner.component';
import { CommonModule } from '@angular/common';
import { IonButton } from '@ionic/angular/standalone';

describe('ErrorBannerComponent', () => {
  let component: ErrorBannerComponent;
  let fixture: ComponentFixture<ErrorBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, TranslateModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(ErrorBannerComponent, {
        set: {
          imports: [CommonModule, IonButton, TranslateModule],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ErrorBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('default values', () => {
    it('should have empty message by default', () => {
      expect(component.message).toBe('');
    });

    it('should have error severity by default', () => {
      expect(component.severity).toBe('error');
    });

    it('should be dismissible by default', () => {
      expect(component.dismissible).toBe(true);
    });

    it('should not be retryable by default', () => {
      expect(component.retryable).toBe(false);
    });

    it('should have default retryText', () => {
      expect(component.retryText).toBe('common.retry');
    });
  });

  describe('severityClass getter', () => {
    it('should return alert-error for error severity', () => {
      component.severity = 'error';
      expect(component.severityClass).toBe('alert-error');
    });

    it('should return alert-warning for warning severity', () => {
      component.severity = 'warning';
      expect(component.severityClass).toBe('alert-warning');
    });

    it('should return alert-info for info severity', () => {
      component.severity = 'info';
      expect(component.severityClass).toBe('alert-info');
    });

    it('should return alert-error for unknown severity', () => {
      component.severity = 'unknown' as ErrorSeverity;
      expect(component.severityClass).toBe('alert-error');
    });
  });

  describe('iconName getter', () => {
    it('should return alert-circle for error severity', () => {
      component.severity = 'error';
      expect(component.iconName).toBe('alert-circle');
    });

    it('should return alert-triangle for warning severity', () => {
      component.severity = 'warning';
      expect(component.iconName).toBe('alert-triangle');
    });

    it('should return info for info severity', () => {
      component.severity = 'info';
      expect(component.iconName).toBe('info');
    });

    it('should return alert-circle for unknown severity', () => {
      component.severity = 'unknown' as ErrorSeverity;
      expect(component.iconName).toBe('alert-circle');
    });
  });

  describe('onDismiss method', () => {
    it('should emit dismissed event', () => {
      const dismissedSpy = vi.spyOn(component.dismissed, 'emit');
      component.onDismiss();
      expect(dismissedSpy).toHaveBeenCalled();
    });
  });

  describe('onRetry method', () => {
    it('should emit retry event', () => {
      const retrySpy = vi.spyOn(component.retry, 'emit');
      component.onRetry();
      expect(retrySpy).toHaveBeenCalled();
    });
  });

  describe('input binding', () => {
    it('should accept message input', () => {
      component.message = 'Test error message';
      expect(component.message).toBe('Test error message');
    });

    it('should accept severity input', () => {
      component.severity = 'warning';
      expect(component.severity).toBe('warning');
    });

    it('should accept dismissible input', () => {
      component.dismissible = false;
      expect(component.dismissible).toBe(false);
    });

    it('should accept retryable input', () => {
      component.retryable = true;
      expect(component.retryable).toBe(true);
    });

    it('should accept retryText input', () => {
      component.retryText = 'Try again';
      expect(component.retryText).toBe('Try again');
    });
  });

  describe('output events', () => {
    it('should have dismissed output', () => {
      expect(component.dismissed).toBeDefined();
    });

    it('should have retry output', () => {
      expect(component.retry).toBeDefined();
    });
  });

  describe('severity combinations', () => {
    it('should handle error severity correctly', () => {
      // Default severity is error, no change needed
      expect(component.severityClass).toBe('alert-error');
      expect(component.iconName).toBe('alert-circle');
    });

    it('should handle warning severity correctly', () => {
      // Create a fresh component with warning severity
      const warningFixture = TestBed.createComponent(ErrorBannerComponent);
      const warningComponent = warningFixture.componentInstance;
      warningComponent.severity = 'warning';
      warningFixture.detectChanges();

      expect(warningComponent.severityClass).toBe('alert-warning');
      expect(warningComponent.iconName).toBe('alert-triangle');
    });

    it('should handle info severity correctly', () => {
      // Create a fresh component with info severity
      const infoFixture = TestBed.createComponent(ErrorBannerComponent);
      const infoComponent = infoFixture.componentInstance;
      infoComponent.severity = 'info';
      infoFixture.detectChanges();

      expect(infoComponent.severityClass).toBe('alert-info');
      expect(infoComponent.iconName).toBe('info');
    });
  });
});
