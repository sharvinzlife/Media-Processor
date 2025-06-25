import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/Card';
import { cn } from '../../utils/cn';
import { formatNumber } from '../../utils/format';
import { useTheme } from '../../contexts/ThemeContext';

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, delay = 0 }) => {
  const { isDark } = useTheme();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="stat-card glass-card-hover">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={cn(
              "text-sm mb-1 font-medium uppercase tracking-wide",
              isDark ? "text-slate-400" : "text-slate-700"
            )}>{title}</p>
            <motion.p
              className={cn(
                "text-3xl font-bold mb-1",
                isDark ? "text-white" : "text-slate-900"
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: delay + 0.2 }}
            >
              {formatNumber(value)}
            </motion.p>
          </div>
          <div className={cn('p-3 rounded-lg bg-opacity-10', color)}>
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};