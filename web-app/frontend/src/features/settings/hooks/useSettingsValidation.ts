import { useState, useCallback } from 'react';
import type { AppSettings } from '../../../types';

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const useSettingsValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((settings: AppSettings): ValidationResult => {
    const newErrors: Record<string, string> = {};

    // SMB Connection validation
    if (!settings.smb_server?.trim()) {
      newErrors.smb_server = 'SMB server is required';
    } else if (!/^[\w.-]+$/.test(settings.smb_server.trim())) {
      newErrors.smb_server = 'Invalid server format. Use hostname or IP address';
    }

    if (!settings.smb_share?.trim()) {
      newErrors.smb_share = 'SMB share is required';
    } else if (!/^[\w\s.-]+$/.test(settings.smb_share.trim())) {
      newErrors.smb_share = 'Invalid share name format';
    }

    if (!settings.smb_username?.trim()) {
      newErrors.smb_username = 'Username is required';
    }

    // Path validation
    if (!settings.download_dir?.trim()) {
      newErrors.download_dir = 'Download path is required';
    } else if (!isValidPath(settings.download_dir.trim())) {
      newErrors.download_dir = 'Invalid path format';
    }

    // Media paths validation
    const pathFields = [
      'english_movies_path',
      'malayalam_movies_path',
      'english_tv_path',
      'malayalam_tv_path',
    ] as const;

    pathFields.forEach((field) => {
      const path = settings[field];
      if (!path?.trim()) {
        newErrors[field] = `${getFieldDisplayName(field)} is required`;
      } else if (!isValidRelativePath(path.trim())) {
        newErrors[field] = 'Invalid path format. Use relative paths only';
      }
    });

    // Check for duplicate paths
    const pathValues = pathFields
      .map(field => settings[field]?.trim())
      .filter(Boolean);
    
    const uniquePaths = new Set(pathValues);
    if (pathValues.length !== uniquePaths.size) {
      pathFields.forEach((field) => {
        const path = settings[field]?.trim();
        if (path && pathValues.filter(p => p === path).length > 1) {
          newErrors[field] = 'Path must be unique';
        }
      });
    }

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
    };
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return {
    errors,
    validate,
    clearErrors,
    clearFieldError,
  };
};

// Helper functions
function isValidPath(path: string): boolean {
  // Basic path validation - should not be empty and should be reasonable
  if (!path || path.length < 1) return false;
  
  // Check for invalid characters (basic check)
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(path)) return false;
  
  return true;
}

function isValidRelativePath(path: string): boolean {
  // Relative path validation
  if (!path || path.length < 1) return false;
  
  // Should not start with / or contain absolute path indicators
  if (path.startsWith('/') || path.startsWith('\\') || /^[A-Za-z]:/.test(path)) {
    return false;
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(path)) return false;
  
  // Should not contain .. (parent directory traversal)
  if (path.includes('..')) return false;
  
  return true;
}

function getFieldDisplayName(field: string): string {
  const displayNames: Record<string, string> = {
    english_movies_path: 'English Movies Path',
    malayalam_movies_path: 'Malayalam Movies Path',
    english_tv_path: 'English TV Shows Path',
    malayalam_tv_path: 'Malayalam TV Shows Path',
    download_dir: 'Download Path',
    smb_server: 'SMB Server',
    smb_share: 'SMB Share',
    smb_username: 'SMB Username',
  };
  
  return displayNames[field] || field;
}