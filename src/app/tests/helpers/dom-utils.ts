/**
 * DOM Testing Utilities for Angular/Ionic Components
 * Provides helper functions for querying, interacting with, and asserting DOM state
 */

import { ComponentFixture, tick } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

/**
 * Wait for async operations and Angular change detection
 */
export async function waitForAsync(fixture: ComponentFixture<any>, timeout = 100): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  tick(timeout);
  fixture.detectChanges();
}

/**
 * Query for an Ionic component by its tag name
 */
export function queryIonicComponent(
  fixture: ComponentFixture<any>,
  tagName: string
): DebugElement | null {
  return fixture.debugElement.query(By.css(tagName));
}

/**
 * Query all Ionic components by tag name
 */
export function queryAllIonicComponents(
  fixture: ComponentFixture<any>,
  tagName: string
): DebugElement[] {
  return fixture.debugElement.queryAll(By.css(tagName));
}

/**
 * Get text content from an element, handling Ionic components
 */
export function getElementText(element: DebugElement | HTMLElement | null): string {
  if (!element) return '';

  if (element instanceof DebugElement) {
    return element.nativeElement?.textContent?.trim() || '';
  }
  return element.textContent?.trim() || '';
}

/**
 * Simulate a click event on an element
 */
export function clickElement(
  element: DebugElement | HTMLElement | null,
  fixture?: ComponentFixture<any>
): void {
  if (!element) return;

  if (element instanceof DebugElement) {
    element.nativeElement?.click();
  } else {
    element.click();
  }

  if (fixture) {
    fixture.detectChanges();
  }
}

/**
 * Set input value and trigger input event
 */
export function setInputValue(
  element: DebugElement | HTMLElement | null,
  value: string,
  fixture?: ComponentFixture<any>
): void {
  if (!element) return;

  const inputElement = element instanceof DebugElement ? element.nativeElement : element;

  if (inputElement instanceof HTMLInputElement || inputElement instanceof HTMLTextAreaElement) {
    inputElement.value = value;
    inputElement.dispatchEvent(new Event('input'));
    inputElement.dispatchEvent(new Event('change'));

    if (fixture) {
      fixture.detectChanges();
    }
  }
}

/**
 * Set Ionic input value (ion-input, ion-textarea)
 */
export async function setIonicInputValue(
  fixture: ComponentFixture<any>,
  selector: string,
  value: string
): Promise<void> {
  const ionInput = fixture.debugElement.query(By.css(selector));
  if (ionInput) {
    const input = ionInput.nativeElement.querySelector('input, textarea');
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('ionInput'));
      input.dispatchEvent(new Event('ionChange'));
      fixture.detectChanges();
      await fixture.whenStable();
    }
  }
}

/**
 * Get all text content from elements matching selector
 */
export function getAllTexts(fixture: ComponentFixture<any>, selector: string): string[] {
  const elements = fixture.debugElement.queryAll(By.css(selector));
  return elements.map(el => getElementText(el));
}

/**
 * Check if element has a specific CSS class
 */
export function hasClass(element: DebugElement | HTMLElement | null, className: string): boolean {
  if (!element) return false;

  const el = element instanceof DebugElement ? element.nativeElement : element;
  return el?.classList?.contains(className) || false;
}

/**
 * Wait for an element to appear in the DOM
 */
export async function waitForElement(
  fixture: ComponentFixture<any>,
  selector: string,
  timeout = 3000
): Promise<DebugElement> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    fixture.detectChanges();
    const element = fixture.debugElement.query(By.css(selector));

    if (element) {
      return element;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Element with selector "${selector}" not found after ${timeout}ms`);
}

/**
 * Wait for element to disappear from DOM
 */
export async function waitForElementToDisappear(
  fixture: ComponentFixture<any>,
  selector: string,
  timeout = 3000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    fixture.detectChanges();
    const element = fixture.debugElement.query(By.css(selector));

    if (!element) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Element with selector "${selector}" still present after ${timeout}ms`);
}

/**
 * Simulate ion-select change
 */
export async function selectIonicOption(
  fixture: ComponentFixture<any>,
  selectSelector: string,
  optionValue: string
): Promise<void> {
  const select = fixture.debugElement.query(By.css(selectSelector));
  if (select) {
    const selectElement = select.nativeElement;
    selectElement.value = optionValue;
    selectElement.dispatchEvent(
      new CustomEvent('ionChange', {
        detail: { value: optionValue },
      })
    );
    fixture.detectChanges();
    await fixture.whenStable();
  }
}

/**
 * Simulate ion-toggle change
 */
export async function toggleIonicSwitch(
  fixture: ComponentFixture<any>,
  toggleSelector: string,
  checked: boolean
): Promise<void> {
  const toggle = fixture.debugElement.query(By.css(toggleSelector));
  if (toggle) {
    const toggleElement = toggle.nativeElement;
    toggleElement.checked = checked;
    toggleElement.dispatchEvent(
      new CustomEvent('ionChange', {
        detail: { checked },
      })
    );
    fixture.detectChanges();
    await fixture.whenStable();
  }
}

/**
 * Get computed style of an element
 */
export function getComputedStyle(
  element: DebugElement | HTMLElement | null,
  property: string
): string {
  if (!element) return '';

  const el = element instanceof DebugElement ? element.nativeElement : element;
  return window.getComputedStyle(el).getPropertyValue(property);
}

/**
 * Simulate swipe gesture
 */
export function simulateSwipe(
  element: DebugElement | HTMLElement | null,
  direction: 'left' | 'right' | 'up' | 'down',
  distance = 100
): void {
  if (!element) return;

  const el = element instanceof DebugElement ? element.nativeElement : element;

  const startX = direction === 'left' ? distance : 0;
  const startY = direction === 'up' ? distance : 0;
  const endX = direction === 'right' ? distance : 0;
  const endY = direction === 'down' ? distance : 0;

  el.dispatchEvent(
    new TouchEvent('touchstart', {
      touches: [{ clientX: startX, clientY: startY } as Touch],
    })
  );

  el.dispatchEvent(
    new TouchEvent('touchmove', {
      touches: [{ clientX: endX, clientY: endY } as Touch],
    })
  );

  el.dispatchEvent(
    new TouchEvent('touchend', {
      changedTouches: [{ clientX: endX, clientY: endY } as Touch],
    })
  );
}

/**
 * Check if element is visible
 */
export function isVisible(element: DebugElement | HTMLElement | null): boolean {
  if (!element) return false;

  const el = element instanceof DebugElement ? element.nativeElement : element;
  if (!el) return false;

  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

/**
 * Trigger form submission
 */
export function submitForm(fixture: ComponentFixture<any>, formSelector: string): void {
  const form = fixture.debugElement.query(By.css(formSelector));
  if (form) {
    form.nativeElement.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }
}

/**
 * Get validation errors from form field
 */
export function getFieldErrors(fixture: ComponentFixture<any>, fieldName: string): string[] {
  const errors: string[] = [];
  const errorElements = fixture.debugElement.queryAll(
    By.css(`[data-field="${fieldName}"] .error-message, ion-note[color="danger"]`)
  );

  errorElements.forEach(el => {
    const text = getElementText(el);
    if (text) {
      errors.push(text);
    }
  });

  return errors;
}

/**
 * Utility to create a mock Ionic Loading Controller
 */
export function createMockLoadingController() {
  const loadingElement = {
    present: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
  };

  return {
    create: vi.fn().mockResolvedValue(loadingElement),
    dismiss: vi.fn().mockResolvedValue(undefined),
    getTop: vi.fn().mockResolvedValue(loadingElement),
  };
}

/**
 * Utility to create a mock Ionic Toast Controller
 */
export function createMockToastController() {
  const toastElement = {
    present: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
  };

  return {
    create: vi.fn().mockResolvedValue(toastElement),
    dismiss: vi.fn().mockResolvedValue(undefined),
    getTop: vi.fn().mockResolvedValue(toastElement),
  };
}
