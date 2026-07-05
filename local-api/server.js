import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || '3000');
const API_TOKEN = process.env.API_AUTH_TOKEN;
const PHAR_PATH = resolve(__dirname, process.env.MINECRAFT_PHAR_PATH || '../mcserver/PocketMine-MP.phar');
const WORK_DIR = resolve(__dirname, process.env.MINECRAFT_WORK_DIR || '../mcserver');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PUSH_INTERVAL = (parseInt(process.env.PUSH_INTERVAL_SECONDS || '15')) * 1000;
const LIST_INTERVAL = 30000;
const MAX_LOGS = 500;

// ── State ────────────────────────────────────────────────
let serverProcess = null;
let logs = [];
let lastListResponse = 0;

// ── Supabase client (only if credentials provided) ───────
let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ── Helpers ──────────────────────────────────────────────

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || header !== `Bearer ${API_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function addLog(text) {
  logs.push({ timestamp: new Date().toISOString(), text });
  if (logs.length > MAX_LOGS) logs = logs.slice(-MAX_LOGS);
}

function getPlayerCount() {
  for (let i = logs.length - 1; i >= 0; i--) {
    const m = logs[i].text.match(/There are (\d+)\/(\d+) players online/);
    if (m) return { online: parseInt(m[1]), max: parseInt(m[2]) };
  }
  return null;
}

function ensureWorkDir() {
  if (!existsSync(WORK_DIR)) {
    mkdirSync(WORK_DIR, { recursive: true });
  }
}

// ── Server lifecycle ─────────────────────────────────────

function startServer() {
  if (serverProcess) return { success: false, message: 'Server already running' };

  ensureWorkDir();

  if (!existsSync(PHAR_PATH)) {
    return { success: false, message: `PocketMine-MP.phar not found at ${PHAR_PATH}` };
  }

  const child = spawn('php', [PHAR_PATH], {
    cwd: WORK_DIR,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      addLog(line);
      if (line.includes('players online')) {
        lastListResponse = Date.now();
      }
    }
  });

  child.stderr.on('data', (data) => {
    for (const line of data.toString().split('\n').filter(l => l.trim())) {
      addLog('[STDERR] ' + line);
    }
  });

  child.on('exit', (code, signal) => {
    addLog(`Server process exited (code=${code}, signal=${signal})`);
    serverProcess = null;
  });

  child.on('error', (err) => {
    addLog(`Failed to start server: ${err.message}`);
    serverProcess = null;
  });

  serverProcess = child;
  addLog('Server starting...');
  return { success: true, message: 'Server starting' };
}

function stopServer() {
  if (!serverProcess) return { success: false, message: 'Server not running' };

  addLog('Shutting down server...');
  serverProcess.stdin.write('stop\n');

  let forceKillTimer = setTimeout(() => {
    if (serverProcess) {
      addLog('Force killing server (SIGTERM)...');
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (serverProcess) {
          addLog('Force killing server (SIGKILL)...');
          serverProcess.kill('SIGKILL');
          serverProcess = null;
        }
      }, 5000);
    }
  }, 15000);

  serverProcess.on('exit', () => {
    clearTimeout(forceKillTimer);
    serverProcess = null;
  });

  return { success: true, message: 'Server stopping' };
}

function restartServer() {
  const stop = stopServer();
  if (!stop.success && stop.message !== 'Server not running') return stop;

  setTimeout(() => {
    startServer();
  }, 2000);

  return { success: true, message: 'Server restarting' };
}

function getStatus() {
  const pc = getPlayerCount();
  return {
    running: serverProcess !== null,
    playerCount: pc ? pc.online : 0,
    maxPlayers: pc ? pc.max : 0,
    logCount: logs.length,
  };
}

// ── Periodic: send "list" to server ─────────────────────
setInterval(() => {
  if (serverProcess) {
    serverProcess.stdin.write('list\n');
  }
}, LIST_INTERVAL);

// ── Periodic: push status to Supabase ───────────────────
setInterval(async () => {
  if (!supabase || !API_TOKEN) return;

  const status = getStatus();
  const recentLogs = logs.slice(-20).map(l => l.text).join('\n');

  const { error } = await supabase
    .from('server_status')
    .update({
      status: status.running ? 'on' : 'off',
      player_count: status.playerCount,
      recent_logs: recentLogs,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) {
    console.error('Supabase push error:', error.message);
  }
}, PUSH_INTERVAL);

// ── Express routes ───────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.get('/status', auth, (req, res) => {
  res.json(getStatus());
});

app.get('/logs', auth, (req, res) => {
  const count = Math.min(parseInt(req.query.count) || 50, MAX_LOGS);
  res.json({ logs: logs.slice(-count) });
});

app.post('/start', auth, (req, res) => {
  const result = startServer();
  res.status(result.success ? 200 : 409).json(result);
});

app.post('/stop', auth, (req, res) => {
  res.json(stopServer());
});

app.post('/restart', auth, (req, res) => {
  res.json(restartServer());
});

// ── Start ────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`MC Bedrock Local API running on port ${PORT}`);
  console.log(`Minecraft phar: ${PHAR_PATH}`);
  console.log(`Work dir: ${WORK_DIR}`);
  if (supabase) console.log('Supabase push enabled');
});
