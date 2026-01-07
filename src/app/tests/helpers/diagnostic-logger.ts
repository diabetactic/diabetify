/**
 * Test Diagnostics Logger
 *
 * Provides a diagnostic logging system for tests that captures
 * errors, warnings, and performance information.
 */

/**
 * Log level types
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
  testName?: string;
}

/**
 * Test Diagnostics class for capturing and reporting test information
 */
export class TestDiagnostics {
  private static instance: TestDiagnostics | null = null;
  private static installed = false;

  private logs: LogEntry[] = [];
  private testName: string = '';
  private startTime: number = 0;

  constructor(testName?: string) {
    this.testName = testName || 'Unknown Test';
    this.startTime = performance.now();
  }

  /**
   * Install global diagnostics hooks
   * Call this once at the start of test suite
   */
  static install(): void {
    if (this.installed) {
      return;
    }

    this.installed = true;

    // Create global instance
    this.instance = new TestDiagnostics('Global');

    // Store on window for access from error handlers
    (window as { currentTestDiagnostics?: TestDiagnostics }).currentTestDiagnostics = this.instance;

    // Install hooks for Jasmine if available
    if (typeof jasmine !== 'undefined') {
      const originalDescribe = (window as any).describe;
      const originalIt = (window as any).it;

      if (originalDescribe) {
        (window as any).describe = function (description: string, specDefinitions: () => void) {
          return originalDescribe(description, function () {
            TestDiagnostics.getInstance()?.log('INFO', `Describe: ${description}`);
            specDefinitions();
          });
        };
      }

      if (originalIt) {
        (window as any).it = function (description: string, fn: () => void | Promise<void>) {
          return originalIt(description, async function () {
            const diagnostics = new TestDiagnostics(description);
            (window as { currentTestDiagnostics?: TestDiagnostics }).currentTestDiagnostics =
              diagnostics;

            try {
              diagnostics.log('INFO', `Test started: ${description}`);
              await fn();
              diagnostics.log('INFO', `Test completed: ${description}`);
            } catch (error) {
              diagnostics.log('ERROR', `Test failed: ${description}`, { error });
              throw error;
            } finally {
              diagnostics.printSummary();
            }
          });
        };
      }
    }

    console.log('🔧 TestDiagnostics installed');
  }

  /**
   * Get the current instance
   */
  static getInstance(): TestDiagnostics | null {
    return this.instance;
  }

  /**
   * Create a new diagnostics instance for a specific test
   */
  static forTest(testName: string): TestDiagnostics {
    const diagnostics = new TestDiagnostics(testName);
    (window as { currentTestDiagnostics?: TestDiagnostics }).currentTestDiagnostics = diagnostics;
    return diagnostics;
  }

  /**
   * Log a message with the specified level
   */
  log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: performance.now(),
      testName: this.testName,
    };

    this.logs.push(entry);

    // Also output to console based on level
    const prefix = this.getLevelPrefix(level);
    const elapsed = (entry.timestamp - this.startTime).toFixed(2);

    if (data !== undefined) {
      console.log(`${prefix} [${elapsed}ms] ${message}`, data);
    } else {
      console.log(`${prefix} [${elapsed}ms] ${message}`);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any): void {
    this.log('DEBUG', message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }

  /**
   * Get the prefix for a log level
   */
  private getLevelPrefix(level: LogLevel): string {
    switch (level) {
      case 'DEBUG':
        return '🔍';
      case 'INFO':
        return 'ℹ️';
      case 'WARN':
        return '⚠️';
      case 'ERROR':
        return '❌';
    }
  }

  /**
   * Get all log entries
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(entry => entry.level === level);
  }

  /**
   * Check if there were any errors
   */
  hasErrors(): boolean {
    return this.logs.some(entry => entry.level === 'ERROR');
  }

  /**
   * Check if there were any warnings
   */
  hasWarnings(): boolean {
    return this.logs.some(entry => entry.level === 'WARN');
  }

  /**
   * Get the total duration
   */
  getDuration(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Print a summary of the diagnostics
   */
  printSummary(): void {
    const duration = this.getDuration();
    const errorCount = this.getLogsByLevel('ERROR').length;
    const warnCount = this.getLogsByLevel('WARN').length;

    console.group(`📊 Test Diagnostics: ${this.testName}`);
    console.log(`⏱️ Duration: ${duration.toFixed(2)}ms`);
    console.log(`📝 Total logs: ${this.logs.length}`);

    if (errorCount > 0) {
      console.error(`❌ Errors: ${errorCount}`);
    }
    if (warnCount > 0) {
      console.warn(`⚠️ Warnings: ${warnCount}`);
    }

    console.groupEnd();
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    this.startTime = performance.now();
  }

  /**
   * Create a checkpoint for timing
   */
  checkpoint(name: string): void {
    this.log('INFO', `Checkpoint: ${name}`);
  }

  /**
   * Measure the execution time of an async function
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    this.log('DEBUG', `Starting: ${name}`);

    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.log('INFO', `Completed: ${name} (${duration.toFixed(2)}ms)`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.log('ERROR', `Failed: ${name} (${duration.toFixed(2)}ms)`, { error });
      throw error;
    }
  }

  /**
   * Measure the execution time of a sync function
   */
  measureSync<T>(name: string, fn: () => T): T {
    const start = performance.now();
    this.log('DEBUG', `Starting: ${name}`);

    try {
      const result = fn();
      const duration = performance.now() - start;
      this.log('INFO', `Completed: ${name} (${duration.toFixed(2)}ms)`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.log('ERROR', `Failed: ${name} (${duration.toFixed(2)}ms)`, { error });
      throw error;
    }
  }
}

/**
 * Convenience function to get current diagnostics instance
 */
export function getCurrentDiagnostics(): TestDiagnostics | null {
  return (window as { currentTestDiagnostics?: TestDiagnostics }).currentTestDiagnostics || null;
}

/**
 * Convenience function to log to current diagnostics
 */
export function diagLog(level: LogLevel, message: string, data?: any): void {
  const diagnostics = getCurrentDiagnostics();
  if (diagnostics) {
    diagnostics.log(level, message, data);
  } else {
    // Fallback to console
    console.log(`[${level}] ${message}`, data);
  }
}
