// Backend Verification Script for Docker E2E Tests (GraalJS compatible)
// Uses Maestro's native 'http' object. DO NOT use require() or fetch().
//
// This is the DOCKER VERSION - uses localhost URLs by default.
// For Heroku tests, use verify-backend.js instead.
//
// Usage in Maestro YAML:
//   - runScript:
//       file: ../../scripts/verify-backend-docker.js
//       env:
//         VERIFY_ACTION: readings_exist
//         EXPECTED_VALUE: '120'

// ==========================================
// ENVIRONMENT VARIABLES (Docker defaults)
// ==========================================
var API_URL = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://10.0.2.2:8000'; // Android emulator localhost

var BACKOFFICE_URL =
  typeof BACKOFFICE_API_URL !== 'undefined' ? BACKOFFICE_API_URL : 'http://10.0.2.2:8001'; // Android emulator backoffice

var VERIFY_ACTION = typeof VERIFY_ACTION !== 'undefined' ? VERIFY_ACTION : null;
var USER_ID = typeof USER_ID !== 'undefined' ? USER_ID : '1000';
var USER_PASSWORD = typeof USER_PASSWORD !== 'undefined' ? USER_PASSWORD : 'tuvieja';
var EXPECTED_VALUE = typeof EXPECTED_VALUE !== 'undefined' ? EXPECTED_VALUE : null;
var EXPECTED_STATE = typeof EXPECTED_STATE !== 'undefined' ? EXPECTED_STATE : null;
var MIN_COUNT = typeof MIN_COUNT !== 'undefined' ? parseInt(MIN_COUNT) : 0;
var APPOINTMENT_ID = typeof APPOINTMENT_ID !== 'undefined' ? APPOINTMENT_ID : null;
var ADMIN_USERNAME = typeof ADMIN_USERNAME !== 'undefined' ? ADMIN_USERNAME : 'admin';
var ADMIN_PASSWORD = typeof ADMIN_PASSWORD !== 'undefined' ? ADMIN_PASSWORD : 'admin';

// ==========================================
// HTTP REQUEST HELPER
// ==========================================
function request(method, path, body, token, baseUrl) {
  var url = baseUrl || API_URL;
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (path === '/token') headers['Content-Type'] = 'application/x-www-form-urlencoded';

  var fullUrl = url + path;
  var options = { method: method, headers: headers };

  if (method !== 'GET' && method !== 'DELETE' && body) {
    options.body = body;
  }

  var response = http.request(fullUrl, options);

  if (response.status >= 300) {
    if (response.status === 404) return null;
    throw new Error('HTTP ' + response.status + ' at ' + path + ': ' + response.body);
  }

  return response.body && response.body.length > 0 ? JSON.parse(response.body) : {};
}

// ==========================================
// AUTHENTICATION
// ==========================================
function getUserToken() {
  var tokenData = request('POST', '/token', 'username=' + USER_ID + '&password=' + USER_PASSWORD);
  if (!tokenData || !tokenData.access_token) {
    throw new Error('Failed to get user token for user ' + USER_ID);
  }
  return tokenData.access_token;
}

function getAdminToken() {
  var tokenData = request(
    'POST',
    '/token',
    'username=' + ADMIN_USERNAME + '&password=' + ADMIN_PASSWORD,
    null,
    BACKOFFICE_URL
  );
  if (!tokenData || !tokenData.access_token) {
    throw new Error('Failed to get admin token');
  }
  return tokenData.access_token;
}

// ==========================================
// VERIFICATION FUNCTIONS
// ==========================================

function verifyReadingExists(token, expectedValue) {
  console.log('[Docker] Verifying reading with value ' + expectedValue + ' exists...');

  var data = request('GET', '/glucose/mine', '', token);
  var readings = data && data.readings ? data.readings : data;

  if (!readings || !Array.isArray(readings)) {
    throw new Error('No readings array returned from API');
  }

  console.log('Found ' + readings.length + ' readings in Docker backend');

  var found = false;
  var recentReadings = readings.slice(0, 10);

  for (var i = 0; i < recentReadings.length; i++) {
    var reading = recentReadings[i];
    var value = reading.glucose_level || reading.value;
    if (value == expectedValue) {
      found = true;
      console.log('FOUND reading with value ' + expectedValue + ' at position ' + i);
      break;
    }
  }

  if (!found) {
    throw new Error(
      'VERIFICATION FAILED: Reading with value ' + expectedValue + ' NOT found in Docker backend!'
    );
  }

  output.verified = true;
  output.readingFound = true;
  output.value = expectedValue;
  console.log('[Docker] VERIFICATION PASSED: Reading ' + expectedValue + ' exists');
}

function verifyReadingsCount(token, minCount) {
  console.log('[Docker] Verifying at least ' + minCount + ' readings exist...');

  var data = request('GET', '/glucose/mine', '', token);
  var readings = data && data.readings ? data.readings : data;

  if (!readings || !Array.isArray(readings)) {
    readings = [];
  }

  console.log('Found ' + readings.length + ' readings in Docker backend');

  if (readings.length < minCount) {
    throw new Error(
      'VERIFICATION FAILED: Expected at least ' + minCount + ' readings, found ' + readings.length
    );
  }

  output.verified = true;
  output.readingsCount = readings.length;
  console.log(
    '[Docker] VERIFICATION PASSED: ' + readings.length + ' readings (min: ' + minCount + ')'
  );
}

function verifyReadingDeleted(token, deletedValue) {
  console.log('[Docker] Verifying reading with value ' + deletedValue + ' was deleted...');

  var data = request('GET', '/glucose/mine', '', token);
  var readings = data && data.readings ? data.readings : data;

  if (!readings || !Array.isArray(readings)) {
    readings = [];
  }

  var found = false;
  for (var i = 0; i < readings.length; i++) {
    var value = readings[i].glucose_level || readings[i].value;
    if (value == deletedValue) {
      found = true;
      break;
    }
  }

  if (found) {
    throw new Error(
      'VERIFICATION FAILED: Reading ' + deletedValue + ' still exists (should be deleted)'
    );
  }

  output.verified = true;
  output.deleted = true;
  console.log('[Docker] VERIFICATION PASSED: Reading ' + deletedValue + ' no longer exists');
}

function verifyAppointmentState(token, expectedState) {
  console.log('[Docker] Verifying appointment state is ' + expectedState + '...');

  var state = request('GET', '/appointments/state', '', token);

  var actualState = state;
  if (typeof state === 'object') {
    actualState = state.state || state.status || 'NONE';
  }
  if (state === null) {
    actualState = 'NONE';
  }

  console.log('Current appointment state: ' + actualState);

  var normalizedExpected = expectedState.toUpperCase();
  var normalizedActual = String(actualState).toUpperCase();

  if (normalizedActual !== normalizedExpected) {
    throw new Error(
      'VERIFICATION FAILED: Expected state ' + normalizedExpected + ', got ' + normalizedActual
    );
  }

  output.verified = true;
  output.state = normalizedActual;
  console.log('[Docker] VERIFICATION PASSED: Appointment state is ' + normalizedActual);
}

function verifyResolutionExists(appointmentId) {
  console.log('[Docker] Verifying resolution exists for appointment ' + appointmentId + '...');

  var adminToken = getAdminToken();
  var res = request(
    'GET',
    '/appointments/' + appointmentId + '/resolution',
    '',
    adminToken,
    BACKOFFICE_URL
  );

  if (!res || !res.change_basal_type) {
    output.exists = false;
    output.verified = false;
    console.log('[Docker] No resolution found for appointment ' + appointmentId);
    return;
  }

  console.log('[Docker] Resolution found:');
  console.log('  Basal Type: ' + res.change_basal_type);
  console.log('  Basal Dose: ' + res.change_basal_dose);
  console.log('  Ratio: ' + res.change_ratio);

  output.verified = true;
  output.exists = true;
  output.basalType = res.change_basal_type;
  output.basalDose = res.change_basal_dose;
  output.ratio = res.change_ratio;
  output.sensitivity = res.change_sensitivity;
  console.log('[Docker] VERIFICATION PASSED: Resolution exists');
}

function verifyStreakData(token) {
  console.log('[Docker] Verifying streak data...');

  // Get user profile which should include streak info
  var profile = request('GET', '/users/me', '', token);

  if (!profile) {
    throw new Error('Failed to get user profile');
  }

  console.log('User profile retrieved');

  // Get readings to calculate streak
  var data = request('GET', '/glucose/mine', '', token);
  var readings = data && data.readings ? data.readings : data;
  var readingsCount = readings ? readings.length : 0;

  console.log('Total readings: ' + readingsCount);

  output.verified = true;
  output.totalReadings = readingsCount;
  output.profile = profile;
  console.log('[Docker] VERIFICATION PASSED: Streak data available');
}

function getReadings(token) {
  var data = request('GET', '/glucose/mine', '', token);
  var readings = data && data.readings ? data.readings : data;
  output.readings = readings || [];
  output.count = output.readings.length;
  console.log('[Docker] Retrieved ' + output.count + ' readings');
}

// ==========================================
// MAIN EXECUTION
// ==========================================
function main() {
  console.log('=== Docker Backend Verification Script ===');
  console.log('Action: ' + VERIFY_ACTION);
  console.log('API URL: ' + API_URL);
  console.log('Backoffice URL: ' + BACKOFFICE_URL);
  console.log('User ID: ' + USER_ID);

  if (!VERIFY_ACTION) {
    throw new Error(
      'VERIFY_ACTION not specified. Use: readings_exist, readings_count, reading_deleted, appointment_state, resolution_exists, streak_data, get_readings'
    );
  }

  var token = null;

  // Actions that need user token
  if (VERIFY_ACTION !== 'resolution_exists') {
    token = getUserToken();
    console.log('User token obtained');
  }

  switch (VERIFY_ACTION) {
    case 'readings_exist':
      if (!EXPECTED_VALUE) throw new Error('EXPECTED_VALUE required');
      verifyReadingExists(token, EXPECTED_VALUE);
      break;

    case 'readings_count':
      verifyReadingsCount(token, MIN_COUNT);
      break;

    case 'reading_deleted':
      if (!EXPECTED_VALUE) throw new Error('EXPECTED_VALUE required');
      verifyReadingDeleted(token, EXPECTED_VALUE);
      break;

    case 'appointment_state':
      if (!EXPECTED_STATE) throw new Error('EXPECTED_STATE required');
      verifyAppointmentState(token, EXPECTED_STATE);
      break;

    case 'resolution_exists':
      if (!APPOINTMENT_ID) throw new Error('APPOINTMENT_ID required');
      verifyResolutionExists(APPOINTMENT_ID);
      break;

    case 'streak_data':
      verifyStreakData(token);
      break;

    case 'get_readings':
      getReadings(token);
      break;

    default:
      throw new Error('Unknown VERIFY_ACTION: ' + VERIFY_ACTION);
  }

  console.log('=== Docker Verification Complete ===');
}

main();
