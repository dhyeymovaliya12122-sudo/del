/**
 * export.api.ts
 * Enterprise API client for Export, Audit Logs, and Automated Database Backups.
 * Commandments: #5 (Error handling), #10 (Scalable API structure).
 */
import { api } from './client';
import { AutomatedBackupStatus, ExportLog, ExportPayload, ExportStats } from './types';

export const exportBackupApi = {
  getStats: (accountId: string, chatJid?: string) =>
    api
      .get<ExportStats>('/whatsapp/export/stats', { params: { accountId, chatJid } })
      .then((r) => r.data),

  exportSync: async (payload: ExportPayload, filename?: string) => {
    const res = await api.post('/whatsapp/export/sync', payload, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], {
      type:
        payload.format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : payload.format === 'pdf'
          ? 'application/pdf'
          : 'application/zip',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = payload.format === 'excel' ? 'xlsx' : payload.format === 'pdf' ? 'pdf' : 'zip';
    a.download = filename || `whatsapp_export_${payload.accountId}_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  queueExport: (payload: ExportPayload) =>
    api
      .post<{ success: boolean; jobId: string; status: string; message: string }>(
        '/whatsapp/export/queue',
        payload,
      )
      .then((r) => r.data),

  getJobStatus: (jobId: string) =>
    api
      .get<{
        id: string;
        status: 'queued' | 'processing' | 'completed' | 'failed';
        progress: number;
        downloadToken?: string;
        fileSizeBytes?: number;
        error?: string;
      }>(`/whatsapp/export/status/${jobId}`)
      .then((r) => r.data),

  downloadDatabase: async () => {
    const res = await api.get('/whatsapp/export/database', { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/vnd.sqlite3' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp_database_snapshot_${Date.now()}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  getLogs: (accountId?: string, limit = 50) =>
    api
      .get<ExportLog[]>('/whatsapp/export/logs', { params: { accountId, limit } })
      .then((r) => r.data),

  getAutomatedStatus: () =>
    api.get<AutomatedBackupStatus>('/whatsapp/export/automated/status').then((r) => r.data),

  triggerAutomatedBackup: () =>
    api.post<AutomatedBackupStatus>('/whatsapp/export/automated/trigger').then((r) => r.data),
};
