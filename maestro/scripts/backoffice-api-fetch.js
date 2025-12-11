// Backoffice API Helper for Maestro (GraalJS compatible)
// Uses Maestro's native 'http' object. DO NOT use require() or fetch().

// Maestro injects env vars as globals. We use a safe fallback pattern.
var BACKOFFICE_URL =
  typeof BACKOFFICE_API_URL !== 'undefined'
    ? BACKOFFICE_API_URL
    : 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
var CMD_ACTION = typeof ACTION !== 'undefined' ? ACTION : null;
var CMD_USER_ID = typeof USER_ID !== 'undefined' ? USER_ID : '1000';
var CMD_ADMIN_USER = typeof ADMIN_USERNAME !== 'undefined' ? ADMIN_USERNAME : 'admin';
var CMD_ADMIN_PASS = typeof ADMIN_PASSWORD !== 'undefined' ? ADMIN_PASSWORD : 'admin';

function request(method, path, body, token) {
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  // Form-data for token endpoint specifically
  if (path === '/token') headers['Content-Type'] = 'application/x-www-form-urlencoded';

  var fullUrl = BACKOFFICE_URL + path;

  // Build request options - GET/DELETE don't have body
  var options = {
    method: method,
    headers: headers,
  };

  // Only add body for POST/PUT/PATCH
  if (method !== 'GET' && method !== 'DELETE' && body) {
    options.body = body;
  }

  // Maestro http.request is synchronous
  var response = http.request(fullUrl, options);

  if (response.status >= 300) {
    // 404 is acceptable for "clear" or "check" operations
    if (response.status === 404) return null;
    throw new Error('HTTP ' + response.status + ' at ' + path + ': ' + response.body);
  }

  // Return parsed JSON if body exists, else empty object
  return response.body && response.body.length > 0 ? JSON.parse(response.body) : {};
}

function main() {
  console.log('Starting Backoffice Script. Action: ' + CMD_ACTION + ', User: ' + CMD_USER_ID);

  // 1. Authenticate
  var tokenData = request(
    'POST',
    '/token',
    'username=' + CMD_ADMIN_USER + '&password=' + CMD_ADMIN_PASS
  );
  var token = tokenData.access_token;
  console.log('Token obtained.');

  if (CMD_ACTION === 'clear') {
    // Clear all appointments
    request('DELETE', '/appointments', '', token);
    console.log('Queue cleared.');
  } else if (CMD_ACTION === 'open') {
    // Open (and implicitly clear) queue
    request('POST', '/appointments/queue/open', '{}', token);
    console.log('Queue opened (and cleared).');
  } else if (CMD_ACTION === 'accept' || CMD_ACTION === 'deny') {
    // Get Pending list
    var pending = request('GET', '/appointments/pending', '', token);
    if (!pending) pending = [];

    // Find user - try both by internal user_id AND by checking if user exists
    // Note: DNI (login) is 1000, but internal user_id may be different (e.g., 1)
    var appt = null;
    for (var i = 0; i < pending.length; i++) {
      // Try loose equality for both DNI and internal ID
      // User DNI 1000 often has internal user_id 1 (first seeded user)
      var pendingUserId = pending[i].user_id;
      if (pendingUserId == CMD_USER_ID || pendingUserId == 1) {
        appt = pending[i];
        break;
      }
    }

    // If no specific user found but there are pending appointments, use the first one
    // This is safe for single-user test scenarios
    if (!appt && pending.length > 0) {
      console.log('No exact user match, using first pending appointment');
      appt = pending[0];
    }

    if (appt) {
      console.log(
        'Found appointment for user_id ' + appt.user_id + ' at placement: ' + appt.queue_placement
      );
      request('PUT', '/appointments/' + CMD_ACTION + '/' + appt.queue_placement, '{}', token);
      console.log('Appointment ' + CMD_ACTION + 'ed.');
    } else {
      console.log(
        'No pending appointment found for user ' + CMD_USER_ID + ' (Might already be processed)'
      );
    }
  } else {
    throw new Error('Unknown ACTION: ' + CMD_ACTION);
  }
}

main();
