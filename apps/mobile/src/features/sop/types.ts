export interface SopAttachment {
  name: string;
  url: string;
  size?: string;
}

export interface SopDocument {
  id: string;
  title: string;
  version: string;
  updatedAt: string;
  readStatus: 'unread' | 'read';
  readAt?: string | null;
  content?: string;
  images?: string[];
  attachments?: SopAttachment[];
}
