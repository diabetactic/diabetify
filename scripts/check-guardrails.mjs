import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());

/**
 * @param {string} filePath
 * @returns {string}
 */
function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * @param {string} relativeDir
 * @param {(filePath: string) => boolean} includeFile
 * @param {(dirPath: string) => boolean} [includeDir]
 * @returns {string[]}
 */
function listFiles(relativeDir, includeFile, includeDir) {
  const results = [];
  const root = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(root)) return results;

  /** @param {string} absoluteDir */
  function walk(absoluteDir) {
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      const absolutePath = path.join(absoluteDir, entry.name);
      if (entry.isDirectory()) {
        if (includeDir && !includeDir(absolutePath)) continue;
        walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (includeFile(absolutePath)) results.push(absolutePath);
    }
  }

  walk(root);
  return results;
}

/**
 * @param {string} absoluteFilePath
 * @returns {string}
 */
function rel(absoluteFilePath) {
  return path.relative(repoRoot, absoluteFilePath);
}

/**
 * @typedef {{
 *   name: string;
 *   files: string[];
 *   matchLine: (line: string) => boolean;
 *   message: string;
 * }} Check
 */

/** @type {Check[]} */
const checks = [];

/** @param {Check} check */
function addCheck(check) {
  checks.push(check);
}

// -----------------------------------------------------------------------------
// Guardrails (targeted to issues found in PR review)
// -----------------------------------------------------------------------------

addCheck({
  name: 'No legacy /token/refresh usage in src/',
  files: listFiles(
    'src',
    p => /\.(ts|html|scss|css)$/.test(p),
    dir => !/node_modules|dist|www|\.angular|coverage/.test(dir)
  ),
  matchLine: line => line.includes('/token/refresh'),
  message:
    'Found legacy /token/refresh usage. Backend uses POST /token with grant_type=refresh_token.',
});

addCheck({
  name: 'No Netlify config committed (netlify.toml)',
  files: [path.join(repoRoot, 'netlify.toml')].filter(fs.existsSync),
  matchLine: () => true,
  message:
    'Netlify config is no longer used. Remove netlify.toml and any Netlify-specific CI/deploy logic.',
});

addCheck({
  name: 'No Netlify local state committed (.netlify/)',
  files: listFiles('.netlify', p => /\.(json|toml|yml|yaml|lock)$/.test(p), undefined),
  matchLine: () => true,
  message: 'Netlify local state should never be committed. Remove .netlify/ from the repo.',
});

addCheck({
  name: 'No DeepSource config committed (.deepsource.toml)',
  files: [path.join(repoRoot, '.deepsource.toml')].filter(fs.existsSync),
  matchLine: () => true,
  message: 'DeepSource is no longer used. Remove .deepsource.toml and any related artifacts.',
});

addCheck({
  name: 'No DeepSource exports committed (deepsource-export/)',
  files: listFiles('deepsource-export', _p => true, undefined),
  matchLine: () => true,
  message:
    'DeepSource export artifacts should not be committed. Remove deepsource-export/ from the repo.',
});

addCheck({
  name: 'Seed script must not default USER_ID=1',
  files: [path.join(repoRoot, 'docker/seed-test-data.sh')].filter(fs.existsSync),
  matchLine: line => line.includes('USER_ID="1"'),
  message:
    'Seed script defaults USER_ID="1" on parse failure (risk deleting wrong user data). Fail hard instead.',
});

addCheck({
  name: 'Docker compose must not hardcode secrets',
  files: listFiles('docker', p => /docker-compose\..*\.ya?ml$/.test(p), undefined),
  matchLine: line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) return false;
    const isHardcodedEnv =
      (trimmed.includes('NOREPLY_PASSWORD=') || trimmed.includes('SECRET_KEY=')) &&
      !trimmed.includes('${');
    return Boolean(isHardcodedEnv);
  },
  message:
    'Hardcoded secrets detected in docker compose. Use environment variables (e.g. ${SECRET_KEY}) or .env, never commit real credentials.',
});

addCheck({
  name: 'No hardcoded camera permission strings',
  files: listFiles(
    'src/app',
    p => p.endsWith('.ts'),
    dir => !dir.includes(`${path.sep}test-setup`)
  ),
  matchLine: line =>
    line.includes('Permission Denied') ||
    line.includes('Camera permission is required to scan barcodes'),
  message: 'Camera permission UX must be i18n-driven (no hardcoded strings).',
});

addCheck({
  name: 'No hardcoded fallback username label in templates',
  files: listFiles('src/app', p => p.endsWith('.html'), undefined),
  matchLine: line => line.includes("'Usuario'"),
  message: "Hardcoded template string found ('Usuario'). Use i18n keys instead.",
});

addCheck({
  name: 'Do not log full appointment resolution objects',
  files: listFiles(
    'src/app',
    p => p.endsWith('.ts'),
    dir => !dir.includes(`${path.sep}test-setup`)
  ),
  matchLine: line => line.includes('resolution: this.resolution'),
  message: 'Avoid logging PHI-heavy objects. Log IDs/state only.',
});

addCheck({
  name: 'No ts-comment suppressions',
  files: listFiles(
    'src/app',
    p => p.endsWith('.ts'),
    dir => !dir.includes(`${path.sep}test-setup`)
  ),
  matchLine: line => line.includes('@ts-expect-error') || line.includes('@ts-ignore'),
  message: 'Type suppressions are forbidden. Fix types/tests properly.',
});

addCheck({
  name: 'No blanket eslint-disable comments',
  files: listFiles(
    'src/app',
    p => p.endsWith('.ts'),
    dir => !dir.includes(`${path.sep}test-setup`)
  ),
  matchLine: line => line.trim() === '/* eslint-disable */',
  message:
    'Avoid blanket /* eslint-disable */. Use narrow eslint-disable-next-line with a specific rule and justification.',
});

function run() {
  /** @type {{check: string; file: string; line: number; text: string}[]} */
  const failures = [];

  for (const check of checks) {
    for (const file of check.files) {
      if (!fs.existsSync(file)) continue;
      const content = readText(file);
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (check.matchLine(line)) {
          failures.push({
            check: check.name,
            file: rel(file),
            line: i + 1,
            text: line.trim(),
          });
        }
      }
    }
  }

  if (failures.length === 0) {
    console.log('✅ Guardrails OK');
    return;
  }

  console.error('❌ Guardrails failed:\n');
  for (const f of failures) {
    console.error(`- ${f.check}: ${f.file}:${f.line}`);
    console.error(`  ${f.text}\n`);
  }
  console.error('Fix the issues above or adjust the guardrails intentionally.');
  process.exitCode = 1;
}

run();
