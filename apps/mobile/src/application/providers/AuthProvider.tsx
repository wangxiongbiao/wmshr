import React, {createContext, PropsWithChildren, useContext, useEffect, useMemo, useState} from 'react';
import {fetchCurrentEmployee} from '../../features/auth/services/authApi';
import {EmployeeProfile} from '../../features/auth/types';

type AuthSession = {
  accessToken: string;
};

type AuthContextValue = {
  session: AuthSession | null;
  employee: EmployeeProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: PropsWithChildren) {
  // 第一阶段保留 mock session，让拆分后的业务页面能直接进入主流程；后续接真实登录时只替换 Provider 内部实现。
  const [session, setSession] = useState<AuthSession | null>({accessToken: 'mock-mobile-session'});
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 第一阶段仍自动进入 mock 员工态，但员工资料只从 authApi 读取，避免 Provider 与 service 各维护一份演示数据。
    void fetchCurrentEmployee().then(nextEmployee => {
      if (!mounted) return;
      setEmployee(nextEmployee);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    employee,
    loading,
    async login() {
      setSession({accessToken: 'mock-mobile-session'});
      setEmployee(await fetchCurrentEmployee());
    },
    async logout() {
      setSession(null);
      setEmployee(null);
    },
    async refreshProfile() {
      setEmployee(await fetchCurrentEmployee());
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
