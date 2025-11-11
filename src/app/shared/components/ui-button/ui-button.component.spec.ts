import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { UiButtonComponent } from './ui-button.component';

describe('UiButtonComponent', () => {
  let component: UiButtonComponent;
  let fixture: ComponentFixture<UiButtonComponent>;
  let buttonElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UiButtonComponent);
    component = fixture.componentInstance;
    buttonElement = fixture.debugElement.query(By.css('button'));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Variants', () => {
    it('should apply primary variant classes by default', () => {
      expect(component.variantClasses).toContain('bg-primary');
    });

    it('should apply secondary variant classes', () => {
      component.variant = 'secondary';
      expect(component.variantClasses).toContain('bg-gray-200');
    });

    it('should apply danger variant classes', () => {
      component.variant = 'danger';
      expect(component.variantClasses).toContain('bg-danger');
    });

    it('should apply ghost variant classes', () => {
      component.variant = 'ghost';
      expect(component.variantClasses).toContain('bg-transparent');
    });
  });

  describe('Sizes', () => {
    it('should apply medium size classes by default', () => {
      expect(component.sizeClasses).toContain('px-4');
      expect(component.sizeClasses).toContain('py-2');
    });

    it('should apply small size classes', () => {
      component.size = 'sm';
      expect(component.sizeClasses).toContain('px-3');
      expect(component.sizeClasses).toContain('py-1.5');
    });

    it('should apply large size classes', () => {
      component.size = 'lg';
      expect(component.sizeClasses).toContain('px-6');
      expect(component.sizeClasses).toContain('py-3');
    });
  });

  describe('States', () => {
    it('should be enabled by default', () => {
      expect(component.isDisabled).toBe(false);
      expect(buttonElement.nativeElement.disabled).toBe(false);
    });

    it('should be disabled when disabled input is true', () => {
      component.disabled = true;
      fixture.detectChanges();
      expect(component.isDisabled).toBe(true);
      expect(buttonElement.nativeElement.disabled).toBe(true);
    });

    it('should be disabled when loading', () => {
      component.loading = true;
      fixture.detectChanges();
      expect(component.isDisabled).toBe(true);
      expect(buttonElement.nativeElement.disabled).toBe(true);
    });

    it('should show loading spinner when loading', () => {
      component.loading = true;
      fixture.detectChanges();
      const spinner = fixture.debugElement.query(By.css('svg.animate-spin'));
      expect(spinner).toBeTruthy();
    });

    it('should set aria-busy when loading', () => {
      component.loading = true;
      fixture.detectChanges();
      expect(buttonElement.nativeElement.getAttribute('aria-busy')).toBe('true');
    });
  });

  describe('Icons', () => {
    it('should not show icon by default', () => {
      const icon = fixture.debugElement.query(By.css('ion-icon'));
      expect(icon).toBeFalsy();
    });

    it('should show leading icon when icon input is provided', () => {
      component.icon = 'heart';
      fixture.detectChanges();
      const icons = fixture.debugElement.queryAll(By.css('ion-icon'));
      expect(icons.length).toBe(1);
      expect(icons[0].nativeElement.getAttribute('name')).toBe('heart');
    });

    it('should show trailing icon when iconTrailing input is provided', () => {
      component.iconTrailing = 'arrow-forward';
      fixture.detectChanges();
      const icons = fixture.debugElement.queryAll(By.css('ion-icon'));
      expect(icons.length).toBe(1);
      expect(icons[0].nativeElement.getAttribute('name')).toBe('arrow-forward');
    });

    it('should hide icons when loading', () => {
      component.icon = 'heart';
      component.iconTrailing = 'arrow-forward';
      component.loading = true;
      fixture.detectChanges();
      const icons = fixture.debugElement.queryAll(By.css('ion-icon'));
      expect(icons.length).toBe(0);
    });
  });

  describe('Full Width', () => {
    it('should not be full width by default', () => {
      expect(component.widthClass).toBe('');
    });

    it('should apply full width class when fullWidth is true', () => {
      component.fullWidth = true;
      expect(component.widthClass).toBe('w-full');
    });
  });

  describe('Events', () => {
    it('should emit click event when clicked', () => {
      spyOn(component.buttonClick, 'emit');
      buttonElement.nativeElement.click();
      expect(component.buttonClick.emit).toHaveBeenCalled();
    });

    it('should not emit click event when disabled', () => {
      component.disabled = true;
      fixture.detectChanges();
      spyOn(component.buttonClick, 'emit');
      component.onClick(new MouseEvent('click'));
      expect(component.buttonClick.emit).not.toHaveBeenCalled();
    });

    it('should not emit click event when loading', () => {
      component.loading = true;
      fixture.detectChanges();
      spyOn(component.buttonClick, 'emit');
      component.onClick(new MouseEvent('click'));
      expect(component.buttonClick.emit).not.toHaveBeenCalled();
    });
  });

  describe('Button Type', () => {
    it('should have button type by default', () => {
      expect(buttonElement.nativeElement.type).toBe('button');
    });

    it('should accept submit type', () => {
      component.type = 'submit';
      fixture.detectChanges();
      expect(buttonElement.nativeElement.type).toBe('submit');
    });

    it('should accept reset type', () => {
      component.type = 'reset';
      fixture.detectChanges();
      expect(buttonElement.nativeElement.type).toBe('reset');
    });
  });
});
