import React from 'react';
import {
  CpuChipIcon,
  ServerIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../../contexts/ThemeContext';
import { cn } from '../../../utils/cn';
import type { SystemDiagnostics } from '../../../types';

interface SystemStatsSectionProps {
  systemData?: {
    success: boolean;
    results?: SystemDiagnostics;
  };
  onRefresh: () => void;
}

export const SystemStatsSection: React.FC<SystemStatsSectionProps> = ({
  systemData,
  onRefresh,
}) => {
  const { isDark } = useTheme();

  if (!systemData?.success || !systemData.results) {
    return (
      <div className={cn(
        'p-6 rounded-lg border text-center',
        isDark 
          ? 'bg-amber-900/20 border-amber-700/30' 
          : 'bg-amber-50 border-amber-200'
      )}>
        <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-3 text-amber-500" />
        <p className={cn(
          'text-sm font-medium',
          isDark ? 'text-amber-300' : 'text-amber-700'
        )}>
          System diagnostics unavailable
        </p>
        <p className={cn(
          'text-xs mt-1',
          isDark ? 'text-amber-200' : 'text-amber-600'
        )}>
          Unable to retrieve system information
        </p>
      </div>
    );
  }

  const { results } = systemData;
  
  const getStatusIcon = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? 
        <CheckCircleIcon className="w-5 h-5 text-green-500" /> :
        <XCircleIcon className="w-5 h-5 text-red-500" />;
    }
    
    if (value === 'active') {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    } else if (value === 'inactive') {
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    }
    
    return <ServerIcon className="w-5 h-5 text-gray-500" />;
  };

  const getStatusColor = (value: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? 'text-green-500' : 'text-red-500';
    }
    
    if (value === 'active') return 'text-green-500';
    if (value === 'inactive') return 'text-red-500';
    return 'text-gray-500';
  };

  const stats = [
    {
      label: 'Service Status',
      value: results.services?.pythonProcessor || 'unknown',
      icon: getStatusIcon(results.services?.pythonProcessor),
      valueClassName: getStatusColor(results.services?.pythonProcessor),
    },
    {
      label: 'Disk Space',
      value: results.system?.diskSpace || 'N/A',
      icon: <ServerIcon className="w-5 h-5 text-blue-500" />,
      valueClassName: isDark ? 'text-white' : 'text-gray-900',
    },
    {
      label: 'Memory Usage',
      value: results.system?.memoryUsage || 'N/A',
      icon: <CpuChipIcon className="w-5 h-5 text-purple-500" />,
      valueClassName: isDark ? 'text-white' : 'text-gray-900',
    },
    {
      label: 'System Uptime',
      value: results.system?.uptime || 'N/A',
      icon: <ClockIcon className="w-5 h-5 text-orange-500" />,
      valueClassName: isDark ? 'text-white' : 'text-gray-900',
    },
  ];

  const tools = results.tools || {};
  const toolStats = [
    {
      label: 'FFmpeg',
      value: tools.ffmpeg ? 'Installed' : 'Missing',
      available: tools.ffmpeg,
    },
    {
      label: 'SMB Client',
      value: tools.smbclient ? 'Installed' : 'Missing',
      available: tools.smbclient,
    },
    {
      label: 'MediaInfo',
      value: tools.mediainfo ? 'Installed' : 'Missing',
      available: tools.mediainfo,
    },
  ];

  return (
    <div className="space-y-6">
      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Tool Availability */}
      <div className={cn(
        'p-4 rounded-lg border',
        isDark 
          ? 'bg-slate-700/20 border-slate-600/30' 
          : 'bg-gray-50 border-gray-200'
      )}>
        <h4 className={cn(
          'font-semibold mb-3',
          isDark ? 'text-white' : 'text-gray-900'
        )}>
          Required Tools
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {toolStats.map((tool, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className={cn(
                'text-sm',
                isDark ? 'text-slate-300' : 'text-gray-700'
              )}>
                {tool.label}
              </span>
              <div className="flex items-center space-x-2">
                {tool.available ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircleIcon className="w-4 h-4 text-red-500" />
                )}
                <span className={cn(
                  'text-sm font-medium',
                  tool.available ? 'text-green-500' : 'text-red-500'
                )}>
                  {tool.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};