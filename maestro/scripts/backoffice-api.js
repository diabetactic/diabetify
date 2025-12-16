/**
 * Backoffice API Helper for Maestro Tests
 *
 * Handles admin operations for appointment queue management:
 * - accept: Accept the next pending appointment
 * - deny: Deny the next pending appointment
 * - clear: Clear all pending appointments from queue
 * - open: Open the appointment queue
 * - close: Close the appointment queue
 *
 * Auto-detects Docker backend (localhost:8006) if running.
 */

const https = require('https');
const http = require('http');

const HEROKU_URL = 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
const LOCAL_URL = 'http://localhost:8006'; // container-managing uses port 8006

// Will be set after auto-detection
let BACKOFFICE_URL = process.env.BACKOFFICE_API_URL || null;
const ACTION = process.env.ACTION; // 'accept', 'deny', 'clear', 'open', 'close'
const USER_ID = process.env.USER_ID || '1000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

/**
 * Auto-detect backend (Docker local or Heroku)
 */
async function detectBackend() {
  if (BACKOFFICE_URL) {
    console.log(`Using configured backend: ${BACKOFFICE_URL}`);
    return BACKOFFICE_URL;
  }

  return new Promise(resolve => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 8006, // container-managing uses port 8006
        path: '/docs',
        method: 'GET',
        timeout: 2000,
      },
      res => {
        if (res.statusCode === 200) {
          console.log('✓ Docker backend detected (localhost:8006)');
          resolve(LOCAL_URL);
        } else {
          console.log('⚠ Docker not available, using Heroku');
          resolve(HEROKU_URL);
        }
      }
    );

    req.on('error', () => {
      console.log('⚠ Docker not running, using Heroku');
      resolve(HEROKU_URL);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('⚠ Docker timeout, using Heroku');
      resolve(HEROKU_URL);
    });

    req.end();
  });
}

/**
 * Make HTTP/HTTPS request based on URL
 */
function request(options, postData = null, useHttp = false) {
  return new Promise((resolve, reject) => {
    const httpModule = useHttp ? http : https;
    const req = httpModule.request(options, res => {
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
    if (postData) req.write(postData);
    req.end();
  });
}

// Check if using local Docker (HTTP) or Heroku (HTTPS)
function isLocalDocker() {
  return BACKOFFICE_URL && BACKOFFICE_URL.startsWith('http://');
}

/**
 * Get admin authentication token
 */
async function getAdminToken() {
  const url = new URL(BACKOFFICE_URL);
  const useHttp = isLocalDocker();
  const postData = `username=${ADMIN_USERNAME}&password=${ADMIN_PASSWORD}`;

  const data = await request(
    {
      hostname: url.hostname,
      port: url.port || (useHttp ? 80 : 443),
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    },
    postData,
    useHttp
  );

  return data.access_token;
}

/**
 * Get pending appointments from queue
 */
async function getPendingAppointments(token) {
  const url = new URL(BACKOFFICE_URL);
  const useHttp = isLocalDocker();

  const data = await request(
    {
      hostname: url.hostname,
      port: url.port || (useHttp ? 80 : 443),
      path: '/appointments/pending',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    },
    null,
    useHttp
  );

  return Array.isArray(data) ? data : [];
}

/**
 * Accept or deny an appointment by queue placement
 */
async function updateAppointment(token, queuePlacement, action) {
  const url = new URL(BACKOFFICE_URL);
  const useHttp = isLocalDocker();

  return await request(
    {
      hostname: url.hostname,
      port: url.port || (useHttp ? 80 : 443),
      path: `/appointments/${action}/${queuePlacement}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    },
    null,
    useHttp
  );
}

/**
 * Clear all pending appointments
 */
async function clearQueue(token) {
  const url = new URL(BACKOFFICE_URL);
  const useHttp = isLocalDocker();

  try {
    await request(
      {
        hostname: url.hostname,
        port: url.port || (useHttp ? 80 : 443),
        path: '/appointments',
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
      null,
      useHttp
    );
    return true;
  } catch (e) {
    // 404 means already empty, which is fine
    if (e.message.includes('404')) return true;
    throw e;
  }
}

/**
 * Open queue (and clear it)
 */
async function openQueue(token) {
  const url = new URL(BACKOFFICE_URL);
  const useHttp = isLocalDocker();

  await request(
    {
      hostname: url.hostname,
      port: url.port || (useHttp ? 80 : 443),
      path: '/appointments/queue/open',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
    null,
    useHttp
  );
}

/**
 * Close queue
 */
async function closeQueue(token) {
  const url = new URL(BACKOFFICE_URL);
  const useHttp = isLocalDocker();

  await request(
    {
      hostname: url.hostname,
      port: url.port || (useHttp ? 80 : 443),
      path: '/appointments/queue/close',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
    null,
    useHttp
  );
}

/**
 * Main execution
 */
async function main() {
  try {
    // Auto-detect backend before any operations
    BACKOFFICE_URL = await detectBackend();

    console.log(`Executing action: ${ACTION} for user: ${USER_ID}`);

    const token = await getAdminToken();
    console.log('Admin token obtained');

    if (ACTION === 'clear') {
      await clearQueue(token);
      console.log('Queue cleared');
      return;
    }

    if (ACTION === 'open') {
      await openQueue(token);
      console.log('Queue opened (and cleared)');
      return;
    }

    if (ACTION === 'close') {
      await closeQueue(token);
      console.log('Queue closed');
      return;
    }

    const pending = await getPendingAppointments(token);
    console.log(`Found ${pending.length} pending appointments`);

    // Find appointment for the specific user
    const userAppointment = pending.find(
      apt => apt.user_id === parseInt(USER_ID) || apt.user_id === USER_ID
    );

    if (!userAppointment) {
      console.log(`No pending appointment found for user ${USER_ID}`);
      return;
    }

    const queuePlacement = userAppointment.queue_placement;
    console.log(`Processing appointment with queue_placement: ${queuePlacement}`);

    await updateAppointment(token, queuePlacement, ACTION);
    console.log(`${ACTION} successful for user ${USER_ID}`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
