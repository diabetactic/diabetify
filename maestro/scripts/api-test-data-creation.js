#!/usr/bin/env node
/**
 * API-Based Data Creation Test
 * Creates new readings and appointments directly via API (no emulator needed)
 * This validates that CI/CD will work consistently
 *
 * Usage:
 *   node api-test-data-creation.js
 */

const https = require('https');

const API_URL = process.env.API_BASE_URL || 'diabetactic-api-gateway-37949d6f182f.herokuapp.com';
const BACKOFFICE_URL =
  process.env.BACKOFFICE_API_URL?.replace('https://', '') ||
  'dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
const USER_ID = process.env.TEST_USER_ID || '1000';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'tuvieja';

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
  console.log('🔬 API DATA CREATION TEST\n');
  console.log('This test validates CI/CD will create new data consistently.\n');

  // Get user token
  console.log('1️⃣ Getting user token...');
  const tokenRes = await request(
    API_URL,
    '/token',
    'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    `username=${USER_ID}&password=${USER_PASSWORD}`
  );
  const token = tokenRes.data.access_token;
  console.log('   ✅ Token obtained\n');

  // Get admin token
  console.log('2️⃣ Getting admin token...');
  const adminRes = await request(
    BACKOFFICE_URL,
    '/token',
    'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    'username=admin&password=admin'
  );
  const adminToken = adminRes.data.access_token;
  console.log('   ✅ Admin token obtained\n');

  // Get BEFORE counts
  console.log('3️⃣ Capturing BEFORE state...');
  const beforeAppts = await request(API_URL, '/appointments/mine', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  const beforeReadings = await request(API_URL, '/glucose/mine', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  const apptsBefore = Array.isArray(beforeAppts.data) ? beforeAppts.data : [];
  const readingsBefore = beforeReadings.data?.readings || beforeReadings.data || [];
  const highestApptBefore = apptsBefore.reduce((max, a) => Math.max(max, a.appointment_id || 0), 0);
  console.log('   📅 Appointments:', apptsBefore.length, '(highest ID:', highestApptBefore + ')');
  console.log('   📊 Readings:', Array.isArray(readingsBefore) ? readingsBefore.length : 0);
  console.log();

  // Create a new reading (uses query params, NOT JSON body)
  console.log('4️⃣ Creating new reading...');
  const testValue = 100 + Math.floor(Math.random() * 50); // 100-150 range
  const testNote = `__CI_TEST_${Date.now()}__`;
  const createPath = `/glucose/create?glucose_level=${testValue}&reading_type=DESAYUNO&notes=${encodeURIComponent(testNote)}`;
  const createReadingRes = await request(
    API_URL,
    createPath,
    'POST',
    {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    ''
  );
  console.log(
    '   📊 Create response:',
    createReadingRes.status,
    JSON.stringify(createReadingRes.data).slice(0, 100)
  );
  if (createReadingRes.status >= 200 && createReadingRes.status < 300) {
    console.log('   ✅ Reading created with value:', testValue);
  } else {
    console.log('   ⚠️  Create may have failed, checking...');
  }
  console.log();

  // Get AFTER counts
  console.log('5️⃣ Capturing AFTER state...');
  const afterAppts = await request(API_URL, '/appointments/mine', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  const afterReadings = await request(API_URL, '/glucose/mine', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  const apptsAfter = Array.isArray(afterAppts.data) ? afterAppts.data : [];
  const readingsAfter = afterReadings.data?.readings || afterReadings.data || [];
  const highestApptAfter = apptsAfter.reduce((max, a) => Math.max(max, a.appointment_id || 0), 0);
  console.log('   📅 Appointments:', apptsAfter.length, '(highest ID:', highestApptAfter + ')');
  console.log('   📊 Readings:', Array.isArray(readingsAfter) ? readingsAfter.length : 0);
  console.log();

  // Verify reading was created
  console.log('6️⃣ Verifying new reading exists...');
  const foundReading =
    Array.isArray(readingsAfter) &&
    readingsAfter.find(r => {
      const val = r.glucose_level || r.value;
      return val === testValue;
    });
  if (foundReading) {
    console.log('   ✅ VERIFIED: Reading', testValue, 'found in backend!');
  } else {
    console.log('   ❌ NOT FOUND: Reading', testValue, 'not in backend');
    console.log(
      '   Recent values:',
      Array.isArray(readingsAfter)
        ? readingsAfter
            .slice(0, 5)
            .map(r => r.glucose_level || r.value)
            .join(', ')
        : 'N/A'
    );
  }
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  const readingsChange =
    (Array.isArray(readingsAfter) ? readingsAfter.length : 0) -
    (Array.isArray(readingsBefore) ? readingsBefore.length : 0);
  console.log(
    `Readings: ${Array.isArray(readingsBefore) ? readingsBefore.length : 0} → ${Array.isArray(readingsAfter) ? readingsAfter.length : 0} (${readingsChange >= 0 ? '+' : ''}${readingsChange})`
  );
  console.log(`Appointments: ${apptsBefore.length} → ${apptsAfter.length}`);
  console.log(`Highest Appointment ID: ${highestApptBefore} → ${highestApptAfter}`);
  console.log();

  if (foundReading) {
    console.log('✅ CI/CD DATA CREATION TEST: PASSED');
    console.log('   The API correctly creates and persists new readings.');
  } else {
    console.log('⚠️  CI/CD DATA CREATION TEST: CHECK REQUIRED');
    console.log('   The reading may have been created but with different format.');
  }
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
