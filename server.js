// Minimal static server for Render Web Service
// Binds to 0.0.0.0 and PORT from env

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.resolve(__dirname);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body) res.end(body); else res.end();
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for client-side routing
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        return fs.readFile(indexPath, (e2, idx) => {
          if (e2) return send(res, 500, { 'Content-Type': 'text/plain' }, 'Server error');
          send(res, 200, { 'Content-Type': 'text/html; charset=utf-8' }, idx);
        });
      }
      return send(res, 500, { 'Content-Type': 'text/plain' }, 'Server error');
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    send(res, 200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=3600' }, data);
  });
}

const server = http.createServer((req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    const safePath = path.normalize(reqPath).replace(/^\/+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    // Prevent path traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      return send(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');
    }

    // If requesting a directory, try index.html
    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isDirectory()) {
        return serveFile(res, path.join(filePath, 'index.html'));
      }
      serveFile(res, filePath);
    });
  } catch (e) {
    send(res, 500, { 'Content-Type': 'text/plain' }, 'Server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Snake Game server listening on http://${HOST}:${PORT}`);
});
