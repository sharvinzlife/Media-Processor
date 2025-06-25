import React from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  BeakerIcon, 
  LanguageIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import { useTheme } from '../../../contexts/ThemeContext';
import { cn } from '../../../utils/cn';
import type { AppSettings } from '../../../types';

interface ProcessingSettingsSectionProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  errors: Record<string, string>;
}

export const ProcessingSettingsSection: React.FC<ProcessingSettingsSectionProps> = ({
  settings,
  onUpdate,
  errors,
}) => {
  const { isDark } = useTheme();

  const toggleClassName = cn(
    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer',
    'focus:outline-none focus:ring-2 focus:ring-purple-500/20'
  );

  const toggleButtonClassName = cn(
    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm'
  );

  const labelClassName = cn(
    'block text-sm font-medium mb-2',
    isDark ? 'text-slate-300' : 'text-gray-700'
  );

  const descriptionClassName = cn(
    'text-xs mt-1',
    isDark ? 'text-slate-400' : 'text-gray-500'
  );

  const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label: string;
    description: string;
    icon: React.ReactNode;
    color?: string;
  }> = ({ enabled, onChange, label, description, icon, color = 'purple' }) => {
    const colorClasses = {
      purple: enabled ? 'bg-purple-600' : (isDark ? 'bg-slate-600' : 'bg-gray-300'),
      blue: enabled ? 'bg-blue-600' : (isDark ? 'bg-slate-600' : 'bg-gray-300'),
      green: enabled ? 'bg-green-600' : (isDark ? 'bg-slate-600' : 'bg-gray-300'),
      amber: enabled ? 'bg-amber-600' : (isDark ? 'bg-slate-600' : 'bg-gray-300'),
    };

    return (
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 mt-1">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <label className={labelClassName}>
              {label}
            </label>
            <button
              type="button"
              onClick={() => onChange(!enabled)}
              className={cn(
                toggleClassName,
                colorClasses[color as keyof typeof colorClasses]
              )}
            >
              <span
                className={cn(
                  toggleButtonClassName,
                  enabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
          <p className={descriptionClassName}>
            {description}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Processing Enable/Disable */}
      <ToggleSwitch
        enabled={settings.processing_enabled}
        onChange={(enabled) => onUpdate({ processing_enabled: enabled })}
        label="Enable Processing"
        description="Enable or disable automatic media processing. When disabled, files will be monitored but not processed."
        icon={settings.processing_enabled ? 
          <PlayIcon className="w-5 h-5 text-green-500" /> : 
          <PauseIcon className="w-5 h-5 text-red-500" />
        }
        color="green"
      />

      <div className={cn(
        'border-t pt-6',
        isDark ? 'border-slate-600' : 'border-gray-200'
      )}>
        {/* Dry Run Mode */}
        <ToggleSwitch
          enabled={settings.dry_run || false}
          onChange={(enabled) => onUpdate({ dry_run: enabled })}
          label="Dry Run Mode"
          description="Test mode - processes files without actually moving or modifying them. Useful for testing configurations."
          icon={<BeakerIcon className="w-5 h-5 text-amber-500" />}
          color="amber"
        />
      </div>

      <div className={cn(
        'border-t pt-6',
        isDark ? 'border-slate-600' : 'border-gray-200'
      )}>
        {/* Language Extraction */}
        <ToggleSwitch
          enabled={settings.extract_languages || false}
          onChange={(enabled) => onUpdate({ extract_languages: enabled })}
          label="Language Track Extraction"
          description="Extract specific language tracks from media files (especially Malayalam content). This reduces file size by removing unwanted audio/subtitle tracks."
          icon={<LanguageIcon className="w-5 h-5 text-blue-500" />}
          color="blue"
        />
      </div>

      {/* Processing Information */}
      <div className={cn(
        'p-6 rounded-lg border',
        isDark 
          ? 'bg-slate-800/50 border-slate-600/50' 
          : 'bg-slate-50 border-slate-200'
      )}>
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className={cn(
            'w-6 h-6 flex-shrink-0 mt-0.5',
            isDark ? 'text-blue-400' : 'text-blue-500'
          )} />
          <div>
            <h4 className={cn(
              'font-semibold mb-2',
              isDark ? 'text-white' : 'text-gray-900'
            )}>
              Processing Workflow
            </h4>
            <ul className={cn(
              'space-y-1 text-sm',
              isDark ? 'text-slate-300' : 'text-gray-700'
            )}>
              <li>• <strong>Detection:</strong> Identifies media type (movie/TV) and language</li>
              <li>• <strong>Language Extraction:</strong> Extracts Malayalam audio + English subtitles (if enabled)</li>
              <li>• <strong>Organization:</strong> Creates structured paths based on content type</li>
              <li>• <strong>Transfer:</strong> Copies files to SMB network share</li>
              <li>• <strong>Cleanup:</strong> Removes temporary files and empty directories</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Malayalam Processing Special Note */}
      <div className={cn(
        'p-4 rounded-lg border',
        isDark 
          ? 'bg-purple-900/20 border-purple-700/30 text-purple-300' 
          : 'bg-purple-50 border-purple-200 text-purple-700'
      )}>
        <p className="text-sm">
          <strong>Malayalam Content:</strong> When language extraction is enabled, Malayalam movies and TV shows 
          will have ALL non-Malayalam audio tracks removed, keeping only Malayalam audio and English subtitles. 
          This can reduce file size by 40-60% while preserving the content you want.
        </p>
      </div>
    </div>
  );
};