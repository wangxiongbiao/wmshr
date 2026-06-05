import React, {useEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, Text, View} from 'react-native';
import {AttendanceStackParamList} from '../../../application/navigationTypes';
import {fetchAttendanceRecords} from '../services/attendanceApi';
import {AttendanceRecord} from '../types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {sharedStyles} from '../../../shared/constants/styles';

type Props = NativeStackScreenProps<AttendanceStackParamList, 'AttendanceList'>;

export function AttendanceListScreen({navigation}: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    void fetchAttendanceRecords().then(setRecords);
  }, []);

  return (
    <ScreenContainer>
      <View style={sharedStyles.screenTitle}>
        <Text style={sharedStyles.title}>考勤记录</Text>
        <Text style={sharedStyles.muted}>最近 4 天打卡明细</Text>
      </View>
      {records.map(item => (
        <Pressable key={item.id} style={sharedStyles.listCard} onPress={() => navigation.navigate('AttendanceDetail', {recordId: item.id})}>
          <View>
            <Text style={sharedStyles.cardTitle}>{item.date}</Text>
            <Text style={sharedStyles.muted}>{item.checkInTime} - {item.checkOutTime}</Text>
          </View>
          <View style={[sharedStyles.badge, item.type === 'overtime' && sharedStyles.badgeWarn]}>
            <Text style={[sharedStyles.badgeText, item.type === 'overtime' && sharedStyles.badgeWarnText]}>{item.hours}</Text>
          </View>
        </Pressable>
      ))}
    </ScreenContainer>
  );
}
