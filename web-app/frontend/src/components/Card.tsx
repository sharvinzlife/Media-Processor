import React from 'react';
import { cn } from '../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'solid';
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'glass',
  noPadding = false,
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-slate-800 border border-slate-700',
    glass: 'glass-card',
    solid: 'bg-slate-800',
  };

  return (
    <div
      className={cn(
        'rounded-xl',
        variants[variant],
        !noPadding && 'p-6',
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
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  children,
  className,
  ...props
}) => {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      <div>
        {title && <h3 className="text-lg font-semibold text-slate-100">{title}</h3>}
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
        {children}
      </div>
      {action && <div>{action}</div>}
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