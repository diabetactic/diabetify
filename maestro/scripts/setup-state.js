/**
 * Setup Deterministic State for Maestro Tests
 *
 * This script prepares the backend in a known, deterministic state
 * before running Maestro E2E tests. It performs:
 *
 * 1. Authentication - Get admin token
 * 2. Queue Management - Clear or configure appointment queue
 * 3. User Data Reset - Optional: clear user's readings/appointments
 * 4. State Validation - Verify state is as expected
 *
 * Usage:
 *   # Clear all test data
 *   ACTION=reset USER_ID=1000 node maestro/scripts/setup-state.js
 *
 *   # Setup for appointment flow test
 *   ACTION=prepare-appointments USER_ID=1000 node maestro/scripts/setup-state.js
 *
 *   # Setup for readings test
 *   ACTION=prepare-readings USER_ID=1000 node maestro/scripts/setup-state.js
 *
 *   # Custom fixture
 *   ACTION=load-fixture FIXTURE=maestro/fixtures/test-data.json node maestro/scripts/setup-state.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration from environment
const BACKOFFICE_URL =
  process.env.BACKOFFICE_API_URL || 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
const API_GATEWAY_URL =
  process.env.API_GATEWAY_URL || 'https://dt-api-gateway-3dead350d8fa.herokuapp.com';
const ACTION = process.env.ACTION || 'reset'; // reset, prepare-appointments, prepare-readings, load-fixture
const USER_ID = process.env.USER_ID || '1000';
const USER_PASSWORD = process.env.USER_PASSWORD || 'tuvieja';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const FIXTURE = process.env.FIXTURE;

/**
 * Make HTTPS request
 */
function request(baseUrl, options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl);
    const reqOptions = {
      hostname: url.hostname,
      port: 443,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = https.request(reqOptions, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch {
            resolve(data);
          }
        } else if (res.statusCode === 404) {
          resolve(null); // Not found is ok for some operations
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

/**
 * Get admin authentication token
 */
async function getAdminToken() {
  const postData = `username=${ADMIN_USERNAME}&password=${ADMIN_PASSWORD}`;
  const data = await request(
    BACKOFFICE_URL,
    {
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    },
    postData
  );

  return data.access_token;
}

/**
 * Get user authentication token
 */
async function getUserToken() {
  const postData = `username=${USER_ID}&password=${USER_PASSWORD}`;
  const data = await request(
    API_GATEWAY_URL,
    {
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    },
    postData
  );

  return data.access_token;
}

/**
 * Clear appointment queue (admin)
 */
async function clearAppointmentQueue(adminToken) {
  try {
    await request(BACKOFFICE_URL, {
      path: '/appointments',
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('✓ Appointment queue cleared');
  } catch (e) {
    if (e.message.includes('404')) {
      console.log('✓ Appointment queue already empty');
    } else {
      throw e;
    }
  }
}

/**
 * Open appointment queue (admin)
 */
async function openAppointmentQueue(adminToken) {
  await request(BACKOFFICE_URL, {
    path: '/appointments/queue/open',
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('✓ Appointment queue opened');
}

/**
 * Get user's glucose readings
 */
async function getUserReadings(userToken) {
  try {
    const data = await request(API_GATEWAY_URL, {
      path: '/glucose/mine',
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Delete a glucose reading
 */
async function deleteReading(userToken, readingId) {
  await request(API_GATEWAY_URL, {
    path: `/glucose/${readingId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userToken}` },
  });
}

/**
 * Clear all user's glucose readings
 */
async function clearUserReadings(userToken) {
  const readings = await getUserReadings(userToken);
  console.log(`Found ${readings.length} readings for user ${USER_ID}`);

  for (const reading of readings) {
    try {
      await deleteReading(userToken, reading.id);
      console.log(`✓ Deleted reading ${reading.id}`);
    } catch (e) {
      console.warn(`⚠ Could not delete reading ${reading.id}: ${e.message}`);
    }
  }

  if (readings.length > 0) {
    console.log(`✓ Cleared ${readings.length} readings`);
  } else {
    console.log('✓ No readings to clear');
  }
}

/**
 * Create sample glucose readings
 */
async function createSampleReadings(userToken, count = 5) {
  const readings = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const reading = {
      value: 90 + Math.floor(Math.random() * 80), // 90-170 mg/dL
      datetime: new Date(now - i * 3600000).toISOString(), // Every hour
      meal_context: ['fasting', 'before_meal', 'after_meal'][i % 3],
      notes: `Test reading ${i + 1}`,
    };

    try {
      await request(
        API_GATEWAY_URL,
        {
          path: '/glucose/create',
          method: 'POST',
          headers: { Authorization: `Bearer ${userToken}` },
        },
        reading
      );
      readings.push(reading);
      console.log(`✓ Created reading: ${reading.value} mg/dL`);
    } catch (e) {
      console.warn(`⚠ Could not create reading: ${e.message}`);
    }
  }

  return readings;
}

/**
 * Load fixture from JSON file
 */
async function loadFixture(userToken, adminToken, fixturePath) {
  const absolutePath = path.resolve(process.cwd(), fixturePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Fixture file not found: ${absolutePath}`);
  }

  const fixture = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  console.log(`Loading fixture: ${fixturePath}`);

  // Load readings
  if (fixture.readings && Array.isArray(fixture.readings)) {
    for (const reading of fixture.readings) {
      try {
        await request(
          API_GATEWAY_URL,
          {
            path: '/glucose/create',
            method: 'POST',
            headers: { Authorization: `Bearer ${userToken}` },
          },
          reading
        );
        console.log(`✓ Created reading from fixture`);
      } catch (e) {
        console.warn(`⚠ Could not create reading: ${e.message}`);
      }
    }
  }

  // Configure appointment queue
  if (fixture.appointmentQueue) {
    if (fixture.appointmentQueue.status === 'open') {
      await openAppointmentQueue(adminToken);
    }
    if (fixture.appointmentQueue.clear) {
      await clearAppointmentQueue(adminToken);
    }
  }

  console.log('✓ Fixture loaded successfully');
}

/**
 * Validate state after setup
 */
async function validateState(userToken) {
  console.log('\nValidating state...');

  const readings = await getUserReadings(userToken);
  console.log(`✓ User has ${readings.length} readings`);

  return {
    readings: readings.length,
  };
}

/**
 * Main execution
 */
async function main() {
  console.log(`\n🚀 Setting up test state for user ${USER_ID}`);
  console.log(`Action: ${ACTION}\n`);

  try {
    // Get authentication tokens
    const adminToken = await getAdminToken();
    console.log('✓ Admin token obtained');

    const userToken = await getUserToken();
    console.log('✓ User token obtained\n');

    // Execute action
    switch (ACTION) {
      case 'reset':
        console.log('Resetting all test data...');
        await clearAppointmentQueue(adminToken);
        await clearUserReadings(userToken);
        await openAppointmentQueue(adminToken);
        break;

      case 'prepare-appointments':
        console.log('Preparing for appointment flow test...');
        await clearAppointmentQueue(adminToken);
        await openAppointmentQueue(adminToken);
        break;

      case 'prepare-readings':
        console.log('Preparing for readings test...');
        await clearUserReadings(userToken);
        await createSampleReadings(userToken, 3);
        break;

      case 'load-fixture':
        if (!FIXTURE) {
          throw new Error('FIXTURE environment variable required for load-fixture action');
        }
        await clearUserReadings(userToken);
        await clearAppointmentQueue(adminToken);
        await loadFixture(userToken, adminToken, FIXTURE);
        break;

      default:
        throw new Error(`Unknown action: ${ACTION}`);
    }

    // Validate final state
    const state = await validateState(userToken);

    console.log('\n✅ Test state setup complete!');
    console.log(`\nState summary:`);
    console.log(`  - Readings: ${state.readings}`);
    console.log(`  - User ID: ${USER_ID}`);
    console.log(`  - Backend: ${API_GATEWAY_URL}\n`);
  } catch (error) {
    console.error('\n❌ Error setting up test state:', error.message);
    process.exit(1);
  }
}

main();
