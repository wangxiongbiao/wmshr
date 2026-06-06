import React, {useEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {AttendanceStackParamList} from '../../../application/navigationTypes';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchAttendanceRecords} from '../services/attendanceApi';
import {AttendanceRecord} from '../types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {sharedStyles} from '../../../shared/constants/styles';

 type Props = NativeStackScreenProps<AttendanceStackParamList, 'AttendanceList'>;

export function AttendanceListScreen({navigation}: Props) {
  const { t } = useTranslation('app');
  const {session} = useAuth();
  const {showToast} = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    // 考勤记录列表只读取当前员工 token 下的数据；后端会按 req.employeeApp.employeeId 过滤，前端不传员工 ID。
    void fetchAttendanceRecords(session.accessToken).then(setRecords).catch(error => showToast(error.message));
  }, [session?.accessToken, showToast]);

  return (
    <ScreenContainer>
      <View style={sharedStyles.screenTitle}>
        <Text style={sharedStyles.title}>{t('考勤记录')}</Text>
        <Text style={sharedStyles.muted}>{t('最近 31 天打卡明细')}</Text>
      </View>
      {records.map(item => (
        <Pressable key={item.id} style={sharedStyles.listCard} onPress={() => navigation.navigate('AttendanceDetail', {recordId: item.id})}>
          <View>
            <Text style={sharedStyles.cardTitle}>{item.date}</Text>
            <Text style={sharedStyles.muted}>{item.checkInTime} - {item.checkOutTime}</Text>
            {item.note ? <Text style={sharedStyles.muted}>{item.note}</Text> : null}
          </View>
          <View style={[sharedStyles.badge, item.type === 'overtime' && sharedStyles.badgeWarn]}>
            <Text style={[sharedStyles.badgeText, item.type === 'overtime' && sharedStyles.badgeWarnText]}>{item.hours}</Text>
          </View>
        </Pressable>
      ))}
    </ScreenContainer>
  );
}
