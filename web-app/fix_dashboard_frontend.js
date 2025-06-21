/**
 * Comprehensive dashboard frontend fix
 * Addresses caching issues and proper data loading
 */

console.log('🔧 Applying dashboard frontend fixes...');

// Force cache busting for all API calls
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    // Add cache busting for API calls
    if (url.includes('/api/')) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}_t=${Date.now()}`;
        
        // Ensure no-cache headers
        options.headers = {
            ...options.headers,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        };
    }
    
    return originalFetch(url, options);
};

// Enhanced time formatting function
function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Unknown time';
    
    try {
        const now = new Date();
        const date = new Date(timestamp);
        
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        // For older dates, show actual date
        return date.toLocaleDateString();
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'Time error';
    }
}

// Enhanced stats loading with robust error handling
async function loadDashboardStats() {
    console.log('📊 Loading dashboard statistics...');
    
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        if (data.success && data.stats) {
            console.log('✅ Stats loaded:', data.stats);
            updateStatsDisplay(data.stats);
        } else {
            console.error('❌ Invalid stats response:', data);
            showStatsError('Invalid statistics data received');
        }
    } catch (error) {
        console.error('❌ Error loading stats:', error);
        showStatsError('Failed to load statistics');
    }
}

// Enhanced file history loading
async function loadFileHistory() {
    console.log('📁 Loading file history...');
    
    try {
        const response = await fetch('/api/file-history');
        const data = await response.json();
        
        if (data.success && data.history) {
            console.log('✅ File history loaded:', data.history.length, 'files');
            updateFileHistoryDisplay(data.history);
        } else {
            console.error('❌ Invalid file history response:', data);
            showFileHistoryError('Invalid file history data');
        }
    } catch (error) {
        console.error('❌ Error loading file history:', error);
        showFileHistoryError('Failed to load file history');
    }
}

// Update statistics display
function updateStatsDisplay(stats) {
    // Find stat elements by their text content or structure
    const statElements = document.querySelectorAll('.metric-value, .dashboard-stat-number, .stat-value');
    
    // Update stats with robust element finding
    updateStatElement('English Movies', stats.english_movies || 0);
    updateStatElement('Malayalam Movies', stats.malayalam_movies || 0);
    updateStatElement('English TV Shows', stats.english_tv_shows || 0);
    updateStatElement('Malayalam TV Shows', stats.malayalam_tv_shows || 0);
    
    console.log('📈 Updated dashboard stats display');
}

// Robust stat element update
function updateStatElement(label, value) {
    // Try multiple selectors to find the right element
    const selectors = [
        `[data-stat="${label.toLowerCase().replace(/ /g, '-')}"]`,
        `[aria-label="${label}"]`,
        `[title="${label}"]`
    ];
    
    let element = null;
    for (const selector of selectors) {
        element = document.querySelector(selector);
        if (element) break;
    }
    
    // Fallback: search by text content
    if (!element) {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            if (el.textContent && el.textContent.includes(label)) {
                // Find the value element (usually a sibling or child)
                const valueEl = el.querySelector('.metric-value, .stat-value, .dashboard-number') ||
                              el.nextElementSibling?.querySelector('.metric-value, .stat-value') ||
                              el.parentElement?.querySelector('.metric-value, .stat-value');
                if (valueEl) {
                    element = valueEl;
                    break;
                }
            }
        }
    }
    
    if (element) {
        element.textContent = value;
        console.log(`✅ Updated ${label}: ${value}`);
    } else {
        console.warn(`⚠️  Could not find element for ${label}`);
    }
}

// Update file history display with proper time formatting
function updateFileHistoryDisplay(history) {
    const tableBody = document.querySelector('#file-history-table-body, .file-history tbody, .recent-files tbody');
    
    if (!tableBody) {
        console.warn('⚠️  File history table not found');
        return;
    }
    
    // Clear loading/error states
    const loadingRow = document.querySelector('#file-history-loading');
    const errorRow = document.querySelector('#file-history-error');
    if (loadingRow) loadingRow.style.display = 'none';
    if (errorRow) errorRow.style.display = 'none';
    
    if (history.length === 0) {
        const emptyRow = document.querySelector('#file-history-empty');
        if (emptyRow) emptyRow.style.display = 'table-row';
        return;
    }
    
    // Build new table content
    let tableHTML = '';
    history.slice(0, 20).forEach(file => {
        const fileName = file.filename || file.name || 'Unknown';
        const fileType = file.type || 'unknown';
        const language = file.language || 'unknown';
        const processedTime = formatRelativeTime(file.processed_at || file.processedAt);
        const status = file.status || 'unknown';
        
        // Get emoji for file type
        const typeEmoji = fileType === 'movie' ? '🎬' : fileType === 'tvshow' ? '📺' : '📄';
        const languageEmoji = language === 'malayalam' ? '🇮🇳' : language === 'english' ? '🇺🇸' : '🌐';
        const statusEmoji = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⏳';
        
        tableHTML += `
            <tr>
                <td>
                    <div class="file-name-container">
                        <span class="file-type-emoji">${typeEmoji}</span>
                        <span class="file-name" title="${fileName}">${fileName.length > 50 ? fileName.substring(0, 50) + '...' : fileName}</span>
                    </div>
                </td>
                <td class="text-center">
                    <span class="badge bg-secondary">${typeEmoji} ${fileType}</span>
                </td>
                <td class="text-center">
                    <span class="badge bg-info">${languageEmoji} ${language}</span>
                </td>
                <td class="text-end">
                    <div class="processed-time-container">
                        <span class="processed-time" title="${file.processed_at || file.processedAt}">${processedTime}</span>
                        <span class="status-indicator">${statusEmoji}</span>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
    console.log(`📋 Updated file history display with ${history.length} files`);
}

// Error display functions
function showStatsError(message) {
    console.error('📊 Stats error:', message);
    // Update all stat values to show error state
    const statElements = document.querySelectorAll('.metric-value, .stat-value');
    statElements.forEach(el => {
        el.textContent = '⚠️';
        el.title = message;
    });
}

function showFileHistoryError(message) {
    console.error('📁 File history error:', message);
    const tableBody = document.querySelector('#file-history-table-body, .file-history tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr id="file-history-error">
                <td colspan="4" class="text-center text-danger py-4">
                    <span style="font-size:2rem;">❌</span>
                    <span class="ms-2"><strong>Error:</strong> ${message}</span>
                </td>
            </tr>
        `;
    }
}

// Auto-refresh functionality
function startAutoRefresh() {
    console.log('🔄 Starting auto-refresh...');
    
    // Initial load
    loadDashboardStats();
    loadFileHistory();
    
    // Refresh every 30 seconds
    setInterval(() => {
        console.log('🔄 Auto-refreshing dashboard...');
        loadDashboardStats();
        loadFileHistory();
    }, 30000);
}

// Page visibility API to refresh when tab becomes active
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('👁️  Page became visible, refreshing data...');
        loadDashboardStats();
        loadFileHistory();
    }
});

// Manual refresh button functionality
function setupRefreshButtons() {
    // Stats refresh button
    const statsRefreshBtn = document.querySelector('#refresh-stats, .refresh-stats-btn');
    if (statsRefreshBtn) {
        statsRefreshBtn.addEventListener('click', () => {
            console.log('🔄 Manual stats refresh triggered');
            loadDashboardStats();
        });
    }
    
    // File history refresh button
    const historyRefreshBtn = document.querySelector('#refresh-history, .refresh-history-btn');
    if (historyRefreshBtn) {
        historyRefreshBtn.addEventListener('click', () => {
            console.log('🔄 Manual history refresh triggered');
            loadFileHistory();
        });
    }
}

// Initialize everything when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Dashboard frontend fixes initialized');
        setupRefreshButtons();
        startAutoRefresh();
    });
} else {
    // DOM already loaded
    console.log('🚀 Dashboard frontend fixes initialized (DOM already ready)');
    setupRefreshButtons();
    startAutoRefresh();
}

// Add CSS for better display
const style = document.createElement('style');
style.textContent = `
    .file-name-container {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .file-type-emoji {
        font-size: 1.2em;
        flex-shrink: 0;
    }
    
    .file-name {
        word-break: break-word;
        line-height: 1.2;
    }
    
    .processed-time-container {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
    }
    
    .status-indicator {
        font-size: 0.9em;
    }
    
    .metric-value {
        font-weight: bold;
        font-size: 1.5em;
    }
    
    /* Ensure stats are visible */
    .dashboard-stat-number,
    .stat-value,
    .metric-value {
        color: inherit !important;
        opacity: 1 !important;
    }
`;
document.head.appendChild(style);

console.log('✅ Dashboard frontend fix script loaded successfully');

// Expose functions globally for debugging
window.dashboardFix = {
    loadStats: loadDashboardStats,
    loadHistory: loadFileHistory,
    formatTime: formatRelativeTime,
    refresh: () => {
        loadDashboardStats();
        loadFileHistory();
    }
};