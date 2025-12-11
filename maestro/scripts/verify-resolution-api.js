// Verify Resolution via API Script for Maestro (GraalJS compatible)
// Uses Maestro's native 'http' object. DO NOT use require() or fetch().
//
// This script verifies resolution data exists in the backend API
// and returns the values for UI comparison.
//
// Usage in Maestro YAML:
//   - runScript:
//       file: ../../scripts/verify-resolution-api.js
//       env:
//         APPOINTMENT_ID: '${output.appointmentId}'
//
// Output:
//   output.exists - Boolean if resolution exists
//   output.basalType - Basal insulin type
//   output.basalDose - Basal dose
//   output.basalTime - Administration time
//   output.fastType - Fast insulin type
//   output.ratio - Carb ratio
//   output.sensitivity - Correction factor
//   output.emergencyCare - Emergency care flag
//   output.needsPhysical - Physical appointment flag

var BACKOFFICE_API =
  typeof BACKOFFICE_API_URL !== 'undefined'
    ? BACKOFFICE_API_URL
    : 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';

var ADMIN_USERNAME = typeof ADMIN_USER !== 'undefined' ? ADMIN_USER : 'admin';
var ADMIN_PASSWORD = typeof ADMIN_PASS !== 'undefined' ? ADMIN_PASS : 'admin';
var CMD_APPOINTMENT_ID = typeof APPOINTMENT_ID !== 'undefined' ? APPOINTMENT_ID : null;

function request(method, path, body, token) {
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (path === '/token') headers['Content-Type'] = 'application/x-www-form-urlencoded';

  var fullUrl = BACKOFFICE_API + path;
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

function main() {
  console.log('=== Verify Resolution API Script ===');
  console.log('Appointment ID: ' + CMD_APPOINTMENT_ID);

  if (!CMD_APPOINTMENT_ID) {
    throw new Error('APPOINTMENT_ID is required');
  }

  // Get admin token
  var tokenRes = request(
    'POST',
    '/token',
    'username=' + ADMIN_USERNAME + '&password=' + ADMIN_PASSWORD
  );

  if (!tokenRes.body || !tokenRes.body.access_token) {
    throw new Error('Failed to get admin token');
  }
  var token = tokenRes.body.access_token;
  console.log('Admin token obtained');

  // Get resolution
  var res = request('GET', '/appointments/' + CMD_APPOINTMENT_ID + '/resolution', '', token);

  if (res.status === 404 || !res.body) {
    console.log('No resolution found for appointment ' + CMD_APPOINTMENT_ID);
    output.exists = false;
    output.basalType = '';
    output.basalDose = '';
    output.basalTime = '';
    output.fastType = '';
    output.ratio = '';
    output.sensitivity = '';
    output.emergencyCare = false;
    output.needsPhysical = false;
    return;
  }

  console.log('Resolution found:');
  console.log('  Basal Type: ' + res.body.change_basal_type);
  console.log('  Basal Dose: ' + res.body.change_basal_dose);
  console.log('  Basal Time: ' + res.body.change_basal_time);
  console.log('  Fast Type: ' + res.body.change_fast_type);
  console.log('  Ratio: ' + res.body.change_ratio);
  console.log('  Sensitivity: ' + res.body.change_sensitivity);
  console.log('  Emergency Care: ' + res.body.emergency_care);
  console.log('  Needs Physical: ' + res.body.needed_physical_appointment);

  // Set outputs for Maestro
  output.exists = true;
  output.basalType = res.body.change_basal_type || '';
  output.basalDose = String(res.body.change_basal_dose || '');
  output.basalTime = res.body.change_basal_time || '';
  output.fastType = res.body.change_fast_type || '';
  output.ratio = String(res.body.change_ratio || '');
  output.sensitivity = String(res.body.change_sensitivity || '');
  output.emergencyCare = res.body.emergency_care || false;
  output.needsPhysical = res.body.needed_physical_appointment || false;

  console.log('=== Verification Complete ===');
}

main();
