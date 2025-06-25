import React from 'react';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../../contexts/ThemeContext';
import { cn } from '../../../utils/cn';
import { Button } from '../../../components/Button';
import { serviceApi } from '../../../api/endpoints';
import useAppStore from '../../../store';

interface ServiceStatusSectionProps {
  serviceData?: {
    success: boolean;
    python_service?: {
      status: string;
      pid?: number;
    };
    web_service?: {
      status: string;
      pid?: number;
    };
    // Legacy single service support
    status?: string;
  };
  onRefresh: () => void;
}

export const ServiceStatusSection: React.FC<ServiceStatusSectionProps> = ({
  serviceData,
  onRefresh,
}) => {
  const { isDark } = useTheme();
  const { addNotification } = useAppStore();
  const queryClient = useQueryClient();

  // Python service control mutations
  const startPythonServiceMutation = useMutation({
    mutationFn: () => serviceApi.start('python'),
    onSuccess: () => {
      addNotification('success', 'Python service started successfully');
      queryClient.invalidateQueries({ queryKey: ['service'] });
      onRefresh();
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.error || 'Failed to start Python service');
    },
  });

  const stopPythonServiceMutation = useMutation({
    mutationFn: () => serviceApi.stop('python'),
    onSuccess: () => {
      addNotification('success', 'Python service stopped successfully');
      queryClient.invalidateQueries({ queryKey: ['service'] });
      onRefresh();
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.error || 'Failed to stop Python service');
    },
  });

  const restartPythonServiceMutation = useMutation({
    mutationFn: () => serviceApi.restart('python'),
    onSuccess: () => {
      addNotification('success', 'Python service restarted successfully');
      queryClient.invalidateQueries({ queryKey: ['service'] });
      onRefresh();
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.error || 'Failed to restart Python service');
    },
  });

  // Web service control mutations
  const restartWebServiceMutation = useMutation({
    mutationFn: () => serviceApi.restart('web'),
    onSuccess: () => {
      addNotification('success', 'Web UI service restarted successfully');
      queryClient.invalidateQueries({ queryKey: ['service'] });
      onRefresh();
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.error || 'Failed to restart Web UI service');
    },
  });

  const pythonServiceStatus = serviceData?.python_service?.status || serviceData?.status;
  const webServiceStatus = serviceData?.web_service?.status || 'active'; // Web service is always running if we can access this page
  
  const isPythonRunning = pythonServiceStatus === 'active';
  const isWebRunning = webServiceStatus === 'active';
  const hasPythonData = pythonServiceStatus !== undefined;
  const hasWebData = webServiceStatus !== undefined;

  const getServiceIcon = (isRunning: boolean, hasData: boolean) => {
    if (!hasData) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
    }
    return isRunning ? 
      <CheckCircleIcon className="w-5 h-5 text-green-500" /> :
      <XCircleIcon className="w-5 h-5 text-red-500" />;
  };

  const getServiceStatusText = (isRunning: boolean, hasData: boolean) => {
    if (!hasData) return 'Unknown';
    return isRunning ? 'Running' : 'Stopped';
  };

  const getServiceStatusColor = (isRunning: boolean, hasData: boolean) => {
    if (!hasData) return 'text-amber-500';
    return isRunning ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Service Status Display */}
      <div className="space-y-4">
        {/* Python Service Status */}
        <div className={cn(
          'p-4 rounded-lg border',
          isDark 
            ? 'bg-slate-700/30 border-slate-600/30' 
            : 'bg-white/50 border-gray-200/50'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getServiceIcon(isPythonRunning, hasPythonData)}
              <div>
                <h4 className={cn(
                  'font-medium text-sm',
                  isDark ? 'text-white' : 'text-gray-900'
                )}>
                  Python Service
                </h4>
                <p className={cn('text-xs', getServiceStatusColor(isPythonRunning, hasPythonData))}>
                  {getServiceStatusText(isPythonRunning, hasPythonData)}
                </p>
              </div>
            </div>
            {serviceData?.python_service?.pid && (
              <span className={cn(
                'text-xs px-2 py-1 rounded',
                isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'
              )}>
                PID: {serviceData.python_service.pid}
              </span>
            )}
          </div>
        </div>

        {/* Web Service Status */}
        <div className={cn(
          'p-4 rounded-lg border',
          isDark 
            ? 'bg-slate-700/30 border-slate-600/30' 
            : 'bg-white/50 border-gray-200/50'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getServiceIcon(isWebRunning, hasWebData)}
              <div>
                <h4 className={cn(
                  'font-medium text-sm',
                  isDark ? 'text-white' : 'text-gray-900'
                )}>
                  Web UI Service
                </h4>
                <p className={cn('text-xs', getServiceStatusColor(isWebRunning, hasWebData))}>
                  {getServiceStatusText(isWebRunning, hasWebData)}
                </p>
              </div>
            </div>
            {serviceData?.web_service?.pid && (
              <span className={cn(
                'text-xs px-2 py-1 rounded',
                isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'
              )}>
                PID: {serviceData.web_service.pid}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Service Controls */}
      <div className="space-y-4">
        {/* Python Service Controls */}
        <div>
          <h4 className={cn(
            'font-medium text-sm mb-3',
            isDark ? 'text-slate-300' : 'text-gray-700'
          )}>
            Python Service Controls
          </h4>
          
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => startPythonServiceMutation.mutate()}
              disabled={isPythonRunning || startPythonServiceMutation.isPending}
            >
              {startPythonServiceMutation.isPending ? (
                <ArrowPathIcon className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <PlayIcon className="w-3 h-3 mr-1" />
              )}
              Start
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => stopPythonServiceMutation.mutate()}
              disabled={!isPythonRunning || stopPythonServiceMutation.isPending}
            >
              {stopPythonServiceMutation.isPending ? (
                <ArrowPathIcon className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <StopIcon className="w-3 h-3 mr-1" />
              )}
              Stop
            </Button>
            
            <Button
              size="sm"
              onClick={() => restartPythonServiceMutation.mutate()}
              disabled={restartPythonServiceMutation.isPending}
            >
              {restartPythonServiceMutation.isPending ? (
                <ArrowPathIcon className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <ArrowPathIcon className="w-3 h-3 mr-1" />
              )}
              Restart
            </Button>
          </div>
        </div>

        {/* Web Service Controls */}
        <div>
          <h4 className={cn(
            'font-medium text-sm mb-3',
            isDark ? 'text-slate-300' : 'text-gray-700'
          )}>
            Web UI Service Controls
          </h4>
          
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => restartWebServiceMutation.mutate()}
              disabled={restartWebServiceMutation.isPending}
            >
              {restartWebServiceMutation.isPending ? (
                <ArrowPathIcon className="w-3 h-3 animate-spin mr-2" />
              ) : (
                <ArrowPathIcon className="w-3 h-3 mr-2" />
              )}
              Restart Web UI
            </Button>
          </div>
          
          <p className={cn(
            'text-xs mt-2',
            isDark ? 'text-slate-500' : 'text-gray-500'
          )}>
            Note: Stopping Web UI will disconnect this dashboard
          </p>
        </div>
      </div>

      {/* Service Information */}
      <div className={cn(
        'p-3 rounded-lg border',
        isDark 
          ? 'bg-blue-900/20 border-blue-700/30' 
          : 'bg-blue-50 border-blue-200'
      )}>
        <p className={cn(
          'text-xs',
          isDark ? 'text-blue-300' : 'text-blue-700'
        )}>
          <strong>Python Service:</strong> Handles automatic file processing and organization.<br/>
          <strong>Web UI Service:</strong> Provides this dashboard interface (Port 3005).
        </p>
      </div>
    </div>
  );
};