/**
 * Real-time Dashboard Updates
 * Monitors for new media processing and updates dashboard immediately
 */

console.log('📡 Loading Real-time Updates System...');

class RealtimeUpdates {
    constructor() {
        this.lastStatsUpdate = null;
        this.pollInterval = 10000; // 10 seconds for active monitoring
        this.isPolling = false;
        this.previousStats = null;
        this.init();
    }

    init() {
        this.startPolling();
        this.setupVisibilityHandling();
        this.setupWebSocketFallback();
        
        // Listen for user activity to increase polling frequency
        this.setupActivityDetection();
    }

    async startPolling() {
        if (this.isPolling) return;
        
        this.isPolling = true;
        console.log('🔄 Starting real-time statistics polling...');
        
        // Initial check
        await this.checkForUpdates();
        
        // Set up polling interval
        this.pollTimer = setInterval(() => {
            this.checkForUpdates();
        }, this.pollInterval);
    }

    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.isPolling = false;
        console.log('⏸️  Stopped real-time polling');
    }

    async checkForUpdates() {
        try {
            // Check both stats and file history for changes
            const [statsResponse, historyResponse] = await Promise.all([
                fetch('/api/stats?_t=' + Date.now()),
                fetch('/api/file-history?_t=' + Date.now())
            ]);

            const [statsData, historyData] = await Promise.all([
                statsResponse.json(),
                historyResponse.json()
            ]);

            if (statsData.success && historyData.success) {
                this.processUpdates(statsData.stats, historyData.history);
            }

        } catch (error) {
            console.error('❌ Error checking for updates:', error);
        }
    }

    processUpdates(currentStats, currentHistory) {
        let hasUpdates = false;

        // Check if statistics have changed
        if (this.previousStats) {
            const statsChanged = JSON.stringify(currentStats) !== JSON.stringify(this.previousStats);
            if (statsChanged) {
                console.log('📊 Statistics updated:', currentStats);
                this.updateDashboardStats(currentStats);
                hasUpdates = true;
            }
        }

        // Check if there are new files in history
        if (currentHistory && currentHistory.length > 0) {
            const latestFile = currentHistory[0];
            const latestTimestamp = latestFile.processedAt || latestFile.processed_at;
            
            if (this.lastStatsUpdate && latestTimestamp > this.lastStatsUpdate) {
                console.log('🆕 New media file processed:', latestFile.filename || latestFile.name);
                this.showNewFileNotification(latestFile);
                this.updateFileHistory(currentHistory);
                hasUpdates = true;
            }
            
            this.lastStatsUpdate = latestTimestamp;
        }

        // Store current stats for next comparison
        this.previousStats = { ...currentStats };

        // If there were updates, trigger additional UI refreshes
        if (hasUpdates) {
            this.triggerDashboardRefresh();
        }
    }

    updateDashboardStats(stats) {
        // Use the existing stats fix function if available
        if (window.statsFix?.update) {
            window.statsFix.update();
        } else {
            // Fallback manual update
            this.manualStatsUpdate(stats);
        }

        // Add visual feedback for the update
        this.addUpdateIndicator();
    }

    manualStatsUpdate(stats) {
        const elements = {
            'english-movies-count': stats.english_movies || 0,
            'malayalam-movies-count': stats.malayalam_movies || 0,
            'english-tv-count': stats.english_tv_shows || 0,
            'malayalam-tv-count': stats.malayalam_tv_shows || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                // Animate the change
                element.style.transform = 'scale(1.2)';
                element.style.transition = 'all 0.3s ease';
                
                setTimeout(() => {
                    element.textContent = value;
                    element.style.transform = 'scale(1)';
                }, 150);
            }
        });
    }

    updateFileHistory(history) {
        // Refresh file history display
        if (window.dashboardFix?.loadHistory) {
            window.dashboardFix.loadHistory();
        }
    }

    showNewFileNotification(file) {
        // Create toast notification for new file
        const toast = document.createElement('div');
        toast.className = 'toast position-fixed top-0 end-0 m-3';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="toast-header bg-success text-white">
                <i class="fas fa-plus-circle me-2"></i>
                <strong class="me-auto">New Media Processed</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                <div class="d-flex align-items-center">
                    <div class="me-3">
                        ${file.type === 'movie' ? '🎬' : file.type === 'tvshow' ? '📺' : '📄'}
                    </div>
                    <div>
                        <div class="fw-bold">${(file.filename || file.name || 'Unknown').substring(0, 40)}...</div>
                        <small class="text-muted">${file.language || 'unknown'} ${file.type || 'media'}</small>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(toast);

        // Show toast
        const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
        bsToast.show();

        // Remove from DOM after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    addUpdateIndicator() {
        // Add a subtle indicator that the dashboard was updated
        const indicator = document.createElement('div');
        indicator.className = 'position-fixed top-0 start-50 translate-middle-x bg-success text-white px-3 py-1 rounded-bottom';
        indicator.style.zIndex = '9998';
        indicator.innerHTML = '<i class="fas fa-sync-alt fa-spin me-2"></i>Updated';
        
        document.body.appendChild(indicator);

        // Remove after 2 seconds
        setTimeout(() => {
            indicator.style.opacity = '0';
            indicator.style.transition = 'opacity 0.5s ease';
            setTimeout(() => indicator.remove(), 500);
        }, 2000);
    }

    triggerDashboardRefresh() {
        // Trigger any additional dashboard refresh functions
        const event = new CustomEvent('dashboardUpdated', {
            detail: { timestamp: new Date().toISOString() }
        });
        document.dispatchEvent(event);

        // Update database manager if available
        if (window.databaseManager) {
            window.databaseManager.checkDatabaseHealth();
        }
    }

    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Reduce polling frequency when tab is hidden
                this.pollInterval = 30000; // 30 seconds
            } else {
                // Increase polling frequency when tab is visible
                this.pollInterval = 10000; // 10 seconds
                // Immediate check when becoming visible
                this.checkForUpdates();
            }

            if (this.isPolling) {
                this.stopPolling();
                this.startPolling();
            }
        });
    }

    setupWebSocketFallback() {
        // Future enhancement: WebSocket connection for real-time updates
        // For now, we'll stick with polling but this sets up the structure
        this.websocketSupported = 'WebSocket' in window;
        
        if (this.websocketSupported) {
            console.log('🔌 WebSocket support detected (future enhancement)');
        }
    }

    setupActivityDetection() {
        let lastActivity = Date.now();
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        const updateActivity = () => {
            lastActivity = Date.now();
        };

        activityEvents.forEach(event => {
            document.addEventListener(event, updateActivity, true);
        });

        // Check activity level every minute
        setInterval(() => {
            const timeSinceActivity = Date.now() - lastActivity;
            
            if (timeSinceActivity > 300000) { // 5 minutes of inactivity
                if (this.pollInterval < 60000) {
                    this.pollInterval = 60000; // Reduce to 1 minute
                    if (this.isPolling) {
                        this.stopPolling();
                        this.startPolling();
                    }
                }
            } else if (timeSinceActivity < 60000) { // Active in last minute
                if (this.pollInterval > 10000) {
                    this.pollInterval = 10000; // Increase to 10 seconds
                    if (this.isPolling) {
                        this.stopPolling();
                        this.startPolling();
                    }
                }
            }
        }, 60000);
    }

    // Manual methods for external control
    forceUpdate() {
        console.log('🔄 Force updating dashboard...');
        this.checkForUpdates();
    }

    setPollingInterval(ms) {
        this.pollInterval = ms;
        if (this.isPolling) {
            this.stopPolling();
            this.startPolling();
        }
        console.log(`⏰ Polling interval set to ${ms}ms`);
    }
}

// Initialize real-time updates
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.realtimeUpdates = new RealtimeUpdates();
    });
} else {
    window.realtimeUpdates = new RealtimeUpdates();
}

// Expose global controls
window.dashboardControls = {
    forceUpdate: () => window.realtimeUpdates?.forceUpdate(),
    setPollingInterval: (ms) => window.realtimeUpdates?.setPollingInterval(ms),
    startPolling: () => window.realtimeUpdates?.startPolling(),
    stopPolling: () => window.realtimeUpdates?.stopPolling()
};

console.log('✅ Real-time Updates System loaded successfully');