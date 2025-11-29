#!/usr/bin/env node

/**
 * Dev server launcher with backend ENV switch.
 *
 * Usage:
 *   ENV=local  npm start   # use local Docker gateway (http://localhost:8000)
 *   ENV=heroku npm start   # use Heroku gateway (via API_GATEWAY_URL)
 *
 * You can also override the exact URLs via:
 *   LOCAL_API_GATEWAY_URL
 *   HEROKU_API_BASE_URL
 */

import { spawn } from 'node:child_process';

const envMode = (process.env.ENV || 'mock').toLowerCase();

let apiGatewayUrl;
let configName;

switch (envMode) {
  case 'heroku':
    apiGatewayUrl =
      process.env.HEROKU_API_BASE_URL ||
      'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';
    configName = 'heroku';
    break;
  case 'local':
    // Local Docker / backend
    apiGatewayUrl = process.env.LOCAL_API_GATEWAY_URL || 'http://localhost:8000';
    configName = 'local';
    break;
  case 'mock':
    // Pure front-end / mock data
    apiGatewayUrl = process.env.MOCK_API_GATEWAY_URL || '';
    configName = 'mock';
    break;
  default:
    apiGatewayUrl = process.env.LOCAL_API_GATEWAY_URL || 'http://localhost:8000';
    configName = 'development';
    break;
}

// Exposed for API base-url resolution in the Angular app (via API_GATEWAY_BASE_URL)
process.env.API_GATEWAY_URL = apiGatewayUrl;

console.log(
  `[dev] ENV=${envMode} → API_GATEWAY_URL=${apiGatewayUrl || '(mock mode)'} (ng serve --configuration ${configName} --proxy-config proxy.conf.json)`
);

const ngCommand = process.platform === 'win32' ? 'ng.cmd' : 'ng';
const args = ['serve', '--proxy-config', 'proxy.conf.json', '--configuration', configName];

const child = spawn(ngCommand, args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', code => {
  process.exit(code ?? 0);
});
