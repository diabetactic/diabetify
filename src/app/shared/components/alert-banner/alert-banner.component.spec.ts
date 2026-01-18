// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertBannerComponent, AlertType } from './alert-banner.component';

describe('AlertBannerComponent', () => {
  let component: AlertBannerComponent;
  let fixture: ComponentFixture<AlertBannerComponent>;
  let cdr: ChangeDetectorRef;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertBannerComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertBannerComponent);
    component = fixture.componentInstance;
    cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    fixture.detectChanges();
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
      expect(component.type).toBe('info');
      expect(component.message).toBe('');
      expect(component.dismissible).toBe(false);
      expect(component.visible).toBe(true);
    });
  });

  describe('input properties', () => {
    it('should accept type input', () => {
      component.type = 'success';
      updateInputAndDetect();
      expect(component.type).toBe('success');
    });

    it('should accept message input', () => {
      component.message = 'Test message';
      updateInputAndDetect();
      expect(component.message).toBe('Test message');
    });

    it('should accept dismissible input', () => {
      component.dismissible = true;
      updateInputAndDetect();
      expect(component.dismissible).toBe(true);
    });

    it('should handle all valid alert types', () => {
      const types: AlertType[] = ['success', 'info', 'warning'];

      types.forEach(type => {
        component.type = type;
        updateInputAndDetect();
        expect(component.type).toBe(type);
      });
    });
  });

  describe('getIconForType static method', () => {
    it('should return check-circle for success type', () => {
      const icon = AlertBannerComponent.getIconForType('success');
      expect(icon).toBe('check-circle');
    });

    it('should return info for info type', () => {
      const icon = AlertBannerComponent.getIconForType('info');
      expect(icon).toBe('info');
    });

    it('should return alert-triangle for warning type', () => {
      const icon = AlertBannerComponent.getIconForType('warning');
      expect(icon).toBe('alert-triangle');
    });

    it('should return default info icon for unknown type', () => {
      const icon = AlertBannerComponent.getIconForType('unknown' as AlertType);
      expect(icon).toBe('info');
    });
  });

  describe('getIcon instance method', () => {
    it('should delegate to static method', () => {
      const spy = vi.spyOn(AlertBannerComponent, 'getIconForType');
      component.type = 'success';
      component.getIcon();
      expect(spy).toHaveBeenCalledWith('success');
    });

    it('should return correct icon based on component type', () => {
      component.type = 'success';
      expect(component.getIcon()).toBe('check-circle');

      component.type = 'warning';
      expect(component.getIcon()).toBe('alert-triangle');
    });
  });

  describe('dismiss functionality', () => {
    it('should set visible to false when dismissed', () => {
      component.visible = true;
      component.dismiss();
      expect(component.visible).toBe(false);
    });

    it('should emit dismissed event when dismiss is called', () => {
      const emitSpy = vi.spyOn(component.dismissed, 'emit');
      component.dismiss();
      expect(emitSpy).toHaveBeenCalledWith();
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit dismissed event even if already hidden', () => {
      const emitSpy = vi.spyOn(component.dismissed, 'emit');
      component.visible = false;
      component.dismiss();
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should handle multiple dismiss calls', () => {
      const emitSpy = vi.spyOn(component.dismissed, 'emit');

      component.dismiss();
      component.dismiss();
      component.dismiss();

      expect(component.visible).toBe(false);
      expect(emitSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('output events', () => {
    it('should have dismissed output property', () => {
      expect(component.dismissed).toBeDefined();
      expect(component.dismissed.observers.length).toBe(0);
    });

    it('should emit dismissed event on dismiss', () => {
      const emitSpy = vi.spyOn(component.dismissed, 'emit');
      component.dismiss();
      expect(emitSpy).toHaveBeenCalledOnce();
    });
  });

  describe('template rendering', () => {
    it('should display message when provided', () => {
      component.message = 'Important alert message';
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Important alert message');
    });

    it('should show dismiss button when dismissible is true', () => {
      component.dismissible = true;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      const dismissButton = compiled.querySelector('button');
      expect(dismissButton).toBeTruthy();
    });

    it('should hide dismiss button when dismissible is false', () => {
      component.dismissible = false;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      const dismissButton = compiled.querySelector('button');
      expect(dismissButton).toBeFalsy();
    });

    it('should apply correct CSS class based on type', () => {
      const types: AlertType[] = ['success', 'info', 'warning'];

      types.forEach(type => {
        component.type = type;
        updateInputAndDetect();

        const compiled = fixture.nativeElement;
        const banner = compiled.querySelector(`[data-testid="alert-banner-${type}"]`);
        expect(banner).toBeTruthy();
      });
    });

    it('should hide banner when visible is false', () => {
      component.visible = false;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      const banner = compiled.querySelector('[data-testid^="alert-banner"]');
      expect(banner).toBeFalsy();
    });
  });

  describe('user interactions', () => {
    it('should trigger dismiss when dismiss button is clicked', () => {
      component.dismissible = true;
      updateInputAndDetect();

      const dismissSpy = vi.spyOn(component, 'dismiss');
      const compiled = fixture.nativeElement;
      const dismissButton = compiled.querySelector('button');

      dismissButton?.click();
      fixture.detectChanges();

      expect(dismissSpy).toHaveBeenCalled();
    });

    it('should emit dismissed event when button is clicked', () => {
      component.dismissible = true;
      updateInputAndDetect();

      const emitSpy = vi.spyOn(component.dismissed, 'emit');
      const compiled = fixture.nativeElement;
      const dismissButton = compiled.querySelector('button');

      dismissButton?.click();
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', () => {
      component.message = '';
      updateInputAndDetect();

      expect(component.message).toBe('');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      component.message = longMessage;
      updateInputAndDetect();

      expect(component.message).toBe(longMessage);
    });

    it('should handle special characters in message', () => {
      const specialMessage = '<script>alert("xss")</script>';
      component.message = specialMessage;
      updateInputAndDetect();

      expect(component.message).toBe(specialMessage);
      // Verify the template escapes HTML and doesn't execute script
      const compiled = fixture.nativeElement;
      const textContent = compiled.textContent || '';
      expect(textContent).toContain('<script>');
    });

    it('should reset visible state', () => {
      component.visible = true;
      component.dismiss();
      expect(component.visible).toBe(false);

      component.visible = true;
      expect(component.visible).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should render alert banner for accessibility', () => {
      updateInputAndDetect();
      const compiled = fixture.nativeElement;
      const banner = compiled.querySelector('[data-testid^="alert-banner"]');
      expect(banner).toBeTruthy();
    });

    it('should have accessible dismiss button', () => {
      component.dismissible = true;
      updateInputAndDetect();

      const compiled = fixture.nativeElement;
      const dismissButton = compiled.querySelector('button');
      const ariaLabel = dismissButton?.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });
  });

  describe('component lifecycle', () => {
    it('should maintain state after multiple renders', () => {
      component.type = 'success';
      component.message = 'Test';
      component.dismissible = true;
      updateInputAndDetect();

      expect(component.type).toBe('success');
      expect(component.message).toBe('Test');
      expect(component.dismissible).toBe(true);

      updateInputAndDetect();

      expect(component.type).toBe('success');
      expect(component.message).toBe('Test');
      expect(component.dismissible).toBe(true);
    });
  });
});
