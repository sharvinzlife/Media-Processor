#!/usr/bin/env node

/**
 * Fix Dashboard Statistics Display
 * 
 * This script creates a sync mechanism between the Python API server
 * and the Node.js web server to ensure statistics are displayed correctly.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuration
const PYTHON_API_PORT = 5001;
const WEB_API_PORT = 3001;
const STATS_FILE = path.join(__dirname, 'web-app/api/stats.json');
const FILE_HISTORY_PATH = '/var/lib/media-processor/file_history.json';

// Function to read file history from Python's location
function readFileHistory() {
    try {
        if (fs.existsSync(FILE_HISTORY_PATH)) {
            const data = fs.readFileSync(FILE_HISTORY_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading file history:', error);
    }
    return [];
}

// Function to calculate stats from file history
function calculateStats(fileHistory) {
    const stats = {
        english_movies: 0,
        malayalam_movies: 0,
        english_tv_shows: 0,
        malayalam_tv_shows: 0
    };
    
    // Count unique successful files
    const uniqueFiles = new Map();
    
    fileHistory.forEach(entry => {
        // Only count successful transfers
        if (entry.status === 'success' || entry.status === 'transferSuccess') {
            const key = `${entry.name}_${entry.type}_${entry.language}`;
            if (!uniqueFiles.has(key)) {
                uniqueFiles.set(key, entry);
                
                // Update counts
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
    
    return stats;
}

// Function to sync stats between Python and Node.js
function syncStats() {
    console.log('🔄 Syncing statistics...');
    
    // Read file history from Python's location
    const fileHistory = readFileHistory();
    console.log(`📊 Found ${fileHistory.length} file history entries`);
    
    // Calculate stats
    const calculatedStats = calculateStats(fileHistory);
    console.log('📈 Calculated stats:', calculatedStats);
    
    // Read current stats.json
    let currentStats = {
        english_movies: 0,
        malayalam_movies: 0,
        english_tv_shows: 0,
        malayalam_tv_shows: 0,
        files: []
    };
    
    try {
        if (fs.existsSync(STATS_FILE)) {
            const data = fs.readFileSync(STATS_FILE, 'utf8');
            currentStats = JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading stats.json:', error);
    }
    
    // Update stats with calculated values
    currentStats.english_movies = calculatedStats.english_movies;
    currentStats.malayalam_movies = calculatedStats.malayalam_movies;
    currentStats.english_tv_shows = calculatedStats.english_tv_shows;
    currentStats.malayalam_tv_shows = calculatedStats.malayalam_tv_shows;
    
    // Update files array with recent entries
    const recentFiles = fileHistory
        .filter(f => f.status === 'success' || f.status === 'transferSuccess')
        .sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt))
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
    console.log('✅ Stats file updated');
    
    // Try to notify the Python API server to refresh
    notifyPythonAPI();
}

// Function to notify Python API server
function notifyPythonAPI() {
    const options = {
        hostname: 'localhost',
        port: PYTHON_API_PORT,
        path: '/api/media-stats',
        method: 'GET'
    };
    
    const req = http.request(options, (res) => {
        console.log(`📡 Python API responded with status: ${res.statusCode}`);
    });
    
    req.on('error', (error) => {
        console.log('⚠️  Could not reach Python API server:', error.message);
    });
    
    req.end();
}

// Main execution
console.log('🔧 Media Processor Statistics Sync');
console.log('==================================\n');

// Run sync immediately
syncStats();

// Set up periodic sync every 30 seconds
console.log('\n⏰ Setting up periodic sync every 30 seconds...');
setInterval(syncStats, 30000);

// Also run sync when the script starts
console.log('✅ Statistics sync service started');
console.log('   Press Ctrl+C to stop\n');

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down statistics sync...');
    process.exit(0);
});