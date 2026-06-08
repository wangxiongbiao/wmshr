import {httpClient} from '../../../shared/api/httpClient';
import {AppUpdateInfo} from '../types';

export async function fetchLatestAppUpdate(): Promise<AppUpdateInfo> {
  // 移动端更新检查与门户下载区共用后台同一个公开接口，避免版本号、更新说明和下载地址出现双源漂移。
  return httpClient<AppUpdateInfo>('/api/public/mobile-app-update');
}
