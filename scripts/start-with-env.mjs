#!/usr/bin/env node

/**
 * Dev server launcher with backend ENV switch.
 *
 * Usage:
 *   npm run start:mock   # or ENV=mock npm start   - In-memory mock data, no backend
 *   npm run start:local  # or ENV=local npm start  - Local Docker (http://localhost:8000)
 *   npm run start:cloud  # or ENV=cloud npm start  - Heroku production API
 *
 * ENV values: mock | local | cloud (alias: heroku)
 *
 * Override URLs via environment variables:
 *   LOCAL_API_GATEWAY_URL   - for local mode
 *   HEROKU_API_BASE_URL     - for cloud/heroku mode
 */

import { spawn } from 'node:child_process';

const envMode = (process.env.ENV || 'mock').toLowerCase();

let apiGatewayUrl;
let configName;
let proxyConfig;

switch (envMode) {
  case 'cloud':
  case 'heroku':
    apiGatewayUrl =
      process.env.HEROKU_API_BASE_URL ||
      'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';
    configName = 'heroku';
    proxyConfig = 'proxy.conf.json'; // Heroku proxy
    break;
  case 'local':
    // Local Docker / backend
    apiGatewayUrl = process.env.LOCAL_API_GATEWAY_URL || 'http://localhost:8000';
    configName = 'local';
    proxyConfig = 'proxy.conf.local.json'; // Local Docker proxy
    break;
  case 'mock':
    // Pure front-end / mock data
    apiGatewayUrl = process.env.MOCK_API_GATEWAY_URL || '';
    configName = 'mock';
    proxyConfig = 'proxy.conf.json'; // Not used but needed for ng serve
    break;
  default:
    apiGatewayUrl = process.env.LOCAL_API_GATEWAY_URL || 'http://localhost:8000';
    configName = 'development';
    proxyConfig = 'proxy.conf.json';
    break;
}

// Exposed for API base-url resolution in the Angular app (via API_GATEWAY_BASE_URL)
process.env.API_GATEWAY_URL = apiGatewayUrl;

console.log(
  `[dev] ENV=${envMode} → API_GATEWAY_URL=${apiGatewayUrl || '(mock mode)'} (ng serve --configuration ${configName} --proxy-config ${proxyConfig})`
);

const ngCommand = process.platform === 'win32' ? 'ng.cmd' : 'ng';
const args = ['serve', '--proxy-config', proxyConfig, '--configuration', configName];

const child = spawn(ngCommand, args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', code => {
  process.exit(code ?? 0);
});
