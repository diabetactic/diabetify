// Get Latest Appointment Script for Maestro Tests (GraalJS compatible)
// Uses Maestro's native 'http' object. DO NOT use require() or fetch().
//
// This script queries the user's appointments and returns the latest one.
// Usage in Maestro YAML:
//   - runScript:
//       file: ../../scripts/get-latest-appointment.js
//       env:
//         USER_ID: '1000'
//         USER_PASSWORD: 'tuvieja'
//
// Output:
//   output.appointmentId - The ID of the latest appointment
//   output.appointmentCount - Total number of appointments
//   output.appointment - Full appointment object

// ==========================================
// ENVIRONMENT VARIABLES (injected by Maestro)
// ==========================================
var API_URL =
  typeof API_BASE_URL !== 'undefined'
    ? API_BASE_URL
    : 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';

var USER_ID = typeof USER_ID !== 'undefined' ? USER_ID : '1000';
var USER_PASSWORD = typeof USER_PASSWORD !== 'undefined' ? USER_PASSWORD : 'tuvieja';

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
  var tokenData = request('POST', '/token', 'username=' + USER_ID + '&password=' + USER_PASSWORD);
  if (!tokenData || !tokenData.access_token) {
    throw new Error('Failed to get user token for user ' + USER_ID);
  }
  return tokenData.access_token;
}

// ==========================================
// MAIN EXECUTION
// ==========================================
function main() {
  console.log('=== Get Latest Appointment Script ===');
  console.log('API URL: ' + API_URL);
  console.log('User ID: ' + USER_ID);

  // Get user token
  var token = getUserToken();
  console.log('User token obtained');

  // Get user's appointments
  var appointments = request('GET', '/appointments/mine', '', token);

  if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
    throw new Error('No appointments found for user ' + USER_ID);
  }

  console.log('Found ' + appointments.length + ' appointments');

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
  console.log('Motive: ' + JSON.stringify(latestAppointment.motive));

  // Export to Maestro output for use in subsequent steps
  output.appointmentId = highestId;
  output.appointmentCount = appointments.length;
  output.appointment = latestAppointment;

  console.log('=== Appointment ID Retrieved: ' + highestId + ' ===');
}

main();
