export const GOOGLE_POPUP_NAME = "wmshr-admin-google-auth";
export const GOOGLE_POPUP_POLL_MS = 500;
export const GOOGLE_POPUP_QUERY_KEY = "auth_popup";
export const GOOGLE_POPUP_QUERY_VALUE = "google";
export const GOOGLE_AUTH_MESSAGE_TYPE = "wmshr-admin-google-auth-result";
export const GOOGLE_AUTH_BROADCAST_CHANNEL = "wmshr-google-auth";
export const GOOGLE_AUTH_STORAGE_EVENT_KEY = "wmshr-google-auth-result";

export interface GoogleAuthPopupMessage {
  type: typeof GOOGLE_AUTH_MESSAGE_TYPE;
  status: "success" | "error";
  user?: {
    email: string;
    name: string;
    avatarUrl?: string;
  };
  error?: string;
  accessToken?: string;
  attemptId?: string;
}

export function createGoogleAuthAttemptId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, "0")).join("");
}

export function openCenteredPopup(url: string, title = GOOGLE_POPUP_NAME): Window | null {
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
  if (!target) return;
  try {
    if (target.closed) return;
  } catch {}
  try {
    target.close();
  } catch {}
}

export function buildGooglePopupCallbackUrl(currentOrigin: string, attemptId: string, intent: "login" | "register" | "login_or_register") {
  const url = new URL(currentOrigin);
  url.searchParams.set(GOOGLE_POPUP_QUERY_KEY, GOOGLE_POPUP_QUERY_VALUE);
  url.searchParams.set("attempt", attemptId);
  url.searchParams.set("intent", intent);
  return url.toString();
}

export function publishGoogleAuthResult(message: GoogleAuthPopupMessage) {
  try { if (window.opener) window.opener.postMessage(message, window.location.origin); } catch {}
  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(GOOGLE_AUTH_BROADCAST_CHANNEL);
      channel.postMessage(message);
      channel.close();
    }
  } catch {}
  try {
    localStorage.setItem(GOOGLE_AUTH_STORAGE_EVENT_KEY, JSON.stringify({ ...message, publishedAt: Date.now() }));
    localStorage.removeItem(GOOGLE_AUTH_STORAGE_EVENT_KEY);
  } catch {}
}

export function isGooglePopupCallback(): boolean {
  if (typeof window === "undefined") return false;
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(GOOGLE_POPUP_QUERY_KEY) === GOOGLE_POPUP_QUERY_VALUE;
}

export function parseOAuthHash(hash: string) {
  const cleanHash = hash.replace(/^#/, "");
  const params = new URLSearchParams(cleanHash);
  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    expiresIn: params.get("expires_in"),
    tokenType: params.get("token_type"),
    flowType: params.get("type"),
    error: params.get("error_description") || params.get("error")
  };
}
