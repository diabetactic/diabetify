// Backend Verification Script for Maestro Tests (GraalJS compatible)
// Uses Maestro's native 'http' object. DO NOT use require() or fetch().
//
// This script VERIFIES that data was actually saved to the backend.
// Usage in Maestro YAML:
//   - runScript:
//       file: ../../scripts/verify-backend.js
//       env:
//         VERIFY_ACTION: readings_exist
//         EXPECTED_VALUE: '120'

// ==========================================
// ENVIRONMENT VARIABLES (injected by Maestro)
// ==========================================
var API_URL =
  typeof API_BASE_URL !== 'undefined'
    ? API_BASE_URL
    : 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';

var VERIFY_ACTION = typeof VERIFY_ACTION !== 'undefined' ? VERIFY_ACTION : null;
var USER_ID = typeof USER_ID !== 'undefined' ? USER_ID : '1000';
var USER_PASSWORD = typeof USER_PASSWORD !== 'undefined' ? USER_PASSWORD : 'tuvieja';
var EXPECTED_VALUE = typeof EXPECTED_VALUE !== 'undefined' ? EXPECTED_VALUE : null;
var EXPECTED_STATE = typeof EXPECTED_STATE !== 'undefined' ? EXPECTED_STATE : null;
var MIN_COUNT = typeof MIN_COUNT !== 'undefined' ? parseInt(MIN_COUNT) : 0;

// ==========================================
// HTTP REQUEST HELPER
// ==========================================
function request(method, path, body, token) {
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  // Form-data for token endpoint
  if (path === '/token') headers['Content-Type'] = 'application/x-www-form-urlencoded';

  var fullUrl = API_URL + path;

  var options = {
    method: method,
    headers: headers,
  };

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

// ==========================================
// VERIFICATION FUNCTIONS
// ==========================================

/**
 * Verify a reading with specific value exists
 */
function verifyReadingExists(token, expectedValue) {
  console.log('Verifying reading with value ' + expectedValue + ' exists...');

  var data = request('GET', '/glucose/mine', '', token);
  var readings = data && data.readings ? data.readings : data;

  if (!readings || !Array.isArray(readings)) {
    throw new Error('No readings array returned from API');
  }

  console.log('Found ' + readings.length + ' readings in backend');

  // Look for reading with expected value (within last 5 readings for efficiency)
  var found = false;
  var recentReadings = readings.slice(0, 10); // Check last 10

  for (var i = 0; i < recentReadings.length; i++) {
    var reading = recentReadings[i];
    var value = reading.glucose_level || reading.value;
    console.log('  Reading ' + i + ': value=' + value);
    if (value == expectedValue) {
      found = true;
      console.log('FOUND reading with value ' + expectedValue + ' at position ' + i);
      break;
    }
  }

  if (!found) {
    throw new Error(
      'VERIFICATION FAILED: Reading with value ' +
        expectedValue +
        ' NOT found in backend! ' +
        'Last 10 readings: ' +
        JSON.stringify(
          recentReadings.map(function (r) {
            return r.glucose_level || r.value;
          })
        )
    );
  }

  // Export to Maestro output
  output.verified = true;
  output.readingFound = true;
  output.value = expectedValue;
  console.log('VERIFICATION PASSED: Reading ' + expectedValue + ' exists in backend');
}

/**
 * Verify minimum number of readings exist
 */
function verifyReadingsCount(token, minCount) {
  console.log('Verifying at least ' + minCount + ' readings exist...');

  var data = request('GET', '/glucose/mine', '', token);
  var readings = data && data.readings ? data.readings : data;

  if (!readings || !Array.isArray(readings)) {
    readings = [];
  }

  console.log('Found ' + readings.length + ' readings in backend');

  if (readings.length < minCount) {
    throw new Error(
      'VERIFICATION FAILED: Expected at least ' + minCount + ' readings, found ' + readings.length
    );
  }

  output.verified = true;
  output.readingsCount = readings.length;
  console.log('VERIFICATION PASSED: ' + readings.length + ' readings (min: ' + minCount + ')');
}

/**
 * Verify reading was deleted (no longer exists)
 */
function verifyReadingDeleted(token, deletedValue) {
  console.log('Verifying reading with value ' + deletedValue + ' was deleted...');

  var data = request('GET', '/glucose/mine', '', token);
  var readings = data && data.readings ? data.readings : data;

  if (!readings || !Array.isArray(readings)) {
    readings = [];
  }

  // Check if value still exists
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
      'VERIFICATION FAILED: Reading ' +
        deletedValue +
        ' still exists in backend (should be deleted)'
    );
  }

  output.verified = true;
  output.deleted = true;
  console.log('VERIFICATION PASSED: Reading ' + deletedValue + ' no longer exists');
}

/**
 * Verify appointment queue state
 */
function verifyAppointmentState(token, expectedState) {
  console.log('Verifying appointment state is ' + expectedState + '...');

  var state = request('GET', '/appointments/state', '', token);

  // Handle different response formats
  var actualState = state;
  if (typeof state === 'object') {
    actualState = state.state || state.status || 'NONE';
  }
  if (state === null) {
    actualState = 'NONE';
  }

  console.log('Current appointment state: ' + actualState);

  // Normalize for comparison
  var normalizedExpected = expectedState.toUpperCase();
  var normalizedActual = String(actualState).toUpperCase();

  if (normalizedActual !== normalizedExpected) {
    throw new Error(
      'VERIFICATION FAILED: Expected appointment state ' +
        normalizedExpected +
        ', got ' +
        normalizedActual
    );
  }

  output.verified = true;
  output.state = normalizedActual;
  console.log('VERIFICATION PASSED: Appointment state is ' + normalizedActual);
}

/**
 * Verify queue position
 */
function verifyQueuePosition(token) {
  console.log('Verifying queue position...');

  var position = request('GET', '/appointments/placement', '', token);

  console.log('Queue position: ' + JSON.stringify(position));

  output.verified = true;
  output.position = position;
  console.log('VERIFICATION PASSED: Got queue position');
}

/**
 * Get all readings (for debugging/setup)
 */
function getReadings(token) {
  var data = request('GET', '/glucose/mine', '', token);
  var readings = data && data.readings ? data.readings : data;
  output.readings = readings || [];
  output.count = output.readings.length;
  console.log('Retrieved ' + output.count + ' readings');
}

// ==========================================
// MAIN EXECUTION
// ==========================================
function main() {
  console.log('=== Backend Verification Script ===');
  console.log('Action: ' + VERIFY_ACTION);
  console.log('API URL: ' + API_URL);
  console.log('User ID: ' + USER_ID);

  if (!VERIFY_ACTION) {
    throw new Error(
      'VERIFY_ACTION not specified. Use: readings_exist, readings_count, reading_deleted, appointment_state, queue_position, get_readings'
    );
  }

  // Get user token
  var token = getUserToken();
  console.log('User token obtained');

  // Execute verification based on action
  switch (VERIFY_ACTION) {
    case 'readings_exist':
      if (!EXPECTED_VALUE) throw new Error('EXPECTED_VALUE required for readings_exist');
      verifyReadingExists(token, EXPECTED_VALUE);
      break;

    case 'readings_count':
      verifyReadingsCount(token, MIN_COUNT);
      break;

    case 'reading_deleted':
      if (!EXPECTED_VALUE) throw new Error('EXPECTED_VALUE required for reading_deleted');
      verifyReadingDeleted(token, EXPECTED_VALUE);
      break;

    case 'appointment_state':
      if (!EXPECTED_STATE) throw new Error('EXPECTED_STATE required for appointment_state');
      verifyAppointmentState(token, EXPECTED_STATE);
      break;

    case 'queue_position':
      verifyQueuePosition(token);
      break;

    case 'get_readings':
      getReadings(token);
      break;

    default:
      throw new Error('Unknown VERIFY_ACTION: ' + VERIFY_ACTION);
  }

  console.log('=== Verification Complete ===');
}

main();
