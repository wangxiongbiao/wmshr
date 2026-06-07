import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {sharedStyles} from '../../../shared/constants/styles';
import {colors} from '../../../shared/constants/colors';
import {useToast} from '../../../application/providers/ToastProvider';
import {SUPPORTED_LANGUAGES} from '@wmshr/i18n';

export function SettingsScreen() {
  const {t, i18n} = useTranslation('app');
  const {showToast} = useToast();
  const [languageName, setLanguageName] = useState('');
  const currentLanguageCode = i18n.resolvedLanguage || i18n.language;

  useEffect(() => {
    const current = SUPPORTED_LANGUAGES.find((item) => item.code === currentLanguageCode);
    setLanguageName(current?.nativeName || '');
  }, [currentLanguageCode]);

  const handleChangeLanguage = async (languageCode: string, nativeName: string) => {
    if (languageCode === currentLanguageCode) {
      return;
    }
    // 设置页本轮只保留最小可用能力：明确支持语言切换，并在切换后立即反馈结果，避免用户误以为点按无效。
    await i18n.changeLanguage(languageCode);
    showToast(t('已切换为 {{language}}', {language: nativeName}));
  };

  return (
    <ScreenContainer>
      <Text style={sharedStyles.title}>{t('设置')}</Text>
      <Text style={sharedStyles.muted}>{t('当前仅开放语言切换；通知和账号安全功能暂未开放。')}</Text>

      <View style={styles.currentCard}>
        <Text style={sharedStyles.cardTitle}>{t('当前语言')}</Text>
        <Text style={styles.currentLanguage}>{languageName || currentLanguageCode}</Text>
      </View>

      <Text style={styles.sectionLabel}>{t('切换语言')}</Text>
      {SUPPORTED_LANGUAGES.map((language) => {
        const active = language.code === currentLanguageCode;
        return (
          <Pressable
            key={language.code}
            style={[styles.languageRow, active && styles.languageRowActive]}
            onPress={() => void handleChangeLanguage(language.code, language.nativeName)}
          >
            <View style={sharedStyles.flexOne}>
              <Text style={[sharedStyles.cardTitle, active && styles.activeText]}>{language.nativeName}</Text>
              <Text style={sharedStyles.muted}>{language.code}</Text>
            </View>
            <Text style={[styles.languageStatus, active && styles.activeText]}>{active ? t('当前使用中') : t('点击切换')}</Text>
          </Pressable>
        );
      })}

      <View style={styles.unavailableCard}>
        <Text style={sharedStyles.cardTitle}>{t('暂未开放的设置')}</Text>
        <Text style={sharedStyles.muted}>{t('通知提醒、账号安全等功能还未开放；当前页面不会跳转到不可用的空入口。')}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  currentCard: {marginTop: 18, backgroundColor: '#eff6ff', borderRadius: 22, padding: 16},
  currentLanguage: {marginTop: 8, fontSize: 18, fontWeight: '900', color: colors.primary},
  sectionLabel: {marginTop: 22, marginBottom: 10, fontSize: 13, fontWeight: '900', color: colors.textSubtle},
  languageRow: {backgroundColor: colors.white, borderRadius: 22, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12},
  languageRowActive: {borderWidth: 1, borderColor: colors.primary},
  languageStatus: {fontSize: 12, fontWeight: '900', color: colors.textMuted},
  activeText: {color: colors.primary},
  unavailableCard: {marginTop: 6, backgroundColor: '#f8fafc', borderRadius: 22, padding: 16},
});
