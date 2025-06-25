import React from 'react';
import {
  ArrowUpTrayIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  BeakerIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../../components/Button';
import { useTheme } from '../../../contexts/ThemeContext';
import { cn } from '../../../utils/cn';
import type { DatabaseHealth } from '../../../types';

interface DatabaseActionsSectionProps {
  onBackup: (compress?: boolean) => void;
  onSync: () => void;
  isCreatingBackup: boolean;
  isSyncing: boolean;
  health?: DatabaseHealth;
}

export const DatabaseActionsSection: React.FC<DatabaseActionsSectionProps> = ({
  onBackup,
  onSync,
  isCreatingBackup,
  isSyncing,
  health,
}) => {
  const { isDark } = useTheme();

  const actions = [
    {
      title: 'Create Manual Backup',
      description: 'Create a compressed backup of the current database',
      icon: <ArrowUpTrayIcon className="w-5 h-5" />,
      action: () => onBackup(true),
      loading: isCreatingBackup,
      variant: 'primary' as const,
      color: 'blue',
    },
    {
      title: 'Create Uncompressed Backup',
      description: 'Create a backup without compression for faster access',
      icon: <DocumentDuplicateIcon className="w-5 h-5" />,
      action: () => onBackup(false),
      loading: isCreatingBackup,
      variant: 'secondary' as const,
      color: 'gray',
    },
    {
      title: 'Sync Database',
      description: 'Synchronize database from JSON files and history sources',
      icon: <ArrowPathIcon className="w-5 h-5" />,
      action: onSync,
      loading: isSyncing,
      variant: 'secondary' as const,
      color: 'green',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="space-y-4">
        {actions.map((action, index) => (
          <div
            key={index}
            className={cn(
              'p-4 rounded-lg border transition-all duration-200',
              isDark 
                ? 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50' 
                : 'bg-white/50 border-gray-200/50 hover:border-gray-300/70'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  action.color === 'blue' && 'bg-blue-500/20 text-blue-500',
                  action.color === 'green' && 'bg-green-500/20 text-green-500',
                  action.color === 'gray' && (isDark ? 'bg-slate-600/50 text-slate-300' : 'bg-gray-100 text-gray-600')
                )}>
                  {action.icon}
                </div>
                <div>
                  <h4 className={cn(
                    'font-semibold mb-1',
                    isDark ? 'text-white' : 'text-gray-900'
                  )}>
                    {action.title}
                  </h4>
                  <p className={cn(
                    'text-sm',
                    isDark ? 'text-slate-400' : 'text-gray-600'
                  )}>
                    {action.description}
                  </p>
                </div>
              </div>
              <Button
                variant={action.variant}
                onClick={action.action}
                disabled={action.loading}
                size="sm"
              >
                {action.loading ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  action.icon
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Health-based Recommendations */}
      {health && (
        <div className="space-y-3">
          <h4 className={cn(
            'font-semibold',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            Recommendations
          </h4>
          
          {health.status === 'error' && (
            <div className={cn(
              'p-3 rounded-lg border',
              isDark 
                ? 'bg-red-900/20 border-red-700/30 text-red-300' 
                : 'bg-red-50 border-red-200 text-red-700'
            )}>
              <div className="flex items-start space-x-2">
                <ShieldCheckIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  Database has errors. Consider creating a backup before attempting repairs.
                </p>
              </div>
            </div>
          )}

          {health.status === 'warning' && (
            <div className={cn(
              'p-3 rounded-lg border',
              isDark 
                ? 'bg-amber-900/20 border-amber-700/30 text-amber-300' 
                : 'bg-amber-50 border-amber-200 text-amber-700'
            )}>
              <div className="flex items-start space-x-2">
                <BeakerIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  Database shows warnings. Regular backups recommended.
                </p>
              </div>
            </div>
          )}

          {(!health.last_backup || 
            new Date().getTime() - new Date(health.last_backup).getTime() > 7 * 24 * 60 * 60 * 1000) && (
            <div className={cn(
              'p-3 rounded-lg border',
              isDark 
                ? 'bg-blue-900/20 border-blue-700/30 text-blue-300' 
                : 'bg-blue-50 border-blue-200 text-blue-700'
            )}>
              <div className="flex items-start space-x-2">
                <ArrowUpTrayIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  {!health.last_backup 
                    ? 'No recent backups found. Create a backup to protect your data.'
                    : 'Last backup is over a week old. Consider creating a fresh backup.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};