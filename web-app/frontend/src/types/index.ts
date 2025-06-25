// Media types
export type MediaType = 'movie' | 'tvshow';
export type Language = 'english' | 'malayalam' | 'hindi' | 'tamil' | 'telugu' | 'unknown';

// File status
export type FileStatus = 'success' | 'failed' | 'processing' | 'skipped' | 'found';

// Statistics
export interface MediaStats {
  english_movies: number;
  malayalam_movies: number;
  english_tv_shows: number;
  malayalam_tv_shows: number;
}

// File history entry
export interface FileHistoryEntry {
  name: string;
  type: MediaType;
  language: Language;
  processedAt: string;
  path?: string;
  size?: string;
  status: FileStatus;
  displayName?: string;
  typeEmoji?: string;
  langEmoji?: string;
  statusEmoji?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Service status
export type ServiceStatus = 'active' | 'inactive' | 'unknown';

// System diagnostics
export interface SystemDiagnostics {
  serviceStatus: ServiceStatus;
  diskSpace: string;
  memoryUsage: string;
  uptime: string;
  tools: {
    ffmpeg: boolean;
    smbclient: boolean;
    mediainfo: boolean;
  };
}

// SMB settings
export interface SMBSettings {
  server: string;
  share: string;
  username: string;
  password?: string;
}

// SMB diagnostic result
export interface SMBDiagnosticResult {
  test: string;
  success: boolean;
  message: string;
  emoji?: string;
  output?: string;
  critical?: boolean;
}

// Database backup
export interface DatabaseBackup {
  path: string;
  name: string;
  size: number;
  created_at: string;
  type: 'manual' | 'auto';
}

// Database health
export interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'error';
  integrity_check: boolean;
  size: number;
  total_files: number;
  last_backup?: string;
  issues?: string[];
}

// Settings configuration
export interface AppSettings {
  smb_server: string;
  smb_share: string;
  smb_username: string;
  smb_password?: string;
  english_movies_path: string;
  english_tv_path: string;
  malayalam_movies_path: string;
  malayalam_tv_path: string;
  download_dir: string;
  processing_enabled: boolean;
  dry_run?: boolean;
  extract_languages?: boolean;
}