import React from 'react';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../../components/Button';
import { useTheme } from '../../../contexts/ThemeContext';
import { cn } from '../../../utils/cn';
import { formatBytes, formatDistanceToNow } from '../../../utils/format';
import type { DatabaseBackup } from '../../../types';

interface BackupListSectionProps {
  backups: DatabaseBackup[];
  onRestore: (backup: DatabaseBackup) => void;
  isRestoring: boolean;
}

export const BackupListSection: React.FC<BackupListSectionProps> = ({
  backups,
  onRestore,
  isRestoring,
}) => {
  const { isDark } = useTheme();

  const getBackupTypeIcon = (type: string) => {
    return type === 'manual' ? (
      <UserIcon className="w-4 h-4 text-blue-500" />
    ) : (
      <ComputerDesktopIcon className="w-4 h-4 text-green-500" />
    );
  };

  const getBackupTypeColor = (type: string) => {
    return type === 'manual' 
      ? isDark ? 'text-blue-400' : 'text-blue-600'
      : isDark ? 'text-green-400' : 'text-green-600';
  };

  if (!backups || backups.length === 0) {
    return (
      <div className="text-center py-8">
        <DocumentTextIcon className={cn(
          'w-12 h-12 mx-auto mb-4',
          isDark ? 'text-slate-600' : 'text-gray-400'
        )} />
        <h3 className={cn(
          'text-lg font-semibold mb-2',
          isDark ? 'text-slate-300' : 'text-gray-700'
        )}>
          No Backups Found
        </h3>
        <p className={cn(
          'text-sm',
          isDark ? 'text-slate-400' : 'text-gray-500'
        )}>
          Create your first backup to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className={cn(
          'font-semibold',
          isDark ? 'text-white' : 'text-gray-900'
        )}>
          Available Backups ({backups.length})
        </h4>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {backups.map((backup, index) => (
          <div
            key={backup.path}
            className={cn(
              'p-4 rounded-lg border transition-all duration-200',
              isDark 
                ? 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50' 
                : 'bg-white/50 border-gray-200/50 hover:border-gray-300/70'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  {getBackupTypeIcon(backup.type)}
                  <h5 className={cn(
                    'font-medium truncate',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}>
                    {backup.name}
                  </h5>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    backup.type === 'manual'
                      ? isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                      : isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
                  )}>
                    {backup.type}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <ClockIcon className={cn(
                      'w-4 h-4',
                      isDark ? 'text-slate-400' : 'text-gray-500'
                    )} />
                    <span className={cn(
                      isDark ? 'text-slate-300' : 'text-gray-700'
                    )}>
                      {formatDistanceToNow(backup.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <DocumentTextIcon className={cn(
                      'w-4 h-4',
                      isDark ? 'text-slate-400' : 'text-gray-500'
                    )} />
                    <span className={cn(
                      isDark ? 'text-slate-300' : 'text-gray-700'
                    )}>
                      {formatBytes(backup.size)}
                    </span>
                  </div>
                </div>

                <p className={cn(
                  'text-xs mt-2 truncate',
                  isDark ? 'text-slate-400' : 'text-gray-500'
                )}>
                  {backup.path}
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onRestore(backup)}
                disabled={isRestoring}
                className="ml-4 flex-shrink-0"
              >
                {isRestoring ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Backup Info */}
      <div className={cn(
        'p-3 rounded-lg border',
        isDark 
          ? 'bg-slate-800/50 border-slate-600/50' 
          : 'bg-slate-50 border-slate-200'
      )}>
        <p className={cn(
          'text-xs',
          isDark ? 'text-slate-400' : 'text-gray-600'
        )}>
          <strong>Note:</strong> Restoring a backup will overwrite the current database. 
          Make sure to create a backup of the current state if needed. 
          Automatic backups are created daily, while manual backups are created on-demand.
        </p>
      </div>
    </div>
  );
};