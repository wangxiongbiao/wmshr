const {app, BrowserWindow, Menu, ipcMain, net, protocol, shell} = require('electron');
const path = require('path');
const {pathToFileURL} = require('url');
const runtimeConfig = require('./runtime-config.json');

const APP_HOST = 'app';
const WEB_ROOT = path.join(__dirname, '..', 'apps', 'mobile', 'dist-web');

function getWindowTitle() {
  if (runtimeConfig.appEnv === 'production') {
    return 'WMSHR App (Online)';
  }

  return 'WMSHR App (Local)';
}

function resolveWebAsset(requestUrl) {
  const url = new URL(requestUrl);
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.normalize(path.join(WEB_ROOT, pathname));

  if (!filePath.startsWith(WEB_ROOT)) {
    return null;
  }

  return filePath;
}

function registerStaticProtocol() {
  protocol.handle('wmshr', (request) => {
    const url = new URL(request.url);

    if (url.hostname !== APP_HOST) {
      return new Response('Not found', {status: 404});
    }

    const filePath = resolveWebAsset(request.url);

    if (!filePath) {
      return new Response('Not found', {status: 404});
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

async function proxyApiRequest(_event, request) {
  const response = await net.fetch(request.url, {
    method: request.method || 'GET',
    headers: request.headers || {},
    body: request.body ?? undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    contentType,
    text,
  };
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 430,
    height: 860,
    minWidth: 390,
    minHeight: 700,
    title: getWindowTitle(),
    backgroundColor: '#f8fafc',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[electron] did-fail-load', {errorCode, errorDescription, validatedURL});
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log('[renderer]', {level, message, line, sourceId});
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[electron] render-process-gone', details);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[electron] did-finish-load', mainWindow.webContents.getURL());
  });

  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    shell.openExternal(url);
    return {action: 'deny'};
  });

  mainWindow.loadURL('wmshr://app/');
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'wmshr',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerStaticProtocol();
  ipcMain.handle('wmshr:api-request', proxyApiRequest);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  ipcMain.removeHandler('wmshr:api-request');
});
