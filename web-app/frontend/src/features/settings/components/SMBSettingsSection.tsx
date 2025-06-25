import React from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../../contexts/ThemeContext';
import { cn } from '../../../utils/cn';
import type { AppSettings } from '../../../types';

interface SMBSettingsSectionProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  errors: Record<string, string>;
}

export const SMBSettingsSection: React.FC<SMBSettingsSectionProps> = ({
  settings,
  onUpdate,
  errors,
}) => {
  const { isDark } = useTheme();
  const [showPassword, setShowPassword] = React.useState(false);

  const inputClassName = cn(
    'w-full px-4 py-3 rounded-lg border transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
    isDark 
      ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400' 
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500',
    'hover:border-blue-400'
  );

  const labelClassName = cn(
    'block text-sm font-medium mb-2',
    isDark ? 'text-slate-300' : 'text-gray-700'
  );

  const errorClassName = 'text-red-500 text-sm mt-1';

  return (
    <div className="space-y-6">
      {/* SMB Server */}
      <div>
        <label className={labelClassName}>
          SMB Server
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          value={settings.smb_server || ''}
          onChange={(e) => onUpdate({ smb_server: e.target.value })}
          placeholder="e.g., nas.local or 192.168.1.100"
          className={cn(
            inputClassName,
            errors.smb_server && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
          )}
        />
        {errors.smb_server && (
          <p className={errorClassName}>{errors.smb_server}</p>
        )}
      </div>

      {/* SMB Share */}
      <div>
        <label className={labelClassName}>
          SMB Share
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          value={settings.smb_share || ''}
          onChange={(e) => onUpdate({ smb_share: e.target.value })}
          placeholder="e.g., Media or Data"
          className={cn(
            inputClassName,
            errors.smb_share && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
          )}
        />
        {errors.smb_share && (
          <p className={errorClassName}>{errors.smb_share}</p>
        )}
      </div>

      {/* Username */}
      <div>
        <label className={labelClassName}>
          Username
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          value={settings.smb_username || ''}
          onChange={(e) => onUpdate({ smb_username: e.target.value })}
          placeholder="SMB username"
          className={cn(
            inputClassName,
            errors.smb_username && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
          )}
        />
        {errors.smb_username && (
          <p className={errorClassName}>{errors.smb_username}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className={labelClassName}>
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={settings.smb_password || ''}
            onChange={(e) => onUpdate({ smb_password: e.target.value })}
            placeholder="SMB password"
            className={cn(
              inputClassName,
              'pr-12',
              errors.smb_password && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              'absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-md transition-colors',
              isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {showPassword ? (
              <EyeSlashIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.smb_password && (
          <p className={errorClassName}>{errors.smb_password}</p>
        )}
      </div>

      {/* Connection Test Info */}
      <div className={cn(
        'p-4 rounded-lg border',
        isDark 
          ? 'bg-blue-900/20 border-blue-700/30 text-blue-300' 
          : 'bg-blue-50 border-blue-200 text-blue-700'
      )}>
        <p className="text-sm">
          <strong>Note:</strong> Use the "Test SMB" button above to verify your connection settings. 
          Make sure your SMB server is accessible and the credentials are correct.
        </p>
      </div>
    </div>
  );
};