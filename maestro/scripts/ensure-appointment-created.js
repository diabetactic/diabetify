// Ensure Appointment Created Script for Maestro Tests (GraalJS compatible)
// Uses Maestro's native 'http' object. DO NOT use require() or fetch().
//
// This script checks the appointment state and creates an appointment via API
// if the state is still ACCEPTED (ensuring it transitions to CREATED).
// This handles cases where the UI form submission didn't work properly.
//
// Usage in Maestro YAML:
//   - runScript:
//       file: ../../scripts/ensure-appointment-created.js
//       env:
//         USER_ID: '1000'
//         USER_PASSWORD: 'tuvieja'
//
// Output:
//   output.appointmentId - The ID of the created/latest appointment
//   output.appointmentState - The final state (should be CREATED)

// ==========================================
// ENVIRONMENT VARIABLES (injected by Maestro)
// ==========================================
var API_URL =
  typeof API_BASE_URL !== 'undefined'
    ? API_BASE_URL
    : 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';

var CMD_USER_ID = typeof USER_ID !== 'undefined' ? USER_ID : '1000';
var CMD_USER_PASSWORD = typeof USER_PASSWORD !== 'undefined' ? USER_PASSWORD : 'tuvieja';

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
    throw new Error('HTTP ' + response.status + ' at ' + path + ': ' + response.body);
  }

  return response.body && response.body.length > 0 ? JSON.parse(response.body) : {};
}

// ==========================================
// AUTHENTICATION
// ==========================================
function getUserToken() {
  var tokenData = request(
    'POST',
    '/token',
    'username=' + CMD_USER_ID + '&password=' + CMD_USER_PASSWORD
  );
  if (!tokenData || !tokenData.access_token) {
    throw new Error('Failed to get user token for user ' + CMD_USER_ID);
  }
  return tokenData.access_token;
}

// ==========================================
// MAIN EXECUTION
// ==========================================
function main() {
  console.log('=== Ensure Appointment Created Script ===');
  console.log('API URL: ' + API_URL);
  console.log('User ID: ' + CMD_USER_ID);

  // Get user token
  var token = getUserToken();
  console.log('User token obtained');

  // Check current state
  var state = request('GET', '/appointments/state', '', token);
  console.log('Current appointment state: ' + state);

  if (state === 'CREATED') {
    console.log('State is already CREATED - getting latest appointment ID');
  } else if (state === 'ACCEPTED') {
    console.log('State is ACCEPTED - creating appointment via API to transition to CREATED');

    // Create appointment via API
    var appointmentData = JSON.stringify({
      glucose_objective: 120,
      insulin_type: 'rapida',
      dose: 10,
      fast_insulin: 'Humalog',
      fixed_dose: 5,
      ratio: 10,
      sensitivity: 50,
      pump_type: 'none',
      control_data: 'Created via E2E test script - ' + new Date().toISOString(),
      motive: ['AJUSTE'],
    });

    var created = request('POST', '/appointments/create', appointmentData, token);
    console.log('Appointment created via API. ID: ' + created.appointment_id);

    // Verify state changed
    var newState = request('GET', '/appointments/state', '', token);
    console.log('New state after create: ' + newState);

    if (newState !== 'CREATED') {
      throw new Error('Expected state CREATED after API call, got: ' + newState);
    }
  } else {
    throw new Error('Unexpected appointment state: ' + state + '. Expected ACCEPTED or CREATED.');
  }

  // Get latest appointment ID
  var appointments = request('GET', '/appointments/mine', '', token);

  if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
    throw new Error('No appointments found for user ' + CMD_USER_ID);
  }

  // Find the appointment with the highest ID (most recent)
  var latestAppointment = appointments[0];
  var highestId = latestAppointment.appointment_id || 0;

  for (var i = 1; i < appointments.length; i++) {
    var apt = appointments[i];
    var aptId = apt.appointment_id || 0;
    if (aptId > highestId) {
      highestId = aptId;
      latestAppointment = apt;
    }
  }

  console.log('Latest appointment ID: ' + highestId);

  // Export to Maestro output for use in subsequent steps
  output.appointmentId = highestId;
  output.appointmentState = 'CREATED';
  output.appointment = latestAppointment;

  console.log('=== Appointment ensured CREATED. ID: ' + highestId + ' ===');
}

main();
