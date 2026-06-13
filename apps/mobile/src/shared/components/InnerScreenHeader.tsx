import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useTranslation} from 'react-i18next';
import {colors} from '../constants/colors';

type Props = {
  title: string;
  fallbackHref: '/sop' | '/mine' | '/home';
};

export function InnerScreenHeader({title, fallbackHref}: Props) {
  const router = useRouter();
  const {t} = useTranslation('app');

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackHref);
  };

  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={handleBack}>
        <Ionicons name="chevron-back" size={18} color={colors.text} />
        <Text style={styles.backText}>{t('返回')}</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
  },
  rightSpacer: {
    minWidth: 72,
  },
});
