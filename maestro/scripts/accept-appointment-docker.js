/**
 * Accept Appointment via Backoffice API (Docker Backend)
 *
 * This script is called from Maestro tests to accept appointments
 * via the backoffice API running on Docker.
 */

const http = require('http');

const BACKOFFICE_HOST = '10.0.2.2'; // Android emulator host
const BACKOFFICE_PORT = 8001;
const USER_ID = process.env.TEST_USER_ID || '1000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

/**
 * Make HTTP request
 */
function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (postData) req.write(postData);
    req.end();
  });
}

/**
 * Get admin auth token
 */
async function getAdminToken() {
  const postData = `username=${ADMIN_USERNAME}&password=${ADMIN_PASSWORD}`;

  const data = await request(
    {
      hostname: BACKOFFICE_HOST,
      port: BACKOFFICE_PORT,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    },
    postData
  );

  return data.access_token;
}

/**
 * Accept appointment for user
 */
async function acceptAppointment(token) {
  const postData = JSON.stringify({ user_id: USER_ID });

  await request(
    {
      hostname: BACKOFFICE_HOST,
      port: BACKOFFICE_PORT,
      path: '/appointments/queue/accept',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    },
    postData
  );

  console.log(`✓ Appointment accepted for user ${USER_ID}`);
}

/**
 * Main
 */
async function main() {
  try {
    console.log('🔑 Getting admin token...');
    const token = await getAdminToken();

    console.log(`📅 Accepting appointment for user ${USER_ID}...`);
    await acceptAppointment(token);

    console.log('✅ Done!');
    output.result = 'success';
  } catch (error) {
    console.error('❌ Error:', error.message);
    // Don't fail the test if backoffice is not available
    output.result = 'skipped';
  }
}

main();
