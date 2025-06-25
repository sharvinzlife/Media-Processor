import React, { useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout, LayoutContext } from './components/ui/Layout';
import { NotificationContainer } from './components/Notification';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './features/dashboard/Dashboard';
import { FileHistory } from './features/files/FileHistory';
import { Settings } from './features/settings/Settings';
import { Database } from './features/database/Database';
import { System } from './features/system/System';
import { ThemeProvider } from './contexts/ThemeContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (cacheTime renamed to gcTime)
    },
  },
});

const AppContent: React.FC = () => {
  const { activeTab } = useContext(LayoutContext);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'files':
        return <FileHistory />;
      case 'settings':
        return <Settings />;
      case 'database':
        return <Database />;
      case 'system':
        return <System />;
      default:
        return <Dashboard />;
    }
  };

  return renderContent();
};

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Layout>
            <AppContent />
          </Layout>
          <NotificationContainer />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
