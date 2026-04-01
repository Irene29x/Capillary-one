// Simple local dev server — run with: node server.js
import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Import the API handlers
const { default: scoresHandler } = await import('./api/scores.js');
const { default: authHandler } = await import('./api/auth.js');

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function serveStatic(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// Minimal req/res adapter to match Vercel's handler signature
function createVercelReq(req, body, url) {
  return {
    method: req.method,
    headers: req.headers,
    query: Object.fromEntries(url.searchParams),
    body: body ? JSON.parse(body) : undefined,
  };
}

function createVercelRes(res) {
  const vercelRes = {
    _statusCode: 200,
    _headers: {},
    status(code) { vercelRes._statusCode = code; return vercelRes; },
    json(data) {
      res.writeHead(vercelRes._statusCode, {
        ...vercelRes._headers,
        'Content-Type': 'application/json',
      });
      res.end(JSON.stringify(data));
    },
    setHeader(k, v) { vercelRes._headers[k] = v; return vercelRes; },
  };
  return vercelRes;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API routes
  if (url.pathname.startsWith('/api/scores') || url.pathname.startsWith('/api/auth')) {
    const handler = url.pathname.startsWith('/api/auth') ? authHandler : scoresHandler;
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const vReq = createVercelReq(req, body || null, url);
        const vRes = createVercelRes(res);
        await handler(vReq, vRes);
      } catch (err) {
        console.error('API error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server error' }));
      }
    });
    return;
  }

  // Static files from public/
  let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  serveStatic(filePath, res);
});

server.listen(PORT, () => {
  console.log(`\n  🎮 Capillary Playground running at http://localhost:${PORT}\n`);
});
