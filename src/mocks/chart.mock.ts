/**
 * Mock for chart.js that provides a safe Chart.register() method
 * This is used in tests to prevent the real Chart.register() from throwing
 * when given mock plugins
 */

// Re-export everything from the real chart.js
export * from 'chart.js';

// Import the real Chart and override register
import { Chart as RealChart } from 'chart.js';

// Create a patched Chart that has a safe register method
const patchedRegister = function (
  this: typeof RealChart,
  ...args: Parameters<typeof RealChart.register>
) {
  // Filter out mock plugins that would cause issues
  const safeArgs = args.filter(item => {
    // Only register if it's a real plugin with proper prototype chain
    try {
      if (item && typeof item === 'object' && 'id' in item) {
        // It's a plugin object, which is fine
        return true;
      }
      // Check if it has a prototype we can access
      if (item && (item as { prototype?: unknown }).prototype !== undefined) {
        return true;
      }
    } catch {
      // Ignore errors during plugin validation
    }
    return false;
  });

  // Only call real register with safe args
  if (safeArgs.length > 0) {
    try {
      return RealChart.register.call(this, ...safeArgs);
    } catch {
      // Silently fail in tests - Chart.js registration errors are not critical
    }
  }
};

// Patch the Chart class
RealChart.register = patchedRegister as typeof RealChart.register;

export { RealChart as Chart };
