/**
 * Targeted fix for dashboard statistics display
 * Updates the specific count elements that show zeros
 */

console.log('🎯 Applying targeted statistics display fix...');

// Function to update statistics display with specific element IDs
async function updateDashboardStatistics() {
    try {
        console.log('📊 Fetching latest statistics...');
        
        // Fetch from the working API endpoint
        const response = await fetch('/api/stats?_t=' + Date.now(), {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ API Response:', data);
        
        if (data.success && data.stats) {
            const stats = data.stats;
            
            // Update each specific element by ID
            updateElementById('english-movies-count', stats.english_movies || 0);
            updateElementById('malayalam-movies-count', stats.malayalam_movies || 0);
            updateElementById('english-tv-count', stats.english_tv_shows || 0);
            updateElementById('malayalam-tv-count', stats.malayalam_tv_shows || 0);
            
            console.log('🎉 Successfully updated all statistics displays!');
        } else {
            console.error('❌ Invalid API response format:', data);
        }
        
    } catch (error) {
        console.error('❌ Error updating statistics:', error);
        
        // Show error state
        updateElementById('english-movies-count', '⚠️');
        updateElementById('malayalam-movies-count', '⚠️');
        updateElementById('english-tv-count', '⚠️');
        updateElementById('malayalam-tv-count', '⚠️');
    }
}

// Function to update individual elements by ID
function updateElementById(elementId, value) {
    const element = document.getElementById(elementId);
    
    if (element) {
        // Add animation class
        element.style.transform = 'scale(0.8)';
        element.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            element.textContent = value;
            element.style.transform = 'scale(1)';
            console.log(`✅ Updated ${elementId}: ${value}`);
        }, 150);
    } else {
        console.warn(`⚠️  Element not found: ${elementId}`);
    }
}

// Function to add visual feedback
function addUpdateAnimation() {
    const statsCards = document.querySelectorAll('.stats-card');
    statsCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.transform = 'scale(1.02)';
            card.style.boxShadow = '0 8px 25px rgba(0, 123, 255, 0.3)';
            
            setTimeout(() => {
                card.style.transform = 'scale(1)';
                card.style.boxShadow = '';
            }, 300);
        }, index * 100);
    });
}

// Main execution
function initializeStatsFix() {
    console.log('🚀 Initializing statistics display fix...');
    
    // Update immediately
    updateDashboardStatistics().then(() => {
        addUpdateAnimation();
    });
    
    // Set up periodic updates every 30 seconds
    setInterval(() => {
        console.log('🔄 Auto-refreshing statistics...');
        updateDashboardStatistics();
    }, 30000);
    
    // Update when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('👁️  Page visible, refreshing statistics...');
            updateDashboardStatistics();
        }
    });
    
    // Add manual refresh button functionality
    const refreshButton = document.createElement('button');
    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Stats';
    refreshButton.className = 'btn btn-outline-primary btn-sm position-fixed';
    refreshButton.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
    refreshButton.onclick = () => {
        console.log('🔄 Manual refresh triggered');
        refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        refreshButton.disabled = true;
        
        updateDashboardStatistics().then(() => {
            refreshButton.innerHTML = '<i class="fas fa-check"></i> Updated!';
            setTimeout(() => {
                refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Stats';
                refreshButton.disabled = false;
            }, 2000);
        });
    };
    
    document.body.appendChild(refreshButton);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStatsFix);
} else {
    initializeStatsFix();
}

// Expose globally for debugging
window.statsFix = {
    update: updateDashboardStatistics,
    updateElement: updateElementById
};

console.log('✅ Statistics display fix script loaded successfully');