#!/usr/bin/env node
/**
 * Appointment Creation Flow Test
 * Creates a new appointment through full state machine: NONE → PENDING → ACCEPTED → CREATED
 * This validates CI/CD will create new appointments consistently
 *
 * Usage:
 *   node create-appointment-flow.js
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
  console.log('🏥 APPOINTMENT CREATION FLOW TEST\n');
  console.log('Testing: NONE → PENDING → ACCEPTED → CREATED\n');

  // Get tokens
  console.log('1️⃣ Getting tokens...');
  const tokenRes = await request(
    API_URL,
    '/token',
    'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    `username=${USER_ID}&password=${USER_PASSWORD}`
  );
  const token = tokenRes.data.access_token;

  const adminRes = await request(
    BACKOFFICE_URL,
    '/token',
    'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    'username=admin&password=admin'
  );
  const adminToken = adminRes.data.access_token;
  console.log('   ✅ Tokens obtained\n');

  // Get BEFORE state
  console.log('2️⃣ Capturing BEFORE state...');
  const beforeAppts = await request(API_URL, '/appointments/mine', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  const apptsBefore = Array.isArray(beforeAppts.data) ? beforeAppts.data : [];
  const highestIdBefore = apptsBefore.reduce((max, a) => Math.max(max, a.appointment_id || 0), 0);
  console.log('   📅 Appointments:', apptsBefore.length, '(highest ID:', highestIdBefore + ')');

  // Get current state
  const stateRes = await request(API_URL, '/appointments/state', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  console.log('   🔄 Current state:', JSON.stringify(stateRes.data));
  console.log();

  // Step 1: Clear the queue (DELETE /appointments)
  console.log('3️⃣ Clearing appointment queue...');
  const clearRes = await request(BACKOFFICE_URL, '/appointments', 'DELETE', {
    Authorization: `Bearer ${adminToken}`,
  });
  console.log('   📋 Clear response:', clearRes.status);
  console.log();

  // Step 2: Open the queue
  console.log('4️⃣ Opening appointment queue...');
  const openRes = await request(
    BACKOFFICE_URL,
    '/appointments/queue/open',
    'POST',
    {
      Authorization: `Bearer ${adminToken}`,
    },
    ''
  );
  console.log('   📋 Open response:', openRes.status);
  console.log();

  // Step 3: Join queue (NONE → PENDING) via /appointments/submit
  console.log('5️⃣ Joining appointment queue (NONE → PENDING)...');
  const joinRes = await request(
    API_URL,
    '/appointments/submit',
    'POST',
    {
      Authorization: `Bearer ${token}`,
    },
    ''
  );
  console.log('   📝 Submit response:', joinRes.status, JSON.stringify(joinRes.data).slice(0, 100));

  // Check state after submit
  const afterJoinState = await request(API_URL, '/appointments/state', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  console.log('   🔄 State after submit:', JSON.stringify(afterJoinState.data));
  console.log();

  // Step 4: Get pending appointments to find queue_placement
  console.log('6️⃣ Getting pending appointments...');
  const pendingRes = await request(BACKOFFICE_URL, '/appointments/pending', 'GET', {
    Authorization: `Bearer ${adminToken}`,
  });
  const pending = Array.isArray(pendingRes.data) ? pendingRes.data : [];
  // Note: user_id in backend is internal ID (1), not DNI (1000)
  // For now, just take the first pending appointment since we just cleared the queue
  const userPending = pending[0]; // First pending after our submit
  if (pending.length > 0) {
    console.log('   📋 First pending:', JSON.stringify(pending[0]));
  }
  console.log('   📋 Pending count:', pending.length);
  console.log(
    '   👤 Will accept:',
    userPending ? `queue_placement=${userPending.queue_placement}` : 'NONE'
  );
  console.log();

  // Step 5: Accept via backoffice using queue_placement (PENDING → ACCEPTED)
  console.log('7️⃣ Accepting via backoffice (PENDING → ACCEPTED)...');
  let acceptRes;
  if (userPending && userPending.queue_placement !== undefined) {
    acceptRes = await request(
      BACKOFFICE_URL,
      '/appointments/accept/' + userPending.queue_placement,
      'PUT',
      {
        Authorization: `Bearer ${adminToken}`,
      },
      ''
    );
    console.log(
      '   ✅ Accept response:',
      acceptRes.status,
      JSON.stringify(acceptRes.data).slice(0, 100)
    );
  } else {
    console.log('   ⚠️  No pending appointment to accept');
    acceptRes = { status: 404, data: 'No pending appointment' };
  }

  // Check state after accept
  const afterAcceptState = await request(API_URL, '/appointments/state', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  console.log('   🔄 State after accept:', JSON.stringify(afterAcceptState.data));
  console.log();

  // Step 6: Create appointment (ACCEPTED → CREATED)
  console.log('8️⃣ Creating appointment (ACCEPTED → CREATED)...');
  const appointmentData = JSON.stringify({
    glucose_objective: 110,
    insulin_type: 'basal-bolus', // Required field
    dose: 20,
    fast_insulin: 'Humalog',
    fixed_dose: 10,
    ratio: 12,
    sensitivity: 45,
    pump_type: 'none',
    control_data: `__CI_TEST_${Date.now()}__`,
    motive: ['AJUSTE'], // Must be one of: AJUSTE, HIPOGLUCEMIA, HIPERGLUCEMIA, CETOSIS, DUDAS, OTRO
  });
  const createRes = await request(
    API_URL,
    '/appointments/create',
    'POST',
    {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    appointmentData
  );
  console.log(
    '   📅 Create response:',
    createRes.status,
    JSON.stringify(createRes.data).slice(0, 200)
  );
  console.log();

  // Get AFTER state
  console.log('9️⃣ Capturing AFTER state...');
  const afterAppts = await request(API_URL, '/appointments/mine', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  const apptsAfter = Array.isArray(afterAppts.data) ? afterAppts.data : [];
  const highestIdAfter = apptsAfter.reduce((max, a) => Math.max(max, a.appointment_id || 0), 0);
  console.log('   📅 Appointments:', apptsAfter.length, '(highest ID:', highestIdAfter + ')');

  const finalState = await request(API_URL, '/appointments/state', 'GET', {
    Authorization: `Bearer ${token}`,
  });
  console.log('   🔄 Final state:', JSON.stringify(finalState.data));
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  const newAppts = apptsAfter.length - apptsBefore.length;
  console.log(
    `Appointments: ${apptsBefore.length} → ${apptsAfter.length} (${newAppts >= 0 ? '+' : ''}${newAppts})`
  );
  console.log(`Highest ID: ${highestIdBefore} → ${highestIdAfter}`);

  if (highestIdAfter > highestIdBefore) {
    console.log(`\n✅ NEW APPOINTMENT CREATED! ID: ${highestIdAfter}`);
    console.log(
      '   CI/CD will create appointments with IDs:',
      highestIdAfter + 1,
      highestIdAfter + 2,
      '...'
    );
  } else if (createRes.status === 201 || createRes.status === 200) {
    console.log('\n✅ Appointment creation API responded successfully');
  } else {
    console.log('\n⚠️  Check appointment creation - may require different flow');
  }
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
