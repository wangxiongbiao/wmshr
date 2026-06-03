import React, {useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

// Expo 入口默认从项目根目录读取 App.tsx；这里保留原员工端的四个核心页面，
// 但全部改为 React Native 原生组件，避免继续依赖 DOM、Tailwind className 或 Vite。
type Page = 'home' | 'attendance' | 'sop' | 'mine';
type CheckStatus = 'none' | 'in' | 'out';

interface CheckInData {
  status: CheckStatus;
  inTime: string | null;
  outTime: string | null;
  gps: string;
}

interface AttendanceRecord {
  date: string;
  in: string;
  out: string;
  type: 'normal' | 'overtime';
  hours: string;
}

interface SOP {
  id: number;
  title: string;
  ver: string;
  date: string;
  read: boolean;
}

const attendanceSeed: AttendanceRecord[] = [
  {date: '2026-05-17', in: '08:30', out: '17:35', type: 'normal', hours: '8.1h'},
  {date: '2026-05-16', in: '08:45', out: '19:20', type: 'overtime', hours: '9.6h'},
  {date: '2026-05-15', in: '08:32', out: '17:40', type: 'normal', hours: '8.1h'},
  {date: '2026-05-14', in: '08:28', out: '17:30', type: 'normal', hours: '8.0h'},
];

const sopSeed: SOP[] = [
  {id: 1, title: '仓库安全操作规范', ver: 'V2.1', date: '05-10', read: true},
  {id: 2, title: '拣货作业标准流程', ver: 'V1.8', date: '05-08', read: false},
  {id: 3, title: '叉车安全驾驶指南', ver: 'V3.0', date: '05-05', read: false},
];

const tabs: {id: Page; label: string; icon: keyof typeof Ionicons.glyphMap}[] = [
  {id: 'home', label: '首页', icon: 'home-outline'},
  {id: 'attendance', label: '考勤', icon: 'calendar-outline'},
  {id: 'sop', label: 'SOP', icon: 'document-text-outline'},
  {id: 'mine', label: '我的', icon: 'person-outline'},
];

function formatTime(date: Date) {
  return date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
}

function formatMinute(date: Date) {
  return date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', hour12: false});
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toast, setToast] = useState<string | null>(null);
  const [checkInData, setCheckInData] = useState<CheckInData>({
    status: 'none',
    inTime: null,
    outTime: null,
    gps: '曼谷 Warehouse A · 精度 3.2m',
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = useMemo(
    () => currentTime.toLocaleDateString('zh-CN', {weekday: 'long', month: 'long', day: 'numeric'}),
    [currentTime],
  );

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleCheckIn = () => {
    const timeStr = formatMinute(new Date());

    // 打卡状态只保存在本机内存中；后续如果接真实后端，应从这里替换为 API 请求，
    // 并保留 none -> in -> out 的业务顺序，避免误把演示重置逻辑带入生产。
    if (checkInData.status === 'none') {
      setCheckInData(prev => ({...prev, status: 'in', inTime: timeStr}));
      showToast('上班打卡成功');
    } else if (checkInData.status === 'in') {
      setCheckInData(prev => ({...prev, status: 'out', outTime: timeStr}));
      showToast('下班打卡成功');
    } else {
      setCheckInData({status: 'none', inTime: null, outTime: null, gps: '曼谷 Warehouse A · 精度 3.2m'});
      showToast('已重置状态（演示）');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {currentPage === 'home' && (
          <>
            <Header />
            <View style={styles.clockCard}>
              <View style={styles.clockHeader}>
                <View>
                  <Text style={styles.overline}>系统时间</Text>
                  <Text style={styles.clock}>{formatTime(currentTime)}</Text>
                  <Text style={styles.muted}>{formattedDate}</Text>
                </View>
                <StatusPill status={checkInData.status} />
              </View>

              <View style={styles.timeGrid}>
                <TimeBox label="上班时间" value={checkInData.inTime ?? '--:--'} active={Boolean(checkInData.inTime)} />
                <TimeBox label="下班时间" value={checkInData.outTime ?? '--:--'} active={Boolean(checkInData.outTime)} />
              </View>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={18} color="#2563eb" />
                <Text style={styles.locationText}>{checkInData.gps}</Text>
              </View>

              <Pressable style={({pressed}) => [styles.primaryButton, pressed && styles.buttonPressed]} onPress={handleCheckIn}>
                <Ionicons name="finger-print-outline" size={22} color="#fff" />
                <Text style={styles.primaryButtonText}>{checkInData.status === 'none' ? '上班打卡' : checkInData.status === 'in' ? '下班打卡' : '重置演示'}</Text>
              </Pressable>
            </View>
            <SectionTitle title="今日任务" />
            <TaskCard icon="cube-outline" title="拣货任务" desc="A区入库 · 24 单待处理" />
            <TaskCard icon="shield-checkmark-outline" title="安全提醒" desc="请完成叉车作业前检查" />
          </>
        )}

        {currentPage === 'attendance' && (
          <>
            <ScreenTitle title="考勤记录" subtitle="最近 4 天打卡明细" />
            {attendanceSeed.map(item => (
              <View key={item.date} style={styles.listCard}>
                <View>
                  <Text style={styles.cardTitle}>{item.date}</Text>
                  <Text style={styles.muted}>{item.in} - {item.out}</Text>
                </View>
                <View style={[styles.badge, item.type === 'overtime' && styles.badgeWarn]}>
                  <Text style={[styles.badgeText, item.type === 'overtime' && styles.badgeWarnText]}>{item.hours}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {currentPage === 'sop' && (
          <>
            <ScreenTitle title="SOP 文件" subtitle="仓库作业标准流程" />
            {sopSeed.map(item => (
              <View key={item.id} style={styles.listCard}>
                <Ionicons name={item.read ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={item.read ? '#16a34a' : '#94a3b8'} />
                <View style={styles.flexOne}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.muted}>{item.ver} · 更新 {item.date}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
            ))}
          </>
        )}

        {currentPage === 'mine' && (
          <>
            <ScreenTitle title="我的" subtitle="Thin Thin Aung" />
            <View style={styles.profileCard}>
              <View style={styles.avatar}><Text style={styles.avatarText}>T</Text></View>
              <Text style={styles.profileName}>Thin Thin Aung</Text>
              <Text style={styles.muted}>拣货员 · A区入库 · 缅甸</Text>
            </View>
            <TaskCard icon="settings-outline" title="设置" desc="语言、通知和账号安全" />
            <TaskCard icon="log-out-outline" title="退出登录" desc="结束当前员工端会话" />
          </>
        )}
      </ScrollView>
      <TabBar current={currentPage} onChange={setCurrentPage} />
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.overline}>下午好</Text>
        <Text style={styles.title}>Thin Thin Aung</Text>
      </View>
      <View style={styles.avatarSmall}><Text style={styles.avatarText}>T</Text></View>
    </View>
  );
}

function StatusPill({status}: {status: CheckStatus}) {
  const text = status === 'in' ? '在勤中' : status === 'out' ? '已完成' : '未打卡';
  const active = status === 'in';
  return <View style={[styles.statusPill, active && styles.statusPillActive]}><Text style={[styles.statusText, active && styles.statusTextActive]}>{text}</Text></View>;
}

function TimeBox({label, value, active}: {label: string; value: string; active: boolean}) {
  return (
    <View style={styles.timeBox}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={[styles.timeValue, !active && styles.inactiveText]}>{value}</Text>
    </View>
  );
}

function SectionTitle({title}: {title: string}) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function ScreenTitle({title, subtitle}: {title: string; subtitle: string}) {
  return <View style={styles.screenTitle}><Text style={styles.title}>{title}</Text><Text style={styles.muted}>{subtitle}</Text></View>;
}

function TaskCard({icon, title, desc}: {icon: keyof typeof Ionicons.glyphMap; title: string; desc: string}) {
  return <View style={styles.listCard}><Ionicons name={icon} size={24} color="#2563eb" /><View style={styles.flexOne}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.muted}>{desc}</Text></View></View>;
}

function TabBar({current, onChange}: {current: Page; onChange: (page: Page) => void}) {
  return (
    <View style={styles.tabBar}>
      {tabs.map(tab => {
        const active = current === tab.id;
        return (
          <Pressable key={tab.id} style={styles.tabItem} onPress={() => onChange(tab.id)}>
            <Ionicons name={tab.icon} size={22} color={active ? '#2563eb' : '#94a3b8'} />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#f8fafc'},
  content: {padding: 20, paddingBottom: 112},
  toast: {position: 'absolute', top: 54, left: 20, right: 20, zIndex: 20, padding: 14, borderRadius: 18, backgroundColor: '#16a34a'},
  toastText: {color: '#fff', fontWeight: '800', textAlign: 'center'},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
  overline: {fontSize: 11, color: '#94a3b8', fontWeight: '900', letterSpacing: 1.2},
  title: {fontSize: 28, color: '#0f172a', fontWeight: '900', marginTop: 4},
  muted: {fontSize: 13, color: '#64748b', marginTop: 4},
  avatarSmall: {width: 50, height: 50, borderRadius: 18, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: '#fff', fontSize: 22, fontWeight: '900'},
  clockCard: {backgroundColor: '#fff', borderRadius: 32, padding: 22, shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: {width: 0, height: 10}, elevation: 4},
  clockHeader: {flexDirection: 'row', justifyContent: 'space-between', gap: 12},
  clock: {fontSize: 40, color: '#0f172a', fontWeight: '900', letterSpacing: -1.6, marginTop: 6},
  statusPill: {height: 32, borderRadius: 999, backgroundColor: '#e2e8f0', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center'},
  statusPillActive: {backgroundColor: '#dcfce7'},
  statusText: {fontSize: 11, color: '#64748b', fontWeight: '900'},
  statusTextActive: {color: '#16a34a'},
  timeGrid: {flexDirection: 'row', gap: 12, marginTop: 22},
  timeBox: {flex: 1, backgroundColor: '#f8fafc', borderRadius: 20, padding: 16, alignItems: 'center'},
  timeLabel: {fontSize: 10, color: '#94a3b8', fontWeight: '900'},
  timeValue: {fontSize: 25, color: '#0f172a', fontWeight: '900', marginTop: 8},
  inactiveText: {color: '#cbd5e1'},
  locationRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, padding: 12, backgroundColor: '#eff6ff', borderRadius: 18},
  locationText: {color: '#1d4ed8', fontWeight: '700'},
  primaryButton: {marginTop: 18, height: 58, borderRadius: 22, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10},
  buttonPressed: {opacity: 0.82},
  primaryButtonText: {color: '#fff', fontWeight: '900', fontSize: 17},
  sectionTitle: {fontSize: 20, color: '#0f172a', fontWeight: '900', marginTop: 26, marginBottom: 12},
  screenTitle: {marginBottom: 20},
  listCard: {backgroundColor: '#fff', borderRadius: 22, padding: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: {width: 0, height: 6}, elevation: 2},
  cardTitle: {fontSize: 16, color: '#0f172a', fontWeight: '800'},
  badge: {backgroundColor: '#e0f2fe', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6},
  badgeWarn: {backgroundColor: '#ffedd5'},
  badgeText: {color: '#0369a1', fontWeight: '900'},
  badgeWarnText: {color: '#ea580c'},
  flexOne: {flex: 1},
  profileCard: {backgroundColor: '#fff', borderRadius: 28, padding: 24, alignItems: 'center', marginBottom: 16},
  avatar: {width: 82, height: 82, borderRadius: 30, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 14},
  profileName: {fontSize: 22, color: '#0f172a', fontWeight: '900'},
  tabBar: {position: 'absolute', left: 14, right: 14, bottom: 14, height: 74, borderRadius: 26, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', shadowColor: '#0f172a', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: {width: 0, height: 8}, elevation: 8},
  tabItem: {alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1},
  tabText: {fontSize: 11, color: '#94a3b8', fontWeight: '800'},
  tabTextActive: {color: '#2563eb'},
});
