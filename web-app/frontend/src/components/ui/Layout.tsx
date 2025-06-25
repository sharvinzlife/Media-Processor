import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  DocumentIcon,
  CogIcon,
  CircleStackIcon,
  ComputerDesktopIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedHeader } from './AnimatedHeader';
import { AnimatedFooter } from './AnimatedFooter';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', icon: ChartBarIcon, id: 'dashboard', emoji: '📊' },
  { name: 'File History', icon: DocumentIcon, id: 'files', emoji: '📁' },
  { name: 'Settings', icon: CogIcon, id: 'settings', emoji: '⚙️' },
  { name: 'Database', icon: CircleStackIcon, id: 'database', emoji: '🗄️' },
  { name: 'System', icon: ComputerDesktopIcon, id: 'system', emoji: '🖥️' },
];

interface LayoutContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const LayoutContext = React.createContext<LayoutContextType>({
  activeTab: 'dashboard',
  setActiveTab: () => {},
});

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(() => {
    // Persist activeTab in localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('media-processor-active-tab') || 'dashboard';
    }
    return 'dashboard';
  });
  const { isDark, toggleTheme } = useTheme();

  // Save activeTab to localStorage when it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('media-processor-active-tab', activeTab);
    }
  }, [activeTab]);

  return (
    <LayoutContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn(
        "min-h-screen relative",
        isDark 
          ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
          : "bg-gradient-to-br from-slate-100 via-slate-50 to-white"
      )}>
        {/* Background Effects */}
        <div className={cn(
          "fixed inset-0 pointer-events-none",
          isDark
            ? "bg-[radial-gradient(circle_at_20%_80%,_rgba(120,119,198,0.1)_0%,_transparent_50%),radial-gradient(circle_at_80%_20%,_rgba(255,119,198,0.1)_0%,_transparent_50%),radial-gradient(circle_at_40%_40%,_rgba(120,219,255,0.1)_0%,_transparent_50%)]"
            : "bg-[radial-gradient(circle_at_20%_80%,_rgba(59,130,246,0.1)_0%,_transparent_50%),radial-gradient(circle_at_80%_20%,_rgba(147,51,234,0.1)_0%,_transparent_50%)]"
        )} />

        {/* Top Navigation Bar */}
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn(
            "fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b",
            isDark
              ? "bg-slate-900/95 border-slate-700/50"
              : "bg-white/95 border-slate-300/50"
          )}
        >
          <div className="w-full px-6">
            <div className="flex items-center justify-between h-20 max-w-full">
              {/* Logo Section */}
              <motion.div 
                className="flex items-center gap-4 flex-shrink-0"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-3xl">🎬</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold gradient-text">Media Processor</h1>
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 bg-emerald-400 rounded-full"
                      animate={{
                        opacity: [1, 0.3, 1],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <span className={cn(
                      "text-xs font-medium",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>Live</span>
                  </div>
                </div>
              </motion.div>

              {/* Navigation Items */}
              <div className="flex items-center justify-center flex-1">
                <div className="flex items-center space-x-6">
                {navigation.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden min-w-[90px]',
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : isDark
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                      )}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      whileHover={{ 
                        scale: 1.05,
                        y: -2,
                        transition: { type: "spring", stiffness: 400 }
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Hover background effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100"
                        transition={{ duration: 0.3 }}
                      />
                      
                      {/* Emoji with bounce animation */}
                      <motion.span
                        className="text-xl relative z-10"
                        whileHover={{
                          scale: 1.2,
                          rotate: [0, -10, 10, 0],
                          transition: { duration: 0.3 }
                        }}
                      >
                        {item.emoji}
                      </motion.span>
                      
                      {/* Label */}
                      <span className={cn(
                        "text-sm font-medium relative z-10 text-center whitespace-nowrap",
                        isActive ? "text-white" : ""
                      )}>
                        {item.name}
                      </span>
                      
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          className="absolute bottom-0 left-1/2 w-12 h-1 bg-white rounded-t-full"
                          initial={{ scale: 0, x: "-50%" }}
                          animate={{ scale: 1, x: "-50%" }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        />
                      )}
                      
                      {/* Shimmer effect on hover */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full"
                        transition={{ duration: 0.6 }}
                      />
                    </motion.button>
                  );
                })}
                </div>
              </div>

              {/* Theme Toggle */}
              <div className="flex-shrink-0">
                <motion.button
                  onClick={toggleTheme}
                  className={cn(
                    "p-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                    isDark
                      ? "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
                  )}
                  whileHover={{ scale: 1.1, rotate: 180 }}
                  whileTap={{ scale: 0.9 }}
                  title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                <motion.div
                  initial={false}
                  animate={{ rotate: isDark ? 0 : 180 }}
                  transition={{ duration: 0.3 }}
                >
                  {isDark ? (
                    <SunIcon className="w-6 h-6" />
                  ) : (
                    <MoonIcon className="w-6 h-6" />
                  )}
                </motion.div>
                
                {/* Glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-yellow-400/20 to-orange-400/20 opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.3 }}
                />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.nav>

        {/* Main content with top padding */}
        <div className="flex flex-col min-h-screen pt-20">
          {/* Content */}
          <main className="flex-1 relative">
            {children}
          </main>

          {/* Animated Footer */}
          <AnimatedFooter />
        </div>
      </div>
    </LayoutContext.Provider>
  );
};