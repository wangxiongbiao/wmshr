import React, {useEffect, useState} from 'react';
import {Text} from 'react-native';
import {useTranslation} from 'react-i18next';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {sharedStyles} from '../../../shared/constants/styles';
import {SUPPORTED_LANGUAGES} from '@wmshr/i18n';

export function SettingsScreen() {
  const {t, i18n} = useTranslation('app');
  const [languageName, setLanguageName] = useState('');

  useEffect(() => {
    const current = SUPPORTED_LANGUAGES.find((item) => item.code === (i18n.resolvedLanguage || i18n.language));
    setLanguageName(current?.nativeName || '');
  }, [i18n.language, i18n.resolvedLanguage]);

  return (
    <ScreenContainer>
      <Text style={sharedStyles.title}>{t('设置')}</Text>
      <Text style={sharedStyles.muted}>{t('第一阶段先保留设置页骨架，后续接语言、通知和账号安全。')}</Text>
      <Text style={[sharedStyles.muted, {marginTop: 12}]}>{t('当前语言：{{language}}', { language: languageName || (i18n.resolvedLanguage || i18n.language) })}</Text>
      {SUPPORTED_LANGUAGES.map((language) => (
        <Text
          key={language.code}
          style={[sharedStyles.muted, {marginTop: 10}]}
          onPress={() => void i18n.changeLanguage(language.code)}
        >
          {language.nativeName}
        </Text>
      ))}
    </ScreenContainer>
  );
}
