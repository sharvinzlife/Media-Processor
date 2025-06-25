import React from 'react';
import {
  ExclamationTriangleIcon,
  WifiIcon,
  ServerIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import { Button } from './Button';
import { Card } from './ui/Card';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils/cn';

interface ErrorStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
    icon?: React.ReactNode;
  }>;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  icon,
  actions = [],
  className,
}) => {
  const { isDark } = useTheme();

  return (
    <div className={cn('flex items-center justify-center p-6', className)}>
      <Card className="max-w-lg">
        <div className="text-center">
          <div className="mb-4">
            {icon || <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto" />}
          </div>
          
          <h3 className={cn(
            'text-xl font-bold mb-2',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {title}
          </h3>
          
          <p className={cn(
            'text-sm mb-6',
            isDark ? 'text-slate-400' : 'text-gray-600'
          )}>
            {message}
          </p>
          
          {actions.length > 0 && (
            <div className="flex justify-center space-x-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  variant={action.variant || 'primary'}
                  size="sm"
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ onRetry, className }) => {
  return (
    <ErrorState
      title="Connection Error"
      message="Unable to connect to the server. Please check your network connection and try again."
      icon={<WifiIcon className="w-16 h-16 text-red-500 mx-auto" />}
      actions={onRetry ? [
        {
          label: 'Try Again',
          onClick: onRetry,
          icon: <ArrowPathIcon className="w-4 h-4" />,
        }
      ] : []}
      className={className}
    />
  );
};

interface ServerErrorProps {
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export const ServerError: React.FC<ServerErrorProps> = ({ 
  onRetry, 
  onGoHome, 
  className 
}) => {
  const actions = [];
  
  if (onRetry) {
    actions.push({
      label: 'Try Again',
      onClick: onRetry,
      icon: <ArrowPathIcon className="w-4 h-4" />,
    });
  }
  
  if (onGoHome) {
    actions.push({
      label: 'Go Home',
      onClick: onGoHome,
      variant: 'secondary' as const,
      icon: <HomeIcon className="w-4 h-4" />,
    });
  }

  return (
    <ErrorState
      title="Server Error"
      message="The server encountered an error while processing your request. Please try again later."
      icon={<ServerIcon className="w-16 h-16 text-red-500 mx-auto" />}
      actions={actions}
      className={className}
    />
  );
};

interface NotFoundErrorProps {
  resource?: string;
  onGoHome?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export const NotFoundError: React.FC<NotFoundErrorProps> = ({ 
  resource = 'page',
  onGoHome,
  onGoBack,
  className 
}) => {
  const actions = [];
  
  if (onGoBack) {
    actions.push({
      label: 'Go Back',
      onClick: onGoBack,
      variant: 'secondary' as const,
    });
  }
  
  if (onGoHome) {
    actions.push({
      label: 'Go Home',
      onClick: onGoHome,
      icon: <HomeIcon className="w-4 h-4" />,
    });
  }

  return (
    <ErrorState
      title={`${resource} Not Found`}
      message={`The ${resource.toLowerCase()} you're looking for doesn't exist or has been moved.`}
      icon={<DocumentTextIcon className="w-16 h-16 text-amber-500 mx-auto" />}
      actions={actions}
      className={className}
    />
  );
};

interface PermissionErrorProps {
  onGoHome?: () => void;
  className?: string;
}

export const PermissionError: React.FC<PermissionErrorProps> = ({ 
  onGoHome, 
  className 
}) => {
  return (
    <ErrorState
      title="Access Denied"
      message="You don't have permission to access this resource. Please contact your administrator."
      icon={<ExclamationTriangleIcon className="w-16 h-16 text-amber-500 mx-auto" />}
      actions={onGoHome ? [
        {
          label: 'Go Home',
          onClick: onGoHome,
          icon: <HomeIcon className="w-4 h-4" />,
        }
      ] : []}
      className={className}
    />
  );
};

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  action,
  className,
}) => {
  const { isDark } = useTheme();

  return (
    <div className={cn('flex items-center justify-center p-6', className)}>
      <div className="text-center max-w-md">
        <div className="mb-4">
          {icon || <DocumentTextIcon className={cn(
            'w-16 h-16 mx-auto',
            isDark ? 'text-slate-600' : 'text-gray-400'
          )} />}
        </div>
        
        <h3 className={cn(
          'text-xl font-bold mb-2',
          isDark ? 'text-slate-300' : 'text-gray-700'
        )}>
          {title}
        </h3>
        
        <p className={cn(
          'text-sm mb-6',
          isDark ? 'text-slate-500' : 'text-gray-500'
        )}>
          {message}
        </p>
        
        {action && (
          <Button onClick={action.onClick}>
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
};