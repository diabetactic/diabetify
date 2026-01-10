import { mergeConfig } from 'vitest/config';
import vitestConfig from './vitest.config';

export default mergeConfig(vitestConfig, {
  test: {
    include: ['src/app/tests/integration/**/*.{spec,integration}.ts'],
    testTimeout: 120000,
    hookTimeout: 120000,
    fileParallelism: false,
    poolOptions: {
      forks: { singleFork: true },
    },
    coverage: { enabled: false },
  },
});
