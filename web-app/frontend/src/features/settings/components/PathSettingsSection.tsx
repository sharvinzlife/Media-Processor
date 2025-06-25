import React from 'react';
import { FolderIcon, FilmIcon, TvIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../../contexts/ThemeContext';
import { cn } from '../../../utils/cn';
import type { AppSettings } from '../../../types';

interface PathSettingsSectionProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  errors: Record<string, string>;
}

export const PathSettingsSection: React.FC<PathSettingsSectionProps> = ({
  settings,
  onUpdate,
  errors,
}) => {
  const { isDark } = useTheme();

  const inputClassName = cn(
    'w-full px-4 py-3 rounded-lg border transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500',
    isDark 
      ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400' 
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500',
    'hover:border-green-400'
  );

  const labelClassName = cn(
    'block text-sm font-medium mb-2',
    isDark ? 'text-slate-300' : 'text-gray-700'
  );

  const errorClassName = 'text-red-500 text-sm mt-1';

  const pathSections = [
    {
      icon: <FilmIcon className="w-5 h-5 text-blue-500" />,
      title: 'English Movies',
      key: 'english_movies_path' as keyof AppSettings,
      placeholder: 'e.g., media/movies',
      description: 'Path for English movie files'
    },
    {
      icon: <FilmIcon className="w-5 h-5 text-purple-500" />,
      title: 'Malayalam Movies',
      key: 'malayalam_movies_path' as keyof AppSettings,
      placeholder: 'e.g., media/malayalam-movies',
      description: 'Path for Malayalam movie files'
    },
    {
      icon: <TvIcon className="w-5 h-5 text-amber-500" />,
      title: 'English TV Shows',
      key: 'english_tv_path' as keyof AppSettings,
      placeholder: 'e.g., media/tv-shows',
      description: 'Path for English TV show files'
    },
    {
      icon: <TvIcon className="w-5 h-5 text-green-500" />,
      title: 'Malayalam TV Shows',
      key: 'malayalam_tv_path' as keyof AppSettings,
      placeholder: 'e.g., media/malayalam-tv-shows',
      description: 'Path for Malayalam TV show files'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Download Path */}
      <div>
        <label className={labelClassName}>
          <div className="flex items-center">
            <FolderIcon className="w-5 h-5 mr-2 text-orange-500" />
            Download Path
            <span className="text-red-500 ml-1">*</span>
          </div>
        </label>
        <input
          type="text"
          value={settings.download_dir || ''}
          onChange={(e) => onUpdate({ download_dir: e.target.value })}
          placeholder="e.g., /Downloads or /path/to/jdownloader"
          className={cn(
            inputClassName,
            errors.download_dir && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
          )}
        />
        <p className={cn('text-xs mt-1', isDark ? 'text-slate-400' : 'text-gray-500')}>
          Source directory where downloaded files are located
        </p>
        {errors.download_dir && (
          <p className={errorClassName}>{errors.download_dir}</p>
        )}
      </div>

      <div className={cn(
        'border-t pt-6',
        isDark ? 'border-slate-600' : 'border-gray-200'
      )}>
        <h4 className={cn(
          'text-lg font-semibold mb-4',
          isDark ? 'text-white' : 'text-gray-900'
        )}>
          Destination Paths
        </h4>
        <p className={cn(
          'text-sm mb-6',
          isDark ? 'text-slate-400' : 'text-gray-600'
        )}>
          Relative paths from your SMB share root directory
        </p>

        {/* Media Destination Paths */}
        <div className="grid grid-cols-1 gap-6">
          {pathSections.map((section) => (
            <div key={section.key}>
              <label className={labelClassName}>
                <div className="flex items-center">
                  {section.icon}
                  <span className="ml-2">{section.title}</span>
                  <span className="text-red-500 ml-1">*</span>
                </div>
              </label>
              <input
                type="text"
                value={(settings[section.key] as string) || ''}
                onChange={(e) => onUpdate({ [section.key]: e.target.value })}
                placeholder={section.placeholder}
                className={cn(
                  inputClassName,
                  errors[section.key] && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                )}
              />
              <p className={cn('text-xs mt-1', isDark ? 'text-slate-400' : 'text-gray-500')}>
                {section.description}
              </p>
              {errors[section.key] && (
                <p className={errorClassName}>{errors[section.key]}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Path Info */}
      <div className={cn(
        'p-4 rounded-lg border',
        isDark 
          ? 'bg-green-900/20 border-green-700/30 text-green-300' 
          : 'bg-green-50 border-green-200 text-green-700'
      )}>
        <p className="text-sm">
          <strong>Path Structure:</strong> All destination paths are relative to your SMB share root. 
          For example, if your share is "Media" and you set English movies to "movies", 
          files will be saved to "//server/Media/movies/".
        </p>
      </div>
    </div>
  );
};