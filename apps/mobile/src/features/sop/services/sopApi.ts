import {SopDocument} from '../types';

const sopDocuments: SopDocument[] = [
  {id: '1', title: '仓库安全操作规范', version: 'V2.1', updatedAt: '05-10', readStatus: 'read', readAt: '2026-05-10T09:00:00.000Z'},
  {id: '2', title: '拣货作业标准流程', version: 'V1.8', updatedAt: '05-08', readStatus: 'unread'},
  {id: '3', title: '叉车安全驾驶指南', version: 'V3.0', updatedAt: '05-05', readStatus: 'unread'},
];

export async function fetchSopDocuments(): Promise<SopDocument[]> {
  // SOP 数据先集中在 service，保证后续接后台发布/已读确认时页面无需迁移 mock 数据。
  return sopDocuments;
}

export async function fetchSopDocument(sopId: string): Promise<SopDocument | undefined> {
  return sopDocuments.find(item => item.id === sopId);
}
