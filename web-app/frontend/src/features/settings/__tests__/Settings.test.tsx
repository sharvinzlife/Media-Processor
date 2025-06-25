import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, createMockSettings } from '../../../test/utils/test-utils';
import { Settings } from '../Settings';
import { server } from '../../../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('Settings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<Settings />);
    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });

  it('renders settings form after loading', async () => {
    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByText('Settings & Configuration')).toBeInTheDocument();
    });

    expect(screen.getByText('SMB Connection')).toBeInTheDocument();
    expect(screen.getByText('Media Paths')).toBeInTheDocument();
    expect(screen.getByText('Processing Options')).toBeInTheDocument();
  });

  it('displays SMB connection settings', async () => {
    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('nas.local')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Media')).toBeInTheDocument();
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
  });

  it('allows editing SMB server field', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('nas.local')).toBeInTheDocument();
    });

    const serverField = screen.getByDisplayValue('nas.local');
    await user.clear(serverField);
    await user.type(serverField, 'new-server.local');

    expect(serverField).toHaveValue('new-server.local');
    expect(screen.getByText('Save Changes')).not.toBeDisabled();
  });

  it('shows validation errors for invalid inputs', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('nas.local')).toBeInTheDocument();
    });

    // Clear required field
    const serverField = screen.getByDisplayValue('nas.local');
    await user.clear(serverField);

    // Try to save
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('SMB server is required')).toBeInTheDocument();
    });
  });

  it('tests SMB connection successfully', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByText('Test SMB')).toBeInTheDocument();
    });

    const testButton = screen.getByText('Test SMB');
    await user.click(testButton);

    await waitFor(() => {
      expect(screen.getByText('SMB connection successful!')).toBeInTheDocument();
    });
  });

  it('handles SMB connection test failure', async () => {
    const user = userEvent.setup();
    
    // Override handler for failed connection
    server.use(
      http.post('/api/test-connection', () => {
        return HttpResponse.json({
          success: false,
          error: 'Connection failed: Host not found',
        });
      })
    );

    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('nas.local')).toBeInTheDocument();
    });

    // Change server to invalid one
    const serverField = screen.getByDisplayValue('nas.local');
    await user.clear(serverField);
    await user.type(serverField, 'invalid.server');

    const testButton = screen.getByText('Test SMB');
    await user.click(testButton);

    await waitFor(() => {
      expect(screen.getByText('Connection failed: Host not found')).toBeInTheDocument();
    });
  });

  it('saves settings successfully', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('nas.local')).toBeInTheDocument();
    });

    // Make a change
    const serverField = screen.getByDisplayValue('nas.local');
    await user.clear(serverField);
    await user.type(serverField, 'updated-server.local');

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Settings updated successfully')).toBeInTheDocument();
    });
  });

  it('resets changes when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('nas.local')).toBeInTheDocument();
    });

    // Make a change
    const serverField = screen.getByDisplayValue('nas.local');
    await user.clear(serverField);
    await user.type(serverField, 'changed-server.local');

    expect(serverField).toHaveValue('changed-server.local');

    // Reset changes
    const resetButton = screen.getByText('Reset');
    await user.click(resetButton);

    await waitFor(() => {
      expect(serverField).toHaveValue('nas.local');
    });
  });

  it('toggles processing options correctly', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByText('Processing Options')).toBeInTheDocument();
    });

    // Find the dry run toggle by label
    const dryRunLabel = screen.getByText('Dry Run Mode');
    const dryRunToggle = dryRunLabel.closest('div')?.querySelector('button');
    
    expect(dryRunToggle).toBeInTheDocument();
    
    if (dryRunToggle) {
      await user.click(dryRunToggle);
      expect(screen.getByText('Save Changes')).not.toBeDisabled();
    }
  });

  it('shows unsaved changes warning', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('nas.local')).toBeInTheDocument();
    });

    // Make a change
    const serverField = screen.getByDisplayValue('nas.local');
    await user.clear(serverField);
    await user.type(serverField, 'changed-server.local');

    await waitFor(() => {
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    });
  });
});