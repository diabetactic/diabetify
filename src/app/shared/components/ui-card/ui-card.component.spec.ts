import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { UiCardComponent } from './ui-card.component';

// Test host component to test content projection
@Component({
  template: `
    <app-ui-card [variant]="variant" [clickable]="clickable">
      <h3 header>Test Header</h3>
      <p body>Test Body</p>
      <div footer>Test Footer</div>
    </app-ui-card>
  `,
  standalone: true,
  imports: [UiCardComponent],
})
class TestHostComponent {
  variant: 'default' | 'elevated' | 'outlined' = 'default';
  clickable = false;
}

describe('UiCardComponent', () => {
  let component: UiCardComponent;
  let fixture: ComponentFixture<UiCardComponent>;
  let cardElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UiCardComponent);
    component = fixture.componentInstance;
    cardElement = fixture.debugElement.query(By.css('div[class*="rounded-2xl"]'));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Variants', () => {
    it('should apply default variant classes by default', () => {
      expect(component.variantClasses).toContain('shadow-md');
    });

    it('should apply elevated variant classes', () => {
      component.variant = 'elevated';
      expect(component.variantClasses).toContain('shadow-lg');
      expect(component.variantClasses).toContain('hover:shadow-xl');
    });

    it('should apply outlined variant classes', () => {
      component.variant = 'outlined';
      expect(component.variantClasses).toContain('border-2');
      expect(component.variantClasses).toContain('border-gray-200');
    });
  });

  describe('Padding', () => {
    it('should apply medium padding by default', () => {
      expect(component.bodyClasses).toContain('p-4');
    });

    it('should apply small padding', () => {
      component.padding = 'sm';
      expect(component.bodyClasses).toContain('p-3');
    });

    it('should apply large padding', () => {
      component.padding = 'lg';
      expect(component.bodyClasses).toContain('p-6');
    });

    it('should apply no padding', () => {
      component.padding = 'none';
      expect(component.bodyClasses).toBe('');
    });
  });

  describe('Clickable', () => {
    it('should not be clickable by default', () => {
      expect(component.clickableClasses).toBe('');
      expect(cardElement.nativeElement.getAttribute('role')).toBeNull();
    });

    it('should add clickable classes when clickable is true', () => {
      component.clickable = true;
      fixture.detectChanges();
      expect(component.clickableClasses).toContain('cursor-pointer');
      expect(cardElement.nativeElement.getAttribute('role')).toBe('button');
    });

    it('should emit cardClick when clicked and clickable', () => {
      component.clickable = true;
      spyOn(component.cardClick, 'emit');
      component.onClick();
      expect(component.cardClick.emit).toHaveBeenCalled();
    });

    it('should not emit cardClick when not clickable', () => {
      component.clickable = false;
      spyOn(component.cardClick, 'emit');
      component.onClick();
      expect(component.cardClick.emit).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should not show loading overlay by default', () => {
      const loadingOverlay = fixture.debugElement.query(By.css('.animate-spin'));
      expect(loadingOverlay).toBeFalsy();
    });

    it('should show loading overlay when loading', () => {
      component.loading = true;
      fixture.detectChanges();
      const loadingOverlay = fixture.debugElement.query(By.css('.animate-spin'));
      expect(loadingOverlay).toBeTruthy();
    });

    it('should add loading classes when loading', () => {
      component.loading = true;
      expect(component.loadingClasses).toContain('opacity-60');
      expect(component.loadingClasses).toContain('pointer-events-none');
    });

    it('should not emit cardClick when loading', () => {
      component.clickable = true;
      component.loading = true;
      spyOn(component.cardClick, 'emit');
      component.onClick();
      expect(component.cardClick.emit).not.toHaveBeenCalled();
    });

    it('should set aria-busy when loading', () => {
      component.loading = true;
      fixture.detectChanges();
      expect(cardElement.nativeElement.getAttribute('aria-busy')).toBe('true');
    });
  });

  describe('Content Projection', () => {
    let hostFixture: ComponentFixture<TestHostComponent>;
    let hostComponent: TestHostComponent;

    beforeEach(() => {
      hostFixture = TestBed.createComponent(TestHostComponent);
      hostComponent = hostFixture.componentInstance;
      hostFixture.detectChanges();
    });

    it('should project header content', () => {
      const header = hostFixture.debugElement.query(By.css('h3'));
      expect(header).toBeTruthy();
      expect(header.nativeElement.textContent).toBe('Test Header');
    });

    it('should project body content', () => {
      const body = hostFixture.debugElement.query(By.css('p'));
      expect(body).toBeTruthy();
      expect(body.nativeElement.textContent).toBe('Test Body');
    });

    it('should project footer content', () => {
      const footer = hostFixture.debugElement.query(By.css('div[footer]'));
      expect(footer).toBeTruthy();
      expect(footer.nativeElement.textContent).toBe('Test Footer');
    });
  });

  describe('Header/Footer Classes', () => {
    it('should apply correct header classes', () => {
      const classes = component.headerClasses;
      expect(classes).toContain('px-4');
      expect(classes).toContain('pt-4');
      expect(classes).toContain('pb-3');
      expect(classes).toContain('border-b');
    });

    it('should apply correct footer classes', () => {
      const classes = component.footerClasses;
      expect(classes).toContain('px-4');
      expect(classes).toContain('pb-4');
      expect(classes).toContain('pt-3');
      expect(classes).toContain('border-t');
    });
  });
});
