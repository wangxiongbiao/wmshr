export const GOOGLE_POPUP_NAME = "wmshr-admin-google-auth";
export const GOOGLE_POPUP_POLL_MS = 500;
export const GOOGLE_POPUP_QUERY_KEY = "auth_popup";
export const GOOGLE_POPUP_QUERY_VALUE = "google";
export const GOOGLE_AUTH_MESSAGE_TYPE = "wmshr-admin-google-auth-result";
export const GOOGLE_AUTH_BROADCAST_CHANNEL = "wmshr-google-auth";
export const GOOGLE_AUTH_STORAGE_EVENT_KEY = "wmshr-google-auth-result";
export const GOOGLE_POPUP_PENDING_STORAGE_KEY = "wmshr-google-auth-popup-pending";
export const GOOGLE_POPUP_AUTH_ORIGIN_STORAGE_KEY = "wmshr-google-auth-origin";
export const GOOGLE_POPUP_LAUNCHING_STORAGE_KEY = "wmshr-google-auth-launching";
export const GOOGLE_POPUP_LOGIN_QUERY_KEY = "popup_login";
export const GOOGLE_AUTH_ORIGIN_QUERY_KEY = "auth_origin";
export const GOOGLE_POPUP_FINALIZE_PATH = "/auth/popup-complete";
export const GOOGLE_POPUP_STATUS_QUERY_KEY = "status";
export const GOOGLE_POPUP_ERROR_QUERY_KEY = "error";
export const GOOGLE_POPUP_TARGET_QUERY_KEY = "target";

export type GoogleAuthPopupMessage =
  | { type: typeof GOOGLE_AUTH_MESSAGE_TYPE; status: "success"; targetUrl?: string }
  | { type: typeof GOOGLE_AUTH_MESSAGE_TYPE; status: "error"; error: string; targetUrl?: string };

export function logGoogleAuth(scope: string, message: string, details?: Record<string, unknown>) {
  const prefix = `[google-auth][${scope}] ${message}`;
  if (details) {
    console.info(prefix, details);
    return;
  }
  console.info(prefix);
}

export function openCenteredPopup(url: string, title: string) {
  const width = 520;
  const height = 720;
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

  return window.open(
    url,
    title,
    `popup=yes,width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)}`
  );
}

export function closePopupWindow(target: Window | null | undefined) {
  if (!target) {
    return;
  }

  try {
    if (target.closed) {
      return;
    }
  } catch {
    // Cross-Origin-Opener-Policy can temporarily block reading `closed`.
  }

  try {
    target.close();
  } catch {
    // The auth result is delivered through same-origin channels; closing is best-effort.
  }
}

export function buildAdminPopupLoginUrl(adminPortalUrl: string, openerOrigin: string) {
  const url = new URL(adminPortalUrl);
  url.searchParams.set(GOOGLE_POPUP_LOGIN_QUERY_KEY, GOOGLE_POPUP_QUERY_VALUE);
  url.searchParams.set(GOOGLE_AUTH_ORIGIN_QUERY_KEY, openerOrigin);
  return url.toString();
}

export function buildGooglePopupCallbackUrl(currentOrigin: string, openerOrigin?: string) {
  const url = new URL(currentOrigin);
  url.searchParams.set(GOOGLE_POPUP_QUERY_KEY, GOOGLE_POPUP_QUERY_VALUE);
  if (openerOrigin) {
    url.searchParams.set(GOOGLE_AUTH_ORIGIN_QUERY_KEY, openerOrigin);
  }
  return url.toString();
}

export function buildPortalPopupFinalizeUrl(params: {
  homePortalUrl: string;
  status: "success" | "error";
  targetUrl: string;
  error?: string;
}) {
  const url = new URL(GOOGLE_POPUP_FINALIZE_PATH, params.homePortalUrl);
  url.searchParams.set(GOOGLE_POPUP_STATUS_QUERY_KEY, params.status);
  url.searchParams.set(GOOGLE_POPUP_TARGET_QUERY_KEY, params.targetUrl);
  if (params.error) {
    url.searchParams.set(GOOGLE_POPUP_ERROR_QUERY_KEY, params.error);
  }
  return url.toString();
}
