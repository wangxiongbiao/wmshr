import { useState } from "react";
import type { AdminEmailAuthMode } from "./adminAuthTypes";

interface UseAdminEmailAuthFormOptions {
  t: (key: string) => string;
}

export function useAdminEmailAuthForm({ t }: UseAdminEmailAuthFormOptions) {
  const [mode, setMode] = useState<AdminEmailAuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isRegister = mode === "register";
  const emailActionText = isRegister ? t("注册并进入后台") : t("邮箱登录");

  return {
    mode,
    isRegister,
    email,
    password,
    confirmPassword,
    emailActionText,
    setMode,
    setEmail,
    setPassword,
    setConfirmPassword,
  };
}
