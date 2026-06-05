import React from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native';
import {AttendanceStackParamList} from '../../../application/navigationTypes';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {sharedStyles} from '../../../shared/constants/styles';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'AttendanceDetail'>;

export function AttendanceDetailScreen({route}: Props) {
  return (
    <ScreenContainer>
      <Text style={sharedStyles.title}>考勤详情</Text>
      <Text style={sharedStyles.muted}>记录 ID：{route.params.recordId}</Text>
      <Text style={sharedStyles.muted}>第一阶段先保留详情页骨架，后续接真实考勤详情接口。</Text>
    </ScreenContainer>
  );
}
