import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader } from '../../components/ui/Card';
import { mediaApi } from '../../api/endpoints';
import useAppStore from '../../store';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  formatRelativeTime, 
  cleanFileName, 
  truncate,
  getMediaTypeEmoji,
  getLanguageEmoji,
  getStatusEmoji,
  normalizeStatus
} from '../../utils/format';
import { cn } from '../../utils/cn';

export const FileHistory: React.FC = () => {
  const { fileHistory, setFileHistory } = useAppStore();
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tvshow'>('all');
  const [filterLanguage, setFilterLanguage] = useState<'all' | 'english' | 'malayalam'>('all');

  // Fetch file history
  const { isLoading, isError } = useQuery({
    queryKey: ['fileHistory'],
    queryFn: async () => {
      const response = await mediaApi.getFileHistory();
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
    enabled: true,
  });

  // Handle data fetching
  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await mediaApi.getFileHistory();
        const data = response.data;
        
        if (data?.success && data.history) {
          setFileHistory(data.history);
        }
      } catch (error) {
        console.error('File history error:', error);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [setFileHistory]);

  // Filter files based on search and filters
  const filteredFiles = useMemo(() => {
    return fileHistory.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || file.type === filterType;
      const matchesLanguage = filterLanguage === 'all' || file.language === filterLanguage;
      
      return matchesSearch && matchesType && matchesLanguage;
    });
  }, [fileHistory, searchTerm, filterType, filterLanguage]);

  return (
    <div className="min-h-screen p-6">
      <Card variant="gradient" noPadding>
        <div className="p-6">
          <CardHeader
            title="File History"
            subtitle={`${filteredFiles.length} files processed`}
          />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5",
              isDark ? "text-slate-400" : "text-slate-500"
            )} />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="input w-full sm:w-auto"
          >
            <option value="all">All Types</option>
            <option value="movie">Movies</option>
            <option value="tvshow">TV Shows</option>
          </select>

          {/* Language Filter */}
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value as any)}
            className="input w-full sm:w-auto"
          >
            <option value="all">All Languages</option>
            <option value="english">English</option>
            <option value="malayalam">Malayalam</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={cn(
            "border-y",
            isDark 
              ? "bg-slate-800 border-slate-700" 
              : "bg-slate-50 border-slate-300"
          )}>
            <tr>
              <th className={cn(
                "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                isDark ? "text-slate-400" : "text-slate-700"
              )}>
                File Name
              </th>
              <th className={cn(
                "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                isDark ? "text-slate-400" : "text-slate-700"
              )}>
                Type
              </th>
              <th className={cn(
                "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                isDark ? "text-slate-400" : "text-slate-700"
              )}>
                Language
              </th>
              <th className={cn(
                "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                isDark ? "text-slate-400" : "text-slate-700"
              )}>
                Size
              </th>
              <th className={cn(
                "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                isDark ? "text-slate-400" : "text-slate-700"
              )}>
                Status
              </th>
              <th className={cn(
                "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                isDark ? "text-slate-400" : "text-slate-700"
              )}>
                Processed
              </th>
            </tr>
          </thead>
          <tbody className={cn(
            "divide-y",
            isDark ? "divide-slate-700" : "divide-slate-200"
          )}>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                  <p className={cn(
                    "mt-2",
                    isDark ? "text-slate-400" : "text-slate-600"
                  )}>Loading file history...</p>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={6} className={cn(
                  "px-6 py-12 text-center",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  Failed to load file history
                </td>
              </tr>
            ) : filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={6} className={cn(
                  "px-6 py-12 text-center",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  {searchTerm || filterType !== 'all' || filterLanguage !== 'all' 
                    ? 'No files match your filters' 
                    : 'No files processed yet'}
                </td>
              </tr>
            ) : (
              filteredFiles.map((file, index) => (
                <tr key={index} className={cn(
                  "transition-colors",
                  isDark 
                    ? "hover:bg-slate-800/50" 
                    : "hover:bg-slate-50"
                )}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getMediaTypeEmoji(file.type)}</span>
                      <div>
                        <p className={cn(
                          "text-sm font-medium",
                          isDark ? "text-slate-200" : "text-slate-800"
                        )}>
                          {truncate(cleanFileName(file.name), 50)}
                        </p>
                        {file.path && (
                          <p className={cn(
                            "text-xs mt-1",
                            isDark ? "text-slate-400" : "text-slate-500"
                          )}>
                            {truncate(file.path, 60)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "capitalize text-sm",
                      isDark ? "text-slate-300" : "text-slate-700"
                    )}>{file.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span>{getLanguageEmoji(file.language)}</span>
                      <span className={cn(
                        "capitalize text-sm",
                        isDark ? "text-slate-300" : "text-slate-700"
                      )}>{file.language}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-sm",
                      isDark ? "text-slate-300" : "text-slate-700"
                    )}>
                      {file.size || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span>{getStatusEmoji(file.status)}</span>
                      <span 
                        className={cn(
                          'text-sm capitalize',
                          normalizeStatus(file.status) === 'success' && 'text-green-500',
                          normalizeStatus(file.status) === 'failed' && 'text-red-500',
                          normalizeStatus(file.status) === 'processing' && 'text-blue-500',
                          normalizeStatus(file.status) === 'skipped' && 'text-yellow-500'
                        )}
                      >
                        {normalizeStatus(file.status)}
                      </span>
                    </div>
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-sm",
                    isDark ? "text-slate-300" : "text-slate-700"
                  )}>
                    {formatRelativeTime(file.processedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
};