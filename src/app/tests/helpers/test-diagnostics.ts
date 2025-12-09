/**
 * Test Diagnostics Utilities
 *
 * Provides comprehensive debugging and monitoring utilities for integration tests.
 * Includes logging, DOM snapshots, performance measurement, and error capture.
 */

/**
 * Enhanced Test Logger
 */
export class TestLogger {
  private testName: string;
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();
  private errors: any[] = [];
  private warnings: any[] = [];

  constructor(testName: string) {
    this.testName = testName;
    this.startTime = performance.now();
    console.group(`🧪 Test: ${testName}`);
    console.log('📍 Started at:', new Date().toISOString());
    console.log('⏱️ Performance baseline:', this.startTime);
  }

  log(message: string, ...args: any[]): void {
    console.log(`  ℹ️ ${message}`, ...args);
  }

  checkpoint(name: string): void {
    const timestamp = performance.now();
    this.checkpoints.set(name, timestamp);
    console.log(`  ✓ Checkpoint: ${name} (+${(timestamp - this.startTime).toFixed(2)}ms)`);
  }

  error(message: string, error?: any): void {
    this.errors.push({ message, error, timestamp: performance.now() });
    console.error(`  ❌ ${message}`, error);
  }

  warn(message: string, ...args: any[]): void {
    this.warnings.push({ message, args, timestamp: performance.now() });
    console.warn(`  ⚠️ ${message}`, ...args);
  }

  complete(): TestReport {
    const duration = performance.now() - this.startTime;
    console.log(`✅ Test completed in ${duration.toFixed(2)}ms`);
    console.log('📊 Performance Summary:');

    let lastTime = this.startTime;
    this.checkpoints.forEach((time, name) => {
      const delta = time - lastTime;
      console.log(`  ${name}: ${delta.toFixed(2)}ms`);
      lastTime = time;
    });

    if (this.errors.length > 0) {
      console.error(`❌ ${this.errors.length} error(s) captured`);
    }
    if (this.warnings.length > 0) {
      console.warn(`⚠️ ${this.warnings.length} warning(s) captured`);
    }

    console.groupEnd();

    return {
      testName: this.testName,
      duration,
      checkpoints: Array.from(this.checkpoints.entries()),
      errors: this.errors,
      warnings: this.warnings,
      passed: this.errors.length === 0,
    };
  }
}

export interface TestReport {
  testName: string;
  duration: number;
  checkpoints: [string, number][];
  errors: any[];
  warnings: any[];
  passed: boolean;
}

/**
 * DOM Snapshot Utilities
 */
export class DOMSnapshot {
  static capture(element: Element | null, maxLength: number = 500): string {
    if (!element) {
      return '(null element)';
    }
    const html = element.outerHTML;
    return html.length > maxLength ? `${html.substring(0, maxLength)}...` : html;
  }

  static captureTree(element: Element | null, depth: number = 3): any {
    if (!element || depth === 0) {
      return null;
    }

    const snapshot: any = {
      tag: element.tagName.toLowerCase(),
      id: element.id || undefined,
      classes: Array.from(element.classList),
      attributes: {},
      children: [],
    };

    // Capture important attributes
    const importantAttrs = ['type', 'value', 'placeholder', 'disabled', 'readonly', 'name'];
    importantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value !== null) {
        snapshot.attributes[attr] = value;
      }
    });

    // Capture children
    Array.from(element.children).forEach(child => {
      const childSnapshot = this.captureTree(child, depth - 1);
      if (childSnapshot) {
        snapshot.children.push(childSnapshot);
      }
    });

    return snapshot;
  }

  static log(label: string, element: Element | null): void {
    console.log(`📸 DOM Snapshot: ${label}`);
    console.log(this.captureTree(element));
  }

  static compare(before: Element | null, after: Element | null): void {
    console.group('🔄 DOM Comparison');
    console.log('Before:', this.captureTree(before));
    console.log('After:', this.captureTree(after));
    console.groupEnd();
  }
}

/**
 * Performance Measurement Utilities
 */
export class PerformanceMeasurement {
  private static marks: Map<string, number> = new Map();

  static mark(name: string): void {
    const timestamp = performance.now();
    this.marks.set(name, timestamp);
    console.log(`⏱️ Mark: ${name} at ${timestamp.toFixed(2)}ms`);
  }

  static measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    if (!start) {
      console.error(`❌ Start mark "${startMark}" not found`);
      return -1;
    }

    const end = endMark ? this.marks.get(endMark) : performance.now();
    if (!end) {
      console.error(`❌ End mark "${endMark}" not found`);
      return -1;
    }

    const duration = end - start;
    console.log(`📊 Measure: ${name} = ${duration.toFixed(2)}ms`);
    return duration;
  }

  static clear(): void {
    this.marks.clear();
  }

  static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    console.log(`⏱️ Starting async operation: ${name}`);

    try {
      const result = await fn();
      const duration = performance.now() - start;
      console.log(`✅ Completed ${name} in ${duration.toFixed(2)}ms`);
      return { result, duration };
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`❌ Failed ${name} after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }
}

/**
 * Visual Verification Utilities
 */
export class VisualVerification {
  static getCSSVariable(element: Element, variableName: string): string {
    const computedStyle = window.getComputedStyle(element);
    return computedStyle.getPropertyValue(variableName).trim();
  }

  static getComputedStyle(element: Element): CSSStyleDeclaration {
    return window.getComputedStyle(element);
  }

  static verifyBackgroundColor(
    element: Element,
    expectedColor: string,
    _tolerance: number = 5
  ): boolean {
    const computed = this.getComputedStyle(element);
    const actual = computed.backgroundColor;

    console.log(`🎨 Background Color - Expected: ${expectedColor}, Actual: ${actual}`);

    // Simple string comparison for now
    // Could be enhanced with color parsing and tolerance checking
    return actual.includes(expectedColor);
  }

  static verifyVisibility(element: Element): boolean {
    const computed = this.getComputedStyle(element);
    const visible =
      computed.display !== 'none' && computed.visibility !== 'hidden' && computed.opacity !== '0';

    console.log(
      `👁️ Visibility - Display: ${computed.display}, Visibility: ${computed.visibility}, Opacity: ${computed.opacity}`
    );
    return visible;
  }

  static logAllCSSVariables(element: Element): void {
    const computed = window.getComputedStyle(element);
    const cssVars: Record<string, string> = {};

    // Get all custom properties
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      if (prop.startsWith('--')) {
        cssVars[prop] = computed.getPropertyValue(prop).trim();
      }
    }

    console.group('🎨 CSS Variables');
    console.table(cssVars);
    console.groupEnd();
  }
}

/**
 * Network Monitoring Utilities
 */
export class NetworkMonitor {
  private requests: NetworkRequest[] = [];
  private originalFetch: any;

  start(): void {
    this.requests = [];
    console.log('🌐 Network monitoring started');

    // Mock fetch to intercept requests
    this.originalFetch = window.fetch;
    window.fetch = this.mockFetch.bind(this);
  }

  stop(): void {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }
    console.log(`🌐 Network monitoring stopped - ${this.requests.length} request(s) captured`);
  }

  private async mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    const startTime = performance.now();

    console.log(`📡 Network Request: ${method} ${url}`);

    try {
      const response = await this.originalFetch(input, init);
      const duration = performance.now() - startTime;

      this.requests.push({
        url,
        method,
        status: response.status,
        duration,
        timestamp: Date.now(),
      });

      console.log(`✅ Response: ${response.status} (${duration.toFixed(2)}ms)`);
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Request failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  getRequests(): NetworkRequest[] {
    return [...this.requests];
  }

  logSummary(): void {
    console.group('📊 Network Summary');
    console.table(this.requests);
    console.log(`Total Requests: ${this.requests.length}`);
    console.log(`Average Duration: ${this.getAverageDuration().toFixed(2)}ms`);
    console.groupEnd();
  }

  private getAverageDuration(): number {
    if (this.requests.length === 0) return 0;
    const total = this.requests.reduce((sum, req) => sum + req.duration, 0);
    return total / this.requests.length;
  }
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  duration: number;
  timestamp: number;
}

/**
 * Console Error Capture
 */
export class ConsoleErrorCapture {
  private errors: any[] = [];
  private warnings: any[] = [];
  private originalError: any;
  private originalWarn: any;

  start(): void {
    this.errors = [];
    this.warnings = [];

    this.originalError = console.error;
    this.originalWarn = console.warn;

    console.error = (...args: any[]) => {
      this.errors.push({ args, timestamp: Date.now() });
      this.originalError.apply(console, ['❌ Captured Error:', ...args]);
    };

    console.warn = (...args: any[]) => {
      this.warnings.push({ args, timestamp: Date.now() });
      this.originalWarn.apply(console, ['⚠️ Captured Warning:', ...args]);
    };

    console.log('🎯 Console error capture started');
  }

  stop(): void {
    if (this.originalError) {
      console.error = this.originalError;
    }
    if (this.originalWarn) {
      console.warn = this.originalWarn;
    }
    console.log(
      `🎯 Console capture stopped - ${this.errors.length} error(s), ${this.warnings.length} warning(s)`
    );
  }

  getErrors(): any[] {
    return [...this.errors];
  }

  getWarnings(): any[] {
    return [...this.warnings];
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  logSummary(): void {
    console.group('📋 Console Summary');
    if (this.errors.length > 0) {
      console.error(`${this.errors.length} Error(s):`);
      this.errors.forEach((e, i) => console.error(`  ${i + 1}.`, ...e.args));
    }
    if (this.warnings.length > 0) {
      console.warn(`${this.warnings.length} Warning(s):`);
      this.warnings.forEach((w, i) => console.warn(`  ${i + 1}.`, ...w.args));
    }
    console.groupEnd();
  }
}

/**
 * Memory Leak Detection
 */
export class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];

  takeSnapshot(label: string): void {
    if (!(performance as any).memory) {
      console.warn('⚠️ performance.memory not available');
      return;
    }

    const snapshot: MemorySnapshot = {
      label,
      timestamp: Date.now(),
      usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
    };

    this.snapshots.push(snapshot);
    console.log(`💾 Memory Snapshot: ${label}`, {
      used: `${(snapshot.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(snapshot.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
    });
  }

  analyze(): MemoryAnalysis {
    if (this.snapshots.length < 2) {
      console.warn('⚠️ Need at least 2 snapshots for analysis');
      return { hasLeak: false, growth: 0, snapshots: this.snapshots };
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const growth = last.usedJSHeapSize - first.usedJSHeapSize;
    const growthMB = growth / 1024 / 1024;

    console.group('💾 Memory Analysis');
    console.log(`Initial: ${(first.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Final: ${(last.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Growth: ${growthMB.toFixed(2)} MB`);

    // Consider it a potential leak if growth > 5MB
    const hasLeak = growthMB > 5;
    if (hasLeak) {
      console.warn('⚠️ Potential memory leak detected!');
    } else {
      console.log('✅ Memory usage looks healthy');
    }
    console.groupEnd();

    return { hasLeak, growth, snapshots: this.snapshots };
  }

  clear(): void {
    this.snapshots = [];
  }
}

export interface MemorySnapshot {
  label: string;
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface MemoryAnalysis {
  hasLeak: boolean;
  growth: number;
  snapshots: MemorySnapshot[];
}

/**
 * Complete Test Suite for Integration Tests
 */
export class IntegrationTestSuite {
  logger: TestLogger;
  networkMonitor: NetworkMonitor;
  consoleCapture: ConsoleErrorCapture;
  memoryDetector: MemoryLeakDetector;

  constructor(testName: string) {
    this.logger = new TestLogger(testName);
    this.networkMonitor = new NetworkMonitor();
    this.consoleCapture = new ConsoleErrorCapture();
    this.memoryDetector = new MemoryLeakDetector();
  }

  startMonitoring(): void {
    this.networkMonitor.start();
    this.consoleCapture.start();
    this.memoryDetector.takeSnapshot('start');
  }

  stopMonitoring(): TestReport {
    this.networkMonitor.stop();
    this.consoleCapture.stop();
    this.memoryDetector.takeSnapshot('end');

    this.networkMonitor.logSummary();
    this.consoleCapture.logSummary();
    this.memoryDetector.analyze();

    return this.logger.complete();
  }
}
