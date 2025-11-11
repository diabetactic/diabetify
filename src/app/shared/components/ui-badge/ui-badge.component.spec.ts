import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { UiBadgeComponent } from './ui-badge.component';

describe('UiBadgeComponent', () => {
  let component: UiBadgeComponent;
  let fixture: ComponentFixture<UiBadgeComponent>;
  let badgeElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UiBadgeComponent);
    component = fixture.componentInstance;
    badgeElement = fixture.debugElement.query(By.css('span[role="status"]'));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Variants', () => {
    it('should apply neutral variant by default', () => {
      expect(component.variantClasses).toContain('bg-gray-500');
    });

    it('should apply success variant classes', () => {
      component.variant = 'success';
      expect(component.variantClasses).toContain('bg-success');
    });

    it('should apply warning variant classes', () => {
      component.variant = 'warning';
      expect(component.variantClasses).toContain('bg-warning');
    });

    it('should apply danger variant classes', () => {
      component.variant = 'danger';
      expect(component.variantClasses).toContain('bg-danger');
    });

    it('should apply info variant classes', () => {
      component.variant = 'info';
      expect(component.variantClasses).toContain('bg-primary');
    });
  });

  describe('Styles', () => {
    it('should apply solid style by default', () => {
      component.variant = 'success';
      expect(component.variantClasses).toContain('bg-success');
      expect(component.variantClasses).toContain('text-white');
    });

    it('should apply outlined style', () => {
      component.variant = 'success';
      component.badgeStyle = 'outlined';
      expect(component.variantClasses).toContain('border-2');
      expect(component.variantClasses).toContain('border-success');
      expect(component.variantClasses).toContain('bg-transparent');
    });

    it('should apply subtle style', () => {
      component.variant = 'success';
      component.badgeStyle = 'subtle';
      expect(component.variantClasses).toContain('bg-green-100');
      expect(component.variantClasses).toContain('text-green-800');
    });
  });

  describe('Sizes', () => {
    it('should apply medium size by default', () => {
      expect(component.sizeClasses).toContain('px-2.5');
      expect(component.sizeClasses).toContain('py-1');
      expect(component.sizeClasses).toContain('text-sm');
    });

    it('should apply small size', () => {
      component.size = 'sm';
      expect(component.sizeClasses).toContain('px-2');
      expect(component.sizeClasses).toContain('py-0.5');
      expect(component.sizeClasses).toContain('text-xs');
    });

    it('should apply large size', () => {
      component.size = 'lg';
      expect(component.sizeClasses).toContain('px-3');
      expect(component.sizeClasses).toContain('py-1.5');
      expect(component.sizeClasses).toContain('text-base');
    });
  });

  describe('Rounded', () => {
    it('should apply rounded-md by default', () => {
      expect(component.roundedClasses).toBe('rounded-md');
    });

    it('should apply rounded-full when rounded is true', () => {
      component.rounded = true;
      expect(component.roundedClasses).toBe('rounded-full');
    });
  });

  describe('Icon', () => {
    it('should not show icon by default', () => {
      const icon = fixture.debugElement.query(By.css('ion-icon'));
      expect(icon).toBeFalsy();
    });

    it('should show icon when icon input is provided', () => {
      component.icon = 'checkmark';
      fixture.detectChanges();
      const icons = fixture.debugElement.queryAll(By.css('ion-icon'));
      // Should be 1 icon (not counting dismiss button)
      expect(icons.length).toBeGreaterThan(0);
      expect(icons[0].nativeElement.getAttribute('name')).toBe('checkmark');
    });
  });

  describe('Dismissible', () => {
    it('should not be dismissible by default', () => {
      const closeButton = fixture.debugElement.query(By.css('button'));
      expect(closeButton).toBeFalsy();
    });

    it('should show dismiss button when dismissible is true', () => {
      component.dismissible = true;
      fixture.detectChanges();
      const closeButton = fixture.debugElement.query(By.css('button'));
      expect(closeButton).toBeTruthy();
    });

    it('should hide badge when dismissed', () => {
      component.dismissible = true;
      fixture.detectChanges();

      expect(component.isDismissed).toBe(false);
      expect(badgeElement).toBeTruthy();

      component.onDismiss(new Event('click'));
      fixture.detectChanges();

      expect(component.isDismissed).toBe(true);
      const dismissedBadge = fixture.debugElement.query(By.css('span[role="status"]'));
      expect(dismissedBadge).toBeFalsy();
    });

    it('should stop event propagation when dismiss button clicked', () => {
      component.dismissible = true;
      fixture.detectChanges();

      const event = new Event('click');
      spyOn(event, 'stopPropagation');

      component.onDismiss(event);
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Content Projection', () => {
    it('should project content', () => {
      const testContent = 'Test Badge';
      fixture.nativeElement.textContent = testContent;
      fixture.detectChanges();
      expect(badgeElement.nativeElement.textContent).toContain(testContent);
    });
  });

  describe('Icon Size Classes', () => {
    it('should return correct icon size for small', () => {
      component.size = 'sm';
      expect(component.iconSizeClasses).toBe('text-xs');
    });

    it('should return correct icon size for medium', () => {
      component.size = 'md';
      expect(component.iconSizeClasses).toBe('text-sm');
    });

    it('should return correct icon size for large', () => {
      component.size = 'lg';
      expect(component.iconSizeClasses).toBe('text-base');
    });
  });

  describe('Close Button Classes', () => {
    it('should include base classes', () => {
      expect(component.closeButtonClasses).toContain('ml-1');
      expect(component.closeButtonClasses).toContain('hover:opacity-70');
    });

    it('should include size-specific classes', () => {
      component.size = 'lg';
      expect(component.closeButtonClasses).toContain('text-base');
    });
  });
});
