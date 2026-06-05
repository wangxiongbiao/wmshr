import React from 'react';
import {Ionicons} from '@expo/vector-icons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, Text, View} from 'react-native';
import {useAuth} from '../../../application/providers/AuthProvider';
import {MineStackParamList} from '../../../application/navigationTypes';
import {AppButton} from '../../../shared/components/AppButton';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {sharedStyles} from '../../../shared/constants/styles';

type Props = NativeStackScreenProps<MineStackParamList, 'MineHome'>;

export function MineScreen({navigation}: Props) {
  const {employee, logout} = useAuth();

  return (
    <ScreenContainer>
      <View style={sharedStyles.screenTitle}>
        <Text style={sharedStyles.title}>我的</Text>
        <Text style={sharedStyles.muted}>{employee?.name ?? '员工'}</Text>
      </View>
      <View style={sharedStyles.profileCard}>
        <View style={sharedStyles.avatar}><Text style={sharedStyles.avatarText}>{employee?.name?.[0] ?? 'E'}</Text></View>
        <Text style={sharedStyles.profileName}>{employee?.name ?? '员工'}</Text>
        <Text style={sharedStyles.muted}>{employee?.role ?? '--'} · {employee?.dept ?? '--'} · {employee?.country ?? '--'}</Text>
      </View>
      <Pressable style={sharedStyles.listCard} onPress={() => navigation.navigate('Settings')}>
        <Ionicons name="settings-outline" size={24} color={colors.primary} />
        <View style={sharedStyles.flexOne}>
          <Text style={sharedStyles.cardTitle}>设置</Text>
          <Text style={sharedStyles.muted}>语言、通知和账号安全</Text>
        </View>
      </Pressable>
      <AppButton title="退出登录" icon="log-out-outline" onPress={logout} variant="secondary" />
    </ScreenContainer>
  );
}
