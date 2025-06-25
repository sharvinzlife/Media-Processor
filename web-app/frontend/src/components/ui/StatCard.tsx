import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './Card';
import { cn } from '../../utils/cn';
import { formatNumber } from '../../utils/format';
import { useTheme } from '../../contexts/ThemeContext';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'amber' | 'emerald';
  delay?: number;
  trend?: {
    value: number;
    label: string;
  };
}

const colorConfig = {
  blue: {
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    gradient: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/20',
  },
  purple: {
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    gradient: 'from-purple-500/20 to-purple-600/10',
    border: 'border-purple-500/20',
  },
  amber: {
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/20',
  },
  emerald: {
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/20',
  },
};

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  color, 
  delay = 0, 
  trend 
}) => {
  const { isDark } = useTheme();
  const config = colorConfig[color];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        delay,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
    >
      <Card 
        variant="gradient" 
        className={cn(
          'relative overflow-hidden group cursor-pointer',
          'hover:shadow-2xl hover:shadow-blue-500/10',
          config.border
        )}
      >
        {/* Background Gradient */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-50',
          config.gradient
        )} />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className={cn(
                "text-sm font-medium mb-2 uppercase tracking-wide",
                isDark ? "text-slate-300" : "text-slate-800"
              )}>
                {title}
              </p>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: 'spring', 
                  delay: delay + 0.3,
                  stiffness: 200
                }}
              >
                <p className={cn(
                  "text-4xl font-bold mb-1",
                  isDark ? "text-white" : "text-slate-900"
                )}>
                  {formatNumber(value)}
                </p>
              </motion.div>
              
              {trend && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.5 }}
                  className={cn(
                    "flex items-center text-sm",
                    isDark ? "text-slate-400" : "text-slate-600"
                  )}
                >
                  <span className="text-emerald-400">+{trend.value}</span>
                  <span className="ml-1">{trend.label}</span>
                </motion.div>
              )}
            </div>
            
            <motion.div
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: delay + 0.2, duration: 0.5 }}
              className={cn(
                'p-3 rounded-xl',
                config.iconBg,
                'group-hover:scale-110 transition-transform duration-300'
              )}
            >
              <div className={cn('w-6 h-6', config.iconColor)}>
                {icon}
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Shimmer Effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </Card>
    </motion.div>
  );
};