import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { AdminEmailAuthPayload } from "./adminAuthTypes";
import {
  buildGooglePopupCallbackUrl,
  closePopupWindow,
  GOOGLE_AUTH_MESSAGE_TYPE,
  GOOGLE_POPUP_NAME,
  GOOGLE_POPUP_POLL_MS,
  logGoogleAuth,
  openCenteredPopup,
  type GoogleAuthPopupMessage,
} from "../../../../packages/shared/src/google-auth";

const ADMIN_DEV_LAST_CAUSE_KEY = "wmshr-admin-dev-last-cause";
const ADMIN_DEV_AUTH_BOOTSTRAP_COUNT_KEY = "wmshr-admin-dev-auth-bootstrap-count";

function getOAuthErrorFromCurrentUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return searchParams.get("error_description")
    ?? hashParams.get("error_description")
    ?? searchParams.get("error")
    ?? hashParams.get("error")
    ?? "";
}

function writeAdminDevCause(cause: string) {
  if (!import.meta.env.DEV) {
    return;
  }

  try {
    window.sessionStorage.setItem(ADMIN_DEV_LAST_CAUSE_KEY, cause);
  } catch {
    // 调试探针写失败不影响真实登录流程；本地缺少这份辅助信息时最多回退为肉眼观察。
  }
}

function bumpAdminDevCounter(storageKey: string) {
  if (!import.meta.env.DEV) {
    return;
  }

  try {
    const next = Number(window.sessionStorage.getItem(storageKey) || "0") + 1;
    window.sessionStorage.setItem(storageKey, String(next));
  } catch {
    // sessionStorage 不可用时保持静默；不要让排查辅助逻辑反过来制造登录问题。
  }
}

interface UseAdminAuthOptions {
  canonicalPath: string;
  isGooglePopupCallback: boolean;
  tAdmin: (key: string) => string;
}

interface UseAdminAuthResult {
  session: Session | null;
  authLoading: boolean;
  googleSigningIn: boolean;
  emailAuthLoading: boolean;
  authError: string;
  setAuthError: (value: string) => void;
  handleEmailAuth: (payload: AdminEmailAuthPayload) => Promise<void>;
  handleGoogleLogin: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

export function useAdminAuth({ canonicalPath, isGooglePopupCallback, tAdmin }: UseAdminAuthOptions): UseAdminAuthResult {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [emailAuthLoading, setEmailAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const popupPollTimerRef = useRef<number | null>(null);
  const popupWindowRef = useRef<Window | null>(null);
  const popupResolvedRef = useRef(false);

  const clearPopupPollTimer = () => {
    if (popupPollTimerRef.current !== null) {
      window.clearInterval(popupPollTimerRef.current);
      popupPollTimerRef.current = null;
    }
  };

  const clearPopupWindow = () => {
    closePopupWindow(popupWindowRef.current);
    popupWindowRef.current = null;
  };

  const closeCurrentPopupWindow = () => {
    window.open("", "_self");
    window.close();
  };

  const postPopupResultToOpener = (message: GoogleAuthPopupMessage) => {
    if (!window.opener) {
      return;
    }

    window.opener.postMessage(message, window.location.origin);
  };

  useEffect(() => {
    let mounted = true;

    bumpAdminDevCounter(ADMIN_DEV_AUTH_BOOTSTRAP_COUNT_KEY);
    writeAdminDevCause(`auth-bootstrap:${window.location.pathname}`);

    logGoogleAuth("admin", "Bootstrapping admin auth state", {
      href: window.location.href,
      isGooglePopupCallback,
      hasOpener: Boolean(window.opener),
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) {
        return;
      }

      logGoogleAuth("admin", "getSession resolved", {
        hasSession: Boolean(data.session),
        isGooglePopupCallback,
        error: error?.message,
      });

      if (isGooglePopupCallback) {
        if (data.session) {
          logGoogleAuth("admin", "Popup callback has session, notifying opener");
          postPopupResultToOpener({ type: GOOGLE_AUTH_MESSAGE_TYPE, status: "success" });
          closeCurrentPopupWindow();
          return;
        }

        const popupError = getOAuthErrorFromCurrentUrl();
        if (error || popupError) {
          const message = error?.message || popupError || tAdmin("Google 登录失败");
          logGoogleAuth("admin", "Popup callback contains oauth error", { error: message });
          postPopupResultToOpener({
            type: GOOGLE_AUTH_MESSAGE_TYPE,
            status: "error",
            error: message,
          });
          closeCurrentPopupWindow();
          return;
        }

        logGoogleAuth("admin", "Popup callback has no session yet, waiting for auth state change");
        writeAdminDevCause("auth-popup-waiting-state-change");
        setAuthLoading(false);
        return;
      }

      if (error) {
        logGoogleAuth("admin", "getSession returned error", { error: error.message });
        setAuthError(error.message);
        writeAdminDevCause(`auth-getSession-error:${error.message}`);
      }

      writeAdminDevCause(data.session ? "auth-getSession-session" : "auth-getSession-no-session");
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      logGoogleAuth("admin", "onAuthStateChange fired", {
        event,
        hasSession: Boolean(nextSession),
        isGooglePopupCallback,
      });

      if (isGooglePopupCallback && nextSession) {
        logGoogleAuth("admin", "Popup callback received session from auth state change");
        writeAdminDevCause("auth-state-popup-success");
        postPopupResultToOpener({ type: GOOGLE_AUTH_MESSAGE_TYPE, status: "success" });
        closeCurrentPopupWindow();
        return;
      }

      if (isGooglePopupCallback) {
        return;
      }

      if (nextSession?.access_token) {
        writeAdminDevCause("auth-state-session");
        popupResolvedRef.current = true;
        clearPopupPollTimer();
        clearPopupWindow();
      } else {
        writeAdminDevCause("auth-state-no-session");
      }

      setSession(nextSession);
      setAuthError("");
      setGoogleSigningIn(false);
      setEmailAuthLoading(false);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      clearPopupPollTimer();
      clearPopupWindow();
      listener.subscription.unsubscribe();
    };
  }, [isGooglePopupCallback, tAdmin]);

  useEffect(() => {
    if (isGooglePopupCallback) {
      return;
    }

    const handleMessage = (event: MessageEvent<GoogleAuthPopupMessage>) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type !== GOOGLE_AUTH_MESSAGE_TYPE) {
        return;
      }

      popupResolvedRef.current = true;
      clearPopupPollTimer();

      if (event.data.status === "success") {
        clearPopupWindow();
        void supabase.auth.getSession().then(({ data, error }) => {
          if (error) {
            setGoogleSigningIn(false);
            setAuthError(error.message);
            return;
          }

          setSession(data.session);
          setAuthError("");
          setGoogleSigningIn(false);
          setEmailAuthLoading(false);
        });
        return;
      }

      clearPopupWindow();
      setGoogleSigningIn(false);
      setAuthError(event.data.error || tAdmin("Google 登录失败，请重试。"));
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [isGooglePopupCallback, tAdmin]);

  const handleEmailAuth = async (payload: AdminEmailAuthPayload) => {
    const email = payload.email.trim().toLowerCase();
    const password = payload.password;
    const confirmPassword = payload.confirmPassword;

    setAuthError("");

    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      setAuthError(tAdmin("请输入正确的邮箱"));
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      setAuthError(tAdmin("密码至少 8 位，并且需要同时包含字母和数字"));
      return;
    }

    if (payload.mode === "register" && password !== confirmPassword) {
      setAuthError(tAdmin("两次输入的密码不一致"));
      return;
    }

    setEmailAuthLoading(true);
    try {
      const result = payload.mode === "register"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              // 注册邮件回跳必须指回当前 admin 规范路由；不要把邮箱验证后的落点留给裸根路径再二次路由补正。
              emailRedirectTo: window.location.origin + canonicalPath,
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        throw result.error;
      }

      if (result.data.session) {
        setSession(result.data.session);
        setAuthError("");
        return;
      }

      if (payload.mode === "register") {
        setAuthError(tAdmin("注册成功，请先到邮箱完成验证后再登录。"));
        return;
      }

      setAuthError(tAdmin("登录成功但未获取到会话，请刷新后重试。"));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : tAdmin("邮箱认证失败，请重试。"));
    } finally {
      setEmailAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleSigningIn(true);
    setAuthError("");

    popupResolvedRef.current = false;
    clearPopupPollTimer();

    const redirectTo = buildGooglePopupCallbackUrl(window.location.origin);
    logGoogleAuth("admin", "Starting same-origin Google popup login", { redirectTo });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      setGoogleSigningIn(false);
      setAuthError(error.message);
      return;
    }

    if (!data?.url) {
      setGoogleSigningIn(false);
      setAuthError(tAdmin("未获取到 Google 登录地址，请稍后重试。"));
      return;
    }

    const popup = openCenteredPopup(data.url, GOOGLE_POPUP_NAME);
    if (!popup) {
      setGoogleSigningIn(false);
      setAuthError(tAdmin("浏览器拦截了登录弹窗，请允许弹窗后重试。"));
      return;
    }

    popupWindowRef.current = popup;
    popup.focus();

    popupPollTimerRef.current = window.setInterval(() => {
      let popupClosed = false;
      try {
        popupClosed = popup.closed;
      } catch {
        // OAuth 中转页可能因为 COOP 暂时阻止读取 closed；这里只等下一轮轮询，不把它误判为登录失败。
        return;
      }

      if (!popupClosed) {
        return;
      }

      clearPopupPollTimer();
      popupWindowRef.current = null;
      if (!popupResolvedRef.current) {
        setGoogleSigningIn(false);
        setAuthError(tAdmin("你已关闭 Google 登录弹窗，请重试。"));
      }
    }, GOOGLE_POPUP_POLL_MS);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setGoogleSigningIn(false);
    setEmailAuthLoading(false);
  };

  return {
    session,
    authLoading,
    googleSigningIn,
    emailAuthLoading,
    authError,
    setAuthError,
    handleEmailAuth,
    handleGoogleLogin,
    handleSignOut,
  };
}
