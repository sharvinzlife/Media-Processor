import apiClient from './client';
import type {
  MediaStats,
  FileHistoryEntry,
  ServiceStatus,
  SystemDiagnostics,
  SMBSettings,
  SMBDiagnosticResult,
  DatabaseBackup,
  DatabaseHealth,
  AppSettings,
} from '../types';

// Media statistics
export const mediaApi = {
  getStats: () => apiClient.get<{ success: boolean; stats: MediaStats }>('/api/stats'),
  
  getFileHistory: () => 
    apiClient.get<{ success: boolean; history: FileHistoryEntry[] }>('/api/file-history'),
  
  addFileHistory: (entry: Partial<FileHistoryEntry>) =>
    apiClient.post('/api/file-history', entry),
};

// Service control
export const serviceApi = {
  getStatus: () => 
    apiClient.get<{ success: boolean; status: ServiceStatus }>('/api/status'),
  
  start: (service?: 'python' | 'web') => 
    apiClient.post(`/api/service/start${service ? `/${service}` : ''}`),
  
  stop: (service?: 'python' | 'web') => 
    apiClient.post(`/api/service/stop${service ? `/${service}` : ''}`),
  
  restart: (service?: 'python' | 'web') => 
    apiClient.post(`/api/service/restart${service ? `/${service}` : ''}`),
};

// System diagnostics
export const systemApi = {
  getDiagnostics: () =>
    apiClient.get<{ success: boolean; results: SystemDiagnostics }>('/api/system-diagnostics'),
  
  getLogs: (params?: { service?: 'python' | 'web'; maxLines?: number; level?: string }) =>
    apiClient.get<{ success: boolean; logs: any[] }>('/api/logs', { params }),
  
  clearLogs: (params?: { service?: 'python' | 'web' }) => 
    apiClient.post('/api/logs/clear', params),
  
  streamLogs: (service?: 'python' | 'web') => {
    const url = service ? `/api/logs/stream/${service}` : '/api/logs/stream';
    const eventSource = new EventSource(url);
    return eventSource;
  },
};

// SMB management
export const smbApi = {
  getSettings: () =>
    apiClient.get<{ success: boolean; settings: SMBSettings }>('/api/smb-settings'),
  
  testConnection: (settings: SMBSettings) =>
    apiClient.post('/api/test-connection', settings),
  
  diagnose: (settings: SMBSettings) =>
    apiClient.post<{ success: boolean; results: SMBDiagnosticResult[] }>('/api/diagnose-smb', settings),
  
  diagnoseWrite: (settings: SMBSettings) =>
    apiClient.post('/api/diagnose-smb-write', settings),
};

// Database management
export const databaseApi = {
  backup: (type: 'manual' | 'auto' = 'manual', compress = true) =>
    apiClient.post('/api/database/backup', { type, compress }),
  
  restore: (backupPath: string) =>
    apiClient.post('/api/database/restore', { backup_path: backupPath }),
  
  getBackups: () =>
    apiClient.get<{ success: boolean; backups: DatabaseBackup[] }>('/api/database/backups'),
  
  getHealth: () =>
    apiClient.get<{ success: boolean; health: DatabaseHealth }>('/api/database/health'),
  
  sync: () => apiClient.post('/api/database/sync'),
  
  reset: () => apiClient.post('/api/database/reset'),
  
  getInfo: () =>
    apiClient.get<{ success: boolean; size: number; total_files: number; exists: boolean }>('/api/database/info'),
};

// Settings management
export const settingsApi = {
  get: () =>
    apiClient.get<{ success: boolean; settings: AppSettings }>('/api/settings'),
  
  update: (settings: Partial<AppSettings>) =>
    apiClient.post('/api/settings', settings),
};

// Manual operations
export const manualApi = {
  scan: () =>
    apiClient.post<{
      success: boolean;
      message: string;
      total_files: number;
      new_files: number;
      files: FileHistoryEntry[];
    }>('/api/manual-scan'),
};