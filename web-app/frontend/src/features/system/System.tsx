import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ComputerDesktopIcon,
  ServerIcon,
  CpuChipIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';
import { systemApi, serviceApi } from '../../api/endpoints';
import useAppStore from '../../store';

import { SystemStatsSection } from './components/SystemStatsSection';
import { LogViewerSection } from './components/LogViewerSection';
import { ServiceStatusSection } from './components/ServiceStatusSection';

export const System: React.FC = () => {
  const { isDark } = useTheme();
  const { addNotification } = useAppStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch system diagnostics
  const { data: systemData, isLoading: isLoadingSystem, refetch: refetchSystem } = useQuery({
    queryKey: ['system', 'diagnostics'],
    queryFn: async () => {
      const response = await systemApi.getDiagnostics();
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch service status
  const { data: serviceData, isLoading: isLoadingService, refetch: refetchService } = useQuery({
    queryKey: ['service', 'status'],
    queryFn: async () => {
      const response = await serviceApi.getStatus();
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchSystem(), refetchService()]);
      addNotification('success', 'System data refreshed successfully');
    } catch (error) {
      addNotification('error', 'Failed to refresh system data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = isLoadingSystem || isLoadingService;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className={cn('text-lg', isDark ? 'text-slate-400' : 'text-slate-600')}>
            Loading system information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className={cn(
            'text-3xl font-bold mb-2',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            <ComputerDesktopIcon className="w-8 h-8 inline-block mr-3" />
            System Monitoring
          </h1>
          <p className={cn(
            'text-lg',
            isDark ? 'text-slate-400' : 'text-slate-600'
          )}>
            Real-time system diagnostics and service monitoring
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowPathIcon className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Service Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader
              title="Service Status"
              subtitle="Monitor running services"
            >
              <ServerIcon className="w-6 h-6 text-blue-500" />
            </CardHeader>
            <CardContent>
              <ServiceStatusSection
                serviceData={serviceData}
                onRefresh={refetchService}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* System Statistics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="xl:col-span-2"
        >
          <Card>
            <CardHeader
              title="System Statistics"
              subtitle="Hardware and performance metrics"
            >
              <CpuChipIcon className="w-6 h-6 text-green-500" />
            </CardHeader>
            <CardContent>
              <SystemStatsSection
                systemData={systemData}
                onRefresh={refetchSystem}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Log Viewer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader
            title="System Logs"
            subtitle="Real-time application logs and diagnostics"
          >
            <ChartBarIcon className="w-6 h-6 text-purple-500" />
          </CardHeader>
          <CardContent>
            <LogViewerSection />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};