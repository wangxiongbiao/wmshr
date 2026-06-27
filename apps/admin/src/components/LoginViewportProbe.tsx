import { useEffect, useState } from "react";

const LOGIN_DEBUG_LOAD_KEY = "wmshr-admin-login-debug-load-count";
const LOGIN_DEBUG_LAST_CAUSE_KEY = "wmshr-admin-dev-last-cause";
const LOGIN_DEBUG_ROUTE_COUNT_KEY = "wmshr-admin-dev-route-normalize-count";
const LOGIN_DEBUG_AUTH_BOOTSTRAP_COUNT_KEY = "wmshr-admin-dev-auth-bootstrap-count";
const LOGIN_DEBUG_LOGS_KEY = "wmshr-admin-login-debug-console-logs";
const LOGIN_DEBUG_LOG_LIMIT = 400;

type LoginDebugLogLevel = "log" | "info" | "warn" | "error" | "debug" | "window-error" | "unhandledrejection";

interface LoginDebugLogEntry {
  timestamp: string;
  level: LoginDebugLogLevel;
  message: string;
}

declare global {
  interface Window {
    __wmshrAdminLoginConsoleCaptureInstalled__?: boolean;
  }
}

function formatLoginDebugValue(value: unknown) {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "undefined") {
    return "undefined";
  }

  try {
    return JSON.stringify(value, (_key, currentValue) => {
      if (currentValue instanceof Error) {
        return {
          name: currentValue.name,
          message: currentValue.message,
          stack: currentValue.stack,
        };
      }

      if (typeof currentValue === "bigint") {
        return `${currentValue.toString()}n`;
      }

      return currentValue;
    }, 2);
  } catch {
    return String(value);
  }
}

function readLoginDebugLogs() {
  if (typeof window === "undefined") {
    return [] as LoginDebugLogEntry[];
  }

  try {
    const rawLogs = window.sessionStorage.getItem(LOGIN_DEBUG_LOGS_KEY);
    if (!rawLogs) {
      return [] as LoginDebugLogEntry[];
    }

    const parsed = JSON.parse(rawLogs) as LoginDebugLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as LoginDebugLogEntry[];
  }
}

function writeLoginDebugLogs(logs: LoginDebugLogEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(LOGIN_DEBUG_LOGS_KEY, JSON.stringify(logs.slice(-LOGIN_DEBUG_LOG_LIMIT)));
  } catch {
    // sessionStorage 不可用时保持静默；诊断日志不能反过来影响登录页本身。
  }
}

function appendLoginDebugLog(level: LoginDebugLogLevel, values: unknown[]) {
  const nextEntry: LoginDebugLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: values.map((value) => formatLoginDebugValue(value)).join(" "),
  };

  writeLoginDebugLogs([...readLoginDebugLogs(), nextEntry]);
}

function installLoginDebugConsoleCapture() {
  if (!import.meta.env.DEV || typeof window === "undefined" || window.__wmshrAdminLoginConsoleCaptureInstalled__) {
    return;
  }

  window.__wmshrAdminLoginConsoleCaptureInstalled__ = true;

  const consoleMethods: Array<keyof Pick<Console, "log" | "info" | "warn" | "error" | "debug">> = ["log", "info", "warn", "error", "debug"];
  for (const methodName of consoleMethods) {
    const originalMethod = window.console[methodName].bind(window.console);
    window.console[methodName] = ((...args: unknown[]) => {
      appendLoginDebugLog(methodName, args);
      originalMethod(...args);
    }) as Console[typeof methodName];
  }

  window.addEventListener("error", (event) => {
    appendLoginDebugLog("window-error", [event.message, event.filename, `line=${event.lineno}`, `column=${event.colno}`, event.error]);
  });

  window.addEventListener("unhandledrejection", (event) => {
    appendLoginDebugLog("unhandledrejection", [event.reason]);
  });

  appendLoginDebugLog("info", ["login-debug-console-capture-installed"]);
}

function getLoginDebugBootSnapshot() {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return null;
  }

  const previousCount = Number(window.sessionStorage.getItem(LOGIN_DEBUG_LOAD_KEY) || "0");
  const loadCount = previousCount + 1;
  window.sessionStorage.setItem(LOGIN_DEBUG_LOAD_KEY, String(loadCount));

  const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const viewport = window.visualViewport;

  return {
    bootId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    loadCount,
    navigationType: navigationEntry?.type || "unknown",
    initialInnerHeight: window.innerHeight,
    initialViewportHeight: viewport ? Math.round(viewport.height) : null,
    initialViewportScale: viewport ? Number(viewport.scale.toFixed(3)) : null,
  };
}

const LOGIN_DEBUG_BOOT = getLoginDebugBootSnapshot();
installLoginDebugConsoleCapture();

export function LoginViewportProbe() {
  const [mountCount, setMountCount] = useState(0);
  const [lastEvent, setLastEvent] = useState("boot");
  const [innerHeight, setInnerHeight] = useState(() => window.innerHeight);
  const [viewportHeight, setViewportHeight] = useState(() => Math.round(window.visualViewport?.height || window.innerHeight));
  const [viewportScale, setViewportScale] = useState(() => Number((window.visualViewport?.scale || 1).toFixed(3)));
  const [lastAppCause, setLastAppCause] = useState(() => window.sessionStorage.getItem(LOGIN_DEBUG_LAST_CAUSE_KEY) || "n/a");
  const [routeNormalizeCount, setRouteNormalizeCount] = useState(() => Number(window.sessionStorage.getItem(LOGIN_DEBUG_ROUTE_COUNT_KEY) || "0"));
  const [authBootstrapCount, setAuthBootstrapCount] = useState(() => Number(window.sessionStorage.getItem(LOGIN_DEBUG_AUTH_BOOTSTRAP_COUNT_KEY) || "0"));
  const [logCount, setLogCount] = useState(() => readLoginDebugLogs().length);

  useEffect(() => {
    setMountCount((value) => value + 1);

    const applyViewportState = (source: string) => {
      setInnerHeight(window.innerHeight);
      setViewportHeight(Math.round(window.visualViewport?.height || window.innerHeight));
      setViewportScale(Number((window.visualViewport?.scale || 1).toFixed(3)));
      setLastEvent(source);
      setLastAppCause(window.sessionStorage.getItem(LOGIN_DEBUG_LAST_CAUSE_KEY) || "n/a");
      setRouteNormalizeCount(Number(window.sessionStorage.getItem(LOGIN_DEBUG_ROUTE_COUNT_KEY) || "0"));
      setAuthBootstrapCount(Number(window.sessionStorage.getItem(LOGIN_DEBUG_AUTH_BOOTSTRAP_COUNT_KEY) || "0"));
      setLogCount(readLoginDebugLogs().length);
    };

    const handleResize = () => applyViewportState("window.resize");
    const handlePageShow = (event: PageTransitionEvent) => applyViewportState(`pageshow persisted=${event.persisted}`);
    const handlePageHide = (event: PageTransitionEvent) => applyViewportState(`pagehide persisted=${event.persisted}`);
    const handleBeforeUnload = () => applyViewportState("beforeunload");
    const handleVisibility = () => applyViewportState(`visibility=${document.visibilityState}`);
    const handleFocusIn = () => applyViewportState(`focus:${(document.activeElement as HTMLElement | null)?.tagName || "unknown"}`);
    const handleViewportResize = () => applyViewportState("visualViewport.resize");
    const handleViewportScroll = () => applyViewportState("visualViewport.scroll");

    window.addEventListener("resize", handleResize);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("focusin", handleFocusIn);
    window.visualViewport?.addEventListener("resize", handleViewportResize);
    window.visualViewport?.addEventListener("scroll", handleViewportScroll);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("focusin", handleFocusIn);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
      window.visualViewport?.removeEventListener("scroll", handleViewportScroll);
    };
  }, []);

  if (!LOGIN_DEBUG_BOOT) {
    return null;
  }

  const handleDownloadLogs = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      href: window.location.href,
      userAgent: window.navigator.userAgent,
      boot: LOGIN_DEBUG_BOOT,
      probe: {
        mountCount,
        lastEvent,
        appCause: lastAppCause,
        routeNormalizeCount,
        authBootstrapCount,
        innerHeight,
        viewportHeight,
        viewportScale,
      },
      logs: readLoginDebugLogs(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wmshr-admin-login-debug-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLastEvent("download-logs");
    setLogCount(readLoginDebugLogs().length);
  };

  return (
    <div className="fixed bottom-3 left-3 z-[120] max-w-[min(92vw,24rem)] rounded-2xl border border-emerald-400/25 bg-slate-950/88 px-3 py-2 text-[11px] leading-5 text-emerald-100 shadow-2xl shadow-black/40 backdrop-blur-md">
      {/* 这块探针只在本地 dev 生效，用来当场区分“真实页面 reload”与“仍在同一份 JS 上下文里、只是视口/焦点变化导致的抖动”。loadCount 只会在整页重新执行 bundle 时增长；mountCount 仍可能受 React StrictMode 的开发期双挂载影响。 */}
      <div className="font-semibold text-emerald-300">DEV 诊断：login lifecycle</div>
      <div>loadCount={LOGIN_DEBUG_BOOT.loadCount} nav={LOGIN_DEBUG_BOOT.navigationType}</div>
      <div>bootId={LOGIN_DEBUG_BOOT.bootId}</div>
      <div>mount={mountCount} last={lastEvent}</div>
      <div>appCause={lastAppCause}</div>
      <div>routeNormalize={routeNormalizeCount} authBootstrap={authBootstrapCount}</div>
      <div>innerHeight={innerHeight} viewportHeight={viewportHeight} scale={viewportScale}</div>
      <div>initialInner={LOGIN_DEBUG_BOOT.initialInnerHeight} initialViewport={LOGIN_DEBUG_BOOT.initialViewportHeight ?? "n/a"}</div>
      <div>consoleLogs={logCount}</div>
      <button
        type="button"
        onClick={handleDownloadLogs}
        className="mt-2 inline-flex items-center rounded-full border border-emerald-300/35 bg-emerald-400/12 px-3 py-1 text-[11px] font-medium text-emerald-100 transition hover:bg-emerald-400/20"
      >
        下载日志
      </button>
    </div>
  );
}
