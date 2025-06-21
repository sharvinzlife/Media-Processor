/**
 * Time Formatter Fix
 * Fixes all "Just now" displays and removes hourglass symbols
 */

console.log('⏰ Loading Time Formatter Fix...');

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
        
        if (diffMinutes < 1) return '< 1m ago';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        // For older dates, show actual date
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'Time error';
    }
}

// Function to fix all time displays on the page
function fixAllTimeDisplays() {
    console.log('🔧 Fixing all time displays...');
    
    // Find all elements that might contain time information
    const timeElements = document.querySelectorAll('[data-time], .processed-time, .time-display, td:last-child');
    
    timeElements.forEach(el => {
        const text = el.textContent;
        if (text.includes('Just now') || text.includes('just now')) {
            const timeAttr = el.getAttribute('data-time') || el.getAttribute('title');
            if (timeAttr) {
                el.textContent = formatRelativeTime(timeAttr);
            } else {
                el.textContent = '< 1m ago';
            }
            console.log('✅ Fixed time display:', el.textContent);
        }
    });
    
    // Fix file history table specifically
    fixFileHistoryTimes();
}

// Function to specifically fix file history table times
function fixFileHistoryTimes() {
    const historyTableBody = document.querySelector('#file-history-table-body, .file-history tbody, .recent-files tbody');
    
    if (historyTableBody) {
        const rows = historyTableBody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                const timeCell = cells[cells.length - 1]; // Last column is usually time
                const timeText = timeCell.textContent.trim();
                
                if (timeText.includes('Just now') || timeText.includes('just now')) {
                    // Try to find the actual timestamp from attributes or data
                    const timeAttr = timeCell.getAttribute('title') || 
                                   timeCell.getAttribute('data-time') ||
                                   row.getAttribute('data-processed-at');
                    
                    if (timeAttr) {
                        timeCell.textContent = formatRelativeTime(timeAttr);
                    } else {
                        timeCell.textContent = '< 1m ago';
                    }
                    
                    console.log('✅ Fixed file history time:', timeCell.textContent);
                }
            }
        });
    }
}

// Function to remove hourglass symbols
function removeHourglassSymbols() {
    console.log('🚫 Removing hourglass symbols...');
    
    // Find all elements containing hourglass symbols
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(el => {
        if (el.textContent && el.textContent.includes('⏳')) {
            // Replace hourglass with appropriate alternatives
            if (el.textContent.includes('Loading')) {
                el.innerHTML = el.innerHTML.replace('⏳', '📁');
            } else if (el.textContent.includes('Processing') || el.textContent.includes('processing')) {
                el.innerHTML = el.innerHTML.replace('⏳', '🔄');
            } else if (el.textContent.includes('Wait') || el.textContent.includes('wait')) {
                el.innerHTML = el.innerHTML.replace('⏳', '⏸️');
            } else {
                el.innerHTML = el.innerHTML.replace('⏳', '⏱️');
            }
            console.log('✅ Removed hourglass from:', el.tagName);
        }
    });
}

// Function to monitor and fix new content
function startTimeMonitoring() {
    // Use MutationObserver to catch new content
    const observer = new MutationObserver(mutations => {
        let shouldFix = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const text = node.textContent || '';
                        if (text.includes('Just now') || text.includes('⏳')) {
                            shouldFix = true;
                        }
                    }
                });
            } else if (mutation.type === 'characterData') {
                const text = mutation.target.textContent || '';
                if (text.includes('Just now') || text.includes('⏳')) {
                    shouldFix = true;
                }
            }
        });
        
        if (shouldFix) {
            setTimeout(() => {
                fixAllTimeDisplays();
                removeHourglassSymbols();
            }, 100);
        }
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
    
    console.log('👀 Started monitoring for time display issues...');
}

// Override the global time formatting functions
window.formatRelativeTime = formatRelativeTime;

// Enhanced file history update function
window.updateFileHistoryWithProperTimes = function(history) {
    const tableBody = document.querySelector('#file-history-table-body, .file-history tbody, .recent-files tbody');
    
    if (!tableBody || !history || history.length === 0) {
        return;
    }
    
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
        const statusEmoji = status === 'success' ? '✅' : status === 'failed' ? '❌' : status === 'processing' ? '🔄' : '❓';
        
        tableHTML += `
            <tr data-processed-at="${file.processed_at || file.processedAt}">
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
                <td class="text-end" title="${file.processed_at || file.processedAt}" data-time="${file.processed_at || file.processedAt}">
                    <div class="processed-time-container">
                        <span class="processed-time">${processedTime}</span>
                        <span class="status-indicator">${statusEmoji}</span>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
    console.log(`📋 Updated file history with proper times for ${history.length} files`);
};

// Main initialization
function initializeTimeFormatter() {
    console.log('🚀 Initializing Time Formatter Fix...');
    
    // Initial fixes
    fixAllTimeDisplays();
    removeHourglassSymbols();
    
    // Start monitoring
    startTimeMonitoring();
    
    // Set up periodic time updates (every 30 seconds)
    setInterval(() => {
        fixAllTimeDisplays();
    }, 30000);
    
    // Update times when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            fixAllTimeDisplays();
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTimeFormatter);
} else {
    initializeTimeFormatter();
}

// Expose global controls
window.timeFormatterFix = {
    formatTime: formatRelativeTime,
    fixAllTimes: fixAllTimeDisplays,
    removeHourglasses: removeHourglassSymbols,
    updateFileHistory: window.updateFileHistoryWithProperTimes
};

console.log('✅ Time Formatter Fix loaded successfully');