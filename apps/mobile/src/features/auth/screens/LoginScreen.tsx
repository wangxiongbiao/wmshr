import React, {useEffect, useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {AppButton} from '../../../shared/components/AppButton';
import {AppModal} from '../../../shared/components/AppModal';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

const REMEMBERED_CREDENTIALS_KEY = 'wmshr-mobile-remembered-credentials';

type RememberedCredentials = {
  account: string;
  password: string;
};

function getLoginToastMessage(loginError: unknown, t: (key: string) => string) {
  const message = loginError instanceof Error ? loginError.message : '';
  if (message.includes('账号或密码错误')) {
    return t('工号或密码错误，请重新输入');
  }
  if (message.includes('Network') || message.includes('Failed to fetch')) {
    return t('网络异常，请稍后重试');
  }
  if (message.includes('API 地址未配置')) {
    return t('服务暂时不可用，请稍后重试');
  }
  return message ? t('登录失败，请稍后重试') : t('服务暂时不可用，请稍后重试');
}

export function LoginScreen() {
  const { t } = useTranslation('app');
  const {login} = useAuth();
  const {showToast} = useToast();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadRememberedCredentials() {
      const rawCredentials = await SecureStore.getItemAsync(REMEMBERED_CREDENTIALS_KEY).catch(() => null);
      if (!mounted || !rawCredentials) {
        return;
      }

      try {
        const rememberedCredentials = JSON.parse(rawCredentials) as RememberedCredentials;
        if (rememberedCredentials.account && rememberedCredentials.password) {
          // “记住我”按用户确认代表记住工号和密码；凭证只用于登录页回填，不参与自动登录判断。
          setAccount(rememberedCredentials.account);
          setPassword(rememberedCredentials.password);
          setRememberMe(true);
        }
      } catch {
        await SecureStore.deleteItemAsync(REMEMBERED_CREDENTIALS_KEY);
      }
    }

    loadRememberedCredentials();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async () => {
    const nextAccount = account.trim();
    if (!nextAccount) {
      showToast(t('请输入工号'));
      return;
    }
    if (!password) {
      showToast(t('请输入密码'));
      return;
    }

    setSubmitting(true);
    try {
      // 登录动作只把工号密码交给 AuthProvider；AuthProvider 负责持久化登录态，页面只负责“记住我”的凭证回填。
      await login(nextAccount, password);
      if (rememberMe) {
        await SecureStore.setItemAsync(REMEMBERED_CREDENTIALS_KEY, JSON.stringify({account: nextAccount, password}));
      } else {
        await SecureStore.deleteItemAsync(REMEMBERED_CREDENTIALS_KEY);
      }
    } catch (loginError) {
      showToast(getLoginToastMessage(loginError, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={sharedStyles.title}>{t('员工登录')}</Text>
        <Text style={sharedStyles.muted}>{t('请输入工号和密码登录')}</Text>

        <View style={styles.form}>
          <Text style={styles.label}>{t('工号')}</Text>
          <TextInput
            value={account}
            onChangeText={setAccount}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('请输入工号')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Text style={styles.helper}>{t('例如：wms0001')}</Text>

          <Text style={styles.label}>{t('密码')}</Text>
          <View style={styles.passwordField}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              placeholder={t('请输入密码')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.passwordInput]}
            />
            <Pressable
              accessibilityLabel={passwordVisible ? t('隐藏密码') : t('显示密码')}
              // 密码预览只改变本输入框显示状态，不弹窗；是否持久化密码完全由“记住我”控制。
              style={styles.passwordToggle}
              onPress={() => setPasswordVisible((visible) => !visible)}
            >
              <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSubtle} />
            </Pressable>
          </View>

          <View style={styles.formMetaRow}>
            <Pressable style={styles.rememberRow} onPress={() => setRememberMe((remembered) => !remembered)}>
              <Ionicons name={rememberMe ? 'checkbox-outline' : 'square-outline'} size={22} color={colors.primary} />
              <Text style={styles.rememberText}>{t('记住我')}</Text>
            </Pressable>
            <Pressable onPress={() => setForgotPasswordVisible(true)}>
              <Text style={styles.linkText}>{t('忘记密码？')}</Text>
            </Pressable>
          </View>

          <AppButton title={submitting ? t('登录中...') : t('登录')} icon="log-in-outline" onPress={handleLogin} disabled={submitting} />
        </View>
      </View>

      <AppModal
        visible={forgotPasswordVisible}
        title={t('忘记密码')}
        message={t('请联系管理员重置密码。')}
        onRequestClose={() => setForgotPasswordVisible(false)}
        actions={[{label: t('知道了'), onPress: () => setForgotPasswordVisible(false)}]}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center'},
  form: {marginTop: 28, backgroundColor: colors.white, borderRadius: 28, padding: 22, shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: {width: 0, height: 8}, elevation: 3},
  label: {fontSize: 13, fontWeight: '800', color: colors.textSubtle, marginTop: 14, marginBottom: 8},
  input: {height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, fontSize: 16, color: colors.text, backgroundColor: '#f8fafc'},
  helper: {marginTop: 8, fontSize: 12, color: colors.textMuted},
  passwordField: {position: 'relative'},
  passwordInput: {paddingRight: 52},
  passwordToggle: {position: 'absolute', top: 0, right: 0, width: 52, height: 52, alignItems: 'center', justifyContent: 'center'},
  formMetaRow: {marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14},
  rememberRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  rememberText: {fontSize: 14, fontWeight: '800', color: colors.textSubtle},
  linkText: {fontSize: 14, fontWeight: '900', color: colors.primary},
});
