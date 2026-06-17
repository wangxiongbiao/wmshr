import {env} from '../../../shared/config/env';
import {AppUpdateInfo} from '../types';

export async function fetchLatestAppUpdate(): Promise<AppUpdateInfo> {
  const response = await fetch(`${env.apiBaseUrl}/api/public/mobile-app-update`);
  if (!response.ok) {
    return {} as AppUpdateInfo;
  }

  try {
    return await response.json() as AppUpdateInfo;
  } catch {
    return {} as AppUpdateInfo;
  }
}
