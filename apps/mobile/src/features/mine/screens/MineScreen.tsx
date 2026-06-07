import React, {useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {MineStackParamList} from '../../../application/navigationTypes';
import {AppButton} from '../../../shared/components/AppButton';
import {AppModal} from '../../../shared/components/AppModal';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

type Props = NativeStackScreenProps<MineStackParamList, 'MineHome'>;

export function MineScreen({navigation}: Props) {
  const { t } = useTranslation('app');
  const {employee, logout} = useAuth();
  const {showToast} = useToast();
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const handleConfirmLogout = async () => {
    setLogoutConfirmVisible(false);
    // 退出只调用 AuthProvider 清理登录态；导航层会因 session 变为 null 自动回到登录页，不在页面里手动跳转避免双重导航。
    await logout();
    showToast(t('已退出登录'));
  };

  return (
    <ScreenContainer>
      <View style={sharedStyles.screenTitle}>
        <Text style={sharedStyles.title}>{t('我的')}</Text>
        <Text style={sharedStyles.muted}>{employee?.name ?? t('员工')}</Text>
      </View>
      <View style={sharedStyles.profileCard}>
        <View style={sharedStyles.avatar}><Text style={sharedStyles.avatarText}>{employee?.name?.[0] ?? 'E'}</Text></View>
        <Text style={sharedStyles.profileName}>{employee?.name ?? t('员工')}</Text>
        <Text style={sharedStyles.muted}>{employee?.role ?? '--'} · {employee?.dept ?? '--'} · {employee?.country ?? '--'}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={sharedStyles.cardTitle}>{t('当前可用操作')}</Text>
        <Text style={sharedStyles.muted}>{t('你可以在这里查看个人信息、切换语言，或在离开设备前安全退出登录。')}</Text>
      </View>

      <Pressable style={sharedStyles.listCard} onPress={() => navigation.navigate('Settings')}>
        <Ionicons name="settings-outline" size={24} color={colors.primary} />
        <View style={sharedStyles.flexOne}>
          <Text style={sharedStyles.cardTitle}>{t('设置')}</Text>
          <Text style={sharedStyles.muted}>{t('当前仅开放语言切换，其余通知和账号安全入口暂未开放。')}</Text>
        </View>
      </Pressable>
      <AppButton title={t('退出登录')} icon="log-out-outline" onPress={() => setLogoutConfirmVisible(true)} variant="secondary" />

      <AppModal
        visible={logoutConfirmVisible}
        title={t('确认退出登录？')}
        message={t('退出后需要重新登录才能继续使用。')}
        onRequestClose={() => setLogoutConfirmVisible(false)}
        actions={[
          {label: t('取消'), variant: 'secondary', onPress: () => setLogoutConfirmVisible(false)},
          {label: t('退出登录'), variant: 'danger', onPress: handleConfirmLogout},
        ]}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryCard: {backgroundColor: '#eff6ff', borderRadius: 22, padding: 16, marginBottom: 12},
});
