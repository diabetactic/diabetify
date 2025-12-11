// Resolution API Helper for Maestro (GraalJS compatible)
// Uses Maestro's native 'http' object. DO NOT use require() or fetch().
//
// Actions:
//   - create: Create a resolution for an appointment (fails if exists)
//   - ensure: Create a resolution only if it doesn't exist (idempotent)
//   - get: Get resolution for an appointment
//
// Usage in Maestro:
//   - runScript:
//       file: ../../scripts/resolution-api.js
//       env:
//         ACTION: ensure
//         APPOINTMENT_ID: "100"

var BACKOFFICE_URL =
  typeof BACKOFFICE_API_URL !== 'undefined'
    ? BACKOFFICE_API_URL
    : 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';

var CMD_ACTION = typeof ACTION !== 'undefined' ? ACTION : null;
var CMD_APPOINTMENT_ID = typeof APPOINTMENT_ID !== 'undefined' ? APPOINTMENT_ID : null;
var CMD_ADMIN_USER = typeof ADMIN_USERNAME !== 'undefined' ? ADMIN_USERNAME : 'admin';
var CMD_ADMIN_PASS = typeof ADMIN_PASSWORD !== 'undefined' ? ADMIN_PASSWORD : 'admin';

// Resolution data (can be customized via env vars)
var RES_BASAL_TYPE = typeof BASAL_TYPE !== 'undefined' ? BASAL_TYPE : 'Lantus';
var RES_BASAL_DOSE = typeof BASAL_DOSE !== 'undefined' ? parseFloat(BASAL_DOSE) : 22;
var RES_BASAL_TIME = typeof BASAL_TIME !== 'undefined' ? BASAL_TIME : '22:00';
var RES_FAST_TYPE = typeof FAST_TYPE !== 'undefined' ? FAST_TYPE : 'Humalog';
var RES_RATIO = typeof RATIO !== 'undefined' ? parseFloat(RATIO) : 12;
var RES_SENSITIVITY = typeof SENSITIVITY !== 'undefined' ? parseFloat(SENSITIVITY) : 45;
var RES_EMERGENCY = typeof EMERGENCY_CARE !== 'undefined' ? EMERGENCY_CARE === 'true' : false;
var RES_PHYSICAL =
  typeof PHYSICAL_APPOINTMENT !== 'undefined' ? PHYSICAL_APPOINTMENT === 'true' : false;

function request(method, path, body, token) {
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  // Form-data for token endpoint
  if (path === '/token') headers['Content-Type'] = 'application/x-www-form-urlencoded';

  var fullUrl = BACKOFFICE_URL + path;

  var options = {
    method: method,
    headers: headers,
  };

  if (method !== 'GET' && method !== 'DELETE' && body) {
    options.body = body;
  }

  var response = http.request(fullUrl, options);

  if (response.status >= 300 && response.status !== 404) {
    throw new Error('HTTP ' + response.status + ' at ' + path + ': ' + response.body);
  }

  return {
    status: response.status,
    body: response.body && response.body.length > 0 ? JSON.parse(response.body) : null,
  };
}

function main() {
  console.log('Resolution Script. Action: ' + CMD_ACTION + ', Appointment: ' + CMD_APPOINTMENT_ID);

  // 1. Authenticate
  var tokenData = request(
    'POST',
    '/token',
    'username=' + CMD_ADMIN_USER + '&password=' + CMD_ADMIN_PASS
  );
  var token = tokenData.body.access_token;
  console.log('Backoffice token obtained.');

  if (CMD_ACTION === 'create') {
    if (!CMD_APPOINTMENT_ID) {
      throw new Error('APPOINTMENT_ID is required for create action');
    }

    var resolutionData = JSON.stringify({
      appointment_id: parseInt(CMD_APPOINTMENT_ID, 10),
      change_basal_type: RES_BASAL_TYPE,
      change_basal_dose: RES_BASAL_DOSE,
      change_basal_time: RES_BASAL_TIME,
      change_fast_type: RES_FAST_TYPE,
      change_ratio: RES_RATIO,
      change_sensitivity: RES_SENSITIVITY,
      emergency_care: RES_EMERGENCY,
      needed_physical_appointment: RES_PHYSICAL,
    });

    var result = request('POST', '/appointments/create_resolution', resolutionData, token);
    console.log('Resolution created. Status: ' + result.status);
    if (result.body) {
      console.log('Resolution ID: ' + result.body.appointment_id);
    }
  } else if (CMD_ACTION === 'ensure') {
    // Idempotent: create only if resolution doesn't exist
    if (!CMD_APPOINTMENT_ID) {
      throw new Error('APPOINTMENT_ID is required for ensure action');
    }

    // First check if resolution exists
    var getResult = request(
      'GET',
      '/appointments/' + CMD_APPOINTMENT_ID + '/resolution',
      '',
      token
    );

    if (getResult.status !== 404 && getResult.body && getResult.body.change_basal_type) {
      console.log('Resolution already exists for appointment ' + CMD_APPOINTMENT_ID);
      console.log('  Basal Type: ' + getResult.body.change_basal_type);
      console.log('  Basal Dose: ' + getResult.body.change_basal_dose);
      console.log('Skipping creation.');
    } else {
      // Create resolution
      var resolutionData = JSON.stringify({
        appointment_id: parseInt(CMD_APPOINTMENT_ID, 10),
        change_basal_type: RES_BASAL_TYPE,
        change_basal_dose: RES_BASAL_DOSE,
        change_basal_time: RES_BASAL_TIME,
        change_fast_type: RES_FAST_TYPE,
        change_ratio: RES_RATIO,
        change_sensitivity: RES_SENSITIVITY,
        emergency_care: RES_EMERGENCY,
        needed_physical_appointment: RES_PHYSICAL,
      });

      var result = request('POST', '/appointments/create_resolution', resolutionData, token);
      console.log('Resolution created. Status: ' + result.status);
      if (result.body) {
        console.log('Resolution ID: ' + result.body.appointment_id);
      }
    }
  } else if (CMD_ACTION === 'get') {
    if (!CMD_APPOINTMENT_ID) {
      throw new Error('APPOINTMENT_ID is required for get action');
    }

    var result = request('GET', '/appointments/' + CMD_APPOINTMENT_ID + '/resolution', '', token);
    if (result.status === 404) {
      console.log('No resolution found for appointment ' + CMD_APPOINTMENT_ID);
    } else {
      console.log('Resolution found:');
      console.log('  Basal Type: ' + result.body.change_basal_type);
      console.log('  Basal Dose: ' + result.body.change_basal_dose);
      console.log('  Ratio: ' + result.body.change_ratio);
      console.log('  Sensitivity: ' + result.body.change_sensitivity);
    }
  } else {
    throw new Error('Unknown ACTION: ' + CMD_ACTION + '. Use "create", "ensure", or "get".');
  }
}

main();
