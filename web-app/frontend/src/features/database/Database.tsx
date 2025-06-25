import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CircleStackIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';
import { formatBytes, formatDistanceToNow } from '../../utils/format';
import { databaseApi } from '../../api/endpoints';
import useAppStore from '../../store';
import type { DatabaseBackup, DatabaseHealth } from '../../types';

import { BackupListSection } from './components/BackupListSection';
import { DatabaseStatsSection } from './components/DatabaseStatsSection';
import { DatabaseActionsSection } from './components/DatabaseActionsSection';

export const Database: React.FC = () => {
  const { isDark } = useTheme();
  const { addNotification } = useAppStore();
  const queryClient = useQueryClient();
  
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch database health
  const { data: healthData, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['database', 'health'],
    queryFn: async () => {
      const response = await databaseApi.getHealth();
      return response.data.health;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch database backups
  const { data: backupsData, isLoading: isLoadingBackups } = useQuery({
    queryKey: ['database', 'backups'],
    queryFn: async () => {
      const response = await databaseApi.getBackups();
      return response.data.backups;
    },
  });

  // Fetch database info
  const { data: infoData, isLoading: isLoadingInfo } = useQuery({
    queryKey: ['database', 'info'],
    queryFn: async () => {
      const response = await databaseApi.getInfo();
      return response.data;
    },
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: ({ type, compress }: { type: 'manual' | 'auto'; compress: boolean }) => 
      databaseApi.backup(type, compress),
    onSuccess: (response) => {
      if (response.data.success) {
        addNotification('success', 'Database backup created successfully');
        queryClient.invalidateQueries({ queryKey: ['database', 'backups'] });
        queryClient.invalidateQueries({ queryKey: ['database', 'health'] });
      } else {
        addNotification('error', response.data.error || 'Failed to create backup');
      }
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.error || 'Failed to create backup');
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: (backupPath: string) => databaseApi.restore(backupPath),
    onSuccess: (response) => {
      if (response.data.success) {
        addNotification('success', 'Database restored successfully');
        queryClient.invalidateQueries({ queryKey: ['database'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['file-history'] });
      } else {
        addNotification('error', response.data.error || 'Failed to restore database');
      }
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.error || 'Failed to restore database');
    },
  });

  // Sync database mutation
  const syncDatabaseMutation = useMutation({
    mutationFn: () => databaseApi.sync(),
    onSuccess: (response) => {
      if (response.data.success) {
        addNotification('success', 'Database synchronized successfully');
        queryClient.invalidateQueries({ queryKey: ['database'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['file-history'] });
      } else {
        addNotification('error', response.data.error || 'Failed to sync database');
      }
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.error || 'Failed to sync database');
    },
  });

  // Handle backup creation
  const handleCreateBackup = async (compress = true) => {
    setIsCreatingBackup(true);
    try {
      await createBackupMutation.mutateAsync({ type: 'manual', compress });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Handle database sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncDatabaseMutation.mutateAsync();
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle backup restore
  const handleRestore = async (backup: DatabaseBackup) => {
    if (!confirm(`Are you sure you want to restore from "${backup.name}"? This will overwrite the current database.`)) {
      return;
    }
    
    await restoreBackupMutation.mutateAsync(backup.path);
  };

  const isLoading = isLoadingHealth || isLoadingBackups || isLoadingInfo;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className={cn('text-lg', isDark ? 'text-slate-400' : 'text-slate-600')}>
            Loading database information...
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
            <CircleStackIcon className="w-8 h-8 inline-block mr-3" />
            Database Management
          </h1>
          <p className={cn(
            'text-lg',
            isDark ? 'text-slate-400' : 'text-slate-600'
          )}>
            Backup, restore, and monitor your media database
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowPathIcon className="w-4 h-4 mr-2" />
            )}
            Sync Database
          </Button>
          
          <Button
            onClick={() => handleCreateBackup(true)}
            disabled={isCreatingBackup}
          >
            {isCreatingBackup ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
            )}
            Create Backup
          </Button>
        </div>
      </motion.div>

      {/* Database Health Status */}
      {healthData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader
              title="Database Health"
              subtitle="Current status and integrity information"
            >
              <ShieldCheckIcon className={cn(
                'w-6 h-6',
                healthData.status === 'healthy' ? 'text-green-500' :
                healthData.status === 'warning' ? 'text-amber-500' : 'text-red-500'
              )} />
            </CardHeader>
            <CardContent>
              <DatabaseStatsSection 
                health={healthData} 
                info={infoData} 
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Database Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader
              title="Database Operations"
              subtitle="Manage database state and integrity"
            >
              <DocumentDuplicateIcon className="w-6 h-6 text-blue-500" />
            </CardHeader>
            <CardContent>
              <DatabaseActionsSection
                onBackup={handleCreateBackup}
                onSync={handleSync}
                isCreatingBackup={isCreatingBackup}
                isSyncing={isSyncing}
                health={healthData}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Backup Management */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader
              title="Backup Management"
              subtitle="View and restore database backups"
            >
              <ClockIcon className="w-6 h-6 text-purple-500" />
            </CardHeader>
            <CardContent>
              <BackupListSection
                backups={backupsData || []}
                onRestore={handleRestore}
                isRestoring={restoreBackupMutation.isPending}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Information Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardContent noPadding>
            <div className={cn(
              'p-6 rounded-lg border',
              isDark 
                ? 'bg-blue-900/20 border-blue-700/30' 
                : 'bg-blue-50 border-blue-200'
            )}>
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className={cn(
                  'w-6 h-6 flex-shrink-0 mt-0.5',
                  isDark ? 'text-blue-400' : 'text-blue-500'
                )} />
                <div>
                  <h4 className={cn(
                    'font-semibold mb-2',
                    isDark ? 'text-blue-300' : 'text-blue-700'
                  )}>
                    Database Management Features
                  </h4>
                  <ul className={cn(
                    'space-y-1 text-sm',
                    isDark ? 'text-blue-200' : 'text-blue-600'
                  )}>
                    <li>• <strong>Automatic Backups:</strong> Scheduled backups with compression</li>
                    <li>• <strong>Manual Backups:</strong> Create on-demand backups with metadata</li>
                    <li>• <strong>Database Sync:</strong> Synchronize from JSON files and history sources</li>
                    <li>• <strong>Health Monitoring:</strong> Real-time integrity checks and performance metrics</li>
                    <li>• <strong>Restore Operations:</strong> Point-in-time restoration with verification</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};