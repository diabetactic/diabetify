// E2E Resolution Flow Script for Maestro (GraalJS compatible)
// Uses Maestro's native 'http' object. DO NOT use require() or fetch().
//
// This script orchestrates the FULL appointment flow:
// 1. Clear queue (clean state)
// 2. Request appointment (NONE → PENDING)
// 3. Accept via backoffice (PENDING → ACCEPTED)
// 4. Create appointment via API (ACCEPTED → CREATED)
// 5. Add resolution with UNIQUE test values
// 6. Verify resolution via API
// 7. Return data for UI verification
//
// Usage in Maestro YAML:
//   - runScript:
//       file: ../../scripts/e2e-resolution-flow.js
//       env:
//         USER_ID: '1000'
//         USER_PASSWORD: 'tuvieja'
//
// Output variables for Maestro assertions:
//   output.appointmentId - Created appointment ID
//   output.basalType - Resolution basal type (for UI match)
//   output.basalDose - Resolution basal dose (for UI match)
//   output.ratio - Resolution ratio (for UI match)
//   output.sensitivity - Resolution sensitivity (for UI match)
//   output.verified - Boolean if API verification passed

// ==========================================
// CONFIGURATION
// ==========================================
var MAIN_API =
  typeof API_BASE_URL !== 'undefined'
    ? API_BASE_URL
    : 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';

var BACKOFFICE_API =
  typeof BACKOFFICE_API_URL !== 'undefined'
    ? BACKOFFICE_API_URL
    : 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';

var CMD_USER_ID = typeof USER_ID !== 'undefined' ? USER_ID : '1000';
var CMD_USER_PASSWORD = typeof USER_PASSWORD !== 'undefined' ? USER_PASSWORD : 'tuvieja';
var ADMIN_USERNAME = typeof ADMIN_USER !== 'undefined' ? ADMIN_USER : 'admin';
var ADMIN_PASSWORD = typeof ADMIN_PASS !== 'undefined' ? ADMIN_PASS : 'admin';

// Generate unique test values using timestamp
var TIMESTAMP = Date.now();
var TEST_BASAL_TYPE = 'TestBasal_' + TIMESTAMP;
var TEST_BASAL_DOSE = (TIMESTAMP % 50) + 10; // 10-59
var TEST_BASAL_TIME = '21:' + String(TIMESTAMP % 60).padStart(2, '0');
var TEST_FAST_TYPE = 'TestFast_' + TIMESTAMP;
var TEST_RATIO = (TIMESTAMP % 20) + 5; // 5-24
var TEST_SENSITIVITY = (TIMESTAMP % 80) + 20; // 20-99

// ==========================================
// HTTP REQUEST HELPER
// ==========================================
function request(baseUrl, method, path, body, token) {
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (path === '/token') headers['Content-Type'] = 'application/x-www-form-urlencoded';

  var fullUrl = baseUrl + path;
  var options = { method: method, headers: headers };

  if (method !== 'GET' && method !== 'DELETE' && body) {
    options.body = body;
  }

  var response = http.request(fullUrl, options);

  return {
    status: response.status,
    body: response.body && response.body.length > 0 ? JSON.parse(response.body) : null,
  };
}

// ==========================================
// API FUNCTIONS
// ==========================================
function getAdminToken() {
  var res = request(
    BACKOFFICE_API,
    'POST',
    '/token',
    'username=' + ADMIN_USERNAME + '&password=' + ADMIN_PASSWORD
  );
  if (!res.body || !res.body.access_token) {
    throw new Error('Failed to get admin token');
  }
  return res.body.access_token;
}

function getUserToken() {
  var res = request(
    MAIN_API,
    'POST',
    '/token',
    'username=' + CMD_USER_ID + '&password=' + CMD_USER_PASSWORD
  );
  if (!res.body || !res.body.access_token) {
    throw new Error('Failed to get user token');
  }
  return res.body.access_token;
}

function getAppointmentState(userToken) {
  var res = request(MAIN_API, 'GET', '/appointments/state', '', userToken);
  if (res.status === 404) return 'NONE';
  return res.body || 'NONE';
}

function openQueue(adminToken) {
  request(BACKOFFICE_API, 'POST', '/appointments/queue/open', '', adminToken);
  console.log('Queue opened');
}

function submitToQueue(userToken) {
  var res = request(MAIN_API, 'POST', '/appointments/submit', '', userToken);
  console.log('Submitted to queue. Position: ' + (res.body || 'N/A'));
  return res;
}

function acceptAppointment(adminToken, userId) {
  // Get pending appointments
  var pending = request(BACKOFFICE_API, 'GET', '/appointments/pending', '', adminToken);
  if (!pending.body || !Array.isArray(pending.body)) {
    throw new Error('No pending appointments found');
  }

  // Find user's appointment
  var userApt = null;
  for (var i = 0; i < pending.body.length; i++) {
    var apt = pending.body[i];
    if (String(apt.user_id) === String(userId)) {
      userApt = apt;
      break;
    }
  }

  if (!userApt) {
    throw new Error('No pending appointment for user ' + userId);
  }

  // Accept it
  var res = request(
    BACKOFFICE_API,
    'PUT',
    '/appointments/accept/' + userApt.queue_placement,
    '',
    adminToken
  );
  console.log('Accepted appointment at queue position: ' + userApt.queue_placement);
  return res;
}

function createAppointment(userToken) {
  var appointmentData = JSON.stringify({
    glucose_objective: 120,
    insulin_type: 'rapida',
    dose: 10,
    fast_insulin: 'Humalog',
    fixed_dose: 5,
    ratio: 10,
    sensitivity: 50,
    pump_type: 'none',
    control_data: 'E2E Test - ' + new Date().toISOString(),
    motive: ['AJUSTE'],
  });

  var res = request(MAIN_API, 'POST', '/appointments/create', appointmentData, userToken);
  if (!res.body || !res.body.appointment_id) {
    throw new Error('Failed to create appointment. Response: ' + JSON.stringify(res));
  }
  console.log('Created appointment ID: ' + res.body.appointment_id);
  return res.body;
}

function getLatestAppointment(userToken) {
  var res = request(MAIN_API, 'GET', '/appointments/mine', '', userToken);
  if (!res.body || !Array.isArray(res.body) || res.body.length === 0) {
    throw new Error('No appointments found');
  }

  // Find highest ID
  var latest = res.body[0];
  for (var i = 1; i < res.body.length; i++) {
    if (res.body[i].appointment_id > latest.appointment_id) {
      latest = res.body[i];
    }
  }
  return latest;
}

function createResolution(adminToken, appointmentId) {
  var resolutionData = JSON.stringify({
    appointment_id: parseInt(appointmentId, 10),
    change_basal_type: TEST_BASAL_TYPE,
    change_basal_dose: TEST_BASAL_DOSE,
    change_basal_time: TEST_BASAL_TIME,
    change_fast_type: TEST_FAST_TYPE,
    change_ratio: TEST_RATIO,
    change_sensitivity: TEST_SENSITIVITY,
    emergency_care: false,
    needed_physical_appointment: false,
  });

  var res = request(
    BACKOFFICE_API,
    'POST',
    '/appointments/create_resolution',
    resolutionData,
    adminToken
  );
  console.log('Created resolution. Status: ' + res.status);
  return res;
}

function getResolution(adminToken, appointmentId) {
  var res = request(
    BACKOFFICE_API,
    'GET',
    '/appointments/' + appointmentId + '/resolution',
    '',
    adminToken
  );
  return res;
}

// ==========================================
// MAIN FLOW
// ==========================================
function main() {
  console.log('=== E2E Resolution Flow Script ===');
  console.log('Timestamp: ' + TIMESTAMP);
  console.log('Test values:');
  console.log('  Basal Type: ' + TEST_BASAL_TYPE);
  console.log('  Basal Dose: ' + TEST_BASAL_DOSE);
  console.log('  Ratio: ' + TEST_RATIO);
  console.log('  Sensitivity: ' + TEST_SENSITIVITY);

  // Get tokens
  var adminToken = getAdminToken();
  console.log('Admin token obtained');

  var userToken = getUserToken();
  console.log('User token obtained');

  // Check current state
  var state = getAppointmentState(userToken);
  console.log('Current state: ' + state);

  var appointmentId;

  if (state === 'CREATED') {
    // Already have appointment, get latest
    console.log('State is CREATED - using existing appointment');
    var latest = getLatestAppointment(userToken);
    appointmentId = latest.appointment_id;
    console.log('Using appointment ID: ' + appointmentId);
  } else {
    // Need to go through the flow
    console.log('Need to create new appointment through flow');

    // Open queue first
    openQueue(adminToken);

    if (state === 'NONE') {
      // Submit to queue
      submitToQueue(userToken);
      state = 'PENDING';
    }

    if (state === 'PENDING') {
      // Accept via backoffice
      acceptAppointment(adminToken, CMD_USER_ID);
      state = 'ACCEPTED';
    }

    if (state === 'ACCEPTED') {
      // Create appointment
      var created = createAppointment(userToken);
      appointmentId = created.appointment_id;
    }
  }

  console.log('Final appointment ID: ' + appointmentId);

  // Check if resolution already exists
  var existingRes = getResolution(adminToken, appointmentId);

  if (existingRes.status !== 404 && existingRes.body && existingRes.body.change_basal_type) {
    console.log('Resolution already exists:');
    console.log('  Basal Type: ' + existingRes.body.change_basal_type);
    console.log('  Basal Dose: ' + existingRes.body.change_basal_dose);

    // Use existing values for UI verification
    output.appointmentId = appointmentId;
    output.basalType = existingRes.body.change_basal_type;
    output.basalDose = String(existingRes.body.change_basal_dose);
    output.ratio = String(existingRes.body.change_ratio);
    output.sensitivity = String(existingRes.body.change_sensitivity);
    output.verified = true;
  } else {
    // Create new resolution with test values
    console.log('Creating new resolution...');
    createResolution(adminToken, appointmentId);

    // Verify it was created
    var verifyRes = getResolution(adminToken, appointmentId);

    if (verifyRes.status === 404 || !verifyRes.body) {
      throw new Error('Resolution verification failed - not found after creation');
    }

    console.log('Resolution verified:');
    console.log('  Basal Type: ' + verifyRes.body.change_basal_type);
    console.log('  Basal Dose: ' + verifyRes.body.change_basal_dose);

    // Set output for Maestro
    output.appointmentId = appointmentId;
    output.basalType = verifyRes.body.change_basal_type;
    output.basalDose = String(verifyRes.body.change_basal_dose);
    output.ratio = String(verifyRes.body.change_ratio);
    output.sensitivity = String(verifyRes.body.change_sensitivity);
    output.verified = verifyRes.body.change_basal_type === TEST_BASAL_TYPE;
  }

  console.log('=== E2E Flow Complete ===');
  console.log('Appointment ID: ' + output.appointmentId);
  console.log('Verified: ' + output.verified);
}

main();
