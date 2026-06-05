import React from 'react';
import {Text} from 'react-native';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {sharedStyles} from '../../../shared/constants/styles';

export function SettingsScreen() {
  return (
    <ScreenContainer>
      <Text style={sharedStyles.title}>设置</Text>
      <Text style={sharedStyles.muted}>第一阶段先保留设置页骨架，后续接语言、通知和账号安全。</Text>
    </ScreenContainer>
  );
}
