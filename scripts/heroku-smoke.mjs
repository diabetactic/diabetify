#!/usr/bin/env node

/**
 * Heroku API Gateway Smoke Tests
 *
 * Purpose: very basic connectivity checks against the deployed gateway.
 * Scope:
 *   - /health
 *   - /users/me (unauth, expects 401/403)
 *   - /appointments/mine (unauth, expects 401/403)
 *
 * Optional:
 *   - /token with HEROKU_TEST_USER / HEROKU_TEST_PASS (dni/password)
 *   - /users/me authenticated
 *
 * This script is intentionally read-only / low-impact and completely separate
 * from the local Docker-based integration tests.
 */

const BASE_URL =
  process.env.HEROKU_API_BASE_URL || 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';

async function checkBaseConnectivity() {
  // Try a lightweight request to /health if present; tolerate 404 since
  // older deployments may not expose a health endpoint.
  const url = `${BASE_URL}/health`;
  const res = await fetch(url);
  const body = await res.text().catch(() => '');

  console.log(`GET ${url} -> ${res.status}`, body);

  // Any HTTP response means the gateway is reachable; only treat 5xx as a
  // connectivity/availability failure.
  if (res.status >= 500) {
    throw new Error(`/health responded with server error ${res.status}`);
  }
}

async function checkUnauthorizedEndpoints() {
  const endpoints = ['/users/me', '/appointments/mine'];

  for (const path of endpoints) {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url);
    console.log(`GET ${url} -> ${res.status}`);

    if (![401, 403].includes(res.status)) {
      throw new Error(`${path} expected 401/403, got ${res.status}`);
    }
  }
}

async function checkLoginIfConfigured() {
  const user = process.env.HEROKU_TEST_USER;
  const pass = process.env.HEROKU_TEST_PASS;

  if (!user || !pass) {
    console.log('Skipping login smoke (HEROKU_TEST_USER / HEROKU_TEST_PASS not set).');
    return;
  }

  const url = `${BASE_URL}/token`;
  const form = new URLSearchParams();
  form.append('username', user);
  form.append('password', pass);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: form.toString(),
  });

  const body = await res.text().catch(() => '');
  console.log(`POST ${url} -> ${res.status}`, body);

  if (!res.ok) {
    throw new Error(`/token login failed with status ${res.status}`);
  }

  let json;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error('Login response is not valid JSON');
  }

  if (!json.access_token) {
    throw new Error('Login response missing access_token');
  }

  // Optional: light authenticated check for /users/me
  const meUrl = `${BASE_URL}/users/me`;
  const meRes = await fetch(meUrl, {
    headers: { Authorization: `Bearer ${json.access_token}` },
  });
  console.log(`GET ${meUrl} -> ${meRes.status}`);

  if (!meRes.ok) {
    throw new Error(`/users/me failed after login with status ${meRes.status}`);
  }
}

async function main() {
  console.log('🌐 Heroku API Gateway Smoke Tests');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log('');

  try {
    await checkBaseConnectivity();
    await checkUnauthorizedEndpoints();
    await checkLoginIfConfigured();

    console.log('');
    console.log('✅ Heroku smoke tests passed.');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Heroku smoke tests failed:', error?.message || error);
    process.exit(1);
  }
}

main();
