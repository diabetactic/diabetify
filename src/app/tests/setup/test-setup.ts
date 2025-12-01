/**
 * Global Test Setup
 *
 * Automatically configures test environment with:
 * - Diagnostic logging system
 * - Error capturing
 * - Environment information
 * - Performance monitoring
 */

import { TestDiagnostics } from '../helpers/diagnostic-logger';

// Auto-install diagnostics for all tests
TestDiagnostics.install();

// Capture unhandled errors
window.addEventListener('error', event => {
  console.error('🔴 Unhandled Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack,
  });

  // Store in diagnostics if available
  const diagnostics = (window as any).currentTestDiagnostics;
  if (diagnostics) {
    diagnostics.log('ERROR', 'Unhandled Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  }
});

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('🔴 Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise,
  });

  // Store in diagnostics if available
  const diagnostics = (window as any).currentTestDiagnostics;
  if (diagnostics) {
    diagnostics.log('ERROR', 'Unhandled Promise Rejection', {
      reason: event.reason,
      stack: event.reason?.stack,
    });
  }
});

// Capture Angular zone errors
(window as any).Zone?.current.fork({
  name: 'test-error-capture',
  onHandleError: (delegate: any, current: any, target: any, error: any) => {
    console.error('🔴 Zone Error:', error);

    const diagnostics = (window as any).currentTestDiagnostics;
    if (diagnostics) {
      diagnostics.log('ERROR', 'Zone Error', {
        error,
        stack: error?.stack,
        zone: target.name,
      });
    }

    return delegate.handleError(target, error);
  },
});

// Log test environment information
console.group('🧪 Test Environment Initialized');
console.log('📍 User Agent:', navigator.userAgent);
console.log('📍 Platform:', navigator.platform);
console.log('📍 Test Framework: Karma + Jasmine');
console.log('📍 Angular Version:', getAngularVersion());
console.log('📍 Ionic Version:', getIonicVersion());
console.log('📍 Screen Size:', `${window.innerWidth}x${window.innerHeight}`);
console.log(
  '📍 Viewport:',
  `${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`
);
console.log('📍 Device Pixel Ratio:', window.devicePixelRatio);
console.log('📍 Memory:', getMemoryInfo());
console.log('📍 Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('📍 Language:', navigator.language);
console.groupEnd();

/**
 * Get Angular version from global namespace
 */
function getAngularVersion(): string {
  try {
    const ng = (window as any).ng;
    if (ng?.VERSION?.full) {
      return ng.VERSION.full;
    }
    // Try from Angular core
    const core = (window as any).require?.('@angular/core');
    return core?.VERSION?.full || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/**
 * Get Ionic version
 */
function getIonicVersion(): string {
  try {
    // Check for Ionic global
    const ionic = (window as any).Ionic;
    if (ionic?.version) {
      return ionic.version;
    }
    // Try from package
    const pkg = (window as any).require?.('@ionic/angular/package.json');
    return pkg?.version || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/**
 * Get memory information
 */
function getMemoryInfo(): string {
  const memory = (performance as any).memory;
  if (memory) {
    return `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB / ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB (Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB)`;
  }
  return 'N/A';
}

// Log when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM Content Loaded');
  });
} else {
  console.log('✅ DOM Already Loaded');
}

// Log when page is fully loaded
if (document.readyState === 'complete') {
  console.log('✅ Page Fully Loaded');
} else {
  window.addEventListener('load', () => {
    console.log('✅ Page Fully Loaded');
  });
}

// Monitor long tasks (performance)
if ('PerformanceObserver' in window) {
  try {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn('⚠️  Long Task Detected:', {
            duration: `${entry.duration.toFixed(2)}ms`,
            startTime: entry.startTime,
            name: entry.name,
          });
        }
      }
    });
    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    // Long task API not supported
  }
}

// Global test utilities
(window as any).testUtils = {
  /**
   * Print current DOM state
   */
  printDOM() {
    console.log('📄 Current DOM:', document.body.innerHTML);
  },

  /**
   * Print all registered Ionic components
   */
  printIonicComponents() {
    const components = document.querySelectorAll('[class*="ion-"]');
    console.log(
      `🔷 Ionic Components (${components.length}):`,
      Array.from(components).map(el => ({
        tag: el.tagName,
        classes: el.className,
        id: (el as HTMLElement).id,
      }))
    );
  },

  /**
   * Print all event listeners (if available)
   */
  printEventListeners() {
    if ((window as any).getEventListeners) {
      const listeners = (window as any).getEventListeners(document);
      console.log('👂 Event Listeners:', listeners);
    } else {
      console.warn('⚠️  getEventListeners() not available');
    }
  },

  /**
   * Take a performance snapshot
   */
  perfSnapshot() {
    const memory = (performance as any).memory;
    const navigation = performance.getEntriesByType('navigation')[0] as any;

    console.group('⚡ Performance Snapshot');
    console.log('Time:', {
      now: performance.now(),
      timeOrigin: performance.timeOrigin,
    });
    if (memory) {
      console.log('Memory:', {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
      });
    }
    if (navigation) {
      console.log('Navigation:', {
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive,
      });
    }
    console.log('Resources:', performance.getEntriesByType('resource').length);
    console.log('Marks:', performance.getEntriesByType('mark').length);
    console.log('Measures:', performance.getEntriesByType('measure').length);
    console.groupEnd();
  },

  /**
   * Clear all performance entries
   */
  clearPerf() {
    performance.clearMarks();
    performance.clearMeasures();
    performance.clearResourceTimings();
    console.log('✅ Performance entries cleared');
  },
};

console.log('💡 Tip: Use window.testUtils for debugging utilities');
console.log('   - testUtils.printDOM()');
console.log('   - testUtils.printIonicComponents()');
console.log('   - testUtils.perfSnapshot()');
console.log('   - testUtils.clearPerf()');

export {};
