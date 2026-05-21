const { app, BrowserWindow, dialog } = require('electron');
const { ipcMain } = require('electron');
const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const next = require('next');

let mainWindow = null;
let server = null;
let appUrl = null;

function getAppDir() {
  return path.join(__dirname, '..');
}

function getDataDir() {
  if (process.env.DATA_DIR && process.env.DATA_DIR.trim()) {
    return process.env.DATA_DIR.trim();
  }

  return app.isPackaged ? path.join(app.getPath('userData'), 'data') : path.join(getAppDir(), 'data');
}

async function loadEnvFiles() {
  const merged = new Map();
  const fileNames = ['.env', '.ENV', '.env.local'];

  for (const fileName of fileNames) {
    const filePath = path.join(getAppDir(), fileName);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) {
          continue;
        }

        const key = match[1];
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        merged.set(key, value);
      }
    } catch {
      // Ignore missing env files; packaged builds may not ship them.
    }
  }

  for (const [key, value] of merged.entries()) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function createWindow(startUrl) {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1100,
    minWidth: 1280,
    minHeight: 820,
    backgroundColor: '#f8fafc',
    title: 'Gestione Diete',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startNextServer() {
  await loadEnvFiles();
  process.env.DATA_DIR = getDataDir();
  await fs.mkdir(process.env.DATA_DIR, { recursive: true });

  const dev = !app.isPackaged;
  const nextApp = next({ dev, dir: getAppDir() });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  server = http.createServer((req, res) => {
    handle(req, res);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        appUrl = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });

  return appUrl;
}

function resolveDevAppUrl() {
  return process.env.ELECTRON_NEXT_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
}

async function exportPdfFromWindow(payload) {
  if (!appUrl) {
    throw new Error('Next server not ready');
  }

  const fileName = sanitizePdfFileName(payload?.fileName || 'dieta.pdf');
  const selectedPath = await choosePdfDestination(fileName);
  if (!selectedPath) {
    return { ok: false, canceled: true };
  }

  const token = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`;
  const sessionDir = path.join(getDataDir(), 'pdf-sessions');
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(path.join(sessionDir, `${token}.json`), JSON.stringify(payload?.sheet ?? {}), 'utf8');

  const printWindow = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      sandbox: false,
    },
  });

  try {
    await printWindow.loadURL(`${appUrl}/print?token=${encodeURIComponent(token)}`);
    const pdfBuffer = await printWindow.webContents.printToPDF({
      printBackground: true,
      landscape: true,
      pageSize: 'A4',
      marginsType: 1,
      preferCSSPageSize: true,
    });

    await fs.writeFile(selectedPath, pdfBuffer);
    return { ok: true, path: selectedPath };
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.destroy();
    }
  }
}

async function choosePdfDestination(fileName) {
  const result = await dialog.showSaveDialog(mainWindow ?? undefined, {
    title: 'Salva PDF',
    defaultPath: path.join(app.getPath('downloads'), fileName),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return normalizePdfOutputPath(result.filePath);
}

function normalizePdfOutputPath(filePath) {
  const trimmed = String(filePath || '').trim();
  if (!trimmed) {
    return null;
  }

  if (path.extname(trimmed).toLowerCase() === '.pdf') {
    return trimmed;
  }

  return `${trimmed}.pdf`;
}

function sanitizePdfFileName(value) {
  const trimmed = String(value || '').trim();
  const sanitized = trimmed.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!sanitized) {
    return 'dieta.pdf';
  }

  return sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
}

async function boot() {
  const startUrl = app.isPackaged ? await startNextServer() : resolveDevAppUrl();
  appUrl = startUrl;
  createWindow(startUrl);
}

function shutdown() {
  if (server) {
    try {
      server.close();
    } catch (error) {
      console.error('Error closing Next server', error);
    }
    server = null;
  }
}

app.whenReady().then(() => {
  ipcMain.handle('desktop-export-pdf', async (_event, payload) => exportPdfFromWindow(payload));

  void boot().catch((error) => {
    console.error('Failed to start desktop app', error);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && appUrl) {
      createWindow(appUrl);
    }
  });
});

app.on('window-all-closed', () => {
  shutdown();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', shutdown);
