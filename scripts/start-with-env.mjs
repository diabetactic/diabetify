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

const envMode = process.env.ENV || 'local';

let apiGatewayUrl;
if (envMode === 'heroku') {
  apiGatewayUrl =
    process.env.HEROKU_API_BASE_URL ||
    'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';
} else {
  // default: local Docker gateway (container-managing/api-gateway on host port 8004)
  apiGatewayUrl = process.env.LOCAL_API_GATEWAY_URL || 'http://localhost:8004';
}

// Exposed for API base-url resolution in the Angular app (via API_GATEWAY_BASE_URL)
process.env.API_GATEWAY_URL = apiGatewayUrl;

const configName = envMode === 'heroku' ? 'heroku' : 'development';

console.log(
  `[dev] ENV=${envMode} → API_GATEWAY_URL=${apiGatewayUrl} (ng serve --configuration ${configName} --proxy-config proxy.conf.json)`
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
