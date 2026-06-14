import {env} from '../config/env';

type DebugLevel = 'info' | 'warn' | 'error' | 'fatal';

type DebugEntry = {
  sessionId: string;
  level: DebugLevel;
  message: string;
  details?: string;
  timestamp: string;
  appVersion: string;
};

declare global {
  var __WMSHR_MOBILE_DEBUG_LOGGER_INSTALLED__: boolean | undefined;
  var __WMSHR_MOBILE_DEBUG_SESSION_ID__: string | undefined;
}

type ErrorUtilsLike = {
  getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

const LOCAL_APP_VERSION = String((require('../../../../app.json') as {expo?: {version?: string}}).expo?.version || '').trim() || 'unknown';
const sessionId = globalThis.__WMSHR_MOBILE_DEBUG_SESSION_ID__
  || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

globalThis.__WMSHR_MOBILE_DEBUG_SESSION_ID__ = sessionId;

const pendingQueue: DebugEntry[] = [];
let flushing = false;

function stringifyDetails(details: unknown) {
  if (details == null) {
    return '';
  }
  if (typeof details === 'string') {
    return details;
  }
  if (details instanceof Error) {
    return `${details.name}: ${details.message}\n${details.stack || ''}`.trim();
  }

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

async function flushQueue() {
  if (flushing || pendingQueue.length === 0) {
    return;
  }

  flushing = true;
  try {
    while (pendingQueue.length > 0) {
      const next = pendingQueue[0];
      try {
        await fetch(`${env.apiBaseUrl.replace(/\/$/, '')}/api/public/mobile-debug-log`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(next),
        });
        pendingQueue.shift();
      } catch {
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

function enqueue(level: DebugLevel, message: string, details?: unknown) {
  pendingQueue.push({
    sessionId,
    level,
    message,
    details: stringifyDetails(details) || undefined,
    timestamp: new Date().toISOString(),
    appVersion: LOCAL_APP_VERSION,
  });

  if (pendingQueue.length > 80) {
    pendingQueue.splice(0, pendingQueue.length - 80);
  }

  void flushQueue();
}

export function mobileDebugLog(message: string, details?: unknown) {
  enqueue('info', message, details);
}

export function installMobileDebugLogger() {
  if (globalThis.__WMSHR_MOBILE_DEBUG_LOGGER_INSTALLED__) {
    return;
  }

  globalThis.__WMSHR_MOBILE_DEBUG_LOGGER_INSTALLED__ = true;
  enqueue('info', 'logger_installed', {
    apiBaseUrl: env.apiBaseUrl,
    appEnv: env.appEnv,
  });

  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  console.warn = (...args: unknown[]) => {
    enqueue('warn', 'console.warn', args);
    originalWarn(...args);
  };

  console.error = (...args: unknown[]) => {
    enqueue('error', 'console.error', args);
    originalError(...args);
  };

  const errorUtils = (globalThis as typeof globalThis & {ErrorUtils?: ErrorUtilsLike}).ErrorUtils;
  const previousGlobalHandler = errorUtils?.getGlobalHandler?.();
  errorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
    enqueue(isFatal ? 'fatal' : 'error', 'global_js_error', {
      isFatal: Boolean(isFatal),
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
    previousGlobalHandler?.(error, isFatal);
  });
}
