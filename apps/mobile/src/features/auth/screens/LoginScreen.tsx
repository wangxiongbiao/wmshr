import React from 'react';
import {Text, View} from 'react-native';
import {useAuth} from '../../../application/providers/AuthProvider';
import {AppButton} from '../../../shared/components/AppButton';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {sharedStyles} from '../../../shared/constants/styles';

export function LoginScreen() {
  const {login} = useAuth();

  return (
    <ScreenContainer>
      <View style={sharedStyles.centerBlock}>
        <Text style={sharedStyles.title}>WMSHR 员工端</Text>
        <Text style={sharedStyles.muted}>第一阶段保留 mock 登录入口，后续替换为真实员工认证。</Text>
        <AppButton title="进入演示员工端" icon="log-in-outline" onPress={login} />
      </View>
    </ScreenContainer>
  );
}
