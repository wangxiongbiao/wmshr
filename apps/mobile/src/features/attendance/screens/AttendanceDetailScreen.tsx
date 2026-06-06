import React from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Text} from 'react-native';
import {useTranslation} from 'react-i18next';
import {AttendanceStackParamList} from '../../../application/navigationTypes';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {sharedStyles} from '../../../shared/constants/styles';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'AttendanceDetail'>;

export function AttendanceDetailScreen({route}: Props) {
  const { t } = useTranslation('app');

  return (
    <ScreenContainer>
      <Text style={sharedStyles.title}>{t('考勤详情')}</Text>
      <Text style={sharedStyles.muted}>{t('记录 ID：{{id}}', { id: route.params.recordId })}</Text>
      <Text style={sharedStyles.muted}>{t('第一阶段先保留详情页骨架，后续接真实考勤详情接口。')}</Text>
    </ScreenContainer>
  );
}
