/**
 * Performance Monitoring Utilities for Integration Tests
 *
 * Provides comprehensive performance tracking including:
 * - Render times
 * - Memory usage
 * - DOM node changes
 * - Navigation performance
 * - Theme switching performance
 * - Interaction timing
 */

export interface PerformanceMetrics {
  renderTime: number;
  interactionTime: number;
  memoryUsage: number;
  domNodes: number;
  styleRecalculations: number;
  layoutRecalculations: number;
}

export interface PerformanceThreshold {
  renderTime: number;
  memoryUsage: number;
  domNodes: number;
}

export const DEFAULT_THRESHOLDS: PerformanceThreshold = {
  renderTime: 300, // ms
  memoryUsage: 5242880, // 5MB
  domNodes: 1000,
};

export class PerformanceMonitor {
  private observer: PerformanceObserver | null = null;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private startMarks: Map<string, number> = new Map();
  private thresholds: PerformanceThreshold;

  constructor(thresholds: PerformanceThreshold = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
    this.setupObserver();
  }

  /**
   * Setup performance observer to capture browser performance entries
   */
  private setupObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            const duration = entry.duration?.toFixed(2) || 'N/A';
            console.log(`⚡ Performance Entry: ${entry.name} - ${duration}ms`);
          }
        });

        this.observer.observe({
          entryTypes: ['measure', 'navigation', 'paint', 'largest-contentful-paint'],
        });
      } catch (error) {
        console.warn('PerformanceObserver not fully supported:', error);
      }
    }
  }

  /**
   * Start measuring performance for a labeled operation
   */
  startMeasurement(label: string): void {
    this.startMarks.set(label, performance.now());
    const initialMetrics = this.captureMetrics();
    this.metrics.set(`${label}_start`, initialMetrics);

    console.log(`📊 Started measurement: ${label}`);
    console.log(`   DOM Nodes: ${initialMetrics.domNodes}`);
    console.log(`   Memory: ${(initialMetrics.memoryUsage / 1048576).toFixed(2)} MB`);
  }

  /**
   * End measurement and calculate deltas
   */
  endMeasurement(label: string): PerformanceMetrics {
    const startTime = this.startMarks.get(label);
    if (!startTime) {
      throw new Error(`No start mark found for ${label}`);
    }

    const duration = performance.now() - startTime;
    const endMetrics = this.captureMetrics();
    const startMetrics = this.metrics.get(`${label}_start`);

    const results: PerformanceMetrics = {
      renderTime: duration,
      interactionTime: duration,
      memoryUsage: endMetrics.memoryUsage - (startMetrics?.memoryUsage || 0),
      domNodes: endMetrics.domNodes - (startMetrics?.domNodes || 0),
      styleRecalculations: 0,
      layoutRecalculations: 0,
    };

    this.logResults(label, results);
    this.metrics.set(label, results);

    return results;
  }

  /**
   * Log measurement results with visual indicators
   */
  private logResults(label: string, results: PerformanceMetrics): void {
    const status = this.getPerformanceStatus(results.renderTime);
    const statusIcon = status === 'FAST' ? '✅' : status === 'ACCEPTABLE' ? '⚠️' : '❌';

    console.group(`📊 Measurement Complete: ${label}`);
    console.log(`⏱️  Duration: ${results.renderTime.toFixed(2)}ms`);
    console.log(`📦 Memory Delta: ${(results.memoryUsage / 1048576).toFixed(2)} MB`);
    console.log(`🌳 DOM Nodes Added: ${results.domNodes}`);
    console.log(`${statusIcon} Status: ${status}`);
    console.groupEnd();
  }

  /**
   * Determine performance status based on render time
   */
  private getPerformanceStatus(renderTime: number): 'FAST' | 'ACCEPTABLE' | 'SLOW' {
    if (renderTime < 100) return 'FAST';
    if (renderTime < this.thresholds.renderTime) return 'ACCEPTABLE';
    return 'SLOW';
  }

  /**
   * Capture current performance metrics
   */
  private captureMetrics(): PerformanceMetrics {
    const memory = this.getMemoryUsage();
    const domNodes = this.getDOMNodeCount();

    return {
      renderTime: 0,
      interactionTime: 0,
      memoryUsage: memory,
      domNodes: domNodes,
      styleRecalculations: 0,
      layoutRecalculations: 0,
    };
  }

  /**
   * Get current memory usage (if available)
   */
  private getMemoryUsage(): number {
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  /**
   * Count all DOM nodes in document
   */
  private getDOMNodeCount(): number {
    return document.querySelectorAll('*').length;
  }

  /**
   * Measure theme switching performance
   */
  async measureThemeSwitch(switchFn: () => Promise<void>): Promise<PerformanceMetrics> {
    this.startMeasurement('theme-switch');

    // Capture initial color
    const root = document.documentElement;
    const colorBefore = getComputedStyle(root).getPropertyValue('--ion-color-primary').trim();

    // Execute theme switch
    await switchFn();

    // Wait for repaint
    await this.waitForRepaint();

    // Capture new color
    const colorAfter = getComputedStyle(root).getPropertyValue('--ion-color-primary').trim();

    const metrics = this.endMeasurement('theme-switch');

    console.log(`🎨 Theme Switch: ${colorBefore} -> ${colorAfter}`);
    console.log(`   Changed: ${colorBefore !== colorAfter}`);

    return metrics;
  }

  /**
   * Measure navigation performance
   */
  async measureNavigation(navigateFn: () => Promise<void>): Promise<PerformanceMetrics> {
    this.startMeasurement('navigation');

    const beforeUrl = window.location.href;

    await navigateFn();

    // Wait for navigation to complete
    await this.waitForNavigation();

    const metrics = this.endMeasurement('navigation');

    const afterUrl = window.location.href;
    console.log(`🧭 Navigation: ${beforeUrl} -> ${afterUrl}`);
    console.log(`   Same URL: ${beforeUrl === afterUrl}`);

    return metrics;
  }

  /**
   * Measure component render performance
   */
  async measureComponentRender(renderFn: () => Promise<void>): Promise<PerformanceMetrics> {
    this.startMeasurement('component-render');

    await renderFn();

    // Wait for rendering to complete
    await this.waitForRepaint();

    return this.endMeasurement('component-render');
  }

  /**
   * Measure data loading performance
   */
  async measureDataLoad(loadFn: () => Promise<void>): Promise<PerformanceMetrics> {
    this.startMeasurement('data-load');

    await loadFn();

    return this.endMeasurement('data-load');
  }

  /**
   * Wait for browser repaint
   */
  private async waitForRepaint(): Promise<void> {
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Wait for navigation to complete
   */
  private async waitForNavigation(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(): Map<string, PerformanceMetrics> {
    console.group('📊 Performance Report');

    const allMetrics = Array.from(this.metrics.entries());
    const measurements = allMetrics.filter(([label]) => !label.endsWith('_start'));

    // Display individual measurements
    for (const [label, metrics] of measurements) {
      console.log(`${label}:`, {
        time: `${metrics.renderTime.toFixed(2)}ms`,
        memory: `${(metrics.memoryUsage / 1048576).toFixed(2)} MB`,
        domNodes: metrics.domNodes,
      });
    }

    // Calculate averages
    if (measurements.length > 0) {
      const avgRenderTime =
        measurements.reduce((sum, [_, m]) => sum + m.renderTime, 0) / measurements.length;
      const avgMemory =
        measurements.reduce((sum, [_, m]) => sum + m.memoryUsage, 0) / measurements.length;

      console.log('\n📈 Averages:', {
        renderTime: `${avgRenderTime.toFixed(2)}ms`,
        memory: `${(avgMemory / 1048576).toFixed(2)} MB`,
      });
    }

    // Performance warnings
    this.logPerformanceWarnings(measurements);

    console.groupEnd();

    return this.metrics;
  }

  /**
   * Log performance warnings for problematic measurements
   */
  private logPerformanceWarnings(measurements: [string, PerformanceMetrics][]): void {
    const slowOperations = measurements.filter(
      ([_, m]) => m.renderTime > this.thresholds.renderTime
    );
    if (slowOperations.length > 0) {
      console.warn(
        `⚠️ Slow Operations (>${this.thresholds.renderTime}ms):`,
        slowOperations.map(([l]) => l)
      );
    }

    const memoryHeavy = measurements.filter(
      ([_, m]) => m.memoryUsage > this.thresholds.memoryUsage
    );
    if (memoryHeavy.length > 0) {
      console.warn(
        `⚠️ High Memory Usage (>${(this.thresholds.memoryUsage / 1048576).toFixed(2)}MB):`,
        memoryHeavy.map(([l]) => l)
      );
    }

    const domHeavy = measurements.filter(([_, m]) => m.domNodes > this.thresholds.domNodes);
    if (domHeavy.length > 0) {
      console.warn(
        `⚠️ Large DOM Changes (>${this.thresholds.domNodes} nodes):`,
        domHeavy.map(([l]) => l)
      );
    }
  }

  /**
   * Get specific measurement result
   */
  getMetrics(label: string): PerformanceMetrics | undefined {
    return this.metrics.get(label);
  }

  /**
   * Check if measurement exceeds thresholds
   */
  exceedsThresholds(label: string): boolean {
    const metrics = this.getMetrics(label);
    if (!metrics) return false;

    return (
      metrics.renderTime > this.thresholds.renderTime ||
      metrics.memoryUsage > this.thresholds.memoryUsage ||
      metrics.domNodes > this.thresholds.domNodes
    );
  }

  /**
   * Reset all measurements
   */
  reset(): void {
    this.metrics.clear();
    this.startMarks.clear();
  }

  /**
   * Cleanup and disconnect observer
   */
  cleanup(): void {
    this.observer?.disconnect();
    this.reset();
  }
}

/**
 * Install performance monitoring in Jasmine test suite
 */
export function installPerformanceMonitoring(thresholds?: PerformanceThreshold): void {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor(thresholds);
    (window as any).perfMonitor = monitor;
  });

  afterEach(() => {
    monitor.generateReport();
    monitor.cleanup();
  });
}

/**
 * Get the current performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  const monitor = (window as any).perfMonitor;
  if (!monitor) {
    throw new Error(
      'Performance monitor not initialized. Call installPerformanceMonitoring() in beforeEach()'
    );
  }
  return monitor;
}

/**
 * Measure an async operation
 */
export async function measureOperation(
  label: string,
  operation: () => Promise<void>
): Promise<PerformanceMetrics> {
  const monitor = getPerformanceMonitor();
  monitor.startMeasurement(label);
  await operation();
  return monitor.endMeasurement(label);
}

/**
 * Measure a synchronous operation
 */
export function measureSync(label: string, operation: () => void): PerformanceMetrics {
  const monitor = getPerformanceMonitor();
  monitor.startMeasurement(label);
  operation();
  return monitor.endMeasurement(label);
}

/**
 * Assert performance metrics meet expectations
 */
export function expectPerformance(
  metrics: PerformanceMetrics,
  expectations: {
    maxRenderTime?: number;
    maxMemory?: number;
    maxDomNodes?: number;
  }
): void {
  if (expectations.maxRenderTime !== undefined) {
    // Jest's toBeLessThan doesn't support custom messages
    expect(metrics.renderTime).toBeLessThan(expectations.maxRenderTime);
  }

  if (expectations.maxMemory !== undefined) {
    expect(metrics.memoryUsage).toBeLessThan(expectations.maxMemory);
  }

  if (expectations.maxDomNodes !== undefined) {
    expect(metrics.domNodes).toBeLessThan(expectations.maxDomNodes);
  }
}
