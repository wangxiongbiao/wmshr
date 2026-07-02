import React, {createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../shared/constants/colors';

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({children}: PropsWithChildren) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((nextMessage: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setMessage(nextMessage);
    timerRef.current = setTimeout(() => setMessage(null), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const value = useMemo(() => ({showToast}), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast 作为全局浮层由 Provider 托管，避免每个页面重复实现计时器和层级样式。 */}
      {message ? <View style={styles.toast}><Text style={styles.toastText}>{message}</Text></View> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return value;
}

const styles = StyleSheet.create({
  toast: {position: 'absolute', top: 54, left: 20, right: 20, zIndex: 20, padding: 14, borderRadius: 16, backgroundColor: colors.success},
  toastText: {color: colors.white, fontWeight: '800', textAlign: 'center'},
});
