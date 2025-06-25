// Format file size from bytes to human readable
export function formatFileSize(bytes: number | string): string {
  const size = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  
  if (isNaN(size) || size === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(size) / Math.log(1024));
  
  return `${(size / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// Format date to relative time (e.g., "2 hours ago")
export function formatRelativeTime(date: string | Date): string {
  // If no date provided or empty string, show "Recently"
  if (!date || date === '') return 'Recently';
  
  let past: Date;
  
  // Handle different date formats
  if (typeof date === 'string') {
    // Try parsing ISO string first
    past = new Date(date);
    
    // If invalid, try treating as timestamp
    if (isNaN(past.getTime())) {
      const timestamp = parseInt(date);
      if (!isNaN(timestamp)) {
        // Handle both seconds and milliseconds timestamps
        past = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
      } else {
        // Try parsing common date formats
        const cleanDate = date.replace(/[^\d\-\/\s:]/g, '').trim();
        past = new Date(cleanDate);
        
        // If still invalid after cleaning, return Recently
        if (isNaN(past.getTime())) {
          return 'Recently';
        }
      }
    }
  } else {
    past = date;
  }
  
  // If still invalid, return Recently
  if (isNaN(past.getTime())) {
    return 'Recently';
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  
  // Handle future dates (just processed)
  if (diffInSeconds < 0) return 'Just now';
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  
  return past.toLocaleDateString();
}

// Format number with thousand separators
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Get emoji for media type
export function getMediaTypeEmoji(type: string): string {
  switch (type.toLowerCase()) {
    case 'movie':
      return '🎬';
    case 'tvshow':
    case 'tv':
      return '📺';
    default:
      return '📄';
  }
}

// Get emoji for language
export function getLanguageEmoji(language: string): string {
  switch (language.toLowerCase()) {
    case 'malayalam':
    case 'tamil':
    case 'hindi':
      return '🇮🇳';
    case 'english':
      return '🇬🇧';
    default:
      return '🌐';
  }
}

// Get emoji for status
export function getStatusEmoji(status: string): string {
  const normalizedStatus = normalizeStatus(status);
  switch (normalizedStatus.toLowerCase()) {
    case 'success':
      return '✅';
    case 'failed':
      return '❌';
    case 'processing':
      return '⚙️';
    case 'skipped':
      return '⏭️';
    default:
      return '📁';
  }
}

// Normalize status values from backend
export function normalizeStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'transfersuccess':
    case 'extractionsuccess':
      return 'success';
    case 'transferstart':
      return 'processing';
    case 'transferfailed':
    case 'extractionfailed':
      return 'failed';
    default:
      return status;
  }
}

// Clean filename for display
export function cleanFileName(filename: string): string {
  return filename
    .replace(/^www\.\w+\.\w+\s*-\s*/, '') // Remove website prefixes
    .replace(/_mal_extracted\.mkv$/, '.mkv') // Clean extraction suffix
    .replace(/\s+-\s+TRUE\s+WEB-DL/, ' WEB-DL') // Clean up TRUE WEB-DL
    .replace(/\s+\(DD\+[\d\.\s]+\)/, '') // Remove audio details
    .replace(/\s+-\s+\d+GB\s+-\s+ESub/, '') // Remove size and subtitle info
    .trim();
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Format bytes to human readable (alias for formatFileSize)
export function formatBytes(bytes: number): string {
  return formatFileSize(bytes);
}

// Format distance to now (alias for formatRelativeTime)
export function formatDistanceToNow(date: string | Date): string {
  return formatRelativeTime(date);
}