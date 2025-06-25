import { http, HttpResponse } from 'msw';
import type { 
  MediaStats, 
  FileHistoryEntry, 
  AppSettings, 
  DatabaseHealth,
  DatabaseBackup,
  SMBSettings 
} from '../../types';

// Mock data
const mockStats: MediaStats = {
  english_movies: 5,
  malayalam_movies: 3,
  english_tv_shows: 8,
  malayalam_tv_shows: 4,
};

const mockFileHistory: FileHistoryEntry[] = [
  {
    name: 'Test Movie (2023)',
    type: 'movie',
    language: 'english',
    processedAt: new Date().toISOString(),
    path: '/media/movies/Test Movie (2023).mkv',
    size: '2.1 GB',
    status: 'success',
  },
  {
    name: 'Test Malayalam Movie (2023)',
    type: 'movie',
    language: 'malayalam',
    processedAt: new Date(Date.now() - 86400000).toISOString(),
    path: '/media/malayalam-movies/Test Malayalam Movie (2023).mkv',
    size: '1.8 GB',
    status: 'success',
  },
];

const mockSettings: AppSettings = {
  smb_server: 'nas.local',
  smb_share: 'Media',
  smb_username: 'testuser',
  smb_password: 'testpass',
  english_movies_path: 'movies',
  english_tv_path: 'tv-shows',
  malayalam_movies_path: 'malayalam-movies',
  malayalam_tv_path: 'malayalam-tv-shows',
  download_path: '/downloads',
  processing_enabled: true,
  dry_run: false,
  extract_languages: true,
};

const mockDatabaseHealth: DatabaseHealth = {
  status: 'healthy',
  integrity_check: true,
  size: 1024 * 1024, // 1MB
  total_files: 20,
  last_backup: new Date().toISOString(),
};

const mockBackups: DatabaseBackup[] = [
  {
    path: '/backups/manual_backup_2023_12_01.db.gz',
    name: 'manual_backup_2023_12_01.db.gz',
    size: 512 * 1024, // 512KB
    created_at: new Date().toISOString(),
    type: 'manual',
  },
  {
    path: '/backups/auto_backup_2023_11_30.db.gz',
    name: 'auto_backup_2023_11_30.db.gz',
    size: 480 * 1024, // 480KB
    created_at: new Date(Date.now() - 86400000).toISOString(),
    type: 'auto',
  },
];

export const handlers = [
  // Stats API
  http.get('/api/stats', () => {
    return HttpResponse.json({
      success: true,
      stats: mockStats,
    });
  }),

  // File History API
  http.get('/api/file-history', () => {
    return HttpResponse.json({
      success: true,
      history: mockFileHistory,
    });
  }),

  http.post('/api/file-history', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      message: 'File added to history',
    });
  }),

  // Settings API
  http.get('/api/settings', () => {
    return HttpResponse.json({
      success: true,
      settings: mockSettings,
    });
  }),

  http.post('/api/settings', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  }),

  // SMB API
  http.post('/api/test-connection', async ({ request }) => {
    const body = await request.json() as SMBSettings;
    
    // Simulate connection test
    if (body.server === 'invalid.server') {
      return HttpResponse.json({
        success: false,
        error: 'Connection failed: Host not found',
      });
    }

    return HttpResponse.json({
      success: true,
      message: 'Connection successful',
    });
  }),

  // Database API
  http.get('/api/database/health', () => {
    return HttpResponse.json({
      success: true,
      health: mockDatabaseHealth,
    });
  }),

  http.get('/api/database/backups', () => {
    return HttpResponse.json({
      success: true,
      backups: mockBackups,
    });
  }),

  http.get('/api/database/info', () => {
    return HttpResponse.json({
      success: true,
      size: 1024 * 1024,
      total_files: 20,
      exists: true,
    });
  }),

  http.post('/api/database/backup', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      message: 'Backup created successfully',
      backup_path: '/backups/manual_backup_test.db.gz',
    });
  }),

  http.post('/api/database/restore', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      message: 'Database restored successfully',
    });
  }),

  http.post('/api/database/sync', () => {
    return HttpResponse.json({
      success: true,
      message: 'Database synchronized successfully',
    });
  }),

  // Service API
  http.get('/api/status', () => {
    return HttpResponse.json({
      success: true,
      status: 'active',
    });
  }),

  http.post('/api/service/restart', () => {
    return HttpResponse.json({
      success: true,
      message: 'Service restarted successfully',
    });
  }),

  // Manual scan API
  http.post('/api/manual-scan', () => {
    return HttpResponse.json({
      success: true,
      message: 'Scan completed successfully',
      total_files: 10,
      new_files: 2,
      files: mockFileHistory.slice(0, 2),
    });
  }),
];