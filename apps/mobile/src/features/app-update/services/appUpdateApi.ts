import {httpClient} from '../../../shared/api/httpClient';
import {AppUpdateInfo} from '../types';

export async function fetchLatestAppUpdate(): Promise<AppUpdateInfo> {
  return httpClient<AppUpdateInfo>('/api/mobile/app-update');
}
