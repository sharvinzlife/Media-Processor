/**
 * Database Management Frontend Interface
 * Provides backup, restore, and health monitoring capabilities
 */

console.log('🗄️  Loading Database Manager UI...');

class DatabaseManagerUI {
    constructor() {
        this.baseUrl = window.location.origin;
        this.backups = [];
        this.init();
    }

    init() {
        this.createDatabaseSection();
        this.loadBackupsList();
        this.checkDatabaseHealth();
        
        // Refresh every 5 minutes
        setInterval(() => {
            this.loadBackupsList();
            this.checkDatabaseHealth();
        }, 300000);
    }

    createDatabaseSection() {
        // Find settings tab content
        const settingsTabContent = document.querySelector('#settings');
        if (!settingsTabContent) {
            console.warn('Settings tab not found, adding to body');
            this.addToBody();
            return;
        }

        // Create database management section
        const databaseSection = document.createElement('div');
        databaseSection.innerHTML = `
            <div class="card mt-4 glassmorphism-card">
                <div class="card-header">
                    <h5 class="mb-0">
                        <i class="fas fa-database me-2"></i>Database Management
                        <span class="badge bg-success ms-2" id="db-status-badge">Healthy</span>
                    </h5>
                </div>
                <div class="card-body">
                    <!-- Database Health Status -->
                    <div class="row mb-4">
                        <div class="col-md-12">
                            <h6><i class="fas fa-heartbeat me-2"></i>Database Health</h6>
                            <div id="database-health" class="alert alert-info">
                                <i class="fas fa-spinner fa-spin me-2"></i>Checking database health...
                            </div>
                        </div>
                    </div>

                    <!-- Backup Management -->
                    <div class="row">
                        <div class="col-md-6">
                            <h6><i class="fas fa-cloud-upload-alt me-2"></i>Create Backup</h6>
                            <div class="mb-3">
                                <label class="form-label">Backup Type</label>
                                <select class="form-select" id="backup-type">
                                    <option value="manual">Manual Backup</option>
                                    <option value="scheduled">Scheduled Backup</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="compress-backup" checked>
                                    <label class="form-check-label" for="compress-backup">
                                        Compress backup (recommended)
                                    </label>
                                </div>
                            </div>
                            <button class="btn btn-primary" id="create-backup-btn">
                                <i class="fas fa-save me-2"></i>Create Backup
                            </button>
                            <button class="btn btn-info ms-2" id="sync-database-btn">
                                <i class="fas fa-sync me-2"></i>Sync Database
                            </button>
                        </div>

                        <div class="col-md-6">
                            <h6><i class="fas fa-cloud-download-alt me-2"></i>Restore Backup</h6>
                            <div class="mb-3">
                                <label class="form-label">Available Backups</label>
                                <select class="form-select" id="backup-select">
                                    <option value="">Select a backup to restore...</option>
                                </select>
                            </div>
                            <button class="btn btn-warning" id="restore-backup-btn" disabled>
                                <i class="fas fa-upload me-2"></i>Restore Selected Backup
                            </button>
                            <button class="btn btn-secondary ms-2" id="refresh-backups-btn">
                                <i class="fas fa-refresh me-2"></i>Refresh List
                            </button>
                        </div>
                    </div>

                    <!-- Recent Backups List -->
                    <div class="mt-4">
                        <h6><i class="fas fa-history me-2"></i>Recent Backups</h6>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Backup Name</th>
                                        <th>Type</th>
                                        <th>Size</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="backups-table-body">
                                    <tr>
                                        <td colspan="5" class="text-center">
                                            <i class="fas fa-spinner fa-spin me-2"></i>Loading backups...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Status Messages -->
                    <div id="database-messages" class="mt-3"></div>
                </div>
            </div>
        `;

        settingsTabContent.appendChild(databaseSection);
        this.attachEventListeners();
    }

    addToBody() {
        // Fallback: add as floating panel
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 400px;
            z-index: 9998;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            display: none;
        `;
        panel.id = 'database-manager-panel';
        panel.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5><i class="fas fa-database me-2"></i>Database Manager</h5>
                <button class="btn-close" onclick="this.parentElement.parentElement.style.display='none'"></button>
            </div>
            <div id="database-health-mini" class="alert alert-info mb-3">Checking health...</div>
            <button class="btn btn-primary btn-sm me-2" id="create-backup-btn-mini">Backup</button>
            <button class="btn btn-info btn-sm" id="sync-database-btn-mini">Sync</button>
        `;
        
        document.body.appendChild(panel);
        
        // Add toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.innerHTML = '<i class="fas fa-database"></i>';
        toggleBtn.className = 'btn btn-outline-primary position-fixed';
        toggleBtn.style.cssText = 'top: 80px; right: 20px; z-index: 9999;';
        toggleBtn.onclick = () => {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        };
        
        document.body.appendChild(toggleBtn);
    }

    attachEventListeners() {
        // Create backup
        document.getElementById('create-backup-btn')?.addEventListener('click', () => {
            this.createBackup();
        });

        // Sync database
        document.getElementById('sync-database-btn')?.addEventListener('click', () => {
            this.syncDatabase();
        });

        // Restore backup
        document.getElementById('restore-backup-btn')?.addEventListener('click', () => {
            this.restoreBackup();
        });

        // Refresh backups
        document.getElementById('refresh-backups-btn')?.addEventListener('click', () => {
            this.loadBackupsList();
        });

        // Backup selection change
        document.getElementById('backup-select')?.addEventListener('change', (e) => {
            const restoreBtn = document.getElementById('restore-backup-btn');
            if (restoreBtn) {
                restoreBtn.disabled = !e.target.value;
            }
        });
    }

    async createBackup() {
        const btn = document.getElementById('create-backup-btn');
        const originalText = btn.innerHTML;
        
        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating Backup...';
            btn.disabled = true;

            const backupType = document.getElementById('backup-type')?.value || 'manual';
            const compress = document.getElementById('compress-backup')?.checked !== false;

            const response = await fetch(`${this.baseUrl}/api/database/backup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: backupType, compress })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage('success', `✅ ${data.message}`);
                this.loadBackupsList(); // Refresh backup list
            } else {
                this.showMessage('danger', `❌ Backup failed: ${data.error}`);
            }

        } catch (error) {
            this.showMessage('danger', `❌ Error creating backup: ${error.message}`);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async restoreBackup() {
        const backupSelect = document.getElementById('backup-select');
        const backupPath = backupSelect?.value;

        if (!backupPath) {
            this.showMessage('warning', '⚠️ Please select a backup to restore');
            return;
        }

        if (!confirm('Are you sure you want to restore this backup? This will replace the current database.')) {
            return;
        }

        const btn = document.getElementById('restore-backup-btn');
        const originalText = btn.innerHTML;

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Restoring...';
            btn.disabled = true;

            const response = await fetch(`${this.baseUrl}/api/database/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ backup_path: backupPath })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage('success', `✅ ${data.message}`);
                // Refresh dashboard stats
                if (window.statsFix?.update) {
                    window.statsFix.update();
                }
            } else {
                this.showMessage('danger', `❌ Restore failed: ${data.error}`);
            }

        } catch (error) {
            this.showMessage('danger', `❌ Error restoring backup: ${error.message}`);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async syncDatabase() {
        const btn = document.getElementById('sync-database-btn');
        const originalText = btn.innerHTML;

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Syncing...';
            btn.disabled = true;

            const response = await fetch(`${this.baseUrl}/api/database/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage('success', `✅ ${data.message}`);
                // Refresh dashboard stats
                if (window.statsFix?.update) {
                    window.statsFix.update();
                }
            } else {
                this.showMessage('danger', `❌ Sync failed: ${data.error}`);
            }

        } catch (error) {
            this.showMessage('danger', `❌ Error syncing database: ${error.message}`);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async loadBackupsList() {
        try {
            const response = await fetch(`${this.baseUrl}/api/database/backups`);
            const data = await response.json();

            if (data.success) {
                this.backups = data.backups;
                this.updateBackupsUI();
            } else {
                console.error('Failed to load backups:', data.error);
            }

        } catch (error) {
            console.error('Error loading backups:', error);
        }
    }

    async checkDatabaseHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/api/database/health`);
            const data = await response.json();

            if (data.success) {
                this.updateHealthUI(data.health);
            } else {
                this.updateHealthUI({ errors: [data.error] });
            }

        } catch (error) {
            this.updateHealthUI({ errors: [error.message] });
        }
    }

    updateBackupsUI() {
        // Update backup select dropdown
        const backupSelect = document.getElementById('backup-select');
        if (backupSelect) {
            backupSelect.innerHTML = '<option value="">Select a backup to restore...</option>';
            this.backups.forEach(backup => {
                const option = document.createElement('option');
                option.value = backup.path;
                option.textContent = `${backup.name} (${this.formatSize(backup.size)})`;
                backupSelect.appendChild(option);
            });
        }

        // Update backups table
        const tableBody = document.getElementById('backups-table-body');
        if (tableBody) {
            if (this.backups.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No backups found</td></tr>';
            } else {
                tableBody.innerHTML = this.backups.slice(0, 10).map(backup => `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <i class="fas fa-file-archive me-2 text-primary"></i>
                                <span class="small">${backup.name}</span>
                            </div>
                        </td>
                        <td><span class="badge bg-${backup.type === 'auto' ? 'info' : 'secondary'}">${backup.type}</span></td>
                        <td class="small">${this.formatSize(backup.size)}</td>
                        <td class="small">${this.formatDate(backup.created_at)}</td>
                        <td>
                            <button class="btn btn-outline-primary btn-sm" onclick="databaseManager.selectBackup('${backup.path}')">
                                <i class="fas fa-check me-1"></i>Select
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    }

    updateHealthUI(health) {
        const healthDiv = document.getElementById('database-health');
        const statusBadge = document.getElementById('db-status-badge');

        if (!health || health.errors?.length > 0) {
            const errorMsg = health?.errors?.join(', ') || 'Unknown error';
            if (healthDiv) {
                healthDiv.className = 'alert alert-danger';
                healthDiv.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i><strong>Database Error:</strong> ${errorMsg}`;
            }
            if (statusBadge) {
                statusBadge.className = 'badge bg-danger ms-2';
                statusBadge.textContent = 'Error';
            }
        } else {
            const healthInfo = `
                <div class="row">
                    <div class="col-md-4">
                        <small class="text-muted">Size:</small><br>
                        <strong>${health.size_mb || 0} MB</strong>
                    </div>
                    <div class="col-md-4">
                        <small class="text-muted">Records:</small><br>
                        <strong>${health.record_count || 0}</strong>
                    </div>
                    <div class="col-md-4">
                        <small class="text-muted">Last Backup:</small><br>
                        <strong>${health.last_backup_age_hours ? `${health.last_backup_age_hours}h ago` : 'Never'}</strong>
                    </div>
                </div>
            `;

            if (healthDiv) {
                healthDiv.className = 'alert alert-success';
                healthDiv.innerHTML = `<i class="fas fa-check-circle me-2"></i><strong>Database Healthy</strong><br>${healthInfo}`;
            }
            if (statusBadge) {
                statusBadge.className = 'badge bg-success ms-2';
                statusBadge.textContent = 'Healthy';
            }
        }
    }

    selectBackup(backupPath) {
        const backupSelect = document.getElementById('backup-select');
        if (backupSelect) {
            backupSelect.value = backupPath;
            backupSelect.dispatchEvent(new Event('change'));
        }
    }

    showMessage(type, message) {
        const messagesDiv = document.getElementById('database-messages');
        if (!messagesDiv) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        messagesDiv.appendChild(alert);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    formatSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
}

// Initialize database manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.databaseManager = new DatabaseManagerUI();
    });
} else {
    window.databaseManager = new DatabaseManagerUI();
}

console.log('✅ Database Manager UI loaded successfully');