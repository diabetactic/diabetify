#!/usr/bin/env node
/**
 * CI/CD E2E Full Test Suite
 * Runs complete verification of data creation flow for CI/CD pipelines
 *
 * Usage:
 *   node ci-e2e-full-test.js           # Run full test
 *   node ci-e2e-full-test.js --verify  # Verify only (no data creation)
 *
 * CI/CD Integration:
 *   In .circleci/config.yml, add to maestro-tests job:
 *   - run:
 *       name: Pre-test API verification
 *       command: node maestro/scripts/ci-e2e-full-test.js
 */

const https = require('https');

const API_URL = process.env.API_BASE_URL || 'diabetactic-api-gateway-37949d6f182f.herokuapp.com';
const BACKOFFICE_URL =
  process.env.BACKOFFICE_API_URL?.replace('https://', '') ||
  'dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
const USER_ID = process.env.TEST_USER_ID || '1000';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'tuvieja';
const VERIFY_ONLY = process.argv.includes('--verify');

function request(hostname, pathUrl, method, headers, body) {
  return new Promise((resolve, reject) => {
    const host = hostname.replace('https://', '');
    const options = { hostname: host, port: 443, path: pathUrl, method, headers };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔬 CI/CD E2E FULL TEST SUITE');
  console.log('='.repeat(60));
  console.log();

  let exitCode = 0;
  const results = { passed: [], failed: [] };

  try {
    // 1. Authentication
    console.log('1️⃣ AUTHENTICATION');
    const tokenRes = await request(
      API_URL,
      '/token',
      'POST',
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      `username=${USER_ID}&password=${USER_PASSWORD}`
    );

    if (tokenRes.data.access_token) {
      console.log('   ✅ User auth: PASSED');
      results.passed.push('User auth');
    } else {
      console.log('   ❌ User auth: FAILED');
      results.failed.push('User auth');
      exitCode = 1;
    }

    const token = tokenRes.data.access_token;

    const adminRes = await request(
      BACKOFFICE_URL,
      '/token',
      'POST',
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      'username=admin&password=admin'
    );

    if (adminRes.data.access_token) {
      console.log('   ✅ Admin auth: PASSED');
      results.passed.push('Admin auth');
    } else {
      console.log('   ❌ Admin auth: FAILED');
      results.failed.push('Admin auth');
      exitCode = 1;
    }
    const adminToken = adminRes.data.access_token;
    console.log();

    // 2. API Connectivity
    console.log('2️⃣ API CONNECTIVITY');
    const readingsRes = await request(API_URL, '/glucose/mine', 'GET', {
      Authorization: `Bearer ${token}`,
    });
    const readings = readingsRes.data?.readings || readingsRes.data || [];
    const readingsCount = Array.isArray(readings) ? readings.length : 0;

    if (readingsRes.status === 200) {
      console.log(`   ✅ Readings API: PASSED (${readingsCount} readings)`);
      results.passed.push('Readings API');
    } else {
      console.log('   ❌ Readings API: FAILED');
      results.failed.push('Readings API');
      exitCode = 1;
    }

    const apptsRes = await request(API_URL, '/appointments/mine', 'GET', {
      Authorization: `Bearer ${token}`,
    });
    const appts = Array.isArray(apptsRes.data) ? apptsRes.data : [];
    const highestId = appts.reduce((max, a) => Math.max(max, a.appointment_id || 0), 0);

    if (apptsRes.status === 200) {
      console.log(
        `   ✅ Appointments API: PASSED (${appts.length} appointments, highest ID: ${highestId})`
      );
      results.passed.push('Appointments API');
    } else {
      console.log('   ❌ Appointments API: FAILED');
      results.failed.push('Appointments API');
      exitCode = 1;
    }

    const stateRes = await request(API_URL, '/appointments/state', 'GET', {
      Authorization: `Bearer ${token}`,
    });
    const state =
      typeof stateRes.data === 'string' ? stateRes.data : stateRes.data?.state || 'NONE';
    console.log(`   📊 Current state: ${state}`);
    console.log();

    // 3. Backoffice Connectivity
    console.log('3️⃣ BACKOFFICE CONNECTIVITY');
    const pendingRes = await request(BACKOFFICE_URL, '/appointments/pending', 'GET', {
      Authorization: `Bearer ${adminToken}`,
    });
    const pending = Array.isArray(pendingRes.data) ? pendingRes.data : [];

    if (pendingRes.status === 200) {
      console.log(`   ✅ Pending queue: PASSED (${pending.length} pending)`);
      results.passed.push('Backoffice API');
    } else {
      console.log('   ❌ Pending queue: FAILED');
      results.failed.push('Backoffice API');
      exitCode = 1;
    }
    console.log();

    // 4. Data Creation (if not verify-only)
    if (!VERIFY_ONLY) {
      console.log('4️⃣ DATA CREATION TEST');

      // Create reading
      const testValue = 100 + Math.floor(Math.random() * 50);
      const createPath = `/glucose/create?glucose_level=${testValue}&reading_type=DESAYUNO&notes=__CI_TEST__`;
      const createRes = await request(
        API_URL,
        createPath,
        'POST',
        {
          Authorization: `Bearer ${token}`,
        },
        ''
      );

      if (createRes.status === 201) {
        console.log(`   ✅ Create reading: PASSED (value: ${testValue})`);
        results.passed.push('Create reading');
      } else {
        console.log(`   ❌ Create reading: FAILED (${createRes.status})`);
        results.failed.push('Create reading');
        exitCode = 1;
      }
      console.log();
    }

    // 5. Resolution Check (latest appointment)
    console.log('5️⃣ RESOLUTION VERIFICATION');
    if (highestId > 0) {
      const resRes = await request(API_URL, `/appointments/${highestId}/resolution`, 'GET', {
        Authorization: `Bearer ${token}`,
      });

      if (resRes.status === 200 && resRes.data) {
        console.log(`   ✅ Resolution for #${highestId}: PASSED`);
        console.log(
          `      Basal: ${resRes.data.basal_type || 'N/A'} ${resRes.data.basal_dose || 0}u`
        );
        console.log(
          `      Fast: ${resRes.data.fast_type || 'N/A'} ratio ${resRes.data.ratio || 0}`
        );
        results.passed.push('Resolution check');
      } else {
        console.log(`   ⚠️  Resolution for #${highestId}: No resolution yet`);
      }
    }
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log();
    console.log(`📅 Appointments: ${appts.length} (highest ID: ${highestId})`);
    console.log(`📊 Readings: ${readingsCount}`);
    console.log(`🔄 State: ${state}`);
    console.log();

    if (results.failed.length === 0) {
      console.log('✅ CI/CD E2E TEST SUITE: ALL PASSED');
    } else {
      console.log('❌ CI/CD E2E TEST SUITE: FAILURES DETECTED');
      console.log('   Failed:', results.failed.join(', '));
    }
  } catch (error) {
    console.error('❌ Test suite error:', error.message);
    exitCode = 1;
  }

  process.exit(exitCode);
}

main();
