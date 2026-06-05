export interface SopDocument {
  id: string;
  title: string;
  version: string;
  updatedAt: string;
  readStatus: 'unread' | 'read';
  readAt?: string | null;
}
