#!/usr/bin/env node
/**
 * CI/CD E2E Verification Script
 * Captures before/after state and verifies new data was created
 *
 * Usage:
 *   node ci-verification.js before    # Run BEFORE tests, saves snapshot
 *   node ci-verification.js after     # Run AFTER tests, compares and reports
 *   node ci-verification.js full      # Run both and report
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_BASE_URL || 'diabetactic-api-gateway-37949d6f182f.herokuapp.com';
const BACKOFFICE_URL =
  process.env.BACKOFFICE_API_URL?.replace('https://', '') ||
  'dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
const USER_ID = process.env.TEST_USER_ID || '1000';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'tuvieja';
const SNAPSHOT_FILE = path.join(__dirname, '.ci-snapshot.json');

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

async function getState() {
  // Get user token
  const tokenRes = await request(
    API_URL,
    '/token',
    'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    `username=${USER_ID}&password=${USER_PASSWORD}`
  );
  const token = tokenRes.data.access_token;

  // Get admin token
  const adminRes = await request(
    BACKOFFICE_URL,
    '/token',
    'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    'username=admin&password=admin'
  );
  const adminToken = adminRes.data.access_token;

  // Get appointments
  const apptRes = await request(API_URL, '/appointments/mine', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  const appointments = Array.isArray(apptRes.data) ? apptRes.data : [];
  const appointmentIds = appointments.map(a => a.appointment_id).sort((a, b) => b - a);
  const highestApptId = appointmentIds[0] || 0;

  // Get readings
  const readingsRes = await request(API_URL, '/glucose/mine', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  const readings = readingsRes.data?.readings || readingsRes.data || [];
  const readingsArray = Array.isArray(readings) ? readings : [];
  const readingValues = readingsArray.slice(0, 20).map(r => r.glucose_level || r.value);

  // Get appointment state
  const stateRes = await request(API_URL, '/appointments/state', 'GET', {
    Authorization: `Bearer ${token}`,
  });

  // Get pending queue
  const pendingRes = await request(BACKOFFICE_URL, '/appointments/pending', 'GET', {
    Authorization: `Bearer ${adminToken}`,
  });
  const pending = Array.isArray(pendingRes.data) ? pendingRes.data : [];

  return {
    timestamp: new Date().toISOString(),
    appointments: {
      total: appointments.length,
      highestId: highestApptId,
      recentIds: appointmentIds.slice(0, 5),
    },
    readings: {
      total: readingsArray.length,
      recentValues: readingValues,
    },
    state: stateRes.data,
    pendingQueue: pending.length,
  };
}

async function runBefore() {
  console.log('📸 CAPTURING BEFORE STATE\n');

  const state = await getState();

  console.log(
    '📅 Appointments:',
    state.appointments.total,
    '(highest ID:',
    state.appointments.highestId + ')'
  );
  console.log('📊 Readings:', state.readings.total);
  console.log('🔄 State:', JSON.stringify(state.state));
  console.log('📋 Pending Queue:', state.pendingQueue);

  // Save snapshot
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(state, null, 2));
  console.log('\n✅ Snapshot saved to', SNAPSHOT_FILE);

  return state;
}

async function runAfter() {
  console.log('📸 CAPTURING AFTER STATE\n');

  // Load before snapshot
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    console.log('⚠️  No before snapshot found. Running full comparison...');
    return runFull();
  }

  const before = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  const after = await getState();

  console.log('='.repeat(60));
  console.log('📊 COMPARISON REPORT');
  console.log('='.repeat(60));

  // Appointments
  const newAppts = after.appointments.total - before.appointments.total;
  const newApptId = after.appointments.highestId > before.appointments.highestId;
  console.log('\n📅 APPOINTMENTS:');
  console.log(
    '   Before:',
    before.appointments.total,
    '(highest:',
    before.appointments.highestId + ')'
  );
  console.log(
    '   After:',
    after.appointments.total,
    '(highest:',
    after.appointments.highestId + ')'
  );
  console.log('   New:', newAppts >= 0 ? '+' + newAppts : newAppts);
  if (newApptId) {
    console.log('   ✅ New appointment created! ID:', after.appointments.highestId);
  }

  // Readings
  const newReadings = after.readings.total - before.readings.total;
  console.log('\n📊 READINGS:');
  console.log('   Before:', before.readings.total);
  console.log('   After:', after.readings.total);
  console.log('   Net change:', newReadings >= 0 ? '+' + newReadings : newReadings);

  // Find new readings
  const newValues = after.readings.recentValues.filter(
    v => !before.readings.recentValues.includes(v)
  );
  if (newValues.length > 0) {
    console.log('   ✅ New values detected:', newValues.join(', '));
  }

  // State changes
  console.log('\n🔄 STATE:');
  console.log('   Before:', JSON.stringify(before.state));
  console.log('   After:', JSON.stringify(after.state));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));

  const changes = [];
  if (newAppts > 0) changes.push(`${newAppts} new appointment(s)`);
  if (newReadings !== 0) changes.push(`${newReadings >= 0 ? '+' : ''}${newReadings} reading(s)`);
  if (newApptId) changes.push(`New appointment ID: ${after.appointments.highestId}`);

  if (changes.length > 0) {
    console.log('✅ Changes detected:');
    changes.forEach(c => console.log('   - ' + c));
  } else {
    console.log('ℹ️  No data changes detected');
  }

  // Cleanup snapshot
  fs.unlinkSync(SNAPSHOT_FILE);
  console.log('\n🧹 Snapshot cleaned up');

  return { before, after, changes };
}

async function runFull() {
  console.log('🔄 FULL STATE CHECK\n');

  const state = await getState();

  console.log('='.repeat(60));
  console.log('📊 CURRENT STATE REPORT');
  console.log('='.repeat(60));

  console.log('\n📅 APPOINTMENTS:');
  console.log('   Total:', state.appointments.total);
  console.log('   Highest ID:', state.appointments.highestId);
  console.log('   Recent IDs:', state.appointments.recentIds.join(', '));

  console.log('\n📊 READINGS:');
  console.log('   Total:', state.readings.total);
  console.log('   Recent values:', state.readings.recentValues.slice(0, 10).join(', '));

  console.log('\n🔄 APPOINTMENT STATE:', JSON.stringify(state.state));
  console.log('📋 PENDING QUEUE:', state.pendingQueue);

  console.log('\n' + '='.repeat(60));
  console.log('✅ State captured at', state.timestamp);
  console.log('='.repeat(60));

  return state;
}

// Main
const command = process.argv[2] || 'full';

async function main() {
  try {
    switch (command) {
      case 'before':
        await runBefore();
        break;
      case 'after':
        await runAfter();
        break;
      case 'full':
      default:
        await runFull();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
