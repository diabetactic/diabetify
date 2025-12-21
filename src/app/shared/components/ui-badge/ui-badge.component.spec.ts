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

  describe('default values', () => {
    it('should have correct default values', () => {
      expect(component.variant).toBe('neutral');
      expect(component.size).toBe('md');
      expect(component.badgeStyle).toBe('solid');
      expect(component.dismissible).toBe(false);
      expect(component.rounded).toBe(false);
      expect(component.isDismissed).toBe(false);
      expect(component.icon).toBeUndefined();
    });
  });

  describe('variantClasses getter', () => {
    it.each([
      { style: 'solid', variant: 'success', expectedClasses: ['bg-success'] },
      { style: 'solid', variant: 'warning', expectedClasses: ['bg-warning'] },
      { style: 'solid', variant: 'danger', expectedClasses: ['bg-danger'] },
      { style: 'solid', variant: 'info', expectedClasses: ['bg-primary'] },
      { style: 'solid', variant: 'neutral', expectedClasses: ['bg-gray-500'] },
    ] as const)(
      'should return correct classes for solid $variant',
      ({ style, variant, expectedClasses }) => {
        component.badgeStyle = style;
        component.variant = variant;
        expectedClasses.forEach(expectedClass => {
          expect(component.variantClasses).toContain(expectedClass);
        });
      }
    );

    it.each([
      {
        style: 'outlined',
        variant: 'success',
        expectedClasses: ['border-success', 'bg-transparent'],
      },
      { style: 'outlined', variant: 'warning', expectedClasses: ['border-warning'] },
      { style: 'outlined', variant: 'danger', expectedClasses: ['border-danger'] },
      { style: 'outlined', variant: 'info', expectedClasses: ['border-primary'] },
      { style: 'outlined', variant: 'neutral', expectedClasses: ['border-gray-500'] },
    ] as const)(
      'should return correct classes for outlined $variant',
      ({ style, variant, expectedClasses }) => {
        component.badgeStyle = style;
        component.variant = variant;
        expectedClasses.forEach(expectedClass => {
          expect(component.variantClasses).toContain(expectedClass);
        });
      }
    );

    it.each([
      { style: 'subtle', variant: 'success', expectedClasses: ['bg-green-100', 'text-green-800'] },
      { style: 'subtle', variant: 'warning', expectedClasses: ['bg-amber-100'] },
      { style: 'subtle', variant: 'danger', expectedClasses: ['bg-red-100'] },
      { style: 'subtle', variant: 'info', expectedClasses: ['bg-blue-100'] },
      { style: 'subtle', variant: 'neutral', expectedClasses: ['bg-gray-100'] },
    ] as const)(
      'should return correct classes for subtle $variant',
      ({ style, variant, expectedClasses }) => {
        component.badgeStyle = style;
        component.variant = variant;
        expectedClasses.forEach(expectedClass => {
          expect(component.variantClasses).toContain(expectedClass);
        });
      }
    );
  });

  describe('sizeClasses getter', () => {
    it.each([
      { size: 'sm', expectedClasses: ['px-2', 'text-xs'] },
      { size: 'md', expectedClasses: ['px-2.5', 'text-sm'] },
      { size: 'lg', expectedClasses: ['px-3', 'text-base'] },
    ] as const)('should return correct classes for $size size', ({ size, expectedClasses }) => {
      component.size = size;
      expectedClasses.forEach(expectedClass => {
        expect(component.sizeClasses).toContain(expectedClass);
      });
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

  describe('class composition', () => {
    it('should return correct base classes and combine all class getters', () => {
      // baseClasses test
      expect(component.baseClasses).toContain('inline-flex');
      expect(component.baseClasses).toContain('items-center');
      expect(component.baseClasses).toContain('font-medium');

      // badgeClasses test (combines all getters)
      const classes = component.badgeClasses;
      expect(classes).toContain('inline-flex');
      expect(classes).toContain('rounded');
    });
  });

  describe('iconSizeClasses getter', () => {
    it.each([
      { size: 'sm', expectedClass: 'text-xs' },
      { size: 'md', expectedClass: 'text-sm' },
      { size: 'lg', expectedClass: 'text-base' },
    ] as const)('should return $expectedClass for $size size', ({ size, expectedClass }) => {
      component.size = size;
      expect(component.iconSizeClasses).toBe(expectedClass);
    });
  });

  describe('closeButtonClasses getter', () => {
    it.each([
      { size: 'sm', expectedSizeClass: 'text-xs' },
      { size: 'md', expectedSizeClass: 'text-sm' },
      { size: 'lg', expectedSizeClass: 'text-base' },
    ] as const)(
      'should include base and size-specific classes for $size',
      ({ size, expectedSizeClass }) => {
        component.size = size;
        expect(component.closeButtonClasses).toContain('ml-1');
        expect(component.closeButtonClasses).toContain('hover:opacity-70');
        expect(component.closeButtonClasses).toContain(expectedSizeClass);
      }
    );
  });

  describe('onDismiss method', () => {
    it('should set isDismissed to true and stop event propagation', () => {
      const event = new Event('click');
      const stopPropSpy = vi.spyOn(event, 'stopPropagation');
      component.onDismiss(event);
      expect(component.isDismissed).toBe(true);
      expect(stopPropSpy).toHaveBeenCalled();
    });
  });

  describe('hostClasses getter', () => {
    it('should return inline-block class', () => {
      expect(component.hostClasses).toContain('inline-block');
    });
  });
});
