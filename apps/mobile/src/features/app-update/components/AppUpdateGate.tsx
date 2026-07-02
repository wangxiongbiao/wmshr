import React, {createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import i18next from 'i18next';
import {Platform, StyleSheet, Text, View} from 'react-native';
import type {DimensionValue} from 'react-native';
import {colors} from '../../../shared/constants/colors';
import {AppModal} from '../../../shared/components/AppModal';
import {mobileDebugLog} from '../../../shared/debug/mobileDebugLogger';
import {env} from '../../../shared/config/env';
import {getLocalAppVersion} from '../../../shared/config/appVersion';
import {AppUpdateInfo, AppUpdateStatus} from '../types';

const LOCAL_APP_VERSION = getLocalAppVersion();

const ANDROID_APK_MIME_TYPE = 'application/vnd.android.package-archive';
const FLAG_GRANT_READ_URI_PERMISSION = 1;

type AndroidDownloadProgress = {
  bytesWritten: number;
  bytesExpected: number;
};

type AndroidInstallerFile = AndroidDownloadProgress & {
  uri: string;
  reusedCache: boolean;
};

type DownloadProgressState =
  | {kind: 'idle'}
  | {kind: 'downloading'; version: string; bytesWritten: number; bytesExpected: number}
  | {kind: 'ready'; version: string; bytesWritten: number; bytesExpected: number}
  | {kind: 'opening'; version: string; bytesWritten: number; bytesExpected: number}
  | {kind: 'failed'; version: string; message: string};

type AppUpdatePromptContextValue = {
  hasRequiredUpdate: boolean;
  latestVersion?: string;
  isChecking: boolean;
  openUpdatePrompt: () => void;
};

type CheckForUpdateOptions = {
  showFailurePrompt?: boolean;
};

const AppUpdatePromptContext = createContext<AppUpdatePromptContextValue | null>(null);

// 更新弹窗由 AppUpdateGate 根层统一托管；“我的”页等入口只通过这个 context 重新打开根层弹窗，
// 不要在页面内复制下载/安装状态，下载进度也只保留在版本更新弹窗内，避免根层状态和页面内状态分叉。
export function useAppUpdatePrompt() {
  const value = useContext(AppUpdatePromptContext);
  if (!value) {
    throw new Error('useAppUpdatePrompt must be used within AppUpdateGate');
  }
  return value;
}

async function fetchRemoteAndroidInstallerSize(url: string) {
  try {
    const response = await fetch(url, {method: 'HEAD'});
    const contentLength = response.headers.get('content-length');
    const parsedSize = Number(contentLength);
    return response.ok && Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : null;
  } catch (error) {
    mobileDebugLog('app_update_installer_head_failed', error);
    return null;
  }
}

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

async function getCachedAndroidInstallerInfo(update: AppUpdateInfo) {
  const FileSystem = await import('expo-file-system/legacy');
  if (!FileSystem.cacheDirectory) {
    return null;
  }

  const downloadUri = `${FileSystem.cacheDirectory}hmshr-${update.version}.apk`;
  const cachedFile = await FileSystem.getInfoAsync(downloadUri);
  const cachedSize = cachedFile.exists ? Number(cachedFile.size || 0) : 0;
  if (cachedSize <= 0) {
    return null;
  }

  const remoteSize = await fetchRemoteAndroidInstallerSize(update.url);
  if (remoteSize && cachedSize !== remoteSize) {
    // 更新安装包若只校验“文件存在且非空”，一次中断/历史坏缓存就会被误当成可安装包，最终系统安装器提示“解析错误”。
    // 远端提供 Content-Length 时必须严格匹配；不匹配的缓存直接清掉，回到重新下载流程。
    mobileDebugLog('app_update_cached_installer_size_mismatch', {version: update.version, cachedSize, remoteSize});
    await FileSystem.deleteAsync(downloadUri, {idempotent: true}).catch(() => undefined);
    return null;
  }

  return {uri: downloadUri, size: cachedSize};
}

async function downloadAndroidInstaller(
  update: AppUpdateInfo,
  onProgress: (progress: AndroidDownloadProgress) => void,
): Promise<AndroidInstallerFile> {
  const FileSystem = await import('expo-file-system/legacy');

  if (!FileSystem.cacheDirectory) {
    throw new Error(appT('当前设备不支持更新下载目录'));
  }

  const downloadUri = `${FileSystem.cacheDirectory}hmshr-${update.version}.apk`;
  const cachedFile = await FileSystem.getInfoAsync(downloadUri);
  const remoteSize = await fetchRemoteAndroidInstallerSize(update.url);
  // 用户上次点过“去更新”但在系统安装器里取消后，不要每次重新弹窗都强制重下同版本 APK；
  // 只要缓存里已有同版本且大小与远端一致的安装包，就直接复用它，避免重复等待下载。
  if (cachedFile.exists && Number(cachedFile.size || 0) > 0) {
    const size = Number(cachedFile.size || 0);
    if (remoteSize && size !== remoteSize) {
      mobileDebugLog('app_update_cached_installer_size_mismatch', {version: update.version, cachedSize: size, remoteSize});
      await FileSystem.deleteAsync(downloadUri, {idempotent: true}).catch(() => undefined);
    } else {
      onProgress({bytesWritten: size, bytesExpected: size});
      return {uri: downloadUri, reusedCache: true, bytesWritten: size, bytesExpected: size};
    }
  }

  // 下载任务和进度状态在根层 AppUpdateGate 中维护；界面层只在版本更新弹窗里展示进度，避免再出现底部浮动进度卡。
  // 用户关闭更新弹窗后，原下载任务仍继续，重新打开弹窗时仍复用同一个下载状态。
  const downloadResumable = FileSystem.createDownloadResumable(
    update.url,
    downloadUri,
    {},
    (progress: {totalBytesWritten: number; totalBytesExpectedToWrite: number}) => {
      onProgress({
        bytesWritten: progress.totalBytesWritten,
        bytesExpected: progress.totalBytesExpectedToWrite,
      });
    },
  );
  const downloadResult = await downloadResumable.downloadAsync();
  if (!downloadResult?.uri) {
    throw new Error(appT('下载安装失败，请重试。'));
  }

  const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
  const size = fileInfo.exists ? Number(fileInfo.size || 0) : 0;
  if (remoteSize && size !== remoteSize) {
    mobileDebugLog('app_update_download_size_mismatch', {version: update.version, downloadedSize: size, remoteSize});
    await FileSystem.deleteAsync(downloadResult.uri, {idempotent: true}).catch(() => undefined);
    throw new Error(appT('下载安装包不完整，请重试。'));
  }
  return {
    uri: downloadResult.uri,
    reusedCache: false,
    bytesWritten: size,
    bytesExpected: size > 0 ? size : -1,
  };
}

async function openAndroidInstaller(installerUri: string) {
  const FileSystem = await import('expo-file-system/legacy');
  const IntentLauncher = await import('expo-intent-launcher');
  const contentUri = await FileSystem.getContentUriAsync(installerUri);

  // Android 安装 APK 需要把 file:// 转成 content:// 并显式授予读取权限；否则系统安装器无法读取应用缓存目录中的文件。
  return IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
    type: ANDROID_APK_MIME_TYPE,
  });
}

async function loadAndFetchLatestAppUpdate() {
  const {fetchLatestAppUpdate} = await import('../services/appUpdateApi');
  return fetchLatestAppUpdate();
}

export function AppUpdateGate({children}: PropsWithChildren) {
  const t = useCallback((key: string, options?: Record<string, unknown>) => appT(key, options), []);
  const [status, setStatus] = useState<AppUpdateStatus>({kind: 'up_to_date'});
  const [actionLoading, setActionLoading] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [installerReady, setInstallerReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressState>({kind: 'idle'});

  const checkForUpdate = useCallback(async ({showFailurePrompt = true}: CheckForUpdateOptions = {}) => {
    mobileDebugLog('app_update_check_start', {
      platform: Platform.OS,
      localVersion: LOCAL_APP_VERSION,
      apiBaseUrl: env.apiBaseUrl,
    });
    if (Platform.OS !== 'android') {
      mobileDebugLog('app_update_skip_non_android', {platform: Platform.OS});
      setInstallerReady(false);
      setDownloadProgress({kind: 'idle'});
      setStatus({kind: 'up_to_date'});
      return;
    }

    if (!LOCAL_APP_VERSION) {
      mobileDebugLog('app_update_skip_missing_local_version');
      // 本地未打入版本号时，不阻断进入 App，也不弹失败/更新提示，避免“暂无版本信息”场景影响正常使用。
      setInstallerReady(false);
      setDownloadProgress({kind: 'idle'});
      setStatus({kind: 'up_to_date'});
      return;
    }

    setStatus({kind: 'checking'});
    setPromptDismissed(false);
    setInstallerReady(false);
    try {
      const latestUpdate = await loadAndFetchLatestAppUpdate();
      mobileDebugLog('app_update_check_response', latestUpdate);
      if (!hasCompleteUpdateInfo(latestUpdate)) {
        mobileDebugLog('app_update_no_complete_info', latestUpdate);
        // 后台暂未配置版本信息时，按“当前无更新可提示”处理，不再弹出更新异常弹窗。
        setDownloadProgress({kind: 'idle'});
        setStatus({kind: 'up_to_date'});
        return;
      }
      if (!/^https?:\/\//i.test(latestUpdate.url)) {
        throw new Error(appT('更新链接无效，请联系管理员检查后台配置。'));
      }
      if (!localAppVersionNeedsUpdate(latestUpdate.version)) {
        mobileDebugLog('app_update_not_needed', {
          localVersion: LOCAL_APP_VERSION,
          remoteVersion: latestUpdate.version,
        });
        setDownloadProgress({kind: 'idle'});
        setStatus({kind: 'up_to_date'});
        return;
      }

      // 弹窗展示前先探测本地是否已有同版本安装包；命中时把主按钮切成“立即安装”，避免用户误以为还要重新下载。
      const cachedInstaller = await getCachedAndroidInstallerInfo(latestUpdate);
      const cachedInstallerReady = Boolean(cachedInstaller);
      mobileDebugLog('app_update_required', {
        localVersion: LOCAL_APP_VERSION,
        remoteVersion: latestUpdate.version,
        cachedInstallerReady,
      });
      setInstallerReady(cachedInstallerReady);
      setDownloadProgress((current) => {
        if (current.kind !== 'idle' && current.version === latestUpdate.version) {
          return current;
        }
        if (cachedInstaller) {
          return {
            kind: 'ready',
            version: latestUpdate.version,
            bytesWritten: cachedInstaller.size,
            bytesExpected: cachedInstaller.size,
          };
        }
        return {kind: 'idle'};
      });
      setStatus({kind: 'required', update: latestUpdate});
    } catch (error) {
      if (shouldIgnoreUpdateCheckError(error)) {
        mobileDebugLog('app_update_ignore_error', error);
        setStatus({kind: 'up_to_date'});
        return;
      }
      mobileDebugLog('app_update_check_failed', error);
      setInstallerReady(false);
      setDownloadProgress({kind: 'idle'});
      if (!showFailurePrompt) {
        setStatus({kind: 'up_to_date'});
        return;
      }
      setStatus({kind: 'failed', message: error instanceof Error ? error.message : appT('版本检查失败，请重试。')});
    }
  }, []);

  useEffect(() => {
    void checkForUpdate({showFailurePrompt: false});
  }, [checkForUpdate]);

  const openUpdatePrompt = useCallback(() => {
    if (status.kind === 'required' || status.kind === 'failed') {
      setPromptDismissed(false);
      return;
    }

    setActionLoading(true);
    void checkForUpdate().finally(() => setActionLoading(false));
  }, [checkForUpdate, status.kind]);

  const handleInstallUpdate = useCallback(async (update: AppUpdateInfo) => {
    if (actionLoading || (downloadProgress.kind === 'downloading' && downloadProgress.version === update.version)) {
      return;
    }

    setActionLoading(true);
    setPromptDismissed(false);
    try {
      mobileDebugLog('app_update_install_start', update);
      const installerFile = await downloadAndroidInstaller(update, (progress) => {
        setDownloadProgress({
          kind: 'downloading',
          version: update.version,
          bytesWritten: progress.bytesWritten,
          bytesExpected: progress.bytesExpected,
        });
      });
      mobileDebugLog('app_update_download_ready', {
        version: update.version,
        reusedCache: installerFile.reusedCache,
        bytesWritten: installerFile.bytesWritten,
        bytesExpected: installerFile.bytesExpected,
      });
      setInstallerReady(true);
      setDownloadProgress({
        kind: 'ready',
        version: update.version,
        bytesWritten: installerFile.bytesWritten,
        bytesExpected: installerFile.bytesExpected,
      });
      setDownloadProgress({
        kind: 'opening',
        version: update.version,
        bytesWritten: installerFile.bytesWritten,
        bytesExpected: installerFile.bytesExpected,
      });
      const installerResult = await openAndroidInstaller(installerFile.uri);
      // 只要成功拉起过安装器，本地就已经有当前版本 APK；
      // 用户这次若取消安装，下次再弹窗时仍应直接显示“立即安装”。
      mobileDebugLog('app_update_install_prompt_opened', {version: update.version, installerResult});
      setDownloadProgress({
        kind: 'ready',
        version: update.version,
        bytesWritten: installerFile.bytesWritten,
        bytesExpected: installerFile.bytesExpected,
      });
      // 可选择更新场景下，拉起安装器后先放用户继续使用旧版本；后续后台或手动检查命中新版本时再重新提示。
      setPromptDismissed(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : appT('下载安装失败，请重试。');
      mobileDebugLog('app_update_install_failed', error);
      setInstallerReady(false);
      setDownloadProgress({kind: 'failed', version: update.version, message});
      setPromptDismissed(false);
      setStatus({kind: 'failed', message});
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, downloadProgress]);

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

  const installActionLabel = useMemo(() => {
    if (downloadProgress.kind === 'downloading') {
      const percent = getDownloadPercentText(downloadProgress);
      return percent ? t('下载中 {{percent}}', {percent}) : t('下载中...');
    }
    if (downloadProgress.kind === 'opening') {
      return t('正在安装...');
    }
    if (actionLoading) {
      return installerReady ? t('正在安装...') : t('下载中...');
    }
    return installerReady ? t('立即安装') : t('去更新');
  }, [actionLoading, downloadProgress, installerReady, t]);

  const updatePromptContextValue = useMemo<AppUpdatePromptContextValue>(() => ({
    hasRequiredUpdate: status.kind === 'required',
    latestVersion: status.kind === 'required' ? status.update.version : undefined,
    isChecking: status.kind === 'checking',
    openUpdatePrompt,
  }), [openUpdatePrompt, status]);

  return (
    <AppUpdatePromptContext.Provider value={updatePromptContextValue}>
      {/* 启动阶段直接渲染系统，版本检查在后台执行；只有确认有更新时才弹出根层版本更新弹窗。 */}
      {children}

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
          title={downloadProgress.kind === 'downloading' ? t('正在下载更新') : (actionLoading ? t('正在准备更新') : t('发现新版本'))}
          message={requiredMessage}
          actions={[
            {
              label: t('稍后再说'),
              variant: 'secondary',
              onPress: () => setPromptDismissed(true),
            },
            {
              label: installActionLabel,
              onPress: () => {
                if (actionLoading) {
                  return;
                }
                void handleInstallUpdate(status.update);
              },
            },
          ]}
        >
          <AppUpdateProgressPanel progress={downloadProgress} />
        </AppModal>
      ) : null}
    </AppUpdatePromptContext.Provider>
  );
}

function AppUpdateProgressPanel({progress}: {progress: DownloadProgressState}) {
  if (progress.kind === 'idle') {
    return null;
  }

  return (
    <View style={styles.progressPanel}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>{getDownloadStateTitle(progress)}</Text>
        <Text style={styles.progressPercent}>{getDownloadPercentText(progress) || appT('计算中')}</Text>
      </View>
      <ProgressBar progress={progress} />
      <Text style={styles.progressMeta}>{getDownloadMetaText(progress)}</Text>
    </View>
  );
}

function ProgressBar({progress}: {progress: DownloadProgressState}) {
  const ratio = getDownloadRatio(progress);
  const width: DimensionValue = ratio === null ? '36%' : `${Math.max(3, Math.min(100, Math.round(ratio * 100)))}%`;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, ratio === null && styles.progressFillUnknown, {width}]} />
    </View>
  );
}

function getDownloadStateTitle(progress: DownloadProgressState) {
  switch (progress.kind) {
    case 'downloading':
      return appT('安装包下载中');
    case 'ready':
      return appT('安装包已下载');
    case 'opening':
      return appT('正在打开安装器');
    case 'failed':
      return appT('下载失败');
    case 'idle':
    default:
      return '';
  }
}

function getDownloadRatio(progress: DownloadProgressState) {
  if (progress.kind === 'failed' || progress.kind === 'idle') {
    return null;
  }
  if (progress.bytesExpected <= 0) {
    return null;
  }
  return Math.min(1, Math.max(0, progress.bytesWritten / progress.bytesExpected));
}

function getDownloadPercentText(progress: DownloadProgressState) {
  const ratio = getDownloadRatio(progress);
  if (ratio === null) {
    return '';
  }
  return `${Math.round(ratio * 100)}%`;
}

function getDownloadMetaText(progress: DownloadProgressState) {
  if (progress.kind === 'failed') {
    return progress.message;
  }
  if (progress.kind === 'idle') {
    return '';
  }
  if (progress.bytesExpected > 0) {
    return `${formatBytes(progress.bytesWritten)} / ${formatBytes(progress.bytesExpected)}`;
  }
  return appT('已下载 {{size}}，总大小计算中', {size: formatBytes(progress.bytesWritten)});
}

function formatBytes(bytes: number) {
  const safeBytes = Math.max(0, Number.isFinite(bytes) ? bytes : 0);
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = safeBytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function localAppVersionNeedsUpdate(remoteVersion: string) {
  const localParts = normalizeVersionParts(LOCAL_APP_VERSION);
  const remoteParts = normalizeVersionParts(remoteVersion);
  const maxLength = Math.max(localParts.length, remoteParts.length);

  // 更新提示只能在“远端版本高于本地版本”时出现；
  // 不能继续用“不相等就更新”，否则 0.1.7 会被误判成比 0.1.21 更新，手动检查时也会错误提示。
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
  progressPanel: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
  },
  progressTrack: {
    height: 8,
    marginTop: 10,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#dbeafe',
  },
  progressFill: {
    height: '100%',
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  progressFillUnknown: {
    opacity: 0.5,
  },
  progressMeta: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSubtle,
  },
});
