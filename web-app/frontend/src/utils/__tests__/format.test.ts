import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  formatRelativeTime,
  formatNumber,
  getMediaTypeEmoji,
  getLanguageEmoji,
  getStatusEmoji,
  normalizeStatus,
  cleanFileName,
  truncate,
  formatBytes,
  formatDistanceToNow,
} from '../format';

describe('format utilities', () => {
  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1.0 TB');
    });

    it('handles string input', () => {
      expect(formatFileSize('1024')).toBe('1.0 KB');
      expect(formatFileSize('invalid')).toBe('0 B');
    });

    it('handles edge cases', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });
  });

  describe('formatBytes', () => {
    it('is an alias for formatFileSize', () => {
      expect(formatBytes(1024)).toBe(formatFileSize(1024));
    });
  });

  describe('formatRelativeTime', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    it('formats recent times correctly', () => {
      expect(formatRelativeTime(new Date(now.getTime() - 30 * 1000))).toBe('Just now');
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1m ago');
      expect(formatRelativeTime(oneHourAgo)).toBe('1h ago');
      expect(formatRelativeTime(oneDayAgo)).toBe('1d ago');
    });

    it('handles empty or invalid dates', () => {
      expect(formatRelativeTime('')).toBe('Recently');
      expect(formatRelativeTime('invalid-date')).toBe('Recently');
    });

    it('handles string dates', () => {
      expect(formatRelativeTime(oneMinuteAgo.toISOString())).toBe('1m ago');
    });

    it('handles future dates', () => {
      const future = new Date(now.getTime() + 60 * 1000);
      expect(formatRelativeTime(future)).toBe('Just now');
    });
  });

  describe('formatDistanceToNow', () => {
    it('is an alias for formatRelativeTime', () => {
      const date = new Date();
      expect(formatDistanceToNow(date)).toBe(formatRelativeTime(date));
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with thousand separators', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(123)).toBe('123');
    });
  });

  describe('getMediaTypeEmoji', () => {
    it('returns correct emojis for media types', () => {
      expect(getMediaTypeEmoji('movie')).toBe('🎬');
      expect(getMediaTypeEmoji('tvshow')).toBe('📺');
      expect(getMediaTypeEmoji('tv')).toBe('📺');
      expect(getMediaTypeEmoji('unknown')).toBe('📄');
    });

    it('handles case insensitive input', () => {
      expect(getMediaTypeEmoji('MOVIE')).toBe('🎬');
      expect(getMediaTypeEmoji('TvShow')).toBe('📺');
    });
  });

  describe('getLanguageEmoji', () => {
    it('returns correct emojis for languages', () => {
      expect(getLanguageEmoji('malayalam')).toBe('🇮🇳');
      expect(getLanguageEmoji('tamil')).toBe('🇮🇳');
      expect(getLanguageEmoji('hindi')).toBe('🇮🇳');
      expect(getLanguageEmoji('english')).toBe('🇬🇧');
      expect(getLanguageEmoji('french')).toBe('🌐');
    });

    it('handles case insensitive input', () => {
      expect(getLanguageEmoji('ENGLISH')).toBe('🇬🇧');
      expect(getLanguageEmoji('Malayalam')).toBe('🇮🇳');
    });
  });

  describe('getStatusEmoji', () => {
    it('returns correct emojis for status', () => {
      expect(getStatusEmoji('success')).toBe('✅');
      expect(getStatusEmoji('failed')).toBe('❌');
      expect(getStatusEmoji('processing')).toBe('⚙️');
      expect(getStatusEmoji('skipped')).toBe('⏭️');
      expect(getStatusEmoji('unknown')).toBe('📁');
    });

    it('normalizes status before getting emoji', () => {
      expect(getStatusEmoji('transfersuccess')).toBe('✅');
      expect(getStatusEmoji('transferfailed')).toBe('❌');
    });
  });

  describe('normalizeStatus', () => {
    it('normalizes backend status values', () => {
      expect(normalizeStatus('transfersuccess')).toBe('success');
      expect(normalizeStatus('extractionsuccess')).toBe('success');
      expect(normalizeStatus('transferstart')).toBe('processing');
      expect(normalizeStatus('transferfailed')).toBe('failed');
      expect(normalizeStatus('extractionfailed')).toBe('failed');
      expect(normalizeStatus('custom')).toBe('custom');
    });

    it('handles case insensitive input', () => {
      expect(normalizeStatus('TRANSFERSUCCESS')).toBe('success');
      expect(normalizeStatus('TransferFailed')).toBe('failed');
    });
  });

  describe('cleanFileName', () => {
    it('removes website prefixes', () => {
      expect(cleanFileName('www.example.com - Movie Name (2023).mkv'))
        .toBe('Movie Name (2023).mkv');
    });

    it('removes extraction suffixes', () => {
      expect(cleanFileName('Movie_mal_extracted.mkv'))
        .toBe('Movie.mkv');
    });

    it('cleans up quality indicators', () => {
      expect(cleanFileName('Movie - TRUE WEB-DL (2023).mkv'))
        .toBe('Movie WEB-DL (2023).mkv');
    });

    it('removes audio and size details', () => {
      expect(cleanFileName('Movie (DD+ 5.1) - 2GB - ESub.mkv'))
        .toBe('Movie.mkv');
    });

    it('handles multiple cleanup operations', () => {
      expect(cleanFileName('www.site.com - Movie_mal_extracted (DD+ 5.1) - 2GB - ESub.mkv'))
        .toBe('Movie.mkv');
    });
  });

  describe('truncate', () => {
    it('truncates long text with ellipsis', () => {
      expect(truncate('This is a very long text', 10)).toBe('This is...');
      expect(truncate('Short', 10)).toBe('Short');
      expect(truncate('Exactly 10', 10)).toBe('Exactly 10');
    });

    it('handles edge cases', () => {
      expect(truncate('', 5)).toBe('');
      expect(truncate('abc', 3)).toBe('abc');
      expect(truncate('abcd', 3)).toBe('...');
    });
  });
});