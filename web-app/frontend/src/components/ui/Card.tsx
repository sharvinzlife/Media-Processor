import React from 'react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'solid' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'glass',
  size = 'md',
  noPadding = false,
  children,
  ...props
}) => {
  const { isDark } = useTheme();
  
  const variants = {
    default: isDark 
      ? 'bg-slate-800/50 border border-slate-700/50'
      : 'bg-white/70 border border-gray-200/50',
    glass: isDark 
      ? 'bg-slate-800/30 backdrop-blur-xl border border-slate-600/30 shadow-2xl'
      : 'bg-white/90 backdrop-blur-xl border border-slate-300/60 shadow-2xl',
    solid: isDark 
      ? 'bg-slate-800 border border-slate-700'
      : 'bg-white border border-slate-300',
    gradient: isDark 
      ? 'bg-gradient-to-br from-slate-800/40 to-slate-900/60 border border-slate-600/30 backdrop-blur-xl'
      : 'bg-gradient-to-br from-white/90 to-slate-50/90 border border-slate-300/60 backdrop-blur-xl',
  };

  const sizes = {
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-300 hover:shadow-xl',
        isDark ? 'hover:border-slate-500/40' : 'hover:border-gray-300/60',
        variants[variant],
        !noPadding && sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  children,
  className,
  titleClassName,
  subtitleClassName,
  ...props
}) => {
  const { isDark } = useTheme();
  
  return (
    <div className={cn('flex items-start justify-between mb-6', className)} {...props}>
      <div className="flex-1">
        {title && (
          <h3 className={cn(
            'text-xl font-bold mb-1',
            isDark ? 'text-white' : 'text-gray-900',
            titleClassName
          )}>
            {title}
          </h3>
        )}
        {subtitle && (
          <p className={cn(
            'text-sm',
            isDark ? 'text-slate-400' : 'text-gray-600',
            subtitleClassName
          )}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
};