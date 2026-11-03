const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Sederhana loader untuk membaca file .env atau .env.local
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const f of envFiles) {
    const full = path.join(__dirname, f);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx > 0) {
            const k = trimmed.slice(0, idx).trim();
            const v = trimmed.slice(idx + 1).trim();
            if (!process.env[k]) process.env[k] = v;
          }
        }
      });
      console.log(`[Env] Memuat variabel dari: ${f}`);
      break;
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS Headers untuk pengujian lokal
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // 2. Routing untuk Backend API (/api/chat)
  if (urlPath === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch (e) {
        req.body = {};
      }

      // Helper functions agar kompatibel dengan Vercel Functions API
      res.status = function(code) {
        this.statusCode = code;
        return this;
      };
      res.json = function(data) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(data));
        return this;
      };

      try {
        const handler = require('./api/chat.js');
        await handler(req, res);
      } catch (err) {
        console.error('[API Error]', err);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      }
    });
    return;
  }

  // 3. Routing Static Files (index.html, dll.)
  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  const safePath = path.normalize(path.join(__dirname, filePath));

  // Cegah directory traversal
  if (!safePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Akses ditolak');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('File tidak ditemukan: ' + urlPath);
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', mime);
    fs.createReadStream(safePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Galaxy AI Agent berjalan di: http://localhost:${PORT}`);
  console.log(`🌌 3D Space:  http://localhost:${PORT}/index.html`);
  console.log(`⚡ API Chat:  http://localhost:${PORT}/api/chat`);
  console.log(`==================================================\n`);
});

