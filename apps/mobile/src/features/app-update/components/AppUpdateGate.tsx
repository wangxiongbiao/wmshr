import React, {PropsWithChildren, useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Platform, StyleSheet, Text, View} from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import {colors} from '../../../shared/constants/colors';
import {AppModal} from '../../../shared/components/AppModal';
import {fetchLatestAppUpdate} from '../services/appUpdateApi';
import {AppUpdateInfo, AppUpdateStatus} from '../types';

const ANDROID_APK_MIME_TYPE = 'application/vnd.android.package-archive';
const FLAG_GRANT_READ_URI_PERMISSION = 1;
const LOCAL_APP_VERSION = String((require('../../../../../app.json') as {expo?: {version?: string}}).expo?.version || '').trim();

async function downloadAndOpenAndroidInstaller(update: AppUpdateInfo) {
  if (!FileSystem.cacheDirectory) {
    throw new Error('当前设备不支持更新下载目录');
  }

  const downloadUri = `${FileSystem.cacheDirectory}wmshr-${update.version}.apk`;
  await FileSystem.deleteAsync(downloadUri, {idempotent: true}).catch(() => undefined);
  const result = await FileSystem.downloadAsync(update.url, downloadUri);
  const contentUri = await FileSystem.getContentUriAsync(result.uri);

  // Android 安装 APK 需要把 file:// 转成 content:// 并显式授予读取权限；否则系统安装器无法读取应用缓存目录中的文件。
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
    type: ANDROID_APK_MIME_TYPE,
  });
}

export function AppUpdateGate({children}: PropsWithChildren) {
  const [status, setStatus] = useState<AppUpdateStatus>({kind: 'checking'});
  const [actionLoading, setActionLoading] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setStatus({kind: 'up_to_date'});
      return;
    }

    if (!LOCAL_APP_VERSION) {
      setStatus({kind: 'failed', message: '当前 App 版本号读取失败，请联系管理员处理。'});
      return;
    }

    setStatus({kind: 'checking'});
    setPromptDismissed(false);
    try {
      const latestUpdate = await fetchLatestAppUpdate();
      if (!latestUpdate.version || !latestUpdate.content || !latestUpdate.url) {
        throw new Error('更新信息不完整，请联系管理员检查后台配置。');
      }
      if (!/^https?:\/\//i.test(latestUpdate.url)) {
        throw new Error('更新链接无效，请联系管理员检查后台配置。');
      }
      setStatus(localAppVersionNeedsUpdate(latestUpdate.version)
        ? {kind: 'required', update: latestUpdate}
        : {kind: 'up_to_date'});
    } catch (error) {
      setStatus({kind: 'failed', message: error instanceof Error ? error.message : '版本检查失败，请重试。'});
    }
  }, []);

  useEffect(() => {
    void checkForUpdate();
  }, [checkForUpdate]);

  const handleInstallUpdate = useCallback(async (update: AppUpdateInfo) => {
    setActionLoading(true);
    try {
      await downloadAndOpenAndroidInstaller(update);
      // 可选择更新场景下，拉起安装器后先放用户继续使用旧版本；下次启动仍会再次根据接口结果提示更新。
      setPromptDismissed(true);
    } catch (error) {
      setStatus({kind: 'failed', message: error instanceof Error ? error.message : '下载安装失败，请重试。'});
    } finally {
      setActionLoading(false);
    }
  }, []);

  const requiredMessage = useMemo(() => {
    if (status.kind !== 'required') {
      return '';
    }

    return `当前版本：${LOCAL_APP_VERSION}\n最新版本：${status.update.version}\n\n更新内容：\n${status.update.content}`;
  }, [status]);

  const canEnterApp = status.kind === 'up_to_date' || promptDismissed || status.kind === 'failed';

  return (
    <>
      {canEnterApp ? children : (
        <View style={styles.blockingScreen}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.title}>正在获取版本信息</Text>
          <Text style={styles.message}>请稍候，正在检查是否有可用的新版本。</Text>
        </View>
      )}

      {status.kind === 'failed' ? (
        <AppModal
          visible
          onRequestClose={() => setPromptDismissed(true)}
          title="暂时无法获取版本信息"
          message={`${status.message}\n\n你可以稍后再试，也可以先继续使用当前版本。`}
          actions={[
            {
              label: '继续使用',
              variant: 'secondary',
              onPress: () => setPromptDismissed(true),
            },
            {
              label: actionLoading ? '检查中...' : '再次检查',
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
          title={actionLoading ? '正在准备更新' : '发现新版本'}
          message={requiredMessage}
          actions={[
            {
              label: '稍后再说',
              variant: 'secondary',
              onPress: () => {
                if (actionLoading) {
                  return;
                }
                setPromptDismissed(true);
              },
            },
            {
              label: actionLoading ? '下载中...' : '去更新',
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
  return LOCAL_APP_VERSION !== String(remoteVersion || '').trim();
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
