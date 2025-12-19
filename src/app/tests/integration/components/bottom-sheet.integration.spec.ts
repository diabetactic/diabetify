// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BottomSheetComponent } from '../../../shared/components/bottom-sheet/bottom-sheet.component';
import { vi } from 'vitest';

/**
 * Test host component para proyección de contenido
 * Simula el uso real del BottomSheetComponent con slots de contenido
 */
@Component({
  standalone: true,
  imports: [BottomSheetComponent],
  template: `
    <app-bottom-sheet [isOpen]="isOpen" [closeLabel]="closeLabel" (closed)="onClosed()">
      <ng-container header>
        <h3 data-testid="header-content">{{ headerText }}</h3>
      </ng-container>
      <div data-testid="body-content" class="test-content">{{ bodyText }}</div>
    </app-bottom-sheet>
  `,
})
class TestHostComponent {
  isOpen = false;
  closeLabel = 'Close';
  headerText = 'Test Header';
  bodyText = 'Test Body Content';
  onClosed = vi.fn();
}

describe('BottomSheetComponent Integration Tests', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let bottomSheetElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, BrowserAnimationsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();

    bottomSheetElement = fixture.nativeElement.querySelector('.bottom-sheet');
  });

  describe('1. Sheet slides up on open', () => {
    it('should have closed state initially', () => {
      expect(hostComponent.isOpen).toBe(false);
      expect(bottomSheetElement.classList.contains('bottom-sheet--open')).toBe(false);
    });

    it('should apply open class when isOpen becomes true', () => {
      const newFixture = TestBed.createComponent(TestHostComponent);
      newFixture.componentInstance.isOpen = true;
      newFixture.detectChanges();

      const sheet = newFixture.nativeElement.querySelector('.bottom-sheet');
      expect(sheet.classList.contains('bottom-sheet--open')).toBe(true);
    });
  });

  describe('2. Sheet slides down on close', () => {
    it('should remove open class when isOpen becomes false', () => {
      const newFixture = TestBed.createComponent(TestHostComponent);
      newFixture.componentInstance.isOpen = true;
      newFixture.detectChanges();

      let sheet = newFixture.nativeElement.querySelector('.bottom-sheet');
      expect(sheet.classList.contains('bottom-sheet--open')).toBe(true);

      // Crear nuevo fixture para evitar ExpressionChanged
      const closedFixture = TestBed.createComponent(TestHostComponent);
      closedFixture.componentInstance.isOpen = false;
      closedFixture.detectChanges();

      sheet = closedFixture.nativeElement.querySelector('.bottom-sheet');
      expect(sheet.classList.contains('bottom-sheet--open')).toBe(false);
    });
  });

  describe('3. Backdrop fades in/out', () => {
    it('should show backdrop when opened', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      openFixture.componentInstance.isOpen = true;
      openFixture.detectChanges();

      const backdrop = openFixture.nativeElement.querySelector('.bottom-sheet-backdrop');
      expect(backdrop).toBeTruthy();
      expect(backdrop.classList.contains('bottom-sheet-backdrop--visible')).toBe(true);
    });

    it('should not show backdrop when closed', () => {
      expect(hostComponent.isOpen).toBe(false);
      const backdrop = fixture.nativeElement.querySelector('.bottom-sheet-backdrop');
      expect(backdrop).toBeFalsy();
    });

    it('should have backdrop with correct CSS classes when visible', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      openFixture.componentInstance.isOpen = true;
      openFixture.detectChanges();

      const backdrop = openFixture.nativeElement.querySelector('.bottom-sheet-backdrop');
      expect(backdrop.classList.contains('bottom-sheet-backdrop')).toBe(true);
      expect(backdrop.classList.contains('bottom-sheet-backdrop--visible')).toBe(true);
    });
  });

  describe('4. Backdrop click closes sheet', () => {
    it('should emit closed event when backdrop is clicked', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      const component = openFixture.componentInstance;
      component.isOpen = true;
      openFixture.detectChanges();

      const backdrop = openFixture.nativeElement.querySelector('.bottom-sheet-backdrop');
      expect(backdrop).toBeTruthy();

      backdrop.click();
      openFixture.detectChanges();

      expect(component.onClosed).toHaveBeenCalled();
    });

    it('should trigger onBackdropClick method', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      openFixture.componentInstance.isOpen = true;
      openFixture.detectChanges();

      const bottomSheetComponent = openFixture.debugElement.children[0].componentInstance;
      const spy = vi.spyOn(bottomSheetComponent, 'onBackdropClick');

      const backdrop = openFixture.nativeElement.querySelector('.bottom-sheet-backdrop');
      backdrop.click();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('5. Escape key closes sheet', () => {
    it('should close sheet when Escape key is pressed and sheet is open', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      const component = openFixture.componentInstance;
      component.isOpen = true;
      openFixture.detectChanges();

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        bubbles: true,
      });
      document.dispatchEvent(escapeEvent);
      openFixture.detectChanges();

      expect(component.onClosed).toHaveBeenCalled();
    });

    it('should not close when Escape is pressed and sheet is closed', () => {
      expect(hostComponent.isOpen).toBe(false);

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        bubbles: true,
      });
      document.dispatchEvent(escapeEvent);
      fixture.detectChanges();

      expect(hostComponent.onClosed).not.toHaveBeenCalled();
    });

    it('should handle keyboard navigation', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      openFixture.componentInstance.isOpen = true;
      openFixture.detectChanges();

      const closeButton = openFixture.nativeElement.querySelector(
        '.bottom-sheet__close'
      ) as HTMLButtonElement;
      closeButton.focus();

      expect(document.activeElement).toBe(closeButton);
    });
  });

  describe('6. Close button emits event', () => {
    it('should emit closed event when close button is clicked', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      const component = openFixture.componentInstance;
      component.isOpen = true;
      openFixture.detectChanges();

      const closeButton = openFixture.nativeElement.querySelector('.bottom-sheet__close');
      closeButton.click();
      openFixture.detectChanges();

      expect(component.onClosed).toHaveBeenCalledTimes(1);
    });

    it('should have accessible aria-label on close button', () => {
      const closeButton = fixture.nativeElement.querySelector('.bottom-sheet__close');
      expect(closeButton.getAttribute('aria-label')).toBe('Close');
    });

    it('should accept custom closeLabel', () => {
      const customFixture = TestBed.createComponent(TestHostComponent);
      customFixture.componentInstance.closeLabel = 'Dismiss';
      customFixture.detectChanges();

      const closeButton = customFixture.nativeElement.querySelector('.bottom-sheet__close');
      expect(closeButton.getAttribute('aria-label')).toBe('Dismiss');
    });
  });

  describe('7. Content projection', () => {
    it('should project header content correctly', () => {
      const headerContent = fixture.nativeElement.querySelector('[data-testid="header-content"]');
      expect(headerContent).toBeTruthy();
      expect(headerContent.textContent).toContain('Test Header');
    });

    it('should project body content correctly', () => {
      const bodyContent = fixture.nativeElement.querySelector('[data-testid="body-content"]');
      expect(bodyContent).toBeTruthy();
      expect(bodyContent.textContent).toContain('Test Body Content');
    });

    it('should support custom header content', () => {
      const customFixture = TestBed.createComponent(TestHostComponent);
      customFixture.componentInstance.headerText = 'Custom Header';
      customFixture.detectChanges();

      const headerContent = customFixture.nativeElement.querySelector(
        '[data-testid="header-content"]'
      );
      expect(headerContent.textContent).toContain('Custom Header');
    });

    it('should support custom body content', () => {
      const customFixture = TestBed.createComponent(TestHostComponent);
      customFixture.componentInstance.bodyText = 'Custom Body';
      customFixture.detectChanges();

      const bodyContent = customFixture.nativeElement.querySelector('[data-testid="body-content"]');
      expect(bodyContent.textContent).toContain('Custom Body');
    });

    it('should render header content in correct slot', () => {
      const header = fixture.nativeElement.querySelector('.bottom-sheet__header');
      const headerContent = header.querySelector('[data-testid="header-content"]');

      expect(headerContent).toBeTruthy();
      expect(header.contains(headerContent)).toBe(true);
    });

    it('should render body content in correct slot', () => {
      const content = fixture.nativeElement.querySelector('.bottom-sheet__content');
      const bodyContent = content.querySelector('[data-testid="body-content"]');

      expect(bodyContent).toBeTruthy();
      expect(content.contains(bodyContent)).toBe(true);
    });
  });

  describe('8. Z-index layering', () => {
    it('should have sheet with z-index 1000', () => {
      const computedStyle = window.getComputedStyle(bottomSheetElement);
      expect(computedStyle.position).toBe('fixed');
      expect(computedStyle.zIndex).toBe('1000');
    });

    it('should have backdrop with z-index 999', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      openFixture.componentInstance.isOpen = true;
      openFixture.detectChanges();

      const backdrop = openFixture.nativeElement.querySelector('.bottom-sheet-backdrop');
      const computedStyle = window.getComputedStyle(backdrop);

      expect(computedStyle.position).toBe('fixed');
      expect(computedStyle.zIndex).toBe('999');
    });

    it('should maintain correct stacking order', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      openFixture.componentInstance.isOpen = true;
      openFixture.detectChanges();

      const backdrop = openFixture.nativeElement.querySelector('.bottom-sheet-backdrop');
      const sheet = openFixture.nativeElement.querySelector('.bottom-sheet');

      const backdropZIndex = parseInt(window.getComputedStyle(backdrop).zIndex, 10);
      const sheetZIndex = parseInt(window.getComputedStyle(sheet).zIndex, 10);

      expect(sheetZIndex).toBeGreaterThan(backdropZIndex);
      expect(sheetZIndex).toBe(1000);
      expect(backdropZIndex).toBe(999);
    });
  });

  describe('9. ARIA attributes', () => {
    it('should have correct role attribute', () => {
      expect(bottomSheetElement.getAttribute('role')).toBe('dialog');
    });

    it('should have aria-modal attribute set to true', () => {
      expect(bottomSheetElement.getAttribute('aria-modal')).toBe('true');
    });

    it('should have aria-hidden true when closed', () => {
      expect(hostComponent.isOpen).toBe(false);
      expect(bottomSheetElement.getAttribute('aria-hidden')).toBe('true');
    });

    it('should have aria-hidden false when open', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      openFixture.componentInstance.isOpen = true;
      openFixture.detectChanges();

      const sheet = openFixture.nativeElement.querySelector('.bottom-sheet');
      expect(sheet.getAttribute('aria-hidden')).toBe('false');
    });

    it('should have aria-labelledby pointing to header', () => {
      const ariaLabelledBy = bottomSheetElement.getAttribute('aria-labelledby');
      const header = fixture.nativeElement.querySelector(`#${ariaLabelledBy}`);

      expect(ariaLabelledBy).toBeTruthy();
      expect(header).toBeTruthy();
      expect(header.classList.contains('bottom-sheet__header')).toBe(true);
    });

    it('should have unique aria-labelledby ID', () => {
      const ariaLabelledBy = bottomSheetElement.getAttribute('aria-labelledby');
      expect(ariaLabelledBy).toMatch(/^bottom-sheet-header-[a-z0-9]+$/);
    });

    it('should have role="presentation" on backdrop', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      openFixture.componentInstance.isOpen = true;
      openFixture.detectChanges();

      const backdrop = openFixture.nativeElement.querySelector('.bottom-sheet-backdrop');
      expect(backdrop.getAttribute('role')).toBe('presentation');
    });

    it('should have aria-hidden="true" on handle bar', () => {
      const handle = fixture.nativeElement.querySelector('.bottom-sheet__handle');
      expect(handle.getAttribute('aria-hidden')).toBe('true');
    });

    it('should have type="button" on close button', () => {
      const closeButton = fixture.nativeElement.querySelector('.bottom-sheet__close');
      expect(closeButton.getAttribute('type')).toBe('button');
    });
  });

  describe('10. Animation timing', () => {
    it('should have animation states defined in component', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      openFixture.componentInstance.isOpen = true;
      openFixture.detectChanges();

      const sheet = openFixture.nativeElement.querySelector('.bottom-sheet');
      expect(sheet.classList.contains('bottom-sheet--open')).toBe(true);
    });

    it('should have transition styles for animations', () => {
      const sheet = fixture.nativeElement.querySelector('.bottom-sheet');
      const computedStyle = window.getComputedStyle(sheet);

      expect(computedStyle.transform).toBeTruthy();
      expect(computedStyle.willChange).toBe('transform');
    });

    it('should handle open state transitions', () => {
      const closedFixture = TestBed.createComponent(TestHostComponent);
      closedFixture.componentInstance.isOpen = false;
      closedFixture.detectChanges();
      const closedSheet = closedFixture.nativeElement.querySelector('.bottom-sheet');
      expect(closedSheet.classList.contains('bottom-sheet--open')).toBe(false);

      const openFixture = TestBed.createComponent(TestHostComponent);
      openFixture.componentInstance.isOpen = true;
      openFixture.detectChanges();
      const openSheet = openFixture.nativeElement.querySelector('.bottom-sheet');
      expect(openSheet.classList.contains('bottom-sheet--open')).toBe(true);
    });

    it('should have backdrop transition styles', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      openFixture.componentInstance.isOpen = true;
      openFixture.detectChanges();

      const backdrop = openFixture.nativeElement.querySelector('.bottom-sheet-backdrop');
      const computedStyle = window.getComputedStyle(backdrop);

      expect(computedStyle.opacity).toBeTruthy();
    });

    it('should coordinate backdrop and sheet states', () => {
      const openFixture = TestBed.createComponent(TestHostComponent);
      openFixture.componentInstance.isOpen = true;
      openFixture.detectChanges();

      const backdrop = openFixture.nativeElement.querySelector('.bottom-sheet-backdrop');
      const sheet = openFixture.nativeElement.querySelector('.bottom-sheet');

      expect(backdrop).toBeTruthy();
      expect(sheet.classList.contains('bottom-sheet--open')).toBe(true);
    });
  });

  describe('Complete user workflows', () => {
    it('should handle complete open-interact-close workflow', () => {
      const workflowFixture = TestBed.createComponent(TestHostComponent);
      const component = workflowFixture.componentInstance;

      component.isOpen = true;
      workflowFixture.detectChanges();

      const sheet = workflowFixture.nativeElement.querySelector('.bottom-sheet');
      expect(sheet.classList.contains('bottom-sheet--open')).toBe(true);

      const backdrop = workflowFixture.nativeElement.querySelector('.bottom-sheet-backdrop');
      expect(backdrop).toBeTruthy();

      const bodyContent = workflowFixture.nativeElement.querySelector(
        '[data-testid="body-content"]'
      );
      expect(bodyContent.textContent).toContain('Test Body Content');

      const closeButton = workflowFixture.nativeElement.querySelector('.bottom-sheet__close');
      closeButton.click();
      workflowFixture.detectChanges();

      expect(component.onClosed).toHaveBeenCalled();
    });

    it('should handle accessibility navigation workflow', () => {
      const a11yFixture = TestBed.createComponent(TestHostComponent);
      a11yFixture.componentInstance.isOpen = true;
      a11yFixture.detectChanges();

      const sheet = a11yFixture.nativeElement.querySelector('.bottom-sheet');
      expect(sheet.getAttribute('role')).toBe('dialog');
      expect(sheet.getAttribute('aria-modal')).toBe('true');
      expect(sheet.getAttribute('aria-hidden')).toBe('false');

      const closeButton = a11yFixture.nativeElement.querySelector(
        '.bottom-sheet__close'
      ) as HTMLButtonElement;
      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        bubbles: true,
      });
      document.dispatchEvent(escapeEvent);
      a11yFixture.detectChanges();

      expect(a11yFixture.componentInstance.onClosed).toHaveBeenCalled();
    });
  });
});
