import React, {PropsWithChildren, useCallback, useEffect, useMemo, useState} from 'react';
import i18next from 'i18next';
import {ActivityIndicator, Platform, StyleSheet, Text, View} from 'react-native';
import {colors} from '../../../shared/constants/colors';
import {AppModal} from '../../../shared/components/AppModal';
import {AppUpdateInfo, AppUpdateStatus} from '../types';

// 更新门禁直接读取 apps/mobile/app.json 的 Expo 版本，避免再维护一份手写常量导致对外版本与包内版本分叉。
const LOCAL_APP_VERSION = String((require('../../../../app.json') as {expo?: {version?: string}}).expo?.version || '').trim();

const ANDROID_APK_MIME_TYPE = 'application/vnd.android.package-archive';
const FLAG_GRANT_READ_URI_PERMISSION = 1;

function hasCompleteUpdateInfo(update: Partial<AppUpdateInfo> | null | undefined): update is AppUpdateInfo {
  return Boolean(update?.version && update?.content && update?.url);
}

function shouldIgnoreUpdateCheckError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('Android 更新信息未配置完整')
    || message.includes('更新信息不完整')
    || message.includes('暂无版本信息')
    || message.includes('Network request failed')
    || message.includes('Failed to fetch')
    || message.includes('fetch failed')
    || message.includes('网络异常')
    || message.includes('网络错误')
    || message.includes('Network Error');
}

function appT(key: string, options?: Record<string, unknown>) {
  return i18next.t(key, {ns: 'app', ...options});
}

async function downloadAndOpenAndroidInstaller(update: AppUpdateInfo) {
  const FileSystem = await import('expo-file-system/legacy');
  const IntentLauncher = await import('expo-intent-launcher');

  if (!FileSystem.cacheDirectory) {
    throw new Error(appT('当前设备不支持更新下载目录'));
  }

  const downloadUri = `${FileSystem.cacheDirectory}hmshr-${update.version}.apk`;
  const cachedFile = await FileSystem.getInfoAsync(downloadUri);
  // 用户上次点过“去更新”但在系统安装器里取消后，不要每次重新弹窗都强制重下同版本 APK；
  // 只要缓存里已有同版本且非空的安装包，就直接复用它，避免重复等待下载。
  const installerUri = cachedFile.exists && Number(cachedFile.size || 0) > 0
    ? downloadUri
    : (await FileSystem.downloadAsync(update.url, downloadUri)).uri;
  const contentUri = await FileSystem.getContentUriAsync(installerUri);

  // Android 安装 APK 需要把 file:// 转成 content:// 并显式授予读取权限；否则系统安装器无法读取应用缓存目录中的文件。
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
    type: ANDROID_APK_MIME_TYPE,
  });
}

async function loadAndFetchLatestAppUpdate() {
  const {fetchLatestAppUpdate} = await import('../services/appUpdateApi');
  return fetchLatestAppUpdate();
}

async function hasCachedAndroidInstaller(update: AppUpdateInfo) {
  const FileSystem = await import('expo-file-system/legacy');
  if (!FileSystem.cacheDirectory) {
    return false;
  }

  const downloadUri = `${FileSystem.cacheDirectory}hmshr-${update.version}.apk`;
  const cachedFile = await FileSystem.getInfoAsync(downloadUri);
  return cachedFile.exists && Number(cachedFile.size || 0) > 0;
}

export function AppUpdateGate({children}: PropsWithChildren) {
  const t = useCallback((key: string, options?: Record<string, unknown>) => appT(key, options), []);
  const [status, setStatus] = useState<AppUpdateStatus>({kind: 'checking'});
  const [actionLoading, setActionLoading] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [installerReady, setInstallerReady] = useState(false);

  const checkForUpdate = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setInstallerReady(false);
      setStatus({kind: 'up_to_date'});
      return;
    }

    if (!LOCAL_APP_VERSION) {
      // 本地未打入版本号时，不阻断进入 App，也不弹失败/更新提示，避免“暂无版本信息”场景影响正常使用。
      setInstallerReady(false);
      setStatus({kind: 'up_to_date'});
      return;
    }

    setStatus({kind: 'checking'});
    setPromptDismissed(false);
    setInstallerReady(false);
    try {
      const latestUpdate = await loadAndFetchLatestAppUpdate();
      if (!hasCompleteUpdateInfo(latestUpdate)) {
        // 后台暂未配置版本信息时，按“当前无更新可提示”处理，不再弹出更新异常弹窗。
        setStatus({kind: 'up_to_date'});
        return;
      }
      if (!/^https?:\/\//i.test(latestUpdate.url)) {
        throw new Error(appT('更新链接无效，请联系管理员检查后台配置。'));
      }
      if (!localAppVersionNeedsUpdate(latestUpdate.version)) {
        setStatus({kind: 'up_to_date'});
        return;
      }

      // 弹窗展示前先探测本地是否已有同版本安装包；命中时把主按钮切成“立即安装”，避免用户误以为还要重新下载。
      setInstallerReady(await hasCachedAndroidInstaller(latestUpdate));
      setStatus({kind: 'required', update: latestUpdate});
    } catch (error) {
      if (shouldIgnoreUpdateCheckError(error)) {
        setStatus({kind: 'up_to_date'});
        return;
      }
      setInstallerReady(false);
      setStatus({kind: 'failed', message: error instanceof Error ? error.message : appT('版本检查失败，请重试。')});
    }
  }, []);

  useEffect(() => {
    void checkForUpdate();
  }, [checkForUpdate]);

  const handleInstallUpdate = useCallback(async (update: AppUpdateInfo) => {
    setActionLoading(true);
    try {
      await downloadAndOpenAndroidInstaller(update);
      // 只要成功拉起过安装器，本地就已经有当前版本 APK；
      // 用户这次若取消安装，下次再弹窗时仍应直接显示“立即安装”。
      setInstallerReady(true);
      // 可选择更新场景下，拉起安装器后先放用户继续使用旧版本；下次启动仍会再次根据接口结果提示更新。
      setPromptDismissed(true);
    } catch (error) {
      setInstallerReady(false);
      setStatus({kind: 'failed', message: error instanceof Error ? error.message : appT('下载安装失败，请重试。')});
    } finally {
      setActionLoading(false);
    }
  }, []);

  const requiredMessage = useMemo(() => {
    if (status.kind !== 'required') {
      return '';
    }

    return t('当前版本：{{currentVersion}}\n最新版本：{{latestVersion}}\n\n更新内容：\n{{content}}', {
      currentVersion: LOCAL_APP_VERSION,
      latestVersion: status.update.version,
      content: status.update.content,
    });
  }, [status, t]);

  const canEnterApp = status.kind === 'up_to_date' || promptDismissed || status.kind === 'failed';

  return (
    <>
      {canEnterApp ? children : (
        <View style={styles.blockingScreen}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.title}>{t('正在获取版本信息')}</Text>
          <Text style={styles.message}>{t('请稍候，正在检查是否有可用的新版本。')}</Text>
        </View>
      )}

      {status.kind === 'failed' && !promptDismissed ? (
        <AppModal
          visible
          onRequestClose={() => setPromptDismissed(true)}
          title={t('暂时无法获取版本信息')}
          message={`${status.message}\n\n${t('你可以稍后再试，也可以先继续使用当前版本。')}`}
          actions={[
            {
              label: t('继续使用'),
              variant: 'secondary',
              onPress: () => setPromptDismissed(true),
            },
            {
              label: actionLoading ? t('检查中...') : t('再次检查'),
              onPress: () => {
                if (actionLoading) {
                  return;
                }
                setActionLoading(true);
                void checkForUpdate().finally(() => setActionLoading(false));
              },
            },
          ]}
        />
      ) : null}

      {status.kind === 'required' && !promptDismissed ? (
        <AppModal
          visible
          onRequestClose={() => setPromptDismissed(true)}
          title={actionLoading ? t('正在准备更新') : t('发现新版本')}
          message={requiredMessage}
          actions={[
            {
              label: t('稍后再说'),
              variant: 'secondary',
              onPress: () => {
                if (actionLoading) {
                  return;
                }
                setPromptDismissed(true);
              },
            },
            {
              label: actionLoading
                ? (installerReady ? t('正在安装...') : t('下载中...'))
                : (installerReady ? t('立即安装') : t('去更新')),
              onPress: () => {
                if (actionLoading) {
                  return;
                }
                void handleInstallUpdate(status.update);
              },
            },
          ]}
        />
      ) : null}
    </>
  );
}

function localAppVersionNeedsUpdate(remoteVersion: string) {
  const localParts = normalizeVersionParts(LOCAL_APP_VERSION);
  const remoteParts = normalizeVersionParts(remoteVersion);
  const maxLength = Math.max(localParts.length, remoteParts.length);

  // 版本门禁只能在“远端版本高于本地版本”时拦截；
  // 不能继续用“不相等就更新”，否则 0.1.7 会被误判成比 0.1.21 更新，真机启动会一直被错误弹窗挡住。
  for (let index = 0; index < maxLength; index += 1) {
    const localPart = localParts[index] ?? 0;
    const remotePart = remoteParts[index] ?? 0;
    if (remotePart > localPart) {
      return true;
    }
    if (remotePart < localPart) {
      return false;
    }
  }

  return false;
}

function normalizeVersionParts(version: string) {
  return String(version || '')
    .trim()
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

const styles = StyleSheet.create({
  blockingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  message: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSubtle,
  },
});
