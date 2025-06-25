import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CogIcon, 
  FolderIcon, 
  ServerIcon, 
  PlayIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';
import { settingsApi, smbApi } from '../../api/endpoints';
import apiClient from '../../api/client';
import useAppStore from '../../store';
import type { AppSettings, SMBSettings } from '../../types';

import { SMBSettingsSection } from './components/SMBSettingsSection';
import { PathSettingsSection } from './components/PathSettingsSection';
import { ProcessingSettingsSection } from './components/ProcessingSettingsSection';
import { useSettingsValidation } from './hooks/useSettingsValidation';

export const Settings: React.FC = () => {
  const { isDark } = useTheme();
  const { addNotification, setSettings } = useAppStore();
  const queryClient = useQueryClient();
  
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [actualPassword, setActualPassword] = useState<string>('');

  const { validate, errors } = useSettingsValidation();

  // Fetch current settings
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await settingsApi.get();
      return response.data.settings;
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<AppSettings>) => settingsApi.update(settings),
    onSuccess: (response) => {
      if (response.data.success) {
        setSettings(localSettings!);
        setHasChanges(false);
        addNotification('success', 'Settings updated successfully');
        queryClient.invalidateQueries({ queryKey: ['settings'] });
      } else {
        addNotification('error', response.data.error || 'Failed to update settings');
      }
    },
    onError: (error: any) => {
      addNotification('error', error.response?.data?.error || 'Failed to update settings');
    },
  });

  // Test SMB connection
  const testSMBConnection = async () => {
    if (!localSettings) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Use the test connection endpoint with current form data
      const smbSettings = {
        server: localSettings.smb_server,
        share: localSettings.smb_share,
        username: localSettings.smb_username,
        password: actualPassword || localSettings.smb_password
      };
      
      const response = await apiClient.post('/api/test-connection', smbSettings);
      
      if (response.data.success) {
        setTestResult({ success: true, message: 'SMB connection successful!' });
        addNotification('success', 'SMB connection test passed');
      } else {
        setTestResult({ success: false, message: response.data.error || 'Connection failed' });
        addNotification('error', 'SMB connection test failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Connection test failed';
      setTestResult({ success: false, message: errorMessage });
      addNotification('error', errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  // Initialize local settings when data is loaded
  useEffect(() => {
    if (settingsData && !localSettings) {
      setLocalSettings(settingsData);
    }
  }, [settingsData, localSettings]);

  // Update local settings handler
  const updateLocalSettings = (updates: Partial<AppSettings>) => {
    if (!localSettings) return;
    
    // Track actual password separately if it's being updated
    if (updates.smb_password && updates.smb_password !== '********') {
      setActualPassword(updates.smb_password);
    }
    
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  // Save settings
  const handleSave = async () => {
    if (!localSettings) return;
    
    const validationResult = validate(localSettings);
    if (!validationResult.isValid) {
      addNotification('error', 'Please fix validation errors before saving');
      return;
    }
    
    updateSettingsMutation.mutate(localSettings);
  };

  // Reset settings
  const handleReset = () => {
    if (settingsData) {
      setLocalSettings({ ...settingsData });
      setHasChanges(false);
      setTestResult(null);
    }
  };

  if (isLoadingSettings || !localSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className={cn('text-lg', isDark ? 'text-slate-400' : 'text-slate-600')}>
            Loading settings...
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
            <CogIcon className="w-8 h-8 inline-block mr-3" />
            Settings & Configuration
          </h1>
          <p className={cn(
            'text-lg',
            isDark ? 'text-slate-400' : 'text-slate-600'
          )}>
            Configure your media processing preferences and connections
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          {testResult && (
            <div className={cn(
              'flex items-center px-3 py-1 rounded-lg text-sm font-medium',
              testResult.success
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            )}>
              {testResult.success ? (
                <CheckIcon className="w-4 h-4 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
              )}
              {testResult.message}
            </div>
          )}
          
          <Button
            variant="secondary"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            Reset
          </Button>
          
          <Button
            variant="secondary"
            onClick={testSMBConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <PlayIcon className="w-4 h-4 mr-2" />
            )}
            Test SMB
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Save Changes
          </Button>
        </div>
      </motion.div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* SMB Connection Settings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader
              title="SMB Connection"
              subtitle="Configure network share connection"
            >
              <ServerIcon className="w-6 h-6 text-blue-500" />
            </CardHeader>
            <CardContent>
              <SMBSettingsSection
                settings={localSettings}
                onUpdate={updateLocalSettings}
                errors={errors}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Media Paths Settings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader
              title="Media Paths"
              subtitle="Configure destination directories"
            >
              <FolderIcon className="w-6 h-6 text-green-500" />
            </CardHeader>
            <CardContent>
              <PathSettingsSection
                settings={localSettings}
                onUpdate={updateLocalSettings}
                errors={errors}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Processing Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="xl:col-span-2"
        >
          <Card>
            <CardHeader
              title="Processing Options"
              subtitle="Configure media processing behavior"
            >
              <CogIcon className="w-6 h-6 text-purple-500" />
            </CardHeader>
            <CardContent>
              <ProcessingSettingsSection
                settings={localSettings}
                onUpdate={updateLocalSettings}
                errors={errors}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Status Bar */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg border',
            isDark 
              ? 'bg-amber-900/90 border-amber-600/50 text-amber-200' 
              : 'bg-amber-50 border-amber-300 text-amber-800'
          )}
        >
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            You have unsaved changes
          </div>
        </motion.div>
      )}
    </div>
  );
};