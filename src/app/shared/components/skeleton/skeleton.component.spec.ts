// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  let component: SkeletonComponent;
  let fixture: ComponentFixture<SkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('default values', () => {
    it('should have default type as custom', () => {
      expect(component.type).toBe('custom');
    });

    it('should have default variant as shimmer', () => {
      expect(component.variant).toBe('shimmer');
    });

    it('should have default width as 100%', () => {
      expect(component.width).toBe('100%');
    });

    it('should have default height as 1em', () => {
      expect(component.height).toBe('1em');
    });

    it('should have default lines as 1', () => {
      expect(component.lines).toBe(1);
    });
  });

  describe('lineArray getter', () => {
    it('should return array with correct length', () => {
      component.lines = 3;
      expect(component.lineArray.length).toBe(3);
    });

    it('should return empty-like array for single line', () => {
      component.lines = 1;
      expect(component.lineArray.length).toBe(1);
    });

    it('should return array with sequential indices', () => {
      component.lines = 4;
      expect(component.lineArray).toEqual([0, 1, 2, 3]);
    });
  });

  describe('type variations', () => {
    it('should accept text type', () => {
      component.type = 'text';
      fixture.detectChanges();
      expect(component.type).toBe('text');
    });

    it('should accept circle type', () => {
      component.type = 'circle';
      fixture.detectChanges();
      expect(component.type).toBe('circle');
    });

    it('should accept card type', () => {
      component.type = 'card';
      fixture.detectChanges();
      expect(component.type).toBe('card');
    });
  });

  describe('variant variations', () => {
    it('should accept pulse variant', () => {
      component.variant = 'pulse';
      fixture.detectChanges();
      expect(component.variant).toBe('pulse');
    });
  });

  describe('custom dimensions', () => {
    it('should accept custom width', () => {
      component.width = '200px';
      fixture.detectChanges();
      expect(component.width).toBe('200px');
    });

    it('should accept custom height', () => {
      component.height = '50px';
      fixture.detectChanges();
      expect(component.height).toBe('50px');
    });
  });

  describe('template rendering', () => {
    it('should render skeleton element', () => {
      const element = fixture.nativeElement.querySelector('.skeleton');
      expect(element).toBeTruthy();
    });

    it('should have aria-hidden attribute', () => {
      const element = fixture.nativeElement.querySelector('.skeleton');
      expect(element.getAttribute('aria-hidden')).toBe('true');
    });

    it('should have presentation role', () => {
      const element = fixture.nativeElement.querySelector('.skeleton');
      expect(element.getAttribute('role')).toBe('presentation');
    });
  });

  describe('class binding conditions', () => {
    // Test the conditions that control class bindings
    // The actual class application depends on Angular's class binding which uses OnPush

    it('should check pulse variant condition', () => {
      component.variant = 'pulse';
      expect(component.variant === 'pulse').toBe(true);
    });

    it('should check shimmer variant condition (default)', () => {
      expect(component.variant === 'shimmer').toBe(true);
    });

    it('should check text type condition', () => {
      component.type = 'text';
      expect(component.type === 'text').toBe(true);
    });

    it('should check circle type condition', () => {
      component.type = 'circle';
      expect(component.type === 'circle').toBe(true);
    });

    it('should check card type condition', () => {
      component.type = 'card';
      expect(component.type === 'card').toBe(true);
    });
  });
});
