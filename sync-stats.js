#!/usr/bin/env node

/**
 * Sync Stats Script
 * 
 * This script syncs statistics between the Python file history
 * and the Node.js web dashboard stats.json file.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const STATS_FILE = path.join(__dirname, 'web-app/api/stats.json');
const FILE_HISTORY_PATH = '/var/lib/media-processor/file_history.json';

// Read and sync stats
function syncStats() {
    try {
        // Read file history
        let fileHistory = [];
        if (fs.existsSync(FILE_HISTORY_PATH)) {
            const data = fs.readFileSync(FILE_HISTORY_PATH, 'utf8');
            fileHistory = JSON.parse(data);
        }
        
        // Calculate stats from file history
        const stats = {
            english_movies: 0,
            malayalam_movies: 0,
            english_tv_shows: 0,
            malayalam_tv_shows: 0
        };
        
        // Count unique successful files
        const uniqueFiles = new Map();
        
        fileHistory.forEach(entry => {
            if (entry.status === 'success' || entry.status === 'transferSuccess') {
                const key = `${entry.name}_${entry.type}_${entry.language}`;
                if (!uniqueFiles.has(key)) {
                    uniqueFiles.set(key, entry);
                    
                    if (entry.type === 'movie') {
                        if (entry.language === 'malayalam') {
                            stats.malayalam_movies++;
                        } else if (entry.language === 'english') {
                            stats.english_movies++;
                        }
                    } else if (entry.type === 'tvshow' || entry.type === 'tv') {
                        if (entry.language === 'malayalam') {
                            stats.malayalam_tv_shows++;
                        } else if (entry.language === 'english') {
                            stats.english_tv_shows++;
                        }
                    }
                }
            }
        });
        
        // Read current stats file
        let currentStats = {
            english_movies: 0,
            malayalam_movies: 0,
            english_tv_shows: 0,
            malayalam_tv_shows: 0,
            files: []
        };
        
        if (fs.existsSync(STATS_FILE)) {
            try {
                currentStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
            } catch (e) {
                console.error('Error reading stats.json:', e);
            }
        }
        
        // Update stats
        currentStats.english_movies = stats.english_movies;
        currentStats.malayalam_movies = stats.malayalam_movies;
        currentStats.english_tv_shows = stats.english_tv_shows;
        currentStats.malayalam_tv_shows = stats.malayalam_tv_shows;
        
        // Update files array with recent successful entries
        const recentFiles = fileHistory
            .filter(f => f.status === 'success' || f.status === 'transferSuccess')
            .sort((a, b) => new Date(b.processedAt || 0) - new Date(a.processedAt || 0))
            .slice(0, 100)
            .map(f => ({
                name: f.name,
                type: f.type,
                language: f.language,
                processedAt: f.processedAt || new Date().toISOString(),
                path: f.path || '',
                size: f.size || '',
                status: 'success'
            }));
        
        currentStats.files = recentFiles;
        
        // Write updated stats
        fs.writeFileSync(STATS_FILE, JSON.stringify(currentStats, null, 2));
        console.log('Stats synced successfully:', {
            english_movies: stats.english_movies,
            malayalam_movies: stats.malayalam_movies,
            english_tv_shows: stats.english_tv_shows,
            malayalam_tv_shows: stats.malayalam_tv_shows,
            total_files: recentFiles.length
        });
        
    } catch (error) {
        console.error('Error syncing stats:', error);
        process.exit(1);
    }
}

// Run sync
syncStats();
process.exit(0);