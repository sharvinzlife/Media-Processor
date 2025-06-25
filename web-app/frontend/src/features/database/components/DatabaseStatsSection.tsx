import React from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CircleStackIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../../contexts/ThemeContext';
import { cn } from '../../../utils/cn';
import { formatBytes, formatDistanceToNow } from '../../../utils/format';
import type { DatabaseHealth } from '../../../types';

interface DatabaseStatsSectionProps {
  health: DatabaseHealth;
  info?: {
    size: number;
    total_files: number;
    exists: boolean;
  };
}

export const DatabaseStatsSection: React.FC<DatabaseStatsSectionProps> = ({
  health,
  info,
}) => {
  const { isDark } = useTheme();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <CircleStackIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    if (!health.database_exists) return 'Database Missing';
    if (!health.database_readable || !health.database_writable) return 'Access Issues';
    if (!health.integrity_ok) return 'Integrity Failed';
    if (health.errors && health.errors.length > 0) return 'Has Errors';
    return 'Healthy';
  };

  const getDatabaseStatus = () => {
    if (!health.database_exists) return 'error';
    if (!health.database_readable || !health.database_writable) return 'error';
    if (!health.integrity_ok) return 'error';
    if (health.errors && health.errors.length > 0) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'warning':
        return 'text-amber-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const dbStatus = getDatabaseStatus();
  
  const stats = [
    {
      label: 'Database Status',
      value: getStatusText(),
      icon: getStatusIcon(dbStatus),
      valueClassName: getStatusColor(dbStatus),
    },
    {
      label: 'Integrity Check',
      value: health.integrity_ok ? 'Passed' : 'Failed',
      icon: health.integrity_ok ? 
        <CheckCircleIcon className="w-5 h-5 text-green-500" /> :
        <XCircleIcon className="w-5 h-5 text-red-500" />,
      valueClassName: health.integrity_ok ? 'text-green-500' : 'text-red-500',
    },
    {
      label: 'Database Size',
      value: health.size_mb ? `${health.size_mb} MB` : '0 MB',
      icon: <CircleStackIcon className="w-5 h-5 text-blue-500" />,
      valueClassName: isDark ? 'text-white' : 'text-gray-900',
    },
    {
      label: 'Total Files',
      value: health.record_count?.toLocaleString() || '0',
      icon: <DocumentTextIcon className="w-5 h-5 text-purple-500" />,
      valueClassName: isDark ? 'text-white' : 'text-gray-900',
    },
  ];

  if (health.last_backup) {
    stats.push({
      label: 'Last Backup',
      value: formatDistanceToNow(health.last_backup),
      icon: <ClockIcon className="w-5 h-5 text-orange-500" />,
      valueClassName: isDark ? 'text-white' : 'text-gray-900',
    });
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={cn(
              'p-4 rounded-lg border',
              isDark 
                ? 'bg-slate-700/30 border-slate-600/30' 
                : 'bg-white/50 border-gray-200/50'
            )}
          >
            <div className="flex items-center space-x-3">
              {stat.icon}
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-slate-300' : 'text-gray-700'
                )}>
                  {stat.label}
                </p>
                <p className={cn(
                  'text-lg font-semibold',
                  stat.valueClassName
                )}>
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Issues Section */}
      {health.errors && health.errors.length > 0 && (
        <div className={cn(
          'p-4 rounded-lg border',
          isDark 
            ? 'bg-red-900/20 border-red-700/30' 
            : 'bg-red-50 border-red-200'
        )}>
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className={cn(
                'font-semibold mb-2',
                isDark ? 'text-red-300' : 'text-red-700'
              )}>
                Database Issues
              </h4>
              <ul className={cn(
                'space-y-1 text-sm',
                isDark ? 'text-red-200' : 'text-red-600'
              )}>
                {health.errors.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Database Exists Check */}
      {!health.database_exists && (
        <div className={cn(
          'p-4 rounded-lg border',
          isDark 
            ? 'bg-amber-900/20 border-amber-700/30' 
            : 'bg-amber-50 border-amber-200'
        )}>
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className={cn(
                'font-semibold mb-1',
                isDark ? 'text-amber-300' : 'text-amber-700'
              )}>
                Database Not Found
              </h4>
              <p className={cn(
                'text-sm',
                isDark ? 'text-amber-200' : 'text-amber-600'
              )}>
                The database file does not exist. Use the "Sync Database" button to create it from existing data sources.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};