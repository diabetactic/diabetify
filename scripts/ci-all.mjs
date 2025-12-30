import { spawn } from 'node:child_process';

function run(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        // Avoid interactive prompts in CI/local runs.
        COREPACK_ENABLE_DOWNLOAD_PROMPT: process.env.COREPACK_ENABLE_DOWNLOAD_PROMPT ?? '0',
        ...opts.env,
      },
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function withBackgroundProcess(cmd, args, fn) {
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      COREPACK_ENABLE_DOWNLOAD_PROMPT: process.env.COREPACK_ENABLE_DOWNLOAD_PROMPT ?? '0',
    },
  });
  let cleanedUp = false;

  const cleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (child.exitCode == null) child.kill('SIGTERM');
  };

  try {
    await fn();
  } finally {
    await cleanup();
  }
}

async function ensurePnpmAvailable() {
  const pnpmVersion = process.env.PNPM_VERSION ?? '10.12.1';

  // Best-effort. On CI pnpm is usually already present, but local Corepack shims can prompt.
  await run('corepack', ['prepare', `pnpm@${pnpmVersion}`, '--activate']).catch(() => {});
}

async function cleanupDockerCiLeftovers() {
  const list = await new Promise(resolve => {
    const child = spawn('docker', ['ps', '-a', '--format', '{{.Names}}'], {
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: false,
      env: process.env,
    });

    let out = '';
    child.stdout.on('data', chunk => {
      out += String(chunk);
    });
    child.on('exit', () => resolve(out));
    child.on('error', () => resolve(''));
  });

  const existing = new Set(
    String(list)
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  );

  const ciContainers = [
    'diabetactic_test_utils',
    'diabetactic_api_gateway_backoffice',
    'diabetactic_api_gateway',
    'diabetactic_appointments',
    'diabetactic_login_service',
    'diabetactic_glucoserver',
    'diabetactic_appointments_db',
    'diabetactic_users_db',
    'diabetactic_glucoserver_db',
  ].filter(name => existing.has(name));

  if (ciContainers.length > 0) await run('docker', ['rm', '-f', ...ciContainers]);

  await run('docker', ['network', 'inspect', 'diabetactic-ci'])
    .then(() => run('docker', ['network', 'rm', 'diabetactic-ci']))
    .catch(() => {});
}

async function main() {
  const runDocker = process.env.CI_DOCKER === 'true';

  await ensurePnpmAvailable();

  // Phase 1: Static quality (fast, deterministic)
  await run('pnpm', ['run', 'quality:static']);
  await run('pnpm', ['run', 'i18n:check']);

  // Phase 2: Unit + MSW integration
  await run('pnpm', ['run', 'test:coverage']);
  await run('pnpm', ['run', 'test:integration:msw']);

  // Phase 3: Build + UI E2E (mock)
  await run('pnpm', ['run', 'build:mock']);
  await withBackgroundProcess('npx', ['serve', 'www', '-l', '4200', '-s'], async () => {
    await run('npx', ['wait-on', 'http://localhost:4200', '--timeout', '30000']);
    await run(
      'npx',
      [
        '--no-install',
        'playwright',
        'test',
        '--project=mobile-chromium',
        '--grep-invert',
        'visual|@docker',
      ],
      { env: { CI: 'true', E2E_SKIP_SERVER: 'true', E2E_MOCK_MODE: 'true' } }
    );
  });

  // Phase 4: Optional full-stack (Docker)
  if (runDocker) {
    try {
      await cleanupDockerCiLeftovers();
      await run('docker', ['compose', '-f', 'docker/docker-compose.ci.yml', 'up', '-d', '--wait']);
      await run('pnpm', ['run', 'test:integration']);
      await run('bash', ['./docker/seed-test-data.sh', 'full']);

      await withBackgroundProcess('npx', ['serve', 'www', '-l', '4200', '-s'], async () => {
        await run('npx', ['wait-on', 'http://localhost:4200', '--timeout', '30000']);
        await run('npx', ['wait-on', 'http://localhost:8000/health', '--timeout', '60000']);

        await run(
          'npx',
          ['--no-install', 'playwright', 'test', '--project=mobile-chromium', '--grep', '@docker'],
          {
            env: {
              CI: 'true',
              E2E_SKIP_SERVER: 'true',
              E2E_DOCKER_TESTS: 'true',
              E2E_API_URL: 'http://localhost:8000',
              E2E_BACKOFFICE_URL: 'http://localhost:8001',
            },
          }
        );
      });
    } finally {
      await run('docker', ['compose', '-f', 'docker/docker-compose.ci.yml', 'down', '-v']).catch(
        () => {}
      );
      await cleanupDockerCiLeftovers();
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
