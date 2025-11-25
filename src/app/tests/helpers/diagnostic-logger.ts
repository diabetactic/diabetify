/**
 * Comprehensive Test Diagnostics System
 *
 * Provides powerful debugging capabilities for Karma/Jasmine tests including:
 * - Contextual logging with timestamps
 * - DOM snapshot capture
 * - Performance tracking
 * - Console/network interception
 * - Element interaction logging
 * - Comprehensive test reports
 */

export interface LogEntry {
  timestamp: string;
  elapsed: number;
  category: string;
  message: string;
  data?: any;
  stackTrace?: string;
}

export interface DOMSnapshot {
  label: string;
  timestamp: number;
  html: string;
  computedStyles: Record<string, any>;
  activeElement?: string;
  scrollPosition: { x: number; y: number };
}

export interface DiagnosticReport {
  testName: string;
  duration: number;
  logCount: number;
  errorCount: number;
  snapshotCount: number;
  logs: LogEntry[];
  errors: any[];
  consoleWarnings: any[];
  performance: [string, number][];
  domSnapshots: string[];
  networkRequests: any[];
  finalDOM: string;
  memoryUsage: string | number;
}

export class TestDiagnostics {
  private testName: string;
  private startTime: number;
  private logs: LogEntry[] = [];
  private domSnapshots: string[] = [];
  private performanceMarks: Map<string, number> = new Map();
  private consoleErrors: any[] = [];
  private consoleWarnings: any[] = [];
  private networkRequests: any[] = [];
  private originalConsoleError: any;
  private originalConsoleWarn: any;

  constructor(testName: string) {
    this.testName = testName;
    this.startTime = performance.now();
    this.setupConsoleInterceptors();
    this.log('INIT', `Test started: ${testName}`);
  }

  /**
   * Log with context and stack trace
   */
  log(category: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      elapsed: performance.now() - this.startTime,
      category,
      message,
      data,
      stackTrace: new Error().stack,
    };
    this.logs.push(entry);

    // Console output with color coding
    const colors: Record<string, string> = {
      INIT: '\x1b[36m', // Cyan
      DOM: '\x1b[35m', // Magenta
      PERF: '\x1b[33m', // Yellow
      ACTION: '\x1b[32m', // Green
      WAIT: '\x1b[34m', // Blue
      ASSERT: '\x1b[36m', // Cyan
      ERROR: '\x1b[31m', // Red
      NETWORK: '\x1b[35m', // Magenta
    };

    const color = colors[category] || '\x1b[0m';
    const reset = '\x1b[0m';
    console.log(`${color}[${category}]${reset} ${message}`, data || '');
  }

  /**
   * Capture DOM state with computed styles
   */
  captureDOM(label: string): void {
    try {
      const snapshot: DOMSnapshot = {
        label,
        timestamp: Date.now(),
        html: document.body.innerHTML,
        computedStyles: this.captureComputedStyles(),
        activeElement: document.activeElement?.tagName,
        scrollPosition: { x: window.scrollX, y: window.scrollY },
      };
      this.domSnapshots.push(JSON.stringify(snapshot, null, 2));
      this.log('DOM', `Snapshot captured: ${label}`, {
        htmlLength: snapshot.html.length,
        activeElement: snapshot.activeElement,
      });
    } catch (error) {
      this.log('ERROR', `Failed to capture DOM snapshot: ${label}`, error);
    }
  }

  /**
   * Capture computed styles of visible elements
   */
  private captureComputedStyles(): Record<string, any> {
    const styles: Record<string, any> = {};
    const elements = document.querySelectorAll('[id], [class*="ion-"]');

    elements.forEach(element => {
      if (element instanceof HTMLElement && element.offsetParent !== null) {
        const computed = window.getComputedStyle(element);
        const key = element.id || element.className.split(' ')[0] || element.tagName;
        styles[key] = {
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          position: computed.position,
          zIndex: computed.zIndex,
        };
      }
    });

    return styles;
  }

  /**
   * Performance tracking - create a mark
   */
  mark(label: string): void {
    const time = performance.now();
    this.performanceMarks.set(label, time);
    this.log('PERF', `Mark: ${label}`, { absoluteTime: time });
  }

  /**
   * Performance tracking - measure between two marks
   */
  measure(startMark: string, endMark: string): number {
    const start = this.performanceMarks.get(startMark);
    const end = this.performanceMarks.get(endMark);

    if (start && end) {
      const duration = end - start;
      this.log('PERF', `${startMark} → ${endMark}: ${duration.toFixed(2)}ms`, {
        start,
        end,
        duration,
      });
      return duration;
    }

    this.log('ERROR', `Cannot measure: missing mark(s)`, { startMark, endMark });
    return 0;
  }

  /**
   * Log and execute element click with before/after snapshots
   */
  async clickElement(element: HTMLElement, description: string): Promise<void> {
    this.log('ACTION', `Clicking: ${description}`, {
      element: element.tagName,
      id: element.id,
      classes: element.className,
      text: element.textContent?.substring(0, 50),
      visible: element.offsetParent !== null,
      disabled: (element as any).disabled,
    });

    this.captureDOM(`before-click-${description}`);
    this.mark(`click-${description}-start`);

    element.click();

    await this.waitForStability();
    this.mark(`click-${description}-end`);
    this.measure(`click-${description}-start`, `click-${description}-end`);
    this.captureDOM(`after-click-${description}`);
  }

  /**
   * Wait for Angular/Ionic to stabilize
   */
  async waitForStability(timeout = 1000): Promise<void> {
    const start = Date.now();
    let iterations = 0;

    while (Date.now() - start < timeout) {
      iterations++;

      // Check multiple stability indicators
      const isComplete = document.readyState === 'complete';
      const hasLoading = !!document.querySelector('ion-loading');
      const hasSpinner = !!document.querySelector('ion-spinner');
      const hasPendingAnimations = document.getAnimations().length > 0;

      if (isComplete && !hasLoading && !hasSpinner && !hasPendingAnimations) {
        this.log('WAIT', `Stability achieved in ${Date.now() - start}ms`, {
          iterations,
          checks: { isComplete, hasLoading, hasSpinner, hasPendingAnimations },
        });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.log('WAIT', `Stability timeout after ${timeout}ms (${iterations} iterations)`, {
      readyState: document.readyState,
      hasLoading: !!document.querySelector('ion-loading'),
      hasSpinner: !!document.querySelector('ion-spinner'),
      animations: document.getAnimations().length,
    });
  }

  /**
   * Setup console interception to capture errors and warnings
   */
  private setupConsoleInterceptors(): void {
    // Store original functions
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;

    // Intercept console.error
    console.error = (...args: any[]) => {
      this.consoleErrors.push({
        timestamp: Date.now(),
        args,
        stack: new Error().stack,
      });
      this.originalConsoleError.apply(console, args);
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      this.consoleWarnings.push({
        timestamp: Date.now(),
        args,
        stack: new Error().stack,
      });
      this.originalConsoleWarn.apply(console, args);
    };
  }

  /**
   * Track network request
   */
  logNetworkRequest(method: string, url: string, status?: number, data?: any): void {
    const request = {
      timestamp: Date.now(),
      method,
      url,
      status,
      data,
    };
    this.networkRequests.push(request);
    this.log('NETWORK', `${method} ${url}`, { status, hasData: !!data });
  }

  /**
   * Restore original console functions
   */
  private restoreConsole(): void {
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
    }
    if (this.originalConsoleWarn) {
      console.warn = this.originalConsoleWarn;
    }
  }

  /**
   * Generate comprehensive diagnostic report
   */
  generateReport(): DiagnosticReport {
    this.restoreConsole();

    const report: DiagnosticReport = {
      testName: this.testName,
      duration: performance.now() - this.startTime,
      logCount: this.logs.length,
      errorCount: this.consoleErrors.length,
      snapshotCount: this.domSnapshots.length,
      logs: this.logs,
      errors: this.consoleErrors,
      consoleWarnings: this.consoleWarnings,
      performance: Array.from(this.performanceMarks.entries()),
      domSnapshots: this.domSnapshots,
      networkRequests: this.networkRequests,
      finalDOM: document.body.innerHTML.substring(0, 1000),
      memoryUsage: this.getMemoryUsage(),
    };

    this.printReport(report);
    return report;
  }

  /**
   * Get memory usage if available
   */
  private getMemoryUsage(): string | number {
    const memory = (performance as any).memory;
    if (memory) {
      return `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`;
    }
    return 'N/A';
  }

  /**
   * Print formatted report to console
   */
  private printReport(report: DiagnosticReport): void {
    console.group(`📊 Test Diagnostic Report: ${report.testName}`);
    console.log(`⏱️  Duration: ${report.duration.toFixed(2)}ms`);
    console.log(`📝 Logs: ${report.logCount}`);
    console.log(`❌ Errors: ${report.errorCount}`);
    console.log(`⚠️  Warnings: ${report.consoleWarnings.length}`);
    console.log(`📸 DOM Snapshots: ${report.snapshotCount}`);
    console.log(`🌐 Network Requests: ${report.networkRequests.length}`);
    console.log(`💾 Memory: ${report.memoryUsage}`);

    if (report.errors.length > 0) {
      console.group('❌ Captured Errors:');
      report.errors.forEach((error, idx) => {
        console.error(`Error ${idx + 1}:`, error.args);
      });
      console.groupEnd();
    }

    if (report.consoleWarnings.length > 0) {
      console.group('⚠️  Captured Warnings:');
      report.consoleWarnings.forEach((warning, idx) => {
        console.warn(`Warning ${idx + 1}:`, warning.args);
      });
      console.groupEnd();
    }

    if (report.performance.length > 0) {
      console.group('⚡ Performance Marks:');
      report.performance.forEach(([label, time]) => {
        console.log(`${label}: ${time.toFixed(2)}ms`);
      });
      console.groupEnd();
    }

    console.log('📊 Full Report:', report);
    console.groupEnd();
  }

  /**
   * Install diagnostics for all tests (Jasmine integration)
   */
  static install(): void {
    beforeEach(function (this: any) {
      const testName = this.description || 'Unknown Test';
      (window as any).currentTestDiagnostics = new TestDiagnostics(testName);
    });

    afterEach(function (this: any) {
      const diagnostics = (window as any).currentTestDiagnostics;
      if (diagnostics) {
        diagnostics.generateReport();
      }
    });
  }
}

/**
 * Get current test diagnostics instance
 */
export function getDiagnostics(): TestDiagnostics | undefined {
  return (window as any).currentTestDiagnostics;
}

/**
 * Enhanced assertions with logging
 */
export function expectElement(selector: string) {
  const element = document.querySelector(selector);
  const isVisible = element ? (element as HTMLElement).offsetParent !== null : false;

  getDiagnostics()?.log('ASSERT', `Checking element: ${selector}`, {
    exists: !!element,
    visible: isVisible,
    tagName: element?.tagName,
    classes: (element as HTMLElement)?.className,
  });

  return expect(element);
}

/**
 * Wait for element to appear in DOM
 */
export async function waitForElement(selector: string, timeout = 5000): Promise<Element> {
  const diagnostics = getDiagnostics();
  diagnostics?.log('WAIT', `Waiting for element: ${selector}`, { timeout });
  diagnostics?.mark(`wait-${selector}-start`);

  const start = Date.now();
  let lastCheck = 0;

  while (Date.now() - start < timeout) {
    const element = document.querySelector(selector);

    if (element) {
      const elapsed = Date.now() - start;
      diagnostics?.mark(`wait-${selector}-end`);
      diagnostics?.measure(`wait-${selector}-start`, `wait-${selector}-end`);
      diagnostics?.log('WAIT', `Element found: ${selector}`, {
        elapsed: `${elapsed}ms`,
        checks: Math.floor(elapsed / 100),
      });
      return element;
    }

    // Log progress every 1000ms
    const now = Date.now();
    if (now - lastCheck > 1000) {
      diagnostics?.log('WAIT', `Still waiting for: ${selector}`, {
        elapsed: `${now - start}ms`,
        remaining: `${timeout - (now - start)}ms`,
      });
      lastCheck = now;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  diagnostics?.captureDOM(`element-not-found-${selector}`);
  diagnostics?.log('ERROR', `Element not found: ${selector}`, {
    timeout: `${timeout}ms`,
    finalDOM: document.body.innerHTML.substring(0, 500),
  });

  throw new Error(`Element ${selector} not found after ${timeout}ms`);
}

/**
 * Wait for element to be visible (in viewport and not hidden)
 */
export async function waitForVisible(selector: string, timeout = 5000): Promise<HTMLElement> {
  const diagnostics = getDiagnostics();
  diagnostics?.log('WAIT', `Waiting for visible: ${selector}`, { timeout });

  const start = Date.now();

  while (Date.now() - start < timeout) {
    const element = document.querySelector(selector) as HTMLElement;

    if (element && element.offsetParent !== null) {
      const elapsed = Date.now() - start;
      diagnostics?.log('WAIT', `Element visible: ${selector}`, {
        elapsed: `${elapsed}ms`,
      });
      return element;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  diagnostics?.captureDOM(`element-not-visible-${selector}`);
  diagnostics?.log('ERROR', `Element not visible: ${selector}`, { timeout: `${timeout}ms` });

  throw new Error(`Element ${selector} not visible after ${timeout}ms`);
}

/**
 * Wait for text content to appear
 */
export async function waitForText(text: string, timeout = 5000): Promise<Element> {
  const diagnostics = getDiagnostics();
  diagnostics?.log('WAIT', `Waiting for text: "${text}"`, { timeout });

  const start = Date.now();

  while (Date.now() - start < timeout) {
    const xpath = `//*[contains(text(), '${text}')]`;
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const element = result.singleNodeValue as Element;

    if (element) {
      const elapsed = Date.now() - start;
      diagnostics?.log('WAIT', `Text found: "${text}"`, {
        elapsed: `${elapsed}ms`,
        element: element.tagName,
      });
      return element;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  diagnostics?.captureDOM(`text-not-found-${text}`);
  diagnostics?.log('ERROR', `Text not found: "${text}"`, { timeout: `${timeout}ms` });

  throw new Error(`Text "${text}" not found after ${timeout}ms`);
}

/**
 * Log spy call information
 */
export function logSpyCalls(spy: jasmine.Spy, name: string): void {
  const diagnostics = getDiagnostics();
  diagnostics?.log('ASSERT', `Spy calls: ${name}`, {
    callCount: spy.calls.count(),
    calls: spy.calls.allArgs(),
    mostRecent: spy.calls.mostRecent()?.args,
  });
}
