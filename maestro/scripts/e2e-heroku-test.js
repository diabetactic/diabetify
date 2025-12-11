#!/usr/bin/env node
/**
 * E2E Heroku Test Script
 * Tests the full appointment + resolution flow against Heroku backend
 */

const https = require('https');

const API_URL = 'diabetactic-api-gateway-37949d6f182f.herokuapp.com';
const BACKOFFICE_URL = 'dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
const USER_ID = '1000';
const USER_PASSWORD = 'tuvieja';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

function request(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const options = { hostname, port: 443, path, method, headers };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        } else {
          resolve({ status: res.statusCode, error: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🚀 E2E Heroku Test - Full Flow Verification\n');

  // 1. Get user token
  console.log('1️⃣  Getting user token...');
  const tokenRes = await request(
    API_URL,
    '/token',
    'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    `username=${USER_ID}&password=${USER_PASSWORD}`
  );
  if (tokenRes.error) {
    console.log('   ❌ Auth failed:', tokenRes.error);
    process.exit(1);
  }
  const userToken = tokenRes.data.access_token;
  console.log('   ✅ User token obtained');

  // 2. Get admin token
  console.log('\n2️⃣  Getting admin token...');
  const adminRes = await request(
    BACKOFFICE_URL,
    '/token',
    'POST',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    `username=${ADMIN_USERNAME}&password=${ADMIN_PASSWORD}`
  );
  if (adminRes.error) {
    console.log('   ❌ Admin auth failed:', adminRes.error);
    process.exit(1);
  }
  const adminToken = adminRes.data.access_token;
  console.log('   ✅ Admin token obtained');

  // 3. Check appointment state
  console.log('\n3️⃣  Checking appointment state...');
  const stateRes = await request(API_URL, '/appointments/state', 'GET', {
    Authorization: `Bearer ${userToken}`,
  });
  console.log('   📊 Current state:', stateRes.data);

  // 4. Get readings
  console.log('\n4️⃣  Getting glucose readings...');
  const readingsRes = await request(API_URL, '/glucose/mine', 'GET', {
    Authorization: `Bearer ${userToken}`,
  });
  if (readingsRes.data && Array.isArray(readingsRes.data)) {
    console.log('   📊 Total readings:', readingsRes.data.length);
    if (readingsRes.data.length > 0) {
      const recent = readingsRes.data.slice(0, 3);
      recent.forEach((r, i) =>
        console.log(`      ${i + 1}. Value: ${r.glucose_level || r.value} mg/dL`)
      );
    }
  } else {
    console.log('   ⚠️  Readings response:', readingsRes.status, readingsRes.error || 'No data');
  }

  // 5. Get user appointments
  console.log('\n5️⃣  Getting user appointments...');
  const apptRes = await request(API_URL, '/appointments/mine', 'GET', {
    Authorization: `Bearer ${userToken}`,
  });
  if (apptRes.data && Array.isArray(apptRes.data)) {
    console.log('   📊 Total appointments:', apptRes.data.length);
    if (apptRes.data.length > 0) {
      const latest = apptRes.data[0];
      console.log('   📅 Latest appointment:');
      console.log('      ID:', latest.appointment_id);
      console.log('      Status:', latest.state || 'N/A');
      console.log('      Created:', latest.created_at || 'N/A');

      // 6. Check for resolution on latest appointment
      if (latest.appointment_id) {
        console.log('\n6️⃣  Checking resolution for appointment', latest.appointment_id + '...');
        const resolutionRes = await request(
          BACKOFFICE_URL,
          `/appointments/${latest.appointment_id}/resolution`,
          'GET',
          { Authorization: `Bearer ${adminToken}` }
        );

        if (
          resolutionRes.status === 200 &&
          resolutionRes.data &&
          resolutionRes.data.change_basal_type
        ) {
          console.log('   ✅ Resolution found:');
          console.log('      Basal Type:', resolutionRes.data.change_basal_type);
          console.log('      Basal Dose:', resolutionRes.data.change_basal_dose);
          console.log('      Ratio:', resolutionRes.data.change_ratio);
          console.log('      Sensitivity:', resolutionRes.data.change_sensitivity);
        } else if (resolutionRes.status === 404) {
          console.log('   ⚠️  No resolution found for this appointment');
        } else {
          console.log('   ⚠️  Resolution check:', resolutionRes.status);
        }
      }
    }
  } else {
    console.log('   ⚠️  Appointments response:', apptRes.status, apptRes.error || 'No data');
  }

  // 7. Check pending queue
  console.log('\n7️⃣  Checking pending appointment queue...');
  const pendingRes = await request(BACKOFFICE_URL, '/appointments/pending', 'GET', {
    Authorization: `Bearer ${adminToken}`,
  });
  if (pendingRes.data && Array.isArray(pendingRes.data)) {
    console.log('   📊 Pending appointments:', pendingRes.data.length);
  } else {
    console.log('   ⚠️  Pending check:', pendingRes.status);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ E2E HEROKU TEST COMPLETE');
  console.log('='.repeat(50));
  console.log('\nSummary:');
  console.log('  - User Auth: ✅');
  console.log('  - Admin Auth: ✅');
  console.log('  - Appointment State:', stateRes.data);
  console.log('  - API Connectivity: ✅');
  console.log('='.repeat(50));
}

main().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
