import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FilmIcon, TvIcon } from '@heroicons/react/24/outline';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardContent } from '../../components/Card';
import { mediaApi } from '../../api/endpoints';
import useAppStore from '../../store';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const slogans = [
  "🎬 Your Ultimate Media Hub",
  "🚀 Processing Media with Style",
  "✨ Streamlining Your Collection", 
  "🎯 Smart Media Organization",
  "🔥 Lightning Fast Processing",
  "💎 Crystal Clear Quality",
  "🌟 Premium Media Experience",
  "🎪 Entertainment Central Station",
  "🎭 Where Movies Come Alive",
  "📺 TV Shows Organized Perfectly"
];

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ text, speed = 50, onComplete }) => {
  const [displayText, setDisplayText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      const timer = setTimeout(onComplete, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed, onComplete]);

  React.useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <span className="inline-block">
      {displayText}
      <motion.span
        className="inline-block w-0.5 h-6 bg-current ml-1"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </span>
  );
};

const TypewriterSlogan: React.FC = () => {
  const { isDark } = useTheme();
  const [currentSloganIndex, setCurrentSloganIndex] = React.useState(0);

  const handleSloganComplete = () => {
    setTimeout(() => {
      setCurrentSloganIndex(prev => (prev + 1) % slogans.length);
    }, 2000);
  };

  return (
    <motion.div
      className="h-12 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.5 }}
    >
      <div className={cn(
        "text-xl md:text-2xl font-medium",
        isDark ? "text-slate-300" : "text-slate-800"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSloganIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
          >
            <TypewriterText 
              text={slogans[currentSloganIndex]} 
              speed={80}
              onComplete={handleSloganComplete}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const Dashboard: React.FC = () => {
  const { stats, setStats, addNotification } = useAppStore();
  const { isDark } = useTheme();
  const prevStatsRef = React.useRef(stats);

  // Fetch stats with React Query
  const { isLoading, data: queryData } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await mediaApi.getStats();
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: true,
  });

  // Handle query data changes
  React.useEffect(() => {
    if (queryData?.success && queryData.stats) {
      const newStats = queryData.stats;
      const prevStats = prevStatsRef.current;
      
      // Only update if stats have actually changed
      const hasChanged = 
        newStats.english_movies !== prevStats.english_movies ||
        newStats.malayalam_movies !== prevStats.malayalam_movies ||
        newStats.english_tv_shows !== prevStats.english_tv_shows ||
        newStats.malayalam_tv_shows !== prevStats.malayalam_tv_shows;
      
      if (hasChanged) {
        // Check if any values have increased (only if we have previous stats)
        const hasNewFiles = prevStats.english_movies > 0 && (
          newStats.english_movies > prevStats.english_movies ||
          newStats.malayalam_movies > prevStats.malayalam_movies ||
          newStats.english_tv_shows > prevStats.english_tv_shows ||
          newStats.malayalam_tv_shows > prevStats.malayalam_tv_shows
        );
        
        if (hasNewFiles) {
          addNotification('success', 'New media files processed!');
        }
        
        setStats(newStats);
        prevStatsRef.current = newStats;
      }
    }
  }, [queryData, setStats, addNotification]);

  // Prepare chart data
  const chartData = [
    { name: 'English Movies', value: stats.english_movies, color: '#3B82F6' },
    { name: 'Malayalam Movies', value: stats.malayalam_movies, color: '#8B5CF6' },
    { name: 'English TV Shows', value: stats.english_tv_shows, color: '#F59E0B' },
    { name: 'Malayalam TV Shows', value: stats.malayalam_tv_shows, color: '#10B981' },
  ].filter(item => item.value > 0);

  const totalFiles = 
    stats.english_movies + 
    stats.malayalam_movies + 
    stats.english_tv_shows + 
    stats.malayalam_tv_shows;

  return (
    <div className="space-y-6 px-6 py-4">
      {/* Animated Header Section */}
      <motion.header
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={cn(
          "relative overflow-hidden backdrop-blur-xl border-b rounded-xl mb-8",
          isDark
            ? "bg-gradient-to-r from-slate-900/70 via-slate-800/80 to-slate-900/70 border-slate-700/50"
            : "bg-gradient-to-r from-white/95 via-slate-50/95 to-white/95 border-slate-300/50"
        )}
      >
        <div className="relative z-20 container mx-auto px-6 py-6">
          <div className="text-center space-y-4">
            {/* Main Title */}
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-4 relative z-20"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "backOut" }}
            >
              <span 
                className="emoji inline-block mr-3 text-5xl relative z-30" 
                style={{ 
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                  WebkitTextFillColor: 'initial',
                  color: 'initial'
                }}
              >
                🎬
              </span>
              <span className="gradient-text">Media Library Dashboard</span>
              <span 
                className="emoji inline-block ml-3 text-5xl relative z-30" 
                style={{ 
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                  WebkitTextFillColor: 'initial',
                  color: 'initial'
                }}
              >
                📺
              </span>
            </motion.h1>

            {/* Animated Slogan with Typewriter */}
            <TypewriterSlogan />

            {/* Subtitle */}
            <motion.p
              className={cn(
                "text-lg max-w-3xl mx-auto leading-relaxed",
                isDark ? "text-slate-400" : "text-slate-700"
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              Track your media processing statistics in real-time with beautiful visualizations and seamless organization
            </motion.p>

            {/* Feature Pills */}
            <motion.div
              className="flex flex-wrap justify-center gap-3 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {[
                { icon: "⚡", label: "Fast Processing" },
                { icon: "🎯", label: "Smart Detection" },
                { icon: "📊", label: "Real-time Stats" },
                { icon: "🔒", label: "Secure Storage" }
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm cursor-pointer relative overflow-hidden group",
                    isDark
                      ? "bg-slate-800/50 text-slate-300 border border-slate-600/30"
                      : "bg-white/90 text-slate-800 border border-slate-300/60"
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.1, 
                    y: -5,
                    transition: { type: "spring", stiffness: 400, damping: 10 }
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  {/* Hover background effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                    style={{
                      background: isDark 
                        ? "linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))"
                        : "linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))"
                    }}
                    transition={{ duration: 0.3 }}
                  />
                  
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full"
                    transition={{ duration: 0.6 }}
                  />
                  
                  {/* Animated emoji */}
                  <motion.span 
                    className="text-lg relative z-10"
                    whileHover={{
                      rotate: [0, -10, 10, 0],
                      scale: 1.2,
                      transition: { duration: 0.4 }
                    }}
                  >
                    {item.icon}
                  </motion.span>
                  
                  {/* Text with glow effect */}
                  <motion.span 
                    className="text-sm font-medium relative z-10"
                    whileHover={{
                      textShadow: isDark 
                        ? "0 0 8px rgba(59, 130, 246, 0.6)" 
                        : "0 0 8px rgba(59, 130, 246, 0.4)",
                      transition: { duration: 0.3 }
                    }}
                  >
                    {item.label}
                  </motion.span>
                  
                  {/* Border highlight */}
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Dashboard Stats Header with Live Indicator */}
      <div className="relative">
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-2xl font-bold gradient-text">Live Statistics</h2>
          
          {/* Animated Green Live Light */}
          <motion.div
            className="relative flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-sm"
            style={{
              background: isDark 
                ? 'rgba(16, 185, 129, 0.1)' 
                : 'rgba(16, 185, 129, 0.05)'
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          >
            {/* Pulsing green dot */}
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="w-3 h-3 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50" />
              
              {/* Ring animation */}
              <motion.div
                className="absolute inset-0 border-2 border-emerald-400 rounded-full"
                animate={{
                  scale: [1, 2, 2.5],
                  opacity: [0.8, 0.3, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
              
              {/* Second ring for more effect */}
              <motion.div
                className="absolute inset-0 border border-emerald-300 rounded-full"
                animate={{
                  scale: [1, 1.8, 2.2],
                  opacity: [0.6, 0.2, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.3
                }}
              />
            </motion.div>
            
            {/* Live text */}
            <motion.span 
              className="text-sm font-semibold text-emerald-400"
              animate={{
                opacity: [1, 0.7, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              LIVE
            </motion.span>
            
            {/* Glowing background */}
            <motion.div
              className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        </div>
        
        <p className={cn(
          isDark ? "text-slate-400" : "text-slate-600"
        )}>
          Track your media processing statistics in real-time
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="English Movies"
          value={stats.english_movies}
          icon={<FilmIcon />}
          color="blue"
          delay={0}
        />
        <StatCard
          title="Malayalam Movies"
          value={stats.malayalam_movies}
          icon={<FilmIcon />}
          color="purple"
          delay={0.1}
        />
        <StatCard
          title="English TV Shows"
          value={stats.english_tv_shows}
          icon={<TvIcon />}
          color="amber"
          delay={0.2}
        />
        <StatCard
          title="Malayalam TV Shows"
          value={stats.malayalam_tv_shows}
          icon={<TvIcon />}
          color="emerald"
          delay={0.3}
        />
      </div>

      {/* Chart and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Chart */}
        <Card>
          <CardHeader
            title="Media Distribution"
            subtitle="Visual breakdown of your library"
          />
          <CardContent>
            {totalFiles > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className={cn(
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>No media files processed yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader
            title="Library Summary"
            subtitle="Quick overview of your collection"
          />
          <CardContent>
            <div className="space-y-4">
              <div className={cn(
                "flex justify-between items-center py-3 border-b",
                isDark ? "border-slate-700" : "border-slate-300"
              )}>
                <span className={cn(
                  isDark ? "text-slate-400" : "text-slate-900"
                )}>Total Files</span>
                <span className="text-2xl font-bold gradient-text">{totalFiles}</span>
              </div>
              <div className={cn(
                "flex justify-between items-center py-3 border-b",
                isDark ? "border-slate-700" : "border-slate-300"
              )}>
                <span className={cn(
                  isDark ? "text-slate-400" : "text-slate-900"
                )}>Movies</span>
                <span className={cn(
                  "text-xl font-semibold",
                  isDark ? "text-slate-200" : "text-slate-800"
                )}>
                  {stats.english_movies + stats.malayalam_movies}
                </span>
              </div>
              <div className={cn(
                "flex justify-between items-center py-3 border-b",
                isDark ? "border-slate-700" : "border-slate-300"
              )}>
                <span className={cn(
                  isDark ? "text-slate-400" : "text-slate-900"
                )}>TV Shows</span>
                <span className={cn(
                  "text-xl font-semibold",
                  isDark ? "text-slate-200" : "text-slate-800"
                )}>
                  {stats.english_tv_shows + stats.malayalam_tv_shows}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className={cn(
                  isDark ? "text-slate-400" : "text-slate-900"
                )}>Last Update</span>
                <span className={cn(
                  "text-sm",
                  isDark ? "text-slate-300" : "text-slate-700"
                )}>
                  {isLoading ? 'Updating...' : 'Live'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};