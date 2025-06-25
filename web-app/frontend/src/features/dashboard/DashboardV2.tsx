import React from 'react';
import { FilmIcon, TvIcon } from '@heroicons/react/24/outline';
import { StatCard } from '../../components/ui/StatCard';
import { DistributionChart } from '../../components/charts/DistributionChart';
import { SummaryCard } from '../../components/ui/SummaryCard';
import useAppStore from '../../store';
import { formatNumber } from '../../utils/format';

export const DashboardV2: React.FC = () => {
  const { stats } = useAppStore();

  // Prepare chart data
  const chartData = [
    { name: 'English Movies', value: stats.english_movies, color: '#3b82f6' },
    { name: 'Malayalam Movies', value: stats.malayalam_movies, color: '#8b5cf6' },
    { name: 'English TV Shows', value: stats.english_tv_shows, color: '#f59e0b' },
    { name: 'Malayalam TV Shows', value: stats.malayalam_tv_shows, color: '#10b981' },
  ].filter(item => item.value > 0);

  const totalFiles = 
    stats.english_movies + 
    stats.malayalam_movies + 
    stats.english_tv_shows + 
    stats.malayalam_tv_shows;

  const totalMovies = stats.english_movies + stats.malayalam_movies;
  const totalTvShows = stats.english_tv_shows + stats.malayalam_tv_shows;

  const summaryItems = [
    { label: 'Total Files', value: formatNumber(totalFiles), highlight: true },
    { label: 'Movies', value: formatNumber(totalMovies) },
    { label: 'TV Shows', value: formatNumber(totalTvShows) },
    { label: 'Malayalam Content', value: formatNumber(stats.malayalam_movies + stats.malayalam_tv_shows) },
    { label: 'English Content', value: formatNumber(stats.english_movies + stats.english_tv_shows) },
  ];

  return (
    <div className="p-6 space-y-8">

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="English Movies"
          value={stats.english_movies}
          icon={<FilmIcon className="w-6 h-6" />}
          color="blue"
          delay={0}
        />
        <StatCard
          title="Malayalam Movies"
          value={stats.malayalam_movies}
          icon={<FilmIcon className="w-6 h-6" />}
          color="purple"
          delay={0.1}
        />
        <StatCard
          title="English TV Shows"
          value={stats.english_tv_shows}
          icon={<TvIcon className="w-6 h-6" />}
          color="amber"
          delay={0.2}
        />
        <StatCard
          title="Malayalam TV Shows"
          value={stats.malayalam_tv_shows}
          icon={<TvIcon className="w-6 h-6" />}
          color="emerald"
          delay={0.3}
        />
      </div>

      {/* Chart and Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <DistributionChart
            data={chartData}
            title="Media Distribution"
            subtitle="Visual breakdown of your media library"
          />
        </div>

        {/* Summary Card - Takes 1 column */}
        <div className="lg:col-span-1">
          <SummaryCard
            title="Library Overview"
            subtitle="Quick statistics summary"
            items={summaryItems}
          />
        </div>
      </div>

      {/* Additional Info Section */}
      {totalFiles > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="text-center p-6 rounded-2xl bg-slate-800/30 border border-slate-600/30">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {((stats.malayalam_movies + stats.malayalam_tv_shows) / totalFiles * 100).toFixed(1)}%
            </div>
            <div className="text-slate-300">Malayalam Content</div>
          </div>
          
          <div className="text-center p-6 rounded-2xl bg-slate-800/30 border border-slate-600/30">
            <div className="text-3xl font-bold text-emerald-400 mb-2">
              {((totalMovies) / totalFiles * 100).toFixed(1)}%
            </div>
            <div className="text-slate-300">Movies</div>
          </div>
          
          <div className="text-center p-6 rounded-2xl bg-slate-800/30 border border-slate-600/30">
            <div className="text-3xl font-bold text-amber-400 mb-2">
              {((totalTvShows) / totalFiles * 100).toFixed(1)}%
            </div>
            <div className="text-slate-300">TV Shows</div>
          </div>
        </div>
      )}
    </div>
  );
};