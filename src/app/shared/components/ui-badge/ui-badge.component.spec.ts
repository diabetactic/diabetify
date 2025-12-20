// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiBadgeComponent } from './ui-badge.component';

describe('UiBadgeComponent', () => {
  let component: UiBadgeComponent;
  let fixture: ComponentFixture<UiBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, TranslateModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(UiBadgeComponent, {
        set: {
          imports: [CommonModule, TranslateModule],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(UiBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default values', () => {
    it('should have default variant as neutral', () => {
      expect(component.variant).toBe('neutral');
    });

    it('should have default size as md', () => {
      expect(component.size).toBe('md');
    });

    it('should have default badgeStyle as solid', () => {
      expect(component.badgeStyle).toBe('solid');
    });

    it('should have dismissible as false by default', () => {
      expect(component.dismissible).toBe(false);
    });

    it('should have rounded as false by default', () => {
      expect(component.rounded).toBe(false);
    });

    it('should have isDismissed as false by default', () => {
      expect(component.isDismissed).toBe(false);
    });
  });

  describe('baseClasses getter', () => {
    it('should return base class string', () => {
      expect(component.baseClasses).toContain('inline-flex');
      expect(component.baseClasses).toContain('items-center');
      expect(component.baseClasses).toContain('font-medium');
    });
  });

  describe('variantClasses getter', () => {
    describe('solid style', () => {
      beforeEach(() => {
        component.badgeStyle = 'solid';
      });

      it('should return success classes for success variant', () => {
        component.variant = 'success';
        expect(component.variantClasses).toContain('bg-success');
      });

      it('should return warning classes for warning variant', () => {
        component.variant = 'warning';
        expect(component.variantClasses).toContain('bg-warning');
      });

      it('should return danger classes for danger variant', () => {
        component.variant = 'danger';
        expect(component.variantClasses).toContain('bg-danger');
      });

      it('should return info classes for info variant', () => {
        component.variant = 'info';
        expect(component.variantClasses).toContain('bg-primary');
      });

      it('should return neutral classes for neutral variant', () => {
        component.variant = 'neutral';
        expect(component.variantClasses).toContain('bg-gray-500');
      });
    });

    describe('outlined style', () => {
      beforeEach(() => {
        component.badgeStyle = 'outlined';
      });

      it('should return outlined success classes', () => {
        component.variant = 'success';
        expect(component.variantClasses).toContain('border-success');
        expect(component.variantClasses).toContain('bg-transparent');
      });

      it('should return outlined warning classes', () => {
        component.variant = 'warning';
        expect(component.variantClasses).toContain('border-warning');
      });

      it('should return outlined danger classes', () => {
        component.variant = 'danger';
        expect(component.variantClasses).toContain('border-danger');
      });

      it('should return outlined info classes', () => {
        component.variant = 'info';
        expect(component.variantClasses).toContain('border-primary');
      });

      it('should return outlined neutral classes', () => {
        component.variant = 'neutral';
        expect(component.variantClasses).toContain('border-gray-500');
      });
    });

    describe('subtle style', () => {
      beforeEach(() => {
        component.badgeStyle = 'subtle';
      });

      it('should return subtle success classes', () => {
        component.variant = 'success';
        expect(component.variantClasses).toContain('bg-green-100');
        expect(component.variantClasses).toContain('text-green-800');
      });

      it('should return subtle warning classes', () => {
        component.variant = 'warning';
        expect(component.variantClasses).toContain('bg-amber-100');
      });

      it('should return subtle danger classes', () => {
        component.variant = 'danger';
        expect(component.variantClasses).toContain('bg-red-100');
      });

      it('should return subtle info classes', () => {
        component.variant = 'info';
        expect(component.variantClasses).toContain('bg-blue-100');
      });

      it('should return subtle neutral classes', () => {
        component.variant = 'neutral';
        expect(component.variantClasses).toContain('bg-gray-100');
      });
    });
  });

  describe('sizeClasses getter', () => {
    it('should return sm classes for sm size', () => {
      component.size = 'sm';
      expect(component.sizeClasses).toContain('px-2');
      expect(component.sizeClasses).toContain('text-xs');
    });

    it('should return md classes for md size', () => {
      component.size = 'md';
      expect(component.sizeClasses).toContain('px-2.5');
      expect(component.sizeClasses).toContain('text-sm');
    });

    it('should return lg classes for lg size', () => {
      component.size = 'lg';
      expect(component.sizeClasses).toContain('px-3');
      expect(component.sizeClasses).toContain('text-base');
    });
  });

  describe('roundedClasses getter', () => {
    it('should return rounded-md when rounded is false', () => {
      component.rounded = false;
      expect(component.roundedClasses).toBe('rounded-md');
    });

    it('should return rounded-full when rounded is true', () => {
      component.rounded = true;
      expect(component.roundedClasses).toBe('rounded-full');
    });
  });

  describe('badgeClasses getter', () => {
    it('should combine all class getters', () => {
      const classes = component.badgeClasses;
      expect(classes).toContain('inline-flex'); // base
      expect(classes).toContain('rounded'); // rounded
    });
  });

  describe('iconSizeClasses getter', () => {
    it('should return text-xs for sm size', () => {
      component.size = 'sm';
      expect(component.iconSizeClasses).toBe('text-xs');
    });

    it('should return text-sm for md size', () => {
      component.size = 'md';
      expect(component.iconSizeClasses).toBe('text-sm');
    });

    it('should return text-base for lg size', () => {
      component.size = 'lg';
      expect(component.iconSizeClasses).toBe('text-base');
    });
  });

  describe('closeButtonClasses getter', () => {
    it('should include base classes', () => {
      expect(component.closeButtonClasses).toContain('ml-1');
      expect(component.closeButtonClasses).toContain('hover:opacity-70');
    });

    it('should include size-specific classes for sm', () => {
      component.size = 'sm';
      expect(component.closeButtonClasses).toContain('text-xs');
    });

    it('should include size-specific classes for md', () => {
      component.size = 'md';
      expect(component.closeButtonClasses).toContain('text-sm');
    });

    it('should include size-specific classes for lg', () => {
      component.size = 'lg';
      expect(component.closeButtonClasses).toContain('text-base');
    });
  });

  describe('onDismiss method', () => {
    it('should set isDismissed to true', () => {
      const event = new Event('click');
      vi.spyOn(event, 'stopPropagation');
      component.onDismiss(event);
      expect(component.isDismissed).toBe(true);
    });

    it('should stop event propagation', () => {
      const event = new Event('click');
      const stopPropSpy = vi.spyOn(event, 'stopPropagation');
      component.onDismiss(event);
      expect(stopPropSpy).toHaveBeenCalled();
    });
  });

  describe('hostClasses getter', () => {
    it('should return inline-block class', () => {
      expect(component.hostClasses).toContain('inline-block');
    });
  });

  describe('icon input', () => {
    it('should accept icon name', () => {
      component.icon = 'check-circle';
      expect(component.icon).toBe('check-circle');
    });

    it('should be undefined by default', () => {
      expect(component.icon).toBeUndefined();
    });
  });
});
