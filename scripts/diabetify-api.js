#!/usr/bin/env node
/**
 * Diabetify Unified API Helper
 *
 * Consolidated script for all backend API operations.
 * Auto-detects Docker (localhost:8000/8001) or falls back to Heroku.
 *
 * USAGE:
 *   node scripts/diabetify-api.js <action> [options]
 *
 * ACTIONS:
 *   # User Management
 *   create-user --dni=<dni> --email=<email> --name=<name> --surname=<surname> --password=<pwd>
 *   list-users
 *   get-user --id=<user_id>
 *
 *   # Authentication
 *   login --user=<dni> --pass=<password>
 *   admin-login
 *
 *   # Glucose Readings (requires user token)
 *   add-reading --level=<number> --type=<DESAYUNO|ALMUERZO|MERIENDA|CENA|EJERCICIO|OTRAS_COMIDAS|OTRO> [--notes=<text>]
 *   list-readings
 *
 *   # Appointment Queue (admin operations)
 *   open-queue
 *   close-queue
 *   queue-status
 *   pending-appointments
 *
 *   # Appointment Actions
 *   submit-to-queue                    # User submits to queue
 *   accept --placement=<n>             # Admin accepts
 *   deny --placement=<n>               # Admin denies
 *   clear-queue                        # Admin clears all pending
 *
 *   # Appointment Data
 *   create-appointment-data            # Creates appointment medical data
 *   appointment-state                  # Check user's appointment state
 *
 * ENVIRONMENT:
 *   API_URL          - Override API gateway URL (default: auto-detect)
 *   BACKOFFICE_URL   - Override backoffice URL (default: auto-detect)
 *   USER_TOKEN       - Pre-set user token
 *   ADMIN_TOKEN      - Pre-set admin token
 *
 * EXAMPLES:
 *   # Create Julian's user on Docker
 *   node scripts/diabetify-api.js create-user --dni=julian --email=juliancrespo15@gmail.com --name=Julian --surname=Crespo --password=tuvieja
 *
 *   # Login and add a reading
 *   export USER_TOKEN=$(node scripts/diabetify-api.js login --user=julian --pass=tuvieja | jq -r .access_token)
 *   node scripts/diabetify-api.js add-reading --level=95 --type=DESAYUNO --notes="Fasting"
 *
 *   # Admin: Accept next appointment
 *   node scripts/diabetify-api.js accept --placement=0
 */

const http = require('http');
const https = require('https');

// URLs - will be set by auto-detection
const DOCKER_API = 'http://localhost:8000';
const DOCKER_BACKOFFICE = 'http://localhost:8001';
const HEROKU_API = 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';
const HEROKU_BACKOFFICE = 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';

let API_URL = process.env.API_URL || null;
let BACKOFFICE_URL = process.env.BACKOFFICE_URL || null;

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

// Parse command line arguments
const args = process.argv.slice(2);
const action = args[0];
const options = {};
args.slice(1).forEach(arg => {
  const match = arg.match(/^--(\w+)=(.+)$/);
  if (match) options[match[1]] = match[2];
});

/**
 * Auto-detect backend
 */
async function detectBackend() {
  if (API_URL && BACKOFFICE_URL) {
    console.error(`Using configured URLs: API=${API_URL}, Backoffice=${BACKOFFICE_URL}`);
    return;
  }

  return new Promise(resolve => {
    const req = http.request({
      hostname: 'localhost',
      port: 8000,
      path: '/docs',
      method: 'GET',
      timeout: 2000
    }, res => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        console.error('✓ Docker backend detected (localhost:8000/8001)');
        API_URL = DOCKER_API;
        BACKOFFICE_URL = DOCKER_BACKOFFICE;
      } else {
        console.error('⚠ Using Heroku backend');
        API_URL = HEROKU_API;
        BACKOFFICE_URL = HEROKU_BACKOFFICE;
      }
      resolve();
    });

    req.on('error', () => {
      console.error('⚠ Docker not available, using Heroku');
      API_URL = HEROKU_API;
      BACKOFFICE_URL = HEROKU_BACKOFFICE;
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('⚠ Docker timeout, using Heroku');
      API_URL = HEROKU_API;
      BACKOFFICE_URL = HEROKU_BACKOFFICE;
      resolve();
    });

    req.end();
  });
}

/**
 * HTTP request helper
 */
function request(baseUrl, path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {}
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    let postData = null;
    if (body) {
      if (typeof body === 'string') {
        postData = body;
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      } else {
        postData = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
      }
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = httpModule.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data || { success: true });
          }
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

/**
 * Get admin token
 */
async function getAdminToken() {
  if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN;
  const result = await request(BACKOFFICE_URL, '/token', 'POST', `username=${ADMIN_USER}&password=${ADMIN_PASS}`);
  return result.access_token;
}

/**
 * Get user token
 */
async function getUserToken(user, pass) {
  if (process.env.USER_TOKEN) return process.env.USER_TOKEN;
  const result = await request(API_URL, '/token', 'POST', `username=${user}&password=${pass}`);
  return result.access_token;
}

// Action handlers
const actions = {
  // User Management
  async 'create-user'() {
    const token = await getAdminToken();
    const userData = {
      dni: options.dni,
      email: options.email,
      name: options.name,
      surname: options.surname,
      password: options.password,
      blocked: false,
      hospital_account: options.hospital || 'HOSP001'
    };
    return request(BACKOFFICE_URL, '/users/', 'POST', userData, token);
  },

  async 'list-users'() {
    const token = await getAdminToken();
    return request(BACKOFFICE_URL, '/users/', 'GET', null, token);
  },

  async 'get-user'() {
    const token = await getAdminToken();
    return request(BACKOFFICE_URL, `/users/user/${options.id}`, 'GET', null, token);
  },

  // Authentication
  async 'login'() {
    return request(API_URL, '/token', 'POST', `username=${options.user}&password=${options.pass}`);
  },

  async 'admin-login'() {
    return request(BACKOFFICE_URL, '/token', 'POST', `username=${ADMIN_USER}&password=${ADMIN_PASS}`);
  },

  // Glucose Readings
  async 'add-reading'() {
    const token = options.token || process.env.USER_TOKEN;
    if (!token) throw new Error('USER_TOKEN required');
    const query = `glucose_level=${options.level}&reading_type=${options.type}${options.notes ? `&notes=${encodeURIComponent(options.notes)}` : ''}`;
    return request(API_URL, `/glucose/create?${query}`, 'POST', null, token);
  },

  async 'list-readings'() {
    const token = options.token || process.env.USER_TOKEN;
    if (!token) throw new Error('USER_TOKEN required');
    return request(API_URL, '/glucose/mine', 'GET', null, token);
  },

  // Appointment Queue (Admin)
  async 'open-queue'() {
    const token = await getAdminToken();
    return request(BACKOFFICE_URL, '/appointments/queue/open', 'POST', null, token);
  },

  async 'close-queue'() {
    const token = await getAdminToken();
    return request(BACKOFFICE_URL, '/appointments/queue/close', 'POST', null, token);
  },

  async 'queue-status'() {
    const token = await getAdminToken();
    return request(BACKOFFICE_URL, '/appointments/queue', 'GET', null, token);
  },

  async 'pending-appointments'() {
    const token = await getAdminToken();
    return request(BACKOFFICE_URL, '/appointments/pending', 'GET', null, token);
  },

  async 'accept'() {
    const token = await getAdminToken();
    const placement = options.placement || '0';
    return request(BACKOFFICE_URL, `/appointments/accept/${placement}`, 'PUT', null, token);
  },

  async 'deny'() {
    const token = await getAdminToken();
    const placement = options.placement || '0';
    return request(BACKOFFICE_URL, `/appointments/deny/${placement}`, 'PUT', null, token);
  },

  async 'clear-queue'() {
    const token = await getAdminToken();
    // Get all pending and deny each one
    const pending = await request(BACKOFFICE_URL, '/appointments/pending', 'GET', null, token);
    if (!pending || pending.length === 0) return { message: 'Queue already empty' };

    for (const apt of pending) {
      await request(BACKOFFICE_URL, `/appointments/deny/${apt.queue_placement}`, 'PUT', null, token);
    }
    return { message: `Cleared ${pending.length} appointments` };
  },

  // User Appointment Actions
  async 'submit-to-queue'() {
    const token = options.token || process.env.USER_TOKEN;
    if (!token) throw new Error('USER_TOKEN required');
    return request(API_URL, '/appointments/submit', 'POST', null, token);
  },

  async 'appointment-state'() {
    const token = options.token || process.env.USER_TOKEN;
    if (!token) throw new Error('USER_TOKEN required');
    return request(API_URL, '/appointments/state', 'GET', null, token);
  },

  async 'create-appointment-data'() {
    const token = options.token || process.env.USER_TOKEN;
    if (!token) throw new Error('USER_TOKEN required');
    const data = {
      glucose_objective: 100,
      insulin_type: 'Novorapid',
      dose: 10,
      fast_insulin: 'Lantus',
      fixed_dose: 20,
      ratio: 10,
      sensitivity: 50,
      pump_type: 'None',
      control_data: 'Weekly',
      motive: ['AJUSTE']
    };
    return request(API_URL, '/appointments/create', 'POST', data, token);
  },

  // Help
  async 'help'() {
    console.log(`
Diabetify API Helper - Unified script for all backend operations

USAGE: node scripts/diabetify-api.js <action> [options]

USER MANAGEMENT:
  create-user --dni=X --email=X --name=X --surname=X --password=X
  list-users
  get-user --id=<user_id>

AUTHENTICATION:
  login --user=<dni> --pass=<password>
  admin-login

GLUCOSE (needs USER_TOKEN):
  add-reading --level=95 --type=DESAYUNO [--notes="text"]
  list-readings

QUEUE MANAGEMENT (admin):
  open-queue, close-queue, queue-status, pending-appointments
  accept --placement=0
  deny --placement=0
  clear-queue

APPOINTMENTS (needs USER_TOKEN):
  submit-to-queue
  appointment-state
  create-appointment-data

ENVIRONMENT VARIABLES:
  API_URL, BACKOFFICE_URL, USER_TOKEN, ADMIN_TOKEN
`);
    return {};
  }
};

// Main
async function main() {
  if (!action || action === 'help' || action === '--help') {
    await actions.help();
    process.exit(0);
  }

  if (!actions[action]) {
    console.error(`Unknown action: ${action}`);
    console.error('Run with --help for usage');
    process.exit(1);
  }

  await detectBackend();

  try {
    const result = await actions[action]();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
