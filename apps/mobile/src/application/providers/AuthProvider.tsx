import React, {createContext, PropsWithChildren, useContext, useMemo, useState} from 'react';
import {fetchCurrentEmployee, loginEmployeeApp} from '../../features/auth/services/authApi';
import {EmployeeProfile} from '../../features/auth/types';

type AuthSession = {
  accessToken: string;
  expiresAt: string;
};

type AuthContextValue = {
  session: AuthSession | null;
  employee: EmployeeProfile | null;
  loading: boolean;
  login: (account: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: PropsWithChildren) {
  // 第一版员工端只保存内存 session：登录 token 来自 Express 自定义接口；暂不做 refresh token、多设备和持久化，避免扩大认证范围。
  const [session, setSession] = useState<AuthSession | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading] = useState<boolean>(false);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    employee,
    loading,
    async login(account, password) {
      const response = await loginEmployeeApp({account, password});
      setSession({accessToken: response.token, expiresAt: response.expiresAt});
      setEmployee(response.employee);
    },
    async logout() {
      setSession(null);
      setEmployee(null);
    },
    async refreshProfile() {
      // 当前没有 profile 查询接口时只能复用已登录返回的 employee；后续新增鉴权接口时在这里替换，不要让页面直接读 token。
      setEmployee(await fetchCurrentEmployee(employee));
    },
  }), [employee, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
