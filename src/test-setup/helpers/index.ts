/**
 * Test Helpers Index
 *
 * Central export for all test utilities.
 *
 * @example
 * ```typescript
 * import {
 *   // Signal testing
 *   expectSignal,
 *   flushEffects,
 *   createSignalTracker,
 *
 *   // Component harnesses
 *   getIonButton,
 *   getIonInput,
 *   fillForm,
 *
 *   // Test data
 *   TestDataFactory,
 * } from '@test-setup/helpers';
 * ```
 */

// Signal testing utilities (Angular 21+)
export {
  flushEffects,
  updateSignalAndFlush,
  updateSignalWithFnAndFlush,
  expectSignal,
  expectComputed,
  createSignalTracker,
  testEffect,
  createTestSignal,
  waitForSignal,
  expectSignalEventually,
} from './signal-test.helper';

// Component harness utilities (Ionic/Angular)
export {
  // Types
  type ElementHarness,
  type IonInputHarness,
  type IonSelectHarness,

  // Button helpers
  getIonButton,
  getIonButtonBySelector,
  getAllIonButtons,
  clickIonButton,

  // Input helpers
  getIonInput,
  setIonInputValue,

  // Select helpers
  getIonSelect,

  // Toggle helpers
  getIonToggle,

  // Form helpers
  fillForm,

  // General query helpers
  query,
  queryAll,
  getByTestId,
  getByText,

  // Click helpers
  click,
  clickBySelector,
  clickByTestId,

  // Wait helpers
  waitForElement,
  waitForElementToDisappear,
  waitForText,
} from './component-harness.helper';

// Test data factory with Faker.js
export {
  TestDataFactory,
  faker,
  type TestUser,
  type TestGlucoseReading,
  type TestAppointment,
  type TestAuthTokens,
} from './test-data-factory.helper';
