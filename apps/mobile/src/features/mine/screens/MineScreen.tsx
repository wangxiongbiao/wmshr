import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {SUPPORTED_LANGUAGES} from '@wmshr/i18n';
import {useAuth} from '../../../application/providers/AuthProvider';
import {useToast} from '../../../application/providers/ToastProvider';
import {fetchMobileHomeSummary} from '../../attendance/services/attendanceApi';
import {MobileHomeSummary} from '../../attendance/types';
import {useAppUpdatePrompt} from '../../app-update/components/AppUpdateGate';
import {fetchLatestAppUpdate} from '../../app-update/services/appUpdateApi';
import {AppModal} from '../../../shared/components/AppModal';
import {ScreenContainer} from '../../../shared/components/ScreenContainer';
import {colors} from '../../../shared/constants/colors';
import {env} from '../../../shared/config/env';
import {getLocalAppVersion} from '../../../shared/config/appVersion';

const LOCAL_APP_VERSION = getLocalAppVersion('1.0.24');
const DESIGN_REFERENCE_VERSION = '1.0.24';
const DEFAULT_STANDARD_HOURS = 176;

type UpdateBadgeState = {
  hasUpdate: boolean;
  latestVersion?: string;
};

function compareVersion(a: string, b: string) {
  const parse = (value: string) => String(value || '')
    .replace(/^v/i, '')
    .split('.')
    .map(part => Number(part) || 0);
  const left = parse(a);
  const right = parse(b);
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    const current = left[index] || 0;
    const target = right[index] || 0;
    if (current > target) return 1;
    if (current < target) return -1;
  }
  return 0;
}

export function MineScreen() {
  const {t, i18n} = useTranslation('app');
  const {employee, session, logout} = useAuth();
  const {showToast} = useToast();
  const {hasRequiredUpdate, latestVersion: promptedLatestVersion, openUpdatePrompt} = useAppUpdatePrompt();
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [homeSummary, setHomeSummary] = useState<MobileHomeSummary | null>(null);
  const [updateBadge, setUpdateBadge] = useState<UpdateBadgeState>({hasUpdate: false});
  const currentLanguageCode = i18n.resolvedLanguage || i18n.language;

  useEffect(() => {
    let mounted = true;
    async function loadMineSummary() {
      if (!session) {
        return;
      }
      try {
        const summary = await fetchMobileHomeSummary(session.accessToken);
        if (mounted) {
          setHomeSummary(summary);
        }
      } catch {
        if (mounted) {
          setHomeSummary(null);
        }
      }
    }

    void loadMineSummary();
    return () => {
      mounted = false;
    };
  }, [session]);

  useEffect(() => {
    let mounted = true;
    async function loadUpdateState() {
      try {
        const latest = await fetchLatestAppUpdate();
        if (!mounted || !latest?.version) {
          return;
        }
        const hasNewerVersion = compareVersion(LOCAL_APP_VERSION, latest.version) < 0;
        setUpdateBadge({
          hasUpdate: hasNewerVersion,
          latestVersion: latest.version,
        });
      } catch {
        if (mounted) {
          setUpdateBadge({hasUpdate: false});
        }
      }
    }

    void loadUpdateState();
    return () => {
      mounted = false;
    };
  }, []);

  const handleConfirmLogout = async () => {
    setLogoutConfirmVisible(false);
    // 退出只调用 AuthProvider 清理登录态；导航层会因 session 变为 null 自动回到登录页，不在页面里手动跳转避免双重导航。
    await logout();
    showToast(t('已退出登录'));
  };

  const handleChangeLanguage = useCallback(async (languageCode: string, nativeName: string) => {
    if (languageCode === currentLanguageCode) {
      return;
    }
    // “我的”页直接承载语言切换时，语言列表必须允许横向滑动而不是截断；当前支持语种已超过一行容量，后续新增语种也应继续复用这条横向列表，不要退回固定三按钮布局。
    await i18n.changeLanguage(languageCode);
    showToast(t('已切换为 {{language}}', {language: nativeName}));
  }, [currentLanguageCode, i18n, showToast, t]);

  const handleOpenUpdate = useCallback(() => {
    const latestVersion = updateBadge.latestVersion || promptedLatestVersion;
    if (hasRequiredUpdate || (latestVersion && compareVersion(LOCAL_APP_VERSION, latestVersion) < 0)) {
      openUpdatePrompt();
      return;
    }
    showToast(t('当前已是最新版本'));
  }, [hasRequiredUpdate, openUpdatePrompt, promptedLatestVersion, showToast, t, updateBadge.latestVersion]);

  const isScreenshotPreview = env.appEnv === 'screenshots';
  const avatarText = useMemo(() => {
    if (isScreenshotPreview) {
      return t('头像首字');
    }
    return employee?.name?.[0] ?? t('头像首字');
  }, [employee?.name, isScreenshotPreview, t]);
  const displayName = useMemo(() => {
    if (isScreenshotPreview) {
      return t('头像');
    }
    return employee?.name ?? t('头像');
  }, [employee?.name, isScreenshotPreview, t]);
  const departmentText = useMemo(() => {
    if (isScreenshotPreview) {
      return t('A区·入库部门');
    }
    return employee?.dept ?? employee?.role ?? t('A区·入库部门');
  }, [employee?.dept, employee?.role, isScreenshotPreview, t]);
  const attendanceValue = useMemo(() => (isScreenshotPreview ? '18' : String(homeSummary?.attendanceDays ?? 0)), [homeSummary?.attendanceDays, isScreenshotPreview]);
  const anomalyValue = useMemo(() => (isScreenshotPreview ? '0' : String(homeSummary?.pendingSopCount ?? 0)), [homeSummary?.pendingSopCount, isScreenshotPreview]);
  const overtimeValue = useMemo(() => {
    if (isScreenshotPreview) {
      return '4.5';
    }
    const monthHours = Number(homeSummary?.monthHours ?? 0);
    return Math.max(monthHours - DEFAULT_STANDARD_HOURS, 0).toFixed(1);
  }, [homeSummary?.monthHours, isScreenshotPreview]);
  const displayedVersion = isScreenshotPreview ? DESIGN_REFERENCE_VERSION : LOCAL_APP_VERSION;

  return (
    <ScreenContainer>
      <View style={styles.profileHero}>
        <View style={styles.avatarShell}>
          <View style={styles.avatarCard}>
            {employee?.photo ? (
              <Image source={{uri: employee.photo}} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>{avatarText}</Text>
            )}
          </View>
          <View style={styles.avatarStatusBadge}>
            <Ionicons name="checkmark" size={18} color={colors.white} />
          </View>
        </View>
        <Text style={styles.profileName}>{displayName}</Text>
        <View style={styles.departmentBadge}>
          <Text style={styles.departmentBadgeText}>{departmentText}</Text>
        </View>
      </View>

      <View style={styles.languageCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderDot} />
          <Text style={styles.cardHeaderText}>{t('系统多语言设置')}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.languageScrollContent}
        >
          {SUPPORTED_LANGUAGES.map(language => {
            const active = language.code === currentLanguageCode;
            return (
              <Pressable
                key={language.code}
                onPress={() => void handleChangeLanguage(language.code, language.nativeName)}
                style={[styles.languageChip, active && styles.languageChipActive]}
              >
                <Text style={[styles.languageChipText, active && styles.languageChipTextActive]} numberOfLines={1}>
                  {language.nativeName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statColumn}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{attendanceValue}</Text>
          <Text style={styles.statLabel}>{t('出勤率')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statColumn}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{anomalyValue}</Text>
          <Text style={styles.statLabel}>{t('异常')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statColumn}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{overtimeValue}</Text>
          <Text style={styles.statLabel}>{t('加班')}</Text>
        </View>
      </View>

      <View style={styles.actionsCard}>
        <Pressable style={styles.actionRow} onPress={handleOpenUpdate}>
          <View style={[styles.actionIconWrap, styles.updateIconWrap]}>
            <Ionicons name="sync-outline" size={28} color="#2463F6" />
          </View>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>{t('更新应用')}</Text>
            <Text style={styles.actionSubtitle}>V{displayedVersion}</Text>
          </View>
          <View style={styles.actionRightSide}>
            <View style={styles.latestBadge}>
              <Text style={styles.latestBadgeText}>{updateBadge.hasUpdate ? t('可更新') : t('最新')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#C6D3E7" />
          </View>
        </Pressable>

        <Pressable style={styles.logoutRow} onPress={() => setLogoutConfirmVisible(true)}>
          <Ionicons name="log-out-outline" size={26} color="#FF4D73" />
          <Text style={styles.logoutText}>{t('退出登录')}</Text>
        </Pressable>
      </View>

      <Text style={styles.footerVersion}>WMSHR GLOBAL · V{displayedVersion}</Text>

      <AppModal
        visible={logoutConfirmVisible}
        title={t('确认退出登录？')}
        message={t('退出后需要重新登录才能继续使用。')}
        onRequestClose={() => setLogoutConfirmVisible(false)}
        actions={[
          {label: t('取消'), variant: 'secondary', onPress: () => setLogoutConfirmVisible(false)},
          {label: t('退出登录'), variant: 'danger', onPress: handleConfirmLogout},
        ]}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileHero: {alignItems: 'center', paddingTop: 0, marginBottom: 14},
  avatarShell: {position: 'relative', marginBottom: 12},
  avatarCard: {
    width: 136,
    height: 136,
    borderRadius: 16,
    backgroundColor: '#1F58EE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 8,
  },
  avatarImage: {width: '100%', height: '100%', borderRadius: 16},
  avatarText: {fontSize: 50, lineHeight: 58, fontWeight: '900', color: colors.white},
  avatarStatusBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 38,
    height: 38,
    borderRadius: 16,
    backgroundColor: '#17C964',
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#17C964',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  profileName: {fontSize: 20, lineHeight: 26, fontWeight: '900', color: '#161D35'},
  departmentBadge: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E8EDF6',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
  },
  departmentBadgeText: {fontSize: 12, lineHeight: 16, fontWeight: '800', color: '#7D8AA6'},
  languageCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 12,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 5},
    elevation: 3,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4},
  cardHeaderDot: {width: 12, height: 12, borderRadius: 16, backgroundColor: '#3B82F6', marginRight: 10},
  cardHeaderText: {fontSize: 14, lineHeight: 18, fontWeight: '900', color: '#18233D'},
  languageScrollContent: {paddingHorizontal: 2, gap: 10},
  languageChip: {
    minWidth: 114,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#FBFCFE',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageChipActive: {
    backgroundColor: '#2463F6',
    borderColor: '#2463F6',
    shadowColor: '#2463F6',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  languageChipText: {fontSize: 13, lineHeight: 17, fontWeight: '900', color: '#6E7B97'},
  languageChipTextActive: {color: colors.white},
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 5},
    elevation: 3,
  },
  statColumn: {flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center'},
  statValue: {width: '100%', fontSize: 20, lineHeight: 24, fontWeight: '900', color: '#151D36', textAlign: 'center', includeFontPadding: false},
  statLabel: {marginTop: 6, fontSize: 12, lineHeight: 16, fontWeight: '800', color: '#A0AEC4'},
  statDivider: {width: 1, marginVertical: 6, backgroundColor: '#EDF1F7'},
  actionsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 5},
    elevation: 3,
  },
  actionRow: {flexDirection: 'row', alignItems: 'center', minHeight: 68},
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  updateIconWrap: {backgroundColor: '#F4F9FF', borderColor: '#E3EEF9'},
  actionCopy: {flex: 1, minWidth: 0},
  actionTitle: {fontSize: 15, lineHeight: 20, fontWeight: '900', color: '#172039'},
  actionSubtitle: {marginTop: 3, fontSize: 11, lineHeight: 15, fontWeight: '800', color: '#A0AEC4'},
  actionRightSide: {flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 10},
  latestBadge: {
    minWidth: 46,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#F3F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  latestBadgeText: {fontSize: 11, lineHeight: 14, fontWeight: '900', color: '#2463F6'},
  logoutRow: {
    marginTop: 14,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: {fontSize: 16, lineHeight: 22, fontWeight: '900', color: '#FF4D73'},
  footerVersion: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#D2D9E4',
  },
});
