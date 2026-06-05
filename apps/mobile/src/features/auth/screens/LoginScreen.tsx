import React, {useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {useAuth} from '../../../application/providers/AuthProvider';
import {AppButton} from '../../../shared/components/AppButton';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

export function LoginScreen() {
  const {login} = useAuth();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const nextAccount = account.trim();
    if (!nextAccount || !password) {
      setError('请输入 App 账号和密码');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      // 登录动作只把账号密码交给 AuthProvider；页面不直接保存 token，防止后续鉴权扩展时多处维护 session 状态。
      await login(nextAccount, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '员工端登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={sharedStyles.title}>WMSHR 员工端</Text>
        <Text style={sharedStyles.muted}>请输入后台分配的 App 账号和初始密码。</Text>

        <View style={styles.form}>
          <Text style={styles.label}>App 账号</Text>
          <TextInput
            value={account}
            onChangeText={setAccount}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="例如 EMP20260605001"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>密码</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="初始密码 Aa123456"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton title={submitting ? '登录中...' : '登录员工端'} icon="log-in-outline" onPress={handleLogin} disabled={submitting} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center'},
  form: {marginTop: 28, backgroundColor: colors.white, borderRadius: 28, padding: 22, shadowColor: colors.text, shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: {width: 0, height: 8}, elevation: 3},
  label: {fontSize: 13, fontWeight: '800', color: colors.textSubtle, marginTop: 14, marginBottom: 8},
  input: {height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, fontSize: 16, color: colors.text, backgroundColor: '#f8fafc'},
  error: {marginTop: 14, color: '#dc2626', fontWeight: '700'},
});
