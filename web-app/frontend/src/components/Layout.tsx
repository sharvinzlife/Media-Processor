import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChartBarIcon,
  DocumentIcon,
  CogIcon,
  CircleStackIcon,
  ComputerDesktopIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', icon: ChartBarIcon, id: 'dashboard' },
  { name: 'File History', icon: DocumentIcon, id: 'files' },
  { name: 'Settings', icon: CogIcon, id: 'settings' },
  { name: 'Database', icon: CircleStackIcon, id: 'database' },
  { name: 'System', icon: ComputerDesktopIcon, id: 'system' },
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <LayoutContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="min-h-screen bg-animated-gradient">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />
        
        {/* Mobile sidebar backdrop */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <motion.div
          initial={false}
          animate={{ x: sidebarOpen ? 0 : '-100%' }}
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 glass-card m-4 rounded-2xl lg:translate-x-0 lg:static lg:inset-auto lg:w-64',
            'transition-transform duration-300 ease-in-out lg:transition-none'
          )}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h1 className="text-xl font-bold gradient-text">Media Processor</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </motion.div>

        {/* Main content */}
        <div className="lg:ml-72">
          {/* Top bar */}
          <div className="glass-card m-4 rounded-2xl p-4 lg:hidden">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-slate-400 hover:text-slate-300"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-semibold gradient-text">Media Processor</h1>
              <div />
            </div>
          </div>

          {/* Content */}
          <main className="p-4 lg:p-6 relative">
            {children}
          </main>
        </div>
      </div>
    </LayoutContext.Provider>
  );
};