/**
 * Docker Backend Data Population Script
 * Populates a user with realistic readings and appointments
 *
 * Usage:
 *   node scripts/populate-docker-data.js              # Populate data (default: Julian dni=40123456)
 *   node scripts/populate-docker-data.js --clear      # Clear all data first
 *   USER_DNI=1000 node scripts/populate-docker-data.js # Different user (by DNI, not hospital_account)
 *
 * Default user: Julian Crespo (dni=40123456, hospital_account=1000, user_id=5)
 * Other users:  Nacho Scocco (dni=1000, hospital_account=1, user_id=1)
 */

const http = require('http');

// API Gateway runs on port 8004 in container-managing setup
const DOCKER_URL = process.env.API_URL || 'http://localhost:8004';
// Default user: Julian Crespo (dni=40123456, hospital_account=1000, user_id=5)
const USER_DNI = process.env.USER_DNI || '40123456';
const PASSWORD = process.env.PASSWORD || 'tuvieja';
const CLEAR_FIRST = process.argv.includes('--clear');

async function request(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, DOCKER_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {},
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      const postData = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Type'] =
        method === 'POST' && path.includes('token')
          ? 'application/x-www-form-urlencoded'
          : 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      const postData = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(postData);
    }
    req.end();
  });
}

async function checkDockerBackend() {
  try {
    await request('/docs', 'GET');
    console.log(`✓ Docker backend is running at ${DOCKER_URL}`);
    return true;
  } catch (error) {
    console.error(`✗ Docker backend not reachable at ${DOCKER_URL}`);
    console.error('  Start Docker backend first:');
    console.error('    cd /home/julito/TPP/diabetactic/container-managing && docker-compose up -d');
    return false;
  }
}

async function getToken() {
  const postData = `username=${USER_DNI}&password=${PASSWORD}`;
  const data = await request('/token', 'POST', postData);
  return data.access_token;
}

async function clearAllData(token) {
  console.log('\nClearing existing data...');

  // Get all readings
  try {
    const readings = await request('/glucose/mine', 'GET', null, token);
    console.log(`  Found ${readings.length || 0} existing readings`);

    // Delete each reading
    for (const reading of readings || []) {
      try {
        await request(`/glucose/${reading.id}`, 'DELETE', null, token);
      } catch (err) {
        // Ignore delete errors
      }
    }
  } catch (err) {
    console.log('  No readings to clear or endpoint not available');
  }

  // Get all appointments
  try {
    const appointments = await request('/appointments/mine', 'GET', null, token);
    console.log(`  Found ${appointments.length || 0} existing appointments`);

    // Delete each appointment
    for (const apt of appointments || []) {
      try {
        await request(`/appointments/${apt.appointment_id}`, 'DELETE', null, token);
      } catch (err) {
        // Ignore delete errors
      }
    }
  } catch (err) {
    console.log('  No appointments to clear or endpoint not available');
  }

  console.log('✓ Data cleared\n');
}

async function createReading(token, glucoseLevel, readingType, context = 'general') {
  const params = new URLSearchParams({
    glucose_level: glucoseLevel.toString(),
    reading_type: readingType,
    measurement_context: context,
  });

  return await request(`/glucose/create?${params}`, 'POST', null, token);
}

async function createAppointment(token, appointment) {
  return await request('/appointments/create', 'POST', appointment, token);
}

function generateReadings(days = 30) {
  const readings = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // 4 readings per day using Spanish meal type enums
    // API expects: DESAYUNO, ALMUERZO, MERIENDA, CENA, EJERCICIO, OTRAS_COMIDAS, OTRO
    const mealTypes = [
      { hour: 7, type: 'DESAYUNO', context: 'before_breakfast' },
      { hour: 12, type: 'ALMUERZO', context: 'before_lunch' },
      { hour: 16, type: 'MERIENDA', context: 'afternoon_snack' },
      { hour: 20, type: 'CENA', context: 'before_dinner' },
    ];

    for (const { hour, type, context } of mealTypes) {
      const time = new Date(date);
      time.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

      // Realistic glucose values (70-180 range with some variety)
      const baseValue = 70 + Math.random() * 110;
      const value = Math.round(baseValue);

      readings.push({
        time,
        value,
        context,
        type, // Spanish meal type enum
      });
    }
  }

  return readings.sort((a, b) => a.time - b.time); // Oldest first
}

function generateAppointments() {
  // AppointmentPost schema (API gateway) - user_id from token
  // Required: glucose_objective, insulin_type, dose, fast_insulin,
  // fixed_dose, ratio, sensitivity, pump_type, control_data, motive
  // motive is an array of: AJUSTE, HIPOGLUCEMIA, HIPERGLUCEMIA, CETOSIS, DUDAS, OTRO

  return [
    {
      glucose_objective: 100,
      insulin_type: 'Lantus',
      dose: 20,
      fast_insulin: 'Novorapid',
      fixed_dose: 5,
      ratio: 10,
      sensitivity: 50,
      pump_type: 'None',
      control_data: 'CGM Freestyle Libre',
      motive: ['AJUSTE'],
      another_treatment: null,
      other_motive: null,
    },
    {
      glucose_objective: 110,
      insulin_type: 'Tresiba',
      dose: 18,
      fast_insulin: 'Humalog',
      fixed_dose: 4,
      ratio: 12,
      sensitivity: 45,
      pump_type: 'None',
      control_data: 'Glucometer',
      motive: ['DUDAS', 'AJUSTE'],
      another_treatment: 'Metformin 500mg',
      other_motive: null,
    },
    {
      glucose_objective: 95,
      insulin_type: 'Levemir',
      dose: 22,
      fast_insulin: 'Apidra',
      fixed_dose: 6,
      ratio: 8,
      sensitivity: 40,
      pump_type: 'Medtronic 780G',
      control_data: 'Integrated CGM',
      motive: ['HIPOGLUCEMIA'],
      another_treatment: null,
      other_motive: null,
    },
  ];
}

/**
 * Create appointment flow:
 * 1. Submit appointment request (goes to queue)
 * 2. Admin accepts it (via backoffice API)
 * 3. Create appointment data
 */
async function submitAppointment(token) {
  return await request('/appointments/submit', 'POST', null, token);
}

async function acceptAppointmentViaBackoffice() {
  // Use the backoffice API to accept the pending appointment
  const { execSync } = require('child_process');
  try {
    execSync('ACTION=accept node maestro/scripts/backoffice-api.js', {
      stdio: 'pipe',
      cwd: process.cwd(),
    });
    return true;
  } catch (err) {
    console.error('  Failed to accept via backoffice:', err.message);
    return false;
  }
}

async function main() {
  try {
    console.log('Docker Backend Data Population Script');
    console.log('=====================================\n');

    // Check if Docker backend is running
    const isRunning = await checkDockerBackend();
    if (!isRunning) {
      process.exit(1);
    }

    console.log(`Authenticating as user DNI ${USER_DNI}...`);
    const token = await getToken();
    console.log('✓ Token obtained\n');

    // Clear data if requested
    if (CLEAR_FIRST) {
      await clearAllData(token);
    }

    console.log('Generating test data...');
    const readings = generateReadings(30);
    const appointments = generateAppointments();
    console.log(`  ${readings.length} readings (30 days, 4 per day)`);
    console.log(`  ${appointments.length} appointments\n`);

    console.log('Creating readings...');
    let created = 0;
    for (const reading of readings) {
      try {
        await createReading(token, reading.value, reading.type, reading.context);
        created++;
        if (created % 20 === 0) {
          console.log(`  Created ${created}/${readings.length} readings...`);
        }
      } catch (err) {
        console.error(`  Failed to create reading: ${err.message}`);
      }
    }
    console.log(`✓ Created ${created} readings\n`);

    console.log('Creating appointments (submit → accept → create flow)...');
    let createdApts = 0;
    for (const apt of appointments) {
      try {
        // Step 1: Submit appointment request (goes to queue)
        console.log('  Submitting appointment request...');
        await submitAppointment(token);

        // Step 2: Accept via backoffice API
        console.log('  Accepting via backoffice...');
        const accepted = await acceptAppointmentViaBackoffice();
        if (!accepted) {
          console.error('  Failed to accept appointment');
          continue;
        }

        // Step 3: Create appointment data
        console.log('  Creating appointment data...');
        await createAppointment(token, apt);
        createdApts++;
        console.log(`  ✓ Appointment ${createdApts} created`);
      } catch (err) {
        console.error(`  Failed to create appointment: ${err.message}`);
      }
    }
    console.log(`✓ Created ${createdApts} appointments\n`);

    console.log('=====================================');
    console.log('✓ Data population complete!');
    console.log(`\nUser DNI ${USER_DNI} now has:`);
    console.log(`  - ${created} glucose readings`);
    console.log(`  - ${createdApts} upcoming appointments`);
    console.log('\nYou can now capture screenshots with realistic data.');
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

main();
