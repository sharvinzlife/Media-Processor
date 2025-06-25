import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface DistributionChartProps {
  data: ChartData[];
  title?: string;
  subtitle?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium">{data.name}</p>
        <p className="text-slate-300 text-sm">
          Count: <span className="text-white font-semibold">{data.value}</span>
        </p>
        <p className="text-slate-300 text-sm">
          Percentage: <span className="text-white font-semibold">
            {((data.value / data.payload.total) * 100).toFixed(1)}%
          </span>
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-slate-300">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export const DistributionChart: React.FC<DistributionChartProps> = ({
  data,
  title = "Media Distribution",
  subtitle = "Visual breakdown of your library"
}) => {
  const { isDark } = useTheme();
  const totalFiles = data.reduce((sum, item) => sum + item.value, 0);
  const dataWithTotal = data.map(item => ({ ...item, total: totalFiles }));

  if (totalFiles === 0) {
    return (
      <Card variant="gradient">
        <CardHeader title={title} subtitle={subtitle} />
        <CardContent>
          <div className="h-80 flex flex-col items-center justify-center text-center">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-4",
              isDark ? "bg-slate-700/50" : "bg-slate-300/50"
            )}>
              <svg 
                className={cn(
                  "w-8 h-8",
                  isDark ? "text-slate-400" : "text-slate-600"
                )} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className={cn(
              "text-lg font-semibold mb-2",
              isDark ? "text-white" : "text-slate-900"
            )}>No Data Available</h3>
            <p className={cn(
              "max-w-sm",
              isDark ? "text-slate-400" : "text-slate-700"
            )}>
              No media files have been processed yet. Files will appear here after processing.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="gradient">
      <CardHeader title={title} subtitle={subtitle} />
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithTotal}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                stroke="none"
              >
                {dataWithTotal.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};