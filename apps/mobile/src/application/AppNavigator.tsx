import React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useAuth} from './providers/AuthProvider';
import {LoginScreen} from '../features/auth/screens/LoginScreen';
import {HomeScreen} from '../features/home/screens/HomeScreen';
import {AttendanceListScreen} from '../features/attendance/screens/AttendanceListScreen';
import {AttendanceDetailScreen} from '../features/attendance/screens/AttendanceDetailScreen';
import {SopListScreen} from '../features/sop/screens/SopListScreen';
import {SopDetailScreen} from '../features/sop/screens/SopDetailScreen';
import {MineScreen} from '../features/mine/screens/MineScreen';
import {SettingsScreen} from '../features/mine/screens/SettingsScreen';
import {colors} from '../shared/constants/colors';
import {AttendanceStackParamList, AuthStackParamList, MainTabParamList, MineStackParamList, SopStackParamList} from './navigationTypes';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const AttendanceStack = createNativeStackNavigator<AttendanceStackParamList>();
const SopStack = createNativeStackNavigator<SopStackParamList>();
const MineStack = createNativeStackNavigator<MineStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{headerShown: false}}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function AttendanceNavigator() {
  return (
    <AttendanceStack.Navigator screenOptions={{headerShown: false}}>
      <AttendanceStack.Screen name="AttendanceList" component={AttendanceListScreen} />
      <AttendanceStack.Screen name="AttendanceDetail" component={AttendanceDetailScreen} />
    </AttendanceStack.Navigator>
  );
}

function SopNavigator() {
  return (
    <SopStack.Navigator screenOptions={{headerShown: false}}>
      <SopStack.Screen name="SopList" component={SopListScreen} />
      <SopStack.Screen name="SopDetail" component={SopDetailScreen} />
    </SopStack.Navigator>
  );
}

function MineNavigator() {
  return (
    <MineStack.Navigator screenOptions={{headerShown: false}}>
      <MineStack.Screen name="MineHome" component={MineScreen} />
      <MineStack.Screen name="Settings" component={SettingsScreen} />
    </MineStack.Navigator>
  );
}

function MainTabs() {
  const { t } = useTranslation('app');

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 74,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: colors.text,
          shadowOpacity: 0.12,
          shadowRadius: 20,
          shadowOffset: {width: 0, height: 8},
        },
        tabBarLabelStyle: {fontSize: 11, fontWeight: '800'},
        tabBarIcon: ({color, size}) => {
          // 图标映射集中在导航层，避免页面组件了解 Tab 容器细节；新增 Tab 时只改这里和 ParamList。
          const iconMap: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
            Home: 'home-outline',
            Attendance: 'calendar-outline',
            Sop: 'document-text-outline',
            Mine: 'person-outline',
          };
          return <Ionicons name={iconMap[route.name]} size={size} color={color} />;
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{title: t('首页')}} />
      <Tab.Screen name="Attendance" component={AttendanceNavigator} options={{title: t('考勤')}} />
      <Tab.Screen name="Sop" component={SopNavigator} options={{title: 'SOP'}} />
      <Tab.Screen name="Mine" component={MineNavigator} options={{title: t('我的')}} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const {session, loading} = useAuth();

  if (loading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background}}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <NavigationContainer>{session ? <MainTabs /> : <AuthNavigator />}</NavigationContainer>;
}
