import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <ArrowPathIcon 
      className={cn(
        'animate-spin',
        sizeClasses[size],
        className
      )} 
    />
  );
};

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
  avatar?: boolean;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className,
  lines = 3,
  avatar = false 
}) => {
  const { isDark } = useTheme();

  return (
    <div className={cn('animate-pulse', className)}>
      {avatar && (
        <div className={cn(
          'rounded-full w-12 h-12 mb-4',
          isDark ? 'bg-slate-700' : 'bg-gray-300'
        )} />
      )}
      
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-4 rounded',
              isDark ? 'bg-slate-700' : 'bg-gray-300',
              index === lines - 1 ? 'w-2/3' : 'w-full'
            )}
          />
        ))}
      </div>
    </div>
  );
};

interface LoadingCardProps {
  className?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ className }) => {
  const { isDark } = useTheme();

  return (
    <div className={cn(
      'rounded-2xl p-6 animate-pulse',
      isDark 
        ? 'bg-slate-800/30 border border-slate-600/30' 
        : 'bg-white/70 border border-gray-200/50',
      className
    )}>
      <div className="flex items-center space-x-4 mb-4">
        <div className={cn(
          'w-10 h-10 rounded-lg',
          isDark ? 'bg-slate-700' : 'bg-gray-300'
        )} />
        <div className="flex-1">
          <div className={cn(
            'h-4 rounded mb-2 w-3/4',
            isDark ? 'bg-slate-700' : 'bg-gray-300'
          )} />
          <div className={cn(
            'h-3 rounded w-1/2',
            isDark ? 'bg-slate-700' : 'bg-gray-300'
          )} />
        </div>
      </div>
      
      <div className="space-y-3">
        <div className={cn(
          'h-3 rounded',
          isDark ? 'bg-slate-700' : 'bg-gray-300'
        )} />
        <div className={cn(
          'h-3 rounded w-5/6',
          isDark ? 'bg-slate-700' : 'bg-gray-300'
        )} />
        <div className={cn(
          'h-3 rounded w-4/6',
          isDark ? 'bg-slate-700' : 'bg-gray-300'
        )} />
      </div>
    </div>
  );
};

interface LoadingPageProps {
  title?: string;
  subtitle?: string;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  title = 'Loading...',
  subtitle = 'Please wait while we fetch your data'
}) => {
  const { isDark } = useTheme();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <LoadingSpinner size="xl" className={cn(
          'mx-auto mb-6',
          isDark ? 'text-blue-400' : 'text-blue-500'
        )} />
        <h2 className={cn(
          'text-2xl font-bold mb-2',
          isDark ? 'text-white' : 'text-gray-900'
        )}>
          {title}
        </h2>
        <p className={cn(
          'text-lg',
          isDark ? 'text-slate-400' : 'text-slate-600'
        )}>
          {subtitle}
        </p>
      </div>
    </div>
  );
};

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...'
}) => {
  const { isDark } = useTheme();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Loading content */}
      <div className={cn(
        'relative bg-white rounded-2xl p-8 shadow-2xl border max-w-sm w-full mx-4',
        isDark ? 'bg-slate-800 border-slate-600' : 'border-gray-200'
      )}>
        <div className="text-center">
          <LoadingSpinner size="lg" className={cn(
            'mx-auto mb-4',
            isDark ? 'text-blue-400' : 'text-blue-500'
          )} />
          <p className={cn(
            'text-lg font-medium',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};