import React from 'react';
import { Card, CardHeader, CardContent } from './Card';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

interface SummaryItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface SummaryCardProps {
  title: string;
  subtitle?: string;
  items: SummaryItem[];
  isLoading?: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  subtitle,
  items,
  isLoading = false
}) => {
  const { isDark } = useTheme();
  
  return (
    <Card variant="gradient">
      <CardHeader title={title} subtitle={subtitle} />
      <CardContent>
        <div className="space-y-6">
          {items.map((item, index) => (
            <div 
              key={index} 
              className={cn(
                "flex justify-between items-center py-3 border-b last:border-b-0",
                isDark ? "border-slate-600/30" : "border-slate-300/50"
              )}
            >
              <span className={cn(
                "font-medium",
                isDark ? "text-slate-300" : "text-slate-900"
              )}>{item.label}</span>
              <span className={cn(
                "font-bold",
                item.highlight 
                  ? "text-3xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
                  : cn(
                      "text-xl",
                      isDark ? "text-white" : "text-slate-900"
                    )
              )}>
                {isLoading ? (
                  <div className={cn(
                    "w-16 h-6 rounded animate-pulse",
                    isDark ? "bg-slate-600/50" : "bg-slate-300/50"
                  )} />
                ) : (
                  item.value
                )}
              </span>
            </div>
          ))}
          
          {/* Last Update Status */}
          <div className="flex justify-between items-center pt-4">
            <span className={cn(
              "text-sm",
              isDark ? "text-slate-400" : "text-slate-700"
            )}>Last Update</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm text-emerald-400 font-medium">
                {isLoading ? 'Updating...' : 'Live'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};