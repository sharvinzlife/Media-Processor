import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  MediaStats,
  FileHistoryEntry,
  ServiceStatus,
  SystemDiagnostics,
  SMBSettings,
  AppSettings,
} from '../types';

interface AppState {
  // Media stats
  stats: MediaStats;
  setStats: (stats: MediaStats) => void;
  
  // File history
  fileHistory: FileHistoryEntry[];
  setFileHistory: (history: FileHistoryEntry[]) => void;
  addFileToHistory: (file: FileHistoryEntry) => void;
  
  // Service status
  serviceStatus: ServiceStatus;
  setServiceStatus: (status: ServiceStatus) => void;
  
  // System diagnostics
  diagnostics: SystemDiagnostics | null;
  setDiagnostics: (diagnostics: SystemDiagnostics) => void;
  
  // Settings
  settings: AppSettings | null;
  setSettings: (settings: AppSettings) => void;
  
  // SMB settings
  smbSettings: SMBSettings | null;
  setSmbSettings: (settings: SMBSettings) => void;
  
  // UI state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    timestamp: number;
  }>;
  addNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  removeNotification: (id: string) => void;
  
  // Real-time updates
  lastUpdate: number;
  setLastUpdate: () => void;
}

const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        stats: {
          english_movies: 0,
          malayalam_movies: 0,
          english_tv_shows: 0,
          malayalam_tv_shows: 0,
        },
        fileHistory: [],
        serviceStatus: 'unknown',
        diagnostics: null,
        settings: null,
        smbSettings: null,
        isLoading: false,
        notifications: [],
        lastUpdate: Date.now(),
        
        // Actions
        setStats: (stats) => set({ stats }),
        
        setFileHistory: (history) => set({ fileHistory: history }),
        
        addFileToHistory: (file) =>
          set((state) => ({
            fileHistory: [file, ...state.fileHistory].slice(0, 500), // Keep last 500 files
          })),
        
        setServiceStatus: (status) => set({ serviceStatus: status }),
        
        setDiagnostics: (diagnostics) => set({ diagnostics }),
        
        setSettings: (settings) => set({ settings }),
        
        setSmbSettings: (smbSettings) => set({ smbSettings }),
        
        setLoading: (isLoading) => set({ isLoading }),
        
        addNotification: (type, message) =>
          set((state) => ({
            notifications: [
              ...state.notifications,
              {
                id: `${Date.now()}-${Math.random()}`,
                type,
                message,
                timestamp: Date.now(),
              },
            ].slice(-10), // Keep last 10 notifications
          })),
        
        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),
        
        setLastUpdate: () => set({ lastUpdate: Date.now() }),
      }),
      {
        name: 'media-processor-store',
        partialize: (state) => ({
          // Only persist certain parts of the state
          settings: state.settings,
          smbSettings: state.smbSettings,
        }),
      }
    )
  )
);

export default useAppStore;