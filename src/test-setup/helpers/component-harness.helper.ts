/**
 * Component Harness Helper for Ionic/Angular Testing
 *
 * Provides utilities for interacting with Ionic components in tests.
 * Reduces boilerplate and makes tests more readable and maintainable.
 *
 * @example
 * ```typescript
 * // Get and interact with Ionic components
 * const button = getIonButton(fixture, 'Submit');
 * await clickButton(fixture, button);
 *
 * const input = getIonInput(fixture, 'email');
 * await setInputValue(fixture, input, 'test@example.com');
 *
 * // Fill entire form
 * await fillForm(fixture, {
 *   email: 'test@example.com',
 *   password: 'secret123'
 * });
 * ```
 */

import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

// Type declarations for Ionic elements in test environment
// These extend HTMLElement but may not have full type definitions when mocked
type HTMLIonInputElement = HTMLElement & {
  value?: string | number | null;
  placeholder?: string;
  required?: boolean;
  type?: string;
  disabled?: boolean;
};

type HTMLIonSelectElement = HTMLElement & {
  value?: unknown;
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
};

type HTMLIonButtonElement = HTMLElement & {
  disabled?: boolean;
  fill?: string;
  color?: string;
};

// HTMLIonCheckboxElement type reserved for future checkbox harness implementation

type HTMLIonToggleElement = HTMLElement & {
  checked?: boolean;
  disabled?: boolean;
  value?: unknown;
};

/**
 * Query result that includes both the element and helpful methods
 */
export interface ElementHarness<T extends HTMLElement = HTMLElement> {
  element: T;
  debugElement: DebugElement;
  nativeElement: T;

  /** Click the element */
  click(): Promise<void>;

  /** Get text content */
  text(): string;

  /** Check if element is visible */
  isVisible(): boolean;

  /** Check if element is disabled */
  isDisabled(): boolean;

  /** Get attribute value */
  attr(name: string): string | null;

  /** Check if element has class */
  hasClass(className: string): boolean;
}

/**
 * Create an element harness from a debug element
 */
function createHarness<T extends HTMLElement>(
  fixture: ComponentFixture<unknown>,
  debugElement: DebugElement
): ElementHarness<T> {
  const element = debugElement.nativeElement as T;

  return {
    element,
    debugElement,
    nativeElement: element,

    async click(): Promise<void> {
      element.click();
      fixture.detectChanges();
      await fixture.whenStable();
    },

    text(): string {
      return element.textContent?.trim() ?? '';
    },

    isVisible(): boolean {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    },

    isDisabled(): boolean {
      return element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
    },

    attr(name: string): string | null {
      return element.getAttribute(name);
    },

    hasClass(className: string): boolean {
      return element.classList.contains(className);
    },
  };
}

// ============================================================================
// ION-BUTTON
// ============================================================================

/**
 * Get an ion-button by its text content
 */
export function getIonButton(
  fixture: ComponentFixture<unknown>,
  text: string
): ElementHarness<HTMLIonButtonElement> | null {
  const buttons = fixture.debugElement.queryAll(By.css('ion-button'));
  const button = buttons.find(btn => btn.nativeElement.textContent?.trim().includes(text));

  return button ? createHarness(fixture, button) : null;
}

/**
 * Get an ion-button by CSS selector
 */
export function getIonButtonBySelector(
  fixture: ComponentFixture<unknown>,
  selector: string
): ElementHarness<HTMLIonButtonElement> | null {
  const button = fixture.debugElement.query(By.css(`ion-button${selector}`));
  return button ? createHarness(fixture, button) : null;
}

/**
 * Get all ion-buttons in the fixture
 */
export function getAllIonButtons(
  fixture: ComponentFixture<unknown>
): ElementHarness<HTMLIonButtonElement>[] {
  return fixture.debugElement
    .queryAll(By.css('ion-button'))
    .map(btn => createHarness(fixture, btn));
}

/**
 * Click an ion-button by text
 */
export async function clickIonButton(
  fixture: ComponentFixture<unknown>,
  text: string
): Promise<void> {
  const button = getIonButton(fixture, text);
  if (!button) {
    throw new Error(`ion-button with text "${text}" not found`);
  }
  await button.click();
}

// ============================================================================
// ION-INPUT
// ============================================================================

/**
 * Ion-input harness with value manipulation
 */
export interface IonInputHarness extends ElementHarness<HTMLIonInputElement> {
  /** Get current value */
  getValue(): string | number | null;

  /** Set value and trigger events */
  setValue(value: string | number): Promise<void>;

  /** Clear the input */
  clear(): Promise<void>;

  /** Get placeholder text */
  getPlaceholder(): string;

  /** Check if input is required */
  isRequired(): boolean;

  /** Get input type */
  getType(): string;
}

/**
 * Get an ion-input by name, id, or formControlName
 */
export function getIonInput(
  fixture: ComponentFixture<unknown>,
  identifier: string
): IonInputHarness | null {
  // Try multiple selectors
  const selectors = [
    `ion-input[name="${identifier}"]`,
    `ion-input[formControlName="${identifier}"]`,
    `ion-input#${identifier}`,
    `ion-input[data-testid="${identifier}"]`,
  ];

  let debugElement: DebugElement | null = null;
  for (const selector of selectors) {
    debugElement = fixture.debugElement.query(By.css(selector));
    if (debugElement) break;
  }

  if (!debugElement) return null;

  const baseHarness = createHarness<HTMLIonInputElement>(fixture, debugElement);
  const element = baseHarness.element;

  return {
    ...baseHarness,

    getValue(): string | number | null {
      return element.value ?? null;
    },

    async setValue(value: string | number): Promise<void> {
      element.value = value;
      element.dispatchEvent(new CustomEvent('ionInput', { detail: { value } }));
      element.dispatchEvent(new CustomEvent('ionChange', { detail: { value } }));
      fixture.detectChanges();
      await fixture.whenStable();
    },

    async clear(): Promise<void> {
      await this.setValue('');
    },

    getPlaceholder(): string {
      return element.placeholder ?? '';
    },

    isRequired(): boolean {
      return element.hasAttribute('required') || element.required === true;
    },

    getType(): string {
      return element.type ?? 'text';
    },
  };
}

/**
 * Set value on an ion-input by identifier
 */
export async function setIonInputValue(
  fixture: ComponentFixture<unknown>,
  identifier: string,
  value: string | number
): Promise<void> {
  const input = getIonInput(fixture, identifier);
  if (!input) {
    throw new Error(`ion-input "${identifier}" not found`);
  }
  await input.setValue(value);
}

// ============================================================================
// ION-SELECT
// ============================================================================

/**
 * Ion-select harness
 */
export interface IonSelectHarness extends ElementHarness<HTMLIonSelectElement> {
  /** Get current value */
  getValue(): unknown;

  /** Select an option by value */
  selectByValue(value: unknown): Promise<void>;

  /** Get all available options */
  getOptions(): { value: unknown; text: string }[];

  /** Check if multiple selection is enabled */
  isMultiple(): boolean;
}

/**
 * Get an ion-select by identifier
 */
export function getIonSelect(
  fixture: ComponentFixture<unknown>,
  identifier: string
): IonSelectHarness | null {
  const selectors = [
    `ion-select[name="${identifier}"]`,
    `ion-select[formControlName="${identifier}"]`,
    `ion-select#${identifier}`,
  ];

  let debugElement: DebugElement | null = null;
  for (const selector of selectors) {
    debugElement = fixture.debugElement.query(By.css(selector));
    if (debugElement) break;
  }

  if (!debugElement) return null;

  const baseHarness = createHarness<HTMLIonSelectElement>(fixture, debugElement);
  const element = baseHarness.element;

  return {
    ...baseHarness,

    getValue(): unknown {
      return element.value;
    },

    async selectByValue(value: unknown): Promise<void> {
      element.value = value;
      element.dispatchEvent(new CustomEvent('ionChange', { detail: { value } }));
      fixture.detectChanges();
      await fixture.whenStable();
    },

    getOptions(): { value: unknown; text: string }[] {
      const options = element.querySelectorAll('ion-select-option');
      return Array.from(options).map(opt => ({
        value: opt.getAttribute('value'),
        text: opt.textContent?.trim() ?? '',
      }));
    },

    isMultiple(): boolean {
      return element.multiple === true;
    },
  };
}

// ============================================================================
// ION-TOGGLE
// ============================================================================

/**
 * Get an ion-toggle by identifier
 */
export function getIonToggle(
  fixture: ComponentFixture<unknown>,
  identifier: string
): ElementHarness<HTMLIonToggleElement> | null {
  const selectors = [
    `ion-toggle[name="${identifier}"]`,
    `ion-toggle[formControlName="${identifier}"]`,
    `ion-toggle#${identifier}`,
  ];

  let debugElement: DebugElement | null = null;
  for (const selector of selectors) {
    debugElement = fixture.debugElement.query(By.css(selector));
    if (debugElement) break;
  }

  if (!debugElement) return null;

  const baseHarness = createHarness<HTMLIonToggleElement>(fixture, debugElement);

  return {
    ...baseHarness,

    async click(): Promise<void> {
      const element = baseHarness.element;
      element.checked = !element.checked;
      element.dispatchEvent(
        new CustomEvent('ionChange', {
          detail: { checked: element.checked, value: element.value },
        })
      );
      fixture.detectChanges();
      await fixture.whenStable();
    },
  };
}

// ============================================================================
// FORM HELPERS
// ============================================================================

/**
 * Fill a form with multiple values at once
 *
 * @example
 * ```typescript
 * await fillForm(fixture, {
 *   email: 'test@example.com',
 *   password: 'secret123',
 *   rememberMe: true  // for toggles/checkboxes
 * });
 * ```
 */
export async function fillForm(
  fixture: ComponentFixture<unknown>,
  values: Record<string, string | number | boolean>
): Promise<void> {
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === 'boolean') {
      // Handle toggle/checkbox
      const toggle = getIonToggle(fixture, name);
      if (toggle) {
        const element = toggle.element;
        if (element.checked !== value) {
          await toggle.click();
        }
        continue;
      }
    }

    // Try ion-input first
    const input = getIonInput(fixture, name);
    if (input) {
      await input.setValue(value as string | number);
      continue;
    }

    // Try ion-select
    const select = getIonSelect(fixture, name);
    if (select) {
      await select.selectByValue(value);
      continue;
    }

    // Form control not found - silently skip (may be optional field)
  }
}

// ============================================================================
// GENERAL QUERY HELPERS
// ============================================================================

/**
 * Query element by CSS selector
 */
export function query<T extends HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string
): ElementHarness<T> | null {
  const debugElement = fixture.debugElement.query(By.css(selector));
  return debugElement ? createHarness(fixture, debugElement) : null;
}

/**
 * Query all elements by CSS selector
 */
export function queryAll<T extends HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string
): ElementHarness<T>[] {
  return fixture.debugElement.queryAll(By.css(selector)).map(el => createHarness(fixture, el));
}

/**
 * Query element by test ID (data-testid attribute)
 */
export function getByTestId<T extends HTMLElement>(
  fixture: ComponentFixture<unknown>,
  testId: string
): ElementHarness<T> | null {
  return query(fixture, `[data-testid="${testId}"]`);
}

/**
 * Query element by text content
 */
export function getByText(
  fixture: ComponentFixture<unknown>,
  text: string,
  selector = '*'
): ElementHarness | null {
  const elements = fixture.debugElement.queryAll(By.css(selector));
  const element = elements.find(el => el.nativeElement.textContent?.trim().includes(text));
  return element ? createHarness(fixture, element) : null;
}

// ============================================================================
// CLICK AND INTERACTION HELPERS
// ============================================================================

/**
 * Generic click helper that handles change detection
 */
export async function click(
  fixture: ComponentFixture<unknown>,
  element: HTMLElement | ElementHarness
): Promise<void> {
  const el = 'element' in element ? element.element : element;
  el.click();
  fixture.detectChanges();
  await fixture.whenStable();
}

/**
 * Click an element by selector
 */
export async function clickBySelector(
  fixture: ComponentFixture<unknown>,
  selector: string
): Promise<void> {
  const element = query(fixture, selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  await element.click();
}

/**
 * Click an element by test ID
 */
export async function clickByTestId(
  fixture: ComponentFixture<unknown>,
  testId: string
): Promise<void> {
  await clickBySelector(fixture, `[data-testid="${testId}"]`);
}

// ============================================================================
// WAIT HELPERS
// ============================================================================

/**
 * Wait for an element to appear
 */
export async function waitForElement(
  fixture: ComponentFixture<unknown>,
  selector: string,
  timeout = 5000
): Promise<ElementHarness> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    fixture.detectChanges();
    const element = query(fixture, selector);
    if (element) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error(`Element "${selector}" not found within ${timeout}ms`);
}

/**
 * Wait for an element to disappear
 */
export async function waitForElementToDisappear(
  fixture: ComponentFixture<unknown>,
  selector: string,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    fixture.detectChanges();
    const element = query(fixture, selector);
    if (!element) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error(`Element "${selector}" still present after ${timeout}ms`);
}

/**
 * Wait for text to appear in the fixture
 */
export async function waitForText(
  fixture: ComponentFixture<unknown>,
  text: string,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    fixture.detectChanges();
    if (fixture.nativeElement.textContent?.includes(text)) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error(`Text "${text}" not found within ${timeout}ms`);
}

// ============================================================================
// TYPE DECLARATIONS FOR IONIC ELEMENTS
// ============================================================================

declare global {
  interface HTMLIonButtonElement extends HTMLElement {
    disabled: boolean;
    color: string;
    fill: string;
    size: string;
  }

  interface HTMLIonInputElement extends HTMLElement {
    value: string | number | null;
    type: string;
    placeholder: string;
    required: boolean;
    disabled: boolean;
  }

  interface HTMLIonSelectElement extends HTMLElement {
    value: unknown;
    multiple: boolean;
    disabled: boolean;
  }

  interface HTMLIonToggleElement extends HTMLElement {
    checked: boolean;
    value: string;
    disabled: boolean;
  }
}
