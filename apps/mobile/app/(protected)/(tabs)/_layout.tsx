import React from 'react';
import {Tabs} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../../../src/shared/constants/colors';

export default function TabsLayout() {
  const {t} = useTranslation('app');
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
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
          const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            home: 'home-outline',
            attendance: 'calendar-outline',
            sop: 'document-text-outline',
            mine: 'person-outline',
          };
          return <Ionicons name={iconMap[route.name] ?? 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="home" options={{title: t('首页'), href: '/home'}} />
      <Tabs.Screen name="attendance" options={{title: t('考勤'), href: '/attendance'}} />
      <Tabs.Screen name="sop" options={{title: 'SOP', href: '/sop'}} />
      <Tabs.Screen name="mine" options={{title: t('我的'), href: '/mine'}} />
    </Tabs>
  );
}
