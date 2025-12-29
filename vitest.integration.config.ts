import { mergeConfig } from 'vitest/config';
import vitestConfig from './vitest.config';

export default mergeConfig(vitestConfig, {
  test: {
    include: ['src/app/tests/integration/**/*.{spec,integration}.ts'],
    // Integration tests often need more time and resources
    testTimeout: 120000,
    hookTimeout: 120000,
    // Run sequentially to avoid resource contention (database, ports, etc.)
    fileParallelism: false,
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Disable coverage for integration runs by default to save time
    coverage: {
      enabled: false,
    },
  },
});
