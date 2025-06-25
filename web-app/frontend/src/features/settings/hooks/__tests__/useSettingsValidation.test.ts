import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettingsValidation } from '../useSettingsValidation';
import { createMockSettings } from '../../../../test/utils/test-utils';

describe('useSettingsValidation', () => {
  it('validates required SMB fields', () => {
    const { result } = renderHook(() => useSettingsValidation());
    
    const invalidSettings = createMockSettings({
      smb_server: '',
      smb_share: '',
      smb_username: '',
    });

    act(() => {
      const validation = result.current.validate(invalidSettings);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.smb_server).toBe('SMB server is required');
      expect(validation.errors.smb_share).toBe('SMB share is required');
      expect(validation.errors.smb_username).toBe('Username is required');
    });
  });

  it('validates SMB server format', () => {
    const { result } = renderHook(() => useSettingsValidation());
    
    const invalidSettings = createMockSettings({
      smb_server: 'invalid@server!',
    });

    act(() => {
      const validation = result.current.validate(invalidSettings);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.smb_server).toBe('Invalid server format. Use hostname or IP address');
    });
  });

  it('validates required path fields', () => {
    const { result } = renderHook(() => useSettingsValidation());
    
    const invalidSettings = createMockSettings({
      download_path: '',
      english_movies_path: '',
      malayalam_movies_path: '',
    });

    act(() => {
      const validation = result.current.validate(invalidSettings);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.download_path).toBe('Download path is required');
      expect(validation.errors.english_movies_path).toBe('English Movies Path is required');
      expect(validation.errors.malayalam_movies_path).toBe('Malayalam Movies Path is required');
    });
  });

  it('rejects absolute paths for media destinations', () => {
    const { result } = renderHook(() => useSettingsValidation());
    
    const invalidSettings = createMockSettings({
      english_movies_path: '/absolute/path',
      malayalam_movies_path: 'C:\\windows\\path',
    });

    act(() => {
      const validation = result.current.validate(invalidSettings);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.english_movies_path).toBe('Invalid path format. Use relative paths only');
      expect(validation.errors.malayalam_movies_path).toBe('Invalid path format. Use relative paths only');
    });
  });

  it('rejects paths with parent directory traversal', () => {
    const { result } = renderHook(() => useSettingsValidation());
    
    const invalidSettings = createMockSettings({
      english_movies_path: '../movies',
      malayalam_movies_path: 'folder/../other',
    });

    act(() => {
      const validation = result.current.validate(invalidSettings);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.english_movies_path).toBe('Invalid path format. Use relative paths only');
      expect(validation.errors.malayalam_movies_path).toBe('Invalid path format. Use relative paths only');
    });
  });

  it('rejects duplicate paths', () => {
    const { result } = renderHook(() => useSettingsValidation());
    
    const invalidSettings = createMockSettings({
      english_movies_path: 'movies',
      malayalam_movies_path: 'movies', // Same as english
    });

    act(() => {
      const validation = result.current.validate(invalidSettings);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.english_movies_path).toBe('Path must be unique');
      expect(validation.errors.malayalam_movies_path).toBe('Path must be unique');
    });
  });

  it('accepts valid settings', () => {
    const { result } = renderHook(() => useSettingsValidation());
    
    const validSettings = createMockSettings();

    act(() => {
      const validation = result.current.validate(validSettings);
      expect(validation.isValid).toBe(true);
      expect(Object.keys(validation.errors)).toHaveLength(0);
    });
  });

  it('clears errors', () => {
    const { result } = renderHook(() => useSettingsValidation());
    
    // Create some errors first
    const invalidSettings = createMockSettings({ smb_server: '' });
    
    act(() => {
      result.current.validate(invalidSettings);
    });

    expect(Object.keys(result.current.errors)).toHaveLength(1);

    act(() => {
      result.current.clearErrors();
    });

    expect(Object.keys(result.current.errors)).toHaveLength(0);
  });

  it('clears individual field errors', () => {
    const { result } = renderHook(() => useSettingsValidation());
    
    // Create multiple errors
    const invalidSettings = createMockSettings({
      smb_server: '',
      smb_username: '',
    });
    
    act(() => {
      result.current.validate(invalidSettings);
    });

    expect(result.current.errors.smb_server).toBeDefined();
    expect(result.current.errors.smb_username).toBeDefined();

    act(() => {
      result.current.clearFieldError('smb_server');
    });

    expect(result.current.errors.smb_server).toBeUndefined();
    expect(result.current.errors.smb_username).toBeDefined();
  });

  it('validates paths with invalid characters', () => {
    const { result } = renderHook(() => useSettingsValidation());
    
    const invalidSettings = createMockSettings({
      english_movies_path: 'movies<>:"|?*',
      download_path: 'downloads<invalid>',
    });

    act(() => {
      const validation = result.current.validate(invalidSettings);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.english_movies_path).toBe('Invalid path format. Use relative paths only');
      expect(validation.errors.download_path).toBe('Invalid path format');
    });
  });

  it('validates share names with special characters', () => {
    const { result } = renderHook(() => useSettingsValidation());
    
    const validSettings = createMockSettings({
      smb_share: 'My Media Share-2023',
    });

    act(() => {
      const validation = result.current.validate(validSettings);
      expect(validation.isValid).toBe(true);
    });
  });
});