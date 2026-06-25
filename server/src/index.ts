import express from 'express';
import {createServer} from 'http';
import {mkdirSync} from 'fs';
import {networkInterfaces} from 'os';
import path from 'path';
import {fileURLToPath} from 'url';
import {WebSocketServer} from 'ws';
import {Bonjour} from 'bonjour-service';
import QRCode from 'qrcode';
import {createWsServer} from 'tinybase/synchronizers/synchronizer-ws-server';
import {createFilePersister} from 'tinybase/persisters/persister-file';
import {createMergeableStore} from 'tinybase';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const DATA_DIR = process.env.DATA_DIR_OVERRIDE
  ? path.resolve(process.env.DATA_DIR_OVERRIDE)
  : path.resolve(__dirname, '../../data');

// The file persister can't create missing parent dirs — make sure it exists,
// otherwise synced data (items + covers) silently never lands on disk.
mkdirSync(DATA_DIR, {recursive: true});

// ── Discovery helpers ─────────────────────────────────────────────────────

/** Return the first non-loopback IPv4 address on this machine. */
function getLocalIp(): string {
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (!iface.internal && iface.family === 'IPv4') return iface.address;
    }
  }
  return 'localhost';
}

// ── Express app ───────────────────────────────────────────────────────────

const app = express();

// Serve built client (populated by `pnpm build`)
const clientDist = path.resolve(__dirname, '../public');
app.use(express.static(clientDist));

// Health check — also used by the phone to confirm it found the right server
app.get('/health', (_req, res) => {
  res.json({status: 'ok', service: 'tsundoku'});
});

/**
 * Discovery page — shown when no client build exists yet, or when you hit the
 * server directly from a desktop browser.  Displays the LAN URL and a QR code
 * so you can scan it with your phone.
 */
app.get('/_discover', async (_req, res) => {
  const ip = getLocalIp();
  const url = `http://${ip}:${PORT}`;
  let qrSvg = '';
  try {
    qrSvg = await QRCode.toString(url, {type: 'svg', margin: 2});
  } catch {
    qrSvg = `<p>QR generation failed — connect to <strong>${url}</strong></p>`;
  }

  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Tsundoku — Connect</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#E63329;color:#fff;
         display:flex;flex-direction:column;align-items:center;justify-content:center;
         min-height:100dvh;margin:0;gap:24px;padding:24px;text-align:center;}
    h1{font-size:2rem;font-weight:900;margin:0;}
    p{margin:0;opacity:.85;}
    .qr{background:#fff;padding:16px;border-radius:12px;width:min(260px,80vw);}
    .qr svg{width:100%;height:auto;display:block;}
    code{background:rgba(0,0,0,.25);padding:4px 10px;border-radius:6px;font-size:1.1rem;}
    .usb{background:rgba(0,0,0,.2);border-radius:12px;padding:16px 20px;max-width:420px;
         font-size:.88rem;line-height:1.6;text-align:left;}
    .usb h2{font-size:1rem;margin:0 0 8px;}
    .back{position:fixed;top:max(16px,env(safe-area-inset-top));left:16px;
          display:inline-flex;align-items:center;gap:6px;text-decoration:none;
          color:#fff;background:rgba(0,0,0,.2);border:1.5px solid rgba(255,255,255,.4);
          border-radius:8px;padding:8px 14px;font-size:.9rem;font-weight:700;}
    .back:active{background:rgba(0,0,0,.35);}
  </style>
</head>
<body>
  <a class="back" href="/">← Back</a>
  <h1>🚀 Tsundoku</h1>
  <p>Scan with your phone (same WiFi or USB)</p>
  <div class="qr">${qrSvg}</div>
  <code>${url}</code>

  <div class="usb">
    <h2>USB Connection (Android)</h2>
    Run once in a terminal on your PC:<br/>
    <code style="display:block;margin-top:8px;word-break:break-all;">
      adb reverse tcp:${PORT} tcp:${PORT}
    </code>
    Then open <code>http://localhost:${PORT}</code> in Chrome on your phone.<br/>
    The QR code above works over WiFi automatically.
  </div>
</body>
</html>`);
});

// SPA fallback
app.get('*', (_req, res) => {
  const index = path.join(clientDist, 'index.html');
  res.sendFile(index, (err) => {
    if (err) res.redirect('/_discover');
  });
});

// ── HTTP + WebSocket server ───────────────────────────────────────────────

const httpServer = createServer(app);

const wss = new WebSocketServer({server: httpServer});

const wsServer = createWsServer(
  wss,
  (pathId) => {
    const safe = pathId.replace(/[^a-zA-Z0-9_-]/g, '-') || 'default';
    const filePath = path.join(DATA_DIR, `${safe}.json`);
    return createFilePersister(createMergeableStore(), filePath);
  },
);

// ── Start ─────────────────────────────────────────────────────────────────

httpServer.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIp();
  const url = `http://${ip}:${PORT}`;

  console.log('');
  console.log('  🚀  Tsundoku server ready');
  console.log(`       Local:   http://localhost:${PORT}`);
  console.log(`       Network: ${url}`);
  console.log(`       Discover & QR: ${url}/_discover`);
  console.log(`       WebSocket:     ws://${ip}:${PORT}`);
  console.log('');
  console.log('  📱  Phone (WiFi): scan the QR at the URL above');
  console.log(`  🔌  Phone (USB/Android): run 'adb reverse tcp:${PORT} tcp:${PORT}'`);
  console.log(`       then open http://localhost:${PORT} in Chrome on your phone`);
  console.log('');
  console.log(`  💾  Data: ${DATA_DIR}`);
  console.log('');

  // Announce via mDNS so the phone can find the server at tsundoku.local
  try {
    const bonjour = new Bonjour();
    bonjour.publish({name: 'Tsundoku', type: 'http', port: PORT});
    console.log('  📡  mDNS: tsundoku.local announced (works on same network)');
  } catch {
    // mDNS is optional; don't crash if unavailable
  }
});

// ── Graceful shutdown ─────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  console.log('\nShutting down…');
  await wsServer.destroy();
  httpServer.close(() => process.exit(0));
});

export {httpServer, wsServer};
