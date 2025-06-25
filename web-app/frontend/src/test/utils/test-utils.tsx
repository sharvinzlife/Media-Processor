import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { Layout, LayoutProvider } from '../../components/ui/Layout';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LayoutProvider>
          {children}
        </LayoutProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Custom render with Layout (for full page components)
export const renderWithLayout = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const LayoutWrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders>
      <Layout>{children}</Layout>
    </AllTheProviders>
  );
  
  return render(ui, { wrapper: LayoutWrapper, ...options });
};

// Mock store state
export const createMockStore = (initialState?: any) => {
  return {
    stats: {
      english_movies: 5,
      malayalam_movies: 3,
      english_tv_shows: 8,
      malayalam_tv_shows: 4,
    },
    fileHistory: [],
    serviceStatus: 'active' as const,
    diagnostics: null,
    settings: null,
    smbSettings: null,
    isLoading: false,
    notifications: [],
    lastUpdate: Date.now(),
    ...initialState,
  };
};

// Test data factories
export const createMockFileHistoryEntry = (overrides = {}) => ({
  name: 'Test Movie (2023)',
  type: 'movie' as const,
  language: 'english' as const,
  processedAt: new Date().toISOString(),
  path: '/media/movies/Test Movie (2023).mkv',
  size: '2.1 GB',
  status: 'success' as const,
  ...overrides,
});

export const createMockSettings = (overrides = {}) => ({
  smb_server: 'nas.local',
  smb_share: 'Media',
  smb_username: 'testuser',
  smb_password: 'testpass',
  english_movies_path: 'movies',
  english_tv_path: 'tv-shows',
  malayalam_movies_path: 'malayalam-movies',
  malayalam_tv_path: 'malayalam-tv-shows',
  download_path: '/downloads',
  processing_enabled: true,
  dry_run: false,
  extract_languages: true,
  ...overrides,
});

export const createMockDatabaseHealth = (overrides = {}) => ({
  status: 'healthy' as const,
  integrity_check: true,
  size: 1024 * 1024,
  total_files: 20,
  last_backup: new Date().toISOString(),
  ...overrides,
});

// Wait for loading states to resolve
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
};