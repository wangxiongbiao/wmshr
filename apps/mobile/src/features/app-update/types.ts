export type AppUpdateInfo = {
  version: string;
  content: string;
  url: string;
};

export type AppUpdateStatus =
  | { kind: 'checking' }
  | { kind: 'up_to_date' }
  | { kind: 'required'; update: AppUpdateInfo }
  | { kind: 'failed'; message: string };
