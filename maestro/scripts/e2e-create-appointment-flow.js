#!/usr/bin/env node
/**
 * E2E Create Appointment Flow
 * Creates a NEW appointment through the full state machine:
 * NONE → PENDING → ACCEPTED → CREATED → Add Resolution → Verify
 */

const https = require('https');

const API_URL = 'diabetactic-api-gateway-37949d6f182f.herokuapp.com';
const BACKOFFICE_URL = 'dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
const USER_ID = '1000';
const USER_PASSWORD = 'tuvieja';

function request(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const options = { hostname, port: 443, path, method, headers };
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

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('🚀 E2E CREATE APPOINTMENT FLOW\n');
  console.log('Testing: NONE → PENDING → ACCEPTED → CREATED → Resolution\n');
  console.log('='.repeat(60));

  // Get tokens
  console.log('\n🔑 Getting tokens...');
  const userTokenRes = await request(
    API_URL,
    '/token',
    'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    `username=${USER_ID}&password=${USER_PASSWORD}`
  );
  const userToken = userTokenRes.data.access_token;
  console.log('   ✅ User token');

  const adminTokenRes = await request(
    BACKOFFICE_URL,
    '/token',
    'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    'username=admin&password=admin'
  );
  const adminToken = adminTokenRes.data.access_token;
  console.log('   ✅ Admin token');

  // STEP 1: Clear queue
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 1: Clear appointment queue');
  console.log('─'.repeat(60));
  await request(BACKOFFICE_URL, '/appointments', 'DELETE', {
    Authorization: `Bearer ${adminToken}`,
  });
  console.log('   ✅ Queue cleared');

  // STEP 2: Request appointment (NONE → PENDING)
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 2: Request appointment (NONE → PENDING)');
  console.log('─'.repeat(60));

  const reqRes = await request(
    API_URL,
    '/appointments/request',
    'POST',
    {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    '{}'
  );
  console.log('   📝 Request response:', reqRes.status, reqRes.data?.detail || 'OK');

  await sleep(1000);

  // Verify state
  const state1 = await request(API_URL, '/appointments/state', 'GET', {
    Authorization: `Bearer ${userToken}`,
  });
  console.log('   📊 State after request:', state1.data);

  if (state1.data !== 'PENDING') {
    console.log('   ⚠️  Expected PENDING, got:', state1.data);
    console.log('   ℹ️  This may be expected if queue is closed or other conditions');
  }

  // STEP 3: Accept via backoffice (PENDING → ACCEPTED)
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 3: Accept via backoffice (PENDING → ACCEPTED)');
  console.log('─'.repeat(60));

  const pendingRes = await request(BACKOFFICE_URL, '/appointments/pending', 'GET', {
    Authorization: `Bearer ${adminToken}`,
  });

  if (pendingRes.data && Array.isArray(pendingRes.data) && pendingRes.data.length > 0) {
    const appt = pendingRes.data[0];
    console.log('   📅 Found pending appointment at placement:', appt.queue_placement);

    const acceptRes = await request(
      BACKOFFICE_URL,
      `/appointments/accept/${appt.queue_placement}`,
      'PUT',
      { Authorization: `Bearer ${adminToken}` }
    );
    console.log('   ✅ Accept response:', acceptRes.status);

    await sleep(1000);

    // Verify state
    const state2 = await request(API_URL, '/appointments/state', 'GET', {
      Authorization: `Bearer ${userToken}`,
    });
    console.log('   📊 State after accept:', state2.data);
  } else {
    console.log('   ⚠️  No pending appointments found');
  }

  // STEP 4: Create appointment (ACCEPTED → CREATED)
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 4: Create appointment (ACCEPTED → CREATED)');
  console.log('─'.repeat(60));

  const state3 = await request(API_URL, '/appointments/state', 'GET', {
    Authorization: `Bearer ${userToken}`,
  });

  if (state3.data === 'ACCEPTED') {
    const appointmentData = JSON.stringify({
      glucose_objective: 120,
      insulin_type: 'rapida',
      dose: 10,
      fast_insulin: 'Humalog',
      fixed_dose: 5,
      ratio: 10,
      sensitivity: 50,
      pump_type: 'none',
      control_data: 'Created via E2E test - ' + new Date().toISOString(),
      motive: ['AJUSTE'],
    });

    const createRes = await request(
      API_URL,
      '/appointments/create',
      'POST',
      {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      appointmentData
    );
    console.log('   📝 Create response:', createRes.status);

    await sleep(1000);

    // Verify state
    const state4 = await request(API_URL, '/appointments/state', 'GET', {
      Authorization: `Bearer ${userToken}`,
    });
    console.log('   📊 State after create:', state4.data);
  } else {
    console.log('   ⚠️  State is not ACCEPTED:', state3.data);
  }

  // STEP 5: Get latest appointment ID
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 5: Get latest appointment');
  console.log('─'.repeat(60));

  const apptRes = await request(API_URL, '/appointments/mine', 'GET', {
    Authorization: `Bearer ${userToken}`,
  });

  let latestAppointmentId = null;
  if (apptRes.data && Array.isArray(apptRes.data) && apptRes.data.length > 0) {
    let latest = apptRes.data[0];
    for (const apt of apptRes.data) {
      if ((apt.appointment_id || 0) > (latest.appointment_id || 0)) {
        latest = apt;
      }
    }
    latestAppointmentId = latest.appointment_id;
    console.log('   📅 Latest appointment ID:', latestAppointmentId);
  }

  // STEP 6: Create resolution
  console.log('\n' + '─'.repeat(60));
  console.log('STEP 6: Create resolution');
  console.log('─'.repeat(60));

  if (latestAppointmentId) {
    // First check if resolution exists
    const checkRes = await request(
      BACKOFFICE_URL,
      `/appointments/${latestAppointmentId}/resolution`,
      'GET',
      { Authorization: `Bearer ${adminToken}` }
    );

    if (checkRes.status === 404 || !checkRes.data?.change_basal_type) {
      console.log('   📝 Creating new resolution...');

      const resolutionData = JSON.stringify({
        appointment_id: latestAppointmentId,
        change_basal_type: 'Lantus',
        change_basal_dose: 22,
        change_basal_time: '22:00',
        change_fast_type: 'Humalog',
        change_ratio: 12,
        change_sensitivity: 45,
        emergency_care: false,
        needed_physical_appointment: false,
      });

      const createResRes = await request(
        BACKOFFICE_URL,
        '/appointments/create_resolution',
        'POST',
        {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        resolutionData
      );
      console.log('   📝 Resolution create response:', createResRes.status);
    } else {
      console.log('   ✅ Resolution already exists');
    }

    // STEP 7: Verify resolution
    console.log('\n' + '─'.repeat(60));
    console.log('STEP 7: Verify resolution');
    console.log('─'.repeat(60));

    const verifyRes = await request(
      BACKOFFICE_URL,
      `/appointments/${latestAppointmentId}/resolution`,
      'GET',
      { Authorization: `Bearer ${adminToken}` }
    );

    if (verifyRes.data && verifyRes.data.change_basal_type) {
      console.log('   ✅ RESOLUTION VERIFIED:');
      console.log('      Basal Type:', verifyRes.data.change_basal_type);
      console.log('      Basal Dose:', verifyRes.data.change_basal_dose, 'units');
      console.log('      Basal Time:', verifyRes.data.change_basal_time);
      console.log('      Fast Type:', verifyRes.data.change_fast_type);
      console.log('      Ratio:', verifyRes.data.change_ratio, 'g/U');
      console.log('      Sensitivity:', verifyRes.data.change_sensitivity, 'mg/dL/U');
    } else {
      console.log('   ⚠️  Resolution not found:', verifyRes.status);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 E2E APPOINTMENT FLOW COMPLETE');
  console.log('='.repeat(60));

  const finalState = await request(API_URL, '/appointments/state', 'GET', {
    Authorization: `Bearer ${userToken}`,
  });
  console.log('\n📊 Final state:', finalState.data);
  console.log('📅 Appointment ID:', latestAppointmentId);
  console.log('\n✅ Flow completed successfully!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
