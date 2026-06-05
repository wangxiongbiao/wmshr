import React, {useEffect, useMemo, useState} from 'react';
import {Text, View} from 'react-native';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchTodayAttendanceStatus, resetMockTodayAttendanceStatus, submitAttendanceCheckIn} from '../../attendance/services/attendanceApi';
import {TodayAttendanceStatus} from '../../attendance/types';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {formatDateLabel, formatFullTime} from '../../../shared/utils/date';
import {sharedStyles} from '../../../shared/constants/styles';
import {CheckInCard} from '../components/CheckInCard';
import {TodayTaskCard} from '../components/TodayTaskCard';

export function HomeScreen() {
  const {employee} = useAuth();
  const {showToast} = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayStatus, setTodayStatus] = useState<TodayAttendanceStatus | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    void fetchTodayAttendanceStatus().then(setTodayStatus);
  }, []);

  const formattedDate = useMemo(() => formatDateLabel(currentTime), [currentTime]);

  const handleCheckIn = async () => {
    if (!todayStatus) {
      return;
    }

    if (todayStatus.status === 'checked_out') {
      const nextStatus = await resetMockTodayAttendanceStatus();
      setTodayStatus(nextStatus);
      showToast('已重置状态（演示）');
      return;
    }

    const nextStatus = await submitAttendanceCheckIn({
      type: todayStatus.status === 'not_checked_in' ? 'check_in' : 'check_out',
      latitude: 13.7563,
      longitude: 100.5018,
      accuracy: todayStatus.locationAccuracy ?? 0,
      clientTime: new Date().toISOString(),
    });
    setTodayStatus(nextStatus);
    showToast(nextStatus.status === 'checked_in' ? '上班打卡成功' : '下班打卡成功');
  };

  return (
    <ScreenContainer>
      <View style={sharedStyles.header}>
        <View>
          <Text style={sharedStyles.overline}>下午好</Text>
          <Text style={sharedStyles.title}>{employee?.name ?? '员工'}</Text>
        </View>
        <View style={sharedStyles.avatarSmall}><Text style={sharedStyles.avatarText}>{employee?.name?.[0] ?? 'E'}</Text></View>
      </View>

      {todayStatus ? (
        <CheckInCard currentTime={formatFullTime(currentTime)} currentDate={formattedDate} status={todayStatus} onCheckIn={handleCheckIn} />
      ) : null}

      <Text style={sharedStyles.sectionTitle}>今日任务</Text>
      <TodayTaskCard icon="cube-outline" title="拣货任务" desc="A区入库 · 24 单待处理" />
      <TodayTaskCard icon="shield-checkmark-outline" title="安全提醒" desc="请完成叉车作业前检查" />
    </ScreenContainer>
  );
}
