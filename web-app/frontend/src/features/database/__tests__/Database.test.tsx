import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../test/utils/test-utils';
import { Database } from '../Database';
import { server } from '../../../test/mocks/server';
import { http, HttpResponse } from 'msw';

// Mock confirm dialog
global.confirm = vi.fn(() => true);

describe('Database Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<Database />);
    expect(screen.getByText('Loading database information...')).toBeInTheDocument();
  });

  it('renders database management interface after loading', async () => {
    render(<Database />);
    
    await waitFor(() => {
      expect(screen.getByText('Database Management')).toBeInTheDocument();
    });

    expect(screen.getByText('Database Health')).toBeInTheDocument();
    expect(screen.getByText('Database Operations')).toBeInTheDocument();
    expect(screen.getByText('Backup Management')).toBeInTheDocument();
  });

  it('displays database health information', async () => {
    render(<Database />);
    
    await waitFor(() => {
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    expect(screen.getByText('Passed')).toBeInTheDocument(); // Integrity check
    expect(screen.getByText('1.0 MB')).toBeInTheDocument(); // Database size
    expect(screen.getByText('20')).toBeInTheDocument(); // Total files
  });

  it('creates backup successfully', async () => {
    const user = userEvent.setup();
    render(<Database />);
    
    await waitFor(() => {
      expect(screen.getByText('Create Backup')).toBeInTheDocument();
    });

    const createBackupButton = screen.getByText('Create Backup');
    await user.click(createBackupButton);

    await waitFor(() => {
      expect(screen.getByText('Database backup created successfully')).toBeInTheDocument();
    });
  });

  it('syncs database successfully', async () => {
    const user = userEvent.setup();
    render(<Database />);
    
    await waitFor(() => {
      expect(screen.getByText('Sync Database')).toBeInTheDocument();
    });

    const syncButton = screen.getByText('Sync Database');
    await user.click(syncButton);

    await waitFor(() => {
      expect(screen.getByText('Database synchronized successfully')).toBeInTheDocument();
    });
  });

  it('displays available backups', async () => {
    render(<Database />);
    
    await waitFor(() => {
      expect(screen.getByText('Available Backups (2)')).toBeInTheDocument();
    });

    expect(screen.getByText('manual_backup_2023_12_01.db.gz')).toBeInTheDocument();
    expect(screen.getByText('auto_backup_2023_11_30.db.gz')).toBeInTheDocument();
  });

  it('restores backup with confirmation', async () => {
    const user = userEvent.setup();
    render(<Database />);
    
    await waitFor(() => {
      expect(screen.getByText('manual_backup_2023_12_01.db.gz')).toBeInTheDocument();
    });

    // Find restore button for the first backup
    const backupItems = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg[data-testid="ArrowDownTrayIcon"]')
    );
    
    expect(backupItems.length).toBeGreaterThan(0);
    
    await user.click(backupItems[0]);

    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Are you sure you want to restore')
    );

    await waitFor(() => {
      expect(screen.getByText('Database restored successfully')).toBeInTheDocument();
    });
  });

  it('shows no backups message when none available', async () => {
    // Override handler to return empty backups
    server.use(
      http.get('/api/database/backups', () => {
        return HttpResponse.json({
          success: true,
          backups: [],
        });
      })
    );

    render(<Database />);
    
    await waitFor(() => {
      expect(screen.getByText('No Backups Found')).toBeInTheDocument();
    });

    expect(screen.getByText('Create your first backup to get started')).toBeInTheDocument();
  });

  it('handles database errors gracefully', async () => {
    // Override handler to return database error
    server.use(
      http.get('/api/database/health', () => {
        return HttpResponse.json({
          success: true,
          health: {
            status: 'error',
            integrity_check: false,
            size: 1024 * 1024,
            total_files: 20,
            issues: ['Database corruption detected', 'Missing indexes'],
          },
        });
      })
    );

    render(<Database />);
    
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed')).toBeInTheDocument(); // Integrity check failed
    expect(screen.getByText('Database Issues')).toBeInTheDocument();
    expect(screen.getByText('Database corruption detected')).toBeInTheDocument();
  });

  it('shows database recommendations based on health', async () => {
    // Override handler to return warning status
    server.use(
      http.get('/api/database/health', () => {
        return HttpResponse.json({
          success: true,
          health: {
            status: 'warning',
            integrity_check: true,
            size: 1024 * 1024,
            total_files: 20,
            last_backup: null, // No recent backup
          },
        });
      })
    );

    render(<Database />);
    
    await waitFor(() => {
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText(/Regular backups recommended/)).toBeInTheDocument();
    expect(screen.getByText(/No recent backups found/)).toBeInTheDocument();
  });

  it('handles backup creation errors', async () => {
    const user = userEvent.setup();
    
    // Override handler to simulate backup failure
    server.use(
      http.post('/api/database/backup', () => {
        return HttpResponse.json({
          success: false,
          error: 'Insufficient disk space',
        });
      })
    );

    render(<Database />);
    
    await waitFor(() => {
      expect(screen.getByText('Create Backup')).toBeInTheDocument();
    });

    const createBackupButton = screen.getByText('Create Backup');
    await user.click(createBackupButton);

    await waitFor(() => {
      expect(screen.getByText('Insufficient disk space')).toBeInTheDocument();
    });
  });

  it('shows loading states during operations', async () => {
    const user = userEvent.setup();
    
    // Delay the backup response
    server.use(
      http.post('/api/database/backup', async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return HttpResponse.json({
          success: true,
          message: 'Backup created successfully',
        });
      })
    );

    render(<Database />);
    
    await waitFor(() => {
      expect(screen.getByText('Create Backup')).toBeInTheDocument();
    });

    const createBackupButton = screen.getByText('Create Backup');
    await user.click(createBackupButton);

    // Should show loading state
    expect(createBackupButton).toBeDisabled();
  });
});