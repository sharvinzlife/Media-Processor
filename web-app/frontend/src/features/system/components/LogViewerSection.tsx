import React, { useState, useEffect, useRef } from 'react';
import {
  DocumentTextIcon,
  ArrowPathIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  AdjustmentsHorizontalIcon,
  CpuChipIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../contexts/ThemeContext';
import { cn } from '../../../utils/cn';
import { Button } from '../../../components/Button';
import { systemApi } from '../../../api/endpoints';
import useAppStore from '../../../store';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

interface LogViewerSectionProps {
  onRefresh?: () => void;
}

export const LogViewerSection: React.FC<LogViewerSectionProps> = ({
  onRefresh,
}) => {
  const { isDark } = useTheme();
  const { addNotification } = useAppStore();
  
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [maxLines, setMaxLines] = useState(100);
  const [filterLevel, setFilterLevel] = useState('all');
  const [activeService, setActiveService] = useState<'python' | 'web'>('python');
  const pythonLogContainerRef = useRef<HTMLDivElement>(null);
  const webLogContainerRef = useRef<HTMLDivElement>(null);

  // Fetch Python service logs
  const { data: pythonLogsData, isLoading: isPythonLoading, refetch: refetchPython } = useQuery({
    queryKey: ['system', 'logs', 'python', maxLines, filterLevel],
    queryFn: async () => {
      const response = await systemApi.getLogs({
        service: 'python',
        maxLines,
        level: filterLevel === 'all' ? undefined : filterLevel,
      });
      return response.data;
    },
    refetchInterval: isAutoRefresh ? 5000 : false,
    enabled: true,
  });

  // Fetch Web UI service logs
  const { data: webLogsData, isLoading: isWebLoading, refetch: refetchWeb } = useQuery({
    queryKey: ['system', 'logs', 'web', maxLines, filterLevel],
    queryFn: async () => {
      const response = await systemApi.getLogs({
        service: 'web',
        maxLines,
        level: filterLevel === 'all' ? undefined : filterLevel,
      });
      return response.data;
    },
    refetchInterval: isAutoRefresh ? 5000 : false,
    enabled: true,
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (activeService === 'python' && pythonLogContainerRef.current && pythonLogsData?.logs) {
      pythonLogContainerRef.current.scrollTop = pythonLogContainerRef.current.scrollHeight;
    }
  }, [pythonLogsData?.logs, activeService]);

  useEffect(() => {
    if (activeService === 'web' && webLogContainerRef.current && webLogsData?.logs) {
      webLogContainerRef.current.scrollTop = webLogContainerRef.current.scrollHeight;
    }
  }, [webLogsData?.logs, activeService]);

  const handleClearLogs = async () => {
    try {
      await systemApi.clearLogs({
        service: activeService
      });
      addNotification('success', `${activeService === 'python' ? 'Python' : 'Web UI'} logs cleared successfully`);
      if (activeService === 'python') {
        refetchPython();
      } else {
        refetchWeb();
      }
    } catch (error) {
      addNotification('error', 'Failed to clear logs');
    }
  };

  const currentLogsData = activeService === 'python' ? pythonLogsData : webLogsData;
  const isLoading = activeService === 'python' ? isPythonLoading : isWebLoading;
  const logs: LogEntry[] = currentLogsData?.logs || [];

  const refetch = () => {
    if (activeService === 'python') {
      refetchPython();
    } else {
      refetchWeb();
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-500';
      case 'warning':
      case 'warn':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      case 'debug':
        return 'text-gray-500';
      default:
        return isDark ? 'text-slate-300' : 'text-gray-700';
    }
  };

  const getLevelBg = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return isDark ? 'bg-red-900/20' : 'bg-red-50';
      case 'warning':
      case 'warn':
        return isDark ? 'bg-yellow-900/20' : 'bg-yellow-50';
      case 'info':
        return isDark ? 'bg-blue-900/20' : 'bg-blue-50';
      case 'debug':
        return isDark ? 'bg-gray-800/20' : 'bg-gray-50';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Service Tabs */}
      <div className="flex items-center space-x-1 mb-4">
        <button
          onClick={() => setActiveService('python')}
          className={cn(
            'flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeService === 'python'
              ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
              : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
          )}
        >
          <CpuChipIcon className="w-4 h-4 mr-2" />
          Python Service
        </button>
        <button
          onClick={() => setActiveService('web')}
          className={cn(
            'flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeService === 'web'
              ? (isDark ? 'bg-green-600 text-white' : 'bg-green-500 text-white')
              : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
          )}
        >
          <ServerIcon className="w-4 h-4 mr-2" />
          Web UI Service
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          >
            {isAutoRefresh ? (
              <PauseIcon className="w-4 h-4 mr-2" />
            ) : (
              <PlayIcon className="w-4 h-4 mr-2" />
            )}
            {isAutoRefresh ? 'Pause' : 'Resume'}
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isLoading ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowPathIcon className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Filter Level */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className={cn(
              'px-3 py-1 rounded border text-sm',
              isDark
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            )}
          >
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>

          {/* Max Lines */}
          <select
            value={maxLines}
            onChange={(e) => setMaxLines(Number(e.target.value))}
            className={cn(
              'px-3 py-1 rounded border text-sm',
              isDark
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            )}
          >
            <option value={50}>50 lines</option>
            <option value={100}>100 lines</option>
            <option value={200}>200 lines</option>
            <option value={500}>500 lines</option>
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearLogs}
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Log Viewer */}
      <div className={cn(
        'rounded-lg border overflow-hidden',
        isDark
          ? 'bg-slate-900/50 border-slate-700'
          : 'bg-gray-50 border-gray-200'
      )}>
        {/* Service Header */}
        <div className={cn(
          'px-4 py-2 border-b flex items-center justify-between',
          activeService === 'python'
            ? (isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200')
            : (isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200')
        )}>
          <div className="flex items-center space-x-2">
            {activeService === 'python' ? (
              <CpuChipIcon className="w-4 h-4 text-blue-500" />
            ) : (
              <ServerIcon className="w-4 h-4 text-green-500" />
            )}
            <span className={cn(
              'text-sm font-medium',
              isDark ? 'text-white' : 'text-gray-900'
            )}>
              {activeService === 'python' ? 'Media Processor Python Service' : 'Web UI Service'} Logs
            </span>
          </div>
          <span className={cn(
            'text-xs px-2 py-1 rounded',
            activeService === 'python'
              ? (isDark ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-800')
              : (isDark ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800')
          )}>
            {activeService === 'python' ? 'Port: N/A' : 'Port: 3005'}
          </span>
        </div>
        <div
          ref={activeService === 'python' ? pythonLogContainerRef : webLogContainerRef}
          className="h-96 overflow-y-auto p-4 font-mono text-sm"
        >
          {isLoading && logs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className={cn(
                  'text-sm',
                  isDark ? 'text-slate-400' : 'text-gray-600'
                )}>
                  Loading logs...
                </p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <DocumentTextIcon className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                <p className={cn(
                  'text-sm',
                  isDark ? 'text-slate-400' : 'text-gray-600'
                )}>
                  No logs available
                </p>
                <p className={cn(
                  'text-xs mt-1',
                  isDark ? 'text-slate-500' : 'text-gray-500'
                )}>
                  Logs will appear here as the system runs
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-2 rounded text-xs leading-relaxed',
                    getLevelBg(log.level)
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <span className={cn(
                      'font-medium whitespace-nowrap',
                      isDark ? 'text-slate-400' : 'text-gray-500'
                    )}>
                      {log.timestamp}
                    </span>
                    <span className={cn(
                      'font-bold uppercase text-xs px-2 py-0.5 rounded whitespace-nowrap',
                      getLevelColor(log.level)
                    )}>
                      {log.level}
                    </span>
                    {log.source && (
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded whitespace-nowrap',
                        isDark ? 'text-slate-500 bg-slate-800' : 'text-gray-600 bg-gray-200'
                      )}>
                        {log.source}
                      </span>
                    )}
                    <span className={cn(
                      'flex-1 break-words',
                      isDark ? 'text-slate-200' : 'text-gray-800'
                    )}>
                      {log.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className={cn(
        'flex items-center justify-between p-3 rounded-lg border text-xs',
        isDark
          ? 'bg-slate-800/30 border-slate-700 text-slate-400'
          : 'bg-gray-100 border-gray-200 text-gray-600'
      )}>
        <div className="flex items-center space-x-4">
          <span>
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </span>
          <span>•</span>
          <span>
            Service: {activeService === 'python' ? 'Python' : 'Web UI'}
          </span>
          <span>•</span>
          <span>
            Auto-refresh: {isAutoRefresh ? 'ON' : 'OFF'}
          </span>
          <span>•</span>
          <span>
            Filter: {filterLevel === 'all' ? 'All levels' : filterLevel}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <AdjustmentsHorizontalIcon className="w-4 h-4" />
          <span>Max {maxLines} lines</span>
        </div>
      </div>
    </div>
  );
};