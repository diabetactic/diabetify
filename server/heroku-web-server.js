const path = require('node:path');
const express = require('express');

const PORT = Number(process.env.PORT ?? 3000);
const STATIC_DIR = path.resolve(__dirname, '..', 'www');

const DEFAULT_API_GATEWAY_URL = 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL ?? DEFAULT_API_GATEWAY_URL;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

function getForwardHeaders(req) {
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'undefined') continue;
    const lower = key.toLowerCase();
    if (lower === 'host') continue;
    if (lower === 'connection') continue;
    if (lower === 'content-length') continue;
    headers[key] = value;
  }
  return headers;
}

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks);
}

app.all('/api/*', async (req, res) => {
  try {
    const upstreamBase = new URL(API_GATEWAY_URL);
    const upstreamPath = req.originalUrl.replace(/^\/api/, '');
    const upstreamUrl = new URL(upstreamPath, upstreamBase);

    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: getForwardHeaders(req),
      body: await readBody(req),
      redirect: 'manual',
    });

    res.status(upstreamRes.status);
    upstreamRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === 'transfer-encoding') return;
      if (lower === 'content-encoding') return;
      if (lower === 'connection') return;
      res.setHeader(key, value);
    });

    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    res.send(buf);
  } catch (error) {
    res.status(502).json({
      detail: 'Upstream API request failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.use(
  express.static(STATIC_DIR, {
    etag: true,
    maxAge: '1h',
    index: false,
  })
);

// SPA fallback: serve index.html for all non-file routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Web server listening on :${PORT}`);
  console.log(`Serving static from: ${STATIC_DIR}`);
  console.log(`Proxying /api -> ${API_GATEWAY_URL}`);
});
