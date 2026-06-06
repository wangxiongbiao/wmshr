import React, {createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import * as SecureStore from 'expo-secure-store';
import i18next from 'i18next';
import {fetchCurrentEmployee, loginEmployeeApp} from '../../features/auth/services/authApi';
import {EmployeeProfile} from '../../features/auth/types';

type AuthSession = {
  accessToken: string;
  expiresAt: string;
};

type PersistedAuthState = {
  session: AuthSession;
  employee: EmployeeProfile;
};

type AuthContextValue = {
  session: AuthSession | null;
  employee: EmployeeProfile | null;
  loading: boolean;
  login: (account: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AUTH_STATE_KEY = 'wmshr-mobile-auth-state';
const AuthContext = createContext<AuthContextValue | null>(null);

function isSessionValid(session: AuthSession) {
  return new Date(session.expiresAt).getTime() > Date.now();
}

export function AuthProvider({children}: PropsWithChildren) {
  // 登录态现在持久化在 SecureStore：用于 App 重启后恢复 session；密码仍由登录页“记住我”单独管理，避免退出清理和账号回填互相影响。
  const [session, setSession] = useState<AuthSession | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function restoreAuthState() {
      const rawState = await SecureStore.getItemAsync(AUTH_STATE_KEY).catch(() => null);
      if (!mounted) {
        return;
      }

      if (!rawState) {
        setLoading(false);
        return;
      }

      try {
        const persistedState = JSON.parse(rawState) as PersistedAuthState;
        if (persistedState.session && persistedState.employee && isSessionValid(persistedState.session)) {
          setSession(persistedState.session);
          setEmployee(persistedState.employee);
        } else {
          // 过期 token 不恢复，避免用户看到已登录界面后接口立即失败；后续若有 refresh token，应在这里接入刷新流程。
          await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
        }
      } catch {
        await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    restoreAuthState();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (account: string, password: string) => {
    const response = await loginEmployeeApp({account, password});
    const nextSession = {accessToken: response.token, expiresAt: response.expiresAt};
    setSession(nextSession);
    setEmployee(response.employee);
    // 登录成功后同步写入本地安全存储，实现 App 重启后的本地持久化登录；不要在页面层重复写 token。
    await SecureStore.setItemAsync(AUTH_STATE_KEY, JSON.stringify({session: nextSession, employee: response.employee}));
  }, []);

  const logout = useCallback(async () => {
    setSession(null);
    setEmployee(null);
    // 退出登录只清除登录态，不清除“记住我”的账号密码；用户明确取消记住我时由登录页清理凭证。
    await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) {
      // AuthProvider 不在具体页面内，不能依赖 useTranslation；直接使用已初始化的 i18next 单例，保证 service/context 抛错也跟随当前 App 语言。
      throw new Error(i18next.t('请先登录员工账号', {ns: 'app'}));
    }
    // 当前员工资料必须通过 /api/mobile/auth/me 复查账号状态；不要继续复用登录时快照，避免后台禁用后移动端仍显示有效。
    setEmployee(await fetchCurrentEmployee(session.accessToken));
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    employee,
    loading,
    login,
    logout,
    refreshProfile,
  }), [employee, loading, login, logout, refreshProfile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
