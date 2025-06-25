#!/usr/bin/env python3

import os
import json
import logging
import subprocess
from typing import Dict, List, Optional, Union
from datetime import datetime

# Note: You need to install these packages with pip:
# pip install flask flask-cors psutil
try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    import psutil
except ImportError:
    print("Required packages not found. Please install with:")
    print("pip install flask flask-cors psutil")
    exit(1)

# Import database manager
try:
    from database_manager import DatabaseManager
except ImportError:
    DatabaseManager = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("APIServer")

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
CONFIG_PATH = "/etc/media-processor/config.json"
FILE_HISTORY_PATH = "/var/lib/media-processor/file_history.json"
STATS_JSON_PATH = "/home/sharvinzlife/media-processor/web-app/api/stats.json"

def load_config() -> Dict:
    """Load configuration from JSON file"""
    try:
        with open(CONFIG_PATH, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load config from {CONFIG_PATH}: {e}")
        return {}

def save_config(config: Dict) -> bool:
    """Save configuration to JSON file"""
    try:
        os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
        with open(CONFIG_PATH, 'w') as f:
            json.dump(config, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Failed to save config to {CONFIG_PATH}: {e}")
        return False

def load_file_history() -> List[Dict]:
    """Load file history from JSON file"""
    try:
        with open(FILE_HISTORY_PATH, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load file history from {FILE_HISTORY_PATH}: {e}")
        return []

def save_file_history(history: List[Dict]) -> bool:
    """Save file history to JSON file"""
    try:
        os.makedirs(os.path.dirname(FILE_HISTORY_PATH), exist_ok=True)
        with open(FILE_HISTORY_PATH, 'w') as f:
            json.dump(history, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Failed to save file history to {FILE_HISTORY_PATH}: {e}")
        return False

# API Routes
@app.route('/api/status', methods=['GET'])
def get_status():
    """Get the status of the media processor service"""
    try:
        # Check if the service is running
        result = subprocess.run(
            ['systemctl', 'is-active', 'media-processor-py.service'],
            capture_output=True, text=True
        )
        status = result.stdout.strip()
        
        return jsonify({
            'success': True,
            'status': status if status in ['active', 'inactive'] else 'unknown'
        })
    except Exception as e:
        logger.error(f"Error getting service status: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'status': 'unknown'
        })

@app.route('/api/service/<action>', methods=['POST'])
def control_service(action):
    """Control the media processor service"""
    if action not in ['start', 'stop', 'restart']:
        return jsonify({
            'success': False,
            'error': f"Invalid action: {action}"
        })
    
    try:
        result = subprocess.run(
            ['sudo', 'systemctl', action, 'media-processor-py.service'],
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            return jsonify({
                'success': True,
                'message': f"Service {action} command executed successfully"
            })
        else:
            return jsonify({
                'success': False,
                'error': result.stderr.strip()
            })
    except Exception as e:
        logger.error(f"Error controlling service: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    """Get or update settings"""
    if request.method == 'GET':
        config = load_config()
        # Remove sensitive information
        if 'smb_password' in config:
            config['smb_password'] = '********'
        return jsonify({
            'success': True,
            'settings': config
        })
    else:  # POST
        try:
            new_settings = request.json
            current_settings = load_config()
            
            # Update only provided settings
            for key, value in new_settings.items():
                if key in current_settings:
                    # Don't update password if it's masked
                    if key == 'smb_password' and value == '********':
                        continue
                    current_settings[key] = value
            
            if save_config(current_settings):
                return jsonify({
                    'success': True,
                    'message': "Settings updated successfully"
                })
            else:
                return jsonify({
                    'success': False,
                    'error': "Failed to save settings"
                })
        except Exception as e:
            logger.error(f"Error updating settings: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            })

@app.route('/api/smb-settings', methods=['GET'])
def get_smb_settings():
    """Get SMB connection settings"""
    config = load_config()
    smb_settings = {
        'server': config.get('smb_server', ''),
        'share': config.get('smb_share', ''),
        'username': config.get('smb_username', ''),
        'password': '********' if config.get('smb_password') else ''
    }
    return jsonify({
        'success': True,
        'settings': smb_settings
    })

@app.route('/api/test-connection', methods=['POST'])
def test_connection():
    """Test SMB connection"""
    try:
        data = request.json
        server = data.get('server', '')
        share = data.get('share', '')
        user = data.get('user', '')
        password = data.get('password', '')
        
        # Use smbclient to test connection
        cmd = ['smbclient', f'//{server}/{share}', '-U', f'{user}%{password}', '-c', 'ls', '-m', 'SMB3']
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            return jsonify({
                'success': True,
                'message': "Connection successful"
            })
        else:
            return jsonify({
                'success': False,
                'error': result.stderr.strip() or "Connection failed"
            })
    except Exception as e:
        logger.error(f"Error testing connection: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/file-history', methods=['GET', 'POST'])
def handle_file_history():
    """Get or update file history"""
    if request.method == 'GET':
        history = load_file_history()
        # Sort by processedAt in descending order
        history.sort(key=lambda x: x.get('processedAt', ''), reverse=True)
        return jsonify({
            'success': True,
            'history': history
        })
    else:  # POST
        try:
            new_entry = request.json
            history = load_file_history()
            
            # Add timestamp if not provided
            if 'processedAt' not in new_entry:
                new_entry['processedAt'] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            
            # Add the new entry
            history.append(new_entry)
            
            # Keep only the latest 100 entries
            if len(history) > 100:
                history = history[-100:]
            
            if save_file_history(history):
                return jsonify({
                    'success': True,
                    'message': "File history updated successfully"
                })
            else:
                return jsonify({
                    'success': False,
                    'error': "Failed to save file history"
                })
        except Exception as e:
            logger.error(f"Error updating file history: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            })

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get system logs from systemd journal"""
    try:
        # Get the last 100 lines from systemd journal for the media processor service
        result = subprocess.run(
            ['journalctl', '-u', 'media-processor-py.service', '-n', '100', '--no-pager', '--output=short-iso'],
            capture_output=True, text=True
        )
        
        if result.returncode != 0:
            # Fallback to log file if journalctl fails
            log_file = config_manager.get('log_file', '/home/sharvinzlife/media-processor/logs/media_processor_py.log')
            if os.path.exists(log_file):
                result = subprocess.run(['tail', '-n', '100', log_file], capture_output=True, text=True)
                logs = result.stdout.strip().split('\n') if result.stdout else []
            else:
                logs = ["No logs available - service may not be running or log file not found"]
        else:
            logs = result.stdout.strip().split('\n') if result.stdout else []
        
        return jsonify({
            'success': True,
            'logs': logs
        })
    except Exception as e:
        logger.error(f"Error getting logs: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'logs': []
        })

@app.route('/api/system-diagnostics', methods=['GET'])
def get_system_diagnostics():
    """Get enhanced system diagnostics"""
    try:
        # Get system information
        system_info = f"{os.uname().sysname} {os.uname().release} {os.uname().machine}"
        
        # Get memory usage
        memory = psutil.virtual_memory()
        memory_used = memory.used / (1024 * 1024 * 1024)  # GB
        memory_total = memory.total / (1024 * 1024 * 1024)  # GB
        memory_usage = f"{memory_used:.1f}GB/{memory_total:.1f}GB"
        
        # Get disk space
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        
        # Get uptime
        uptime_seconds = psutil.boot_time()
        uptime = datetime.now() - datetime.fromtimestamp(uptime_seconds)
        uptime_str = f"{uptime.days} days, {uptime.seconds // 3600} hours, {(uptime.seconds // 60) % 60} minutes"
        
        # Check required tools
        tools = {}
        for tool in ['ffmpeg', 'smbclient', 'mediainfo']:
            try:
                result = subprocess.run(['which', tool], capture_output=True, text=True)
                tools[tool] = {
                    'installed': result.returncode == 0,
                    'version': 'Installed' if result.returncode == 0 else 'Not found'
                }
            except Exception:
                tools[tool] = {
                    'installed': False,
                    'version': 'Error checking'
                }
        
        # Check service status
        service_status = "unknown"
        try:
            result = subprocess.run(
                ['systemctl', 'is-active', 'media-processor-py.service'],
                capture_output=True, text=True
            )
            service_status = result.stdout.strip()
        except Exception:
            pass
        
        # Get CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        return jsonify({
            'success': True,
            'diagnostics': {
                'system': system_info,
                'uptime': uptime_str,
                'memory': {
                    'usage': memory_usage,
                    'percent': memory.percent
                },
                'disk': {
                    'percent': disk_percent,
                    'free': f"{disk.free / (1024 * 1024 * 1024):.1f}GB",
                    'total': f"{disk.total / (1024 * 1024 * 1024):.1f}GB"
                },
                'cpu': {
                    'percent': cpu_percent
                },
                'tools': tools,
                'service': service_status
            }
        })
    except Exception as e:
        logger.error(f"Error getting system diagnostics: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })
        

@app.route('/api/diagnose-smb', methods=['POST'])
def diagnose_smb():
    """Diagnose SMB connection issues"""
    try:
        data = request.json
        server = data.get('server', '')
        share = data.get('share', '')
        user = data.get('user', '')
        password = data.get('password', '')
        
        results = []
        
        # Test 1: Basic connectivity to server
        try:
            cmd = ['ping', '-c', '1', server]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                results.append({
                    'test': 'Network Connectivity',
                    'status': 'success',
                    'message': f"Server {server} is reachable"
                })
            else:
                results.append({
                    'test': 'Network Connectivity',
                    'status': 'error',
                    'message': f"Cannot reach server {server}"
                })
        except Exception as e:
            results.append({
                'test': 'Network Connectivity',
                'status': 'error',
                'message': f"Error testing connectivity: {str(e)}"
            })
        
        # Test 2: SMB service availability
        try:
            cmd = ['smbclient', '-L', f'//{server}', '-U', f'{user}%{password}', '-m', 'SMB3']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                results.append({
                    'test': 'SMB Service',
                    'status': 'success',
                    'message': f"SMB service is available on {server}"
                })
            else:
                results.append({
                    'test': 'SMB Service',
                    'status': 'error',
                    'message': f"SMB service issue: {result.stderr.strip()}"
                })
        except Exception as e:
            results.append({
                'test': 'SMB Service',
                'status': 'error',
                'message': f"Error testing SMB service: {str(e)}"
            })
        
        # Test 3: Share access
        if share:
            try:
                cmd = ['smbclient', f'//{server}/{share}', '-U', f'{user}%{password}', '-c', 'ls', '-m', 'SMB3']
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    results.append({
                        'test': 'Share Access',
                        'status': 'success',
                        'message': f"Share '{share}' is accessible"
                    })
                else:
                    results.append({
                        'test': 'Share Access',
                        'status': 'error',
                        'message': f"Cannot access share '{share}': {result.stderr.strip()}"
                    })
            except Exception as e:
                results.append({
                    'test': 'Share Access',
                    'status': 'error',
                    'message': f"Error testing share access: {str(e)}"
                })
        
        # Test 4: Write permissions
        if share:
            try:
                test_dir = f"test_dir_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                cmd = ['smbclient', f'//{server}/{share}', '-U', f'{user}%{password}', 
                       '-c', f"mkdir {test_dir}; rmdir {test_dir}", '-m', 'SMB3']
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    results.append({
                        'test': 'Write Permissions',
                        'status': 'success',
                        'message': f"Write permissions confirmed on share '{share}'"
                    })
                else:
                    results.append({
                        'test': 'Write Permissions',
                        'status': 'error',
                        'message': f"No write permissions on share '{share}': {result.stderr.strip()}"
                    })
            except Exception as e:
                results.append({
                    'test': 'Write Permissions',
                    'status': 'error',
                    'message': f"Error testing write permissions: {str(e)}"
                })
        
        return jsonify({
            'success': True,
            'results': results
        })
    except Exception as e:
        logger.error(f"Error diagnosing SMB: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/media-stats', methods=['GET'])
def get_media_stats():
    """Get media library statistics"""
    try:
        # Read directly from the stats.json file that has the correct data
        if os.path.exists(STATS_JSON_PATH):
            with open(STATS_JSON_PATH, 'r') as f:
                data = json.load(f)
                
            # Extract stats in the format expected by the web interface
            stats = {
                'english_movies': data.get('english_movies', 0),
                'malayalam_movies': data.get('malayalam_movies', 0),
                'english_tv': data.get('english_tv_shows', 0),  # Note: different naming
                'malayalam_tv': data.get('malayalam_tv_shows', 0)  # Note: different naming
            }
            
            logger.info(f"Loaded stats from {STATS_JSON_PATH}: {stats}")
            return jsonify({
                'success': True,
                'stats': stats
            })
        
        # Fallback to file history if stats.json doesn't exist
        logger.warning(f"Stats file {STATS_JSON_PATH} not found, falling back to file history")
        
        stats = {
            'english_movies': 0,
            'malayalam_movies': 0,
            'english_tv': 0,
            'malayalam_tv': 0
        }
        
        # Get file history to count processed files
        history = load_file_history()
        
        # Use a dictionary to track unique successful files only
        unique_files = {}
        
        for entry in history:
            filename = entry.get('name', '')
            status = entry.get('status', '').lower()
            media_type = entry.get('type', '').lower()
            language = entry.get('language', '').lower()
            
            # Only count files that were successfully processed (status = success)
            # and avoid counting the same file multiple times
            if status in ['success'] and filename and filename not in unique_files:
                unique_files[filename] = {
                    'type': media_type,
                    'language': language
                }
        
        # Debug: Log unique files for troubleshooting
        logger.info(f"Found {len(unique_files)} unique successful files")
        
        # Count by type and language for debugging
        debug_counts = {}
        for filename, info in unique_files.items():
            media_type = info.get('type', '').lower()
            language = info.get('language', '').lower()
            key = f"{language}_{media_type}"
            debug_counts[key] = debug_counts.get(key, 0) + 1
            
        logger.info(f"Debug counts by type/language: {debug_counts}")
        
        # Log some examples
        for filename, info in list(unique_files.items())[:5]:
            logger.info(f"Example file: {filename[:50]}... Type: {info.get('type')} Language: {info.get('language')}")
        
        # Count unique successful files
        for file_info in unique_files.values():
            media_type = file_info.get('type', '').lower()
            language = file_info.get('language', '').lower()
            
            if media_type == 'movie':
                if language == 'malayalam':
                    stats['malayalam_movies'] += 1
                else:
                    stats['english_movies'] += 1
            elif media_type in ['tv', 'tvshow']:
                if language == 'malayalam':
                    stats['malayalam_tv'] += 1
                else:
                    stats['english_tv'] += 1
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        logger.error(f"Error getting media stats: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/run-diagnostics', methods=['GET'])
def run_diagnostics():
    """Run comprehensive system diagnostics"""
    try:
        results = {}
        
        # Check service status
        service_result = subprocess.run(
            ['systemctl', 'is-active', 'media-processor-py.service'],
            capture_output=True, text=True
        )
        results['serviceStatus'] = service_result.stdout.strip()
        
        # Check if service is enabled
        enabled_result = subprocess.run(
            ['systemctl', 'is-enabled', 'media-processor-py.service'],
            capture_output=True, text=True
        )
        results['serviceEnabled'] = enabled_result.stdout.strip()
        
        # Check directories
        config = load_config()
        download_path = config.get('download_path', '/downloads')
        results['downloadDirExists'] = os.path.isdir(download_path)
        
        # Check disk space
        disk = psutil.disk_usage('/')
        results['diskSpace'] = f"{disk.percent}%"
        results['diskAvailable'] = f"{disk.free // (1024**3)}G"
        
        # Check for required tools
        for tool in ['ffmpeg', 'smbclient', 'mediainfo']:
            # Check if installed
            which_result = subprocess.run(['which', tool], capture_output=True, text=True)
            results[f'{tool}Installed'] = which_result.returncode == 0
            
            if which_result.returncode == 0:
                # Get version
                version_cmd = [tool, '--version'] if tool != 'mediainfo' else [tool, '--Version']
                version_result = subprocess.run(version_cmd, capture_output=True, text=True)
                version = version_result.stdout.strip() if version_result.returncode == 0 else 'Unknown'
                results[f'{tool}Version'] = version
        
        # Test SMB connectivity
        smb_server = config.get('smb_server', '')
        smb_share = config.get('smb_share', '')
        smb_username = config.get('smb_username', '')
        smb_password = config.get('smb_password', '')
        
        if smb_server and smb_share and smb_username:
            try:
                cmd = ['smbclient', f'//{smb_server}/{smb_share}', '-U', f'{smb_username}%{smb_password}', '-c', 'ls', '-m', 'SMB3']
                smb_result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                results['smbConnectivity'] = 'connection_success' if smb_result.returncode == 0 else 'connection_failed'
                if smb_result.returncode != 0:
                    results['smbError'] = smb_result.stderr.strip()
            except Exception as e:
                results['smbConnectivity'] = 'connection_error'
                results['smbError'] = str(e)
        else:
            results['smbConnectivity'] = 'not_configured'
        
        # Check for permission warnings
        results['permissionWarning'] = ''
        if not os.access('/var/log/media-processor', os.W_OK):
            results['permissionWarning'] += 'No write access to log directory. '
        
        # Add diagnostics runtime
        results['diagnosticRuntime'] = 0
        
        return jsonify({
            'success': True,
            'diagnostics': results
        })
    except Exception as e:
        logger.error(f"Error running diagnostics: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/database/backup', methods=['POST'])
def create_database_backup():
    """Create database backup"""
    try:
        if not DatabaseManager:
            return jsonify({
                'success': False,
                'error': 'Database manager not available'
            })
        
        db_manager = DatabaseManager()
        data = request.json or {}
        backup_type = data.get('type', 'manual')
        compress = data.get('compress', True)
        
        backup_path = db_manager.create_backup(backup_type, compress)
        
        if backup_path:
            # Get backup info
            import os
            file_size = os.path.getsize(backup_path)
            
            return jsonify({
                'success': True,
                'backup_path': backup_path,
                'file_size': file_size,
                'message': f'Backup created successfully: {os.path.basename(backup_path)}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create backup'
            })
            
    except Exception as e:
        logger.error(f"Error creating backup: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/database/restore', methods=['POST'])
def restore_database_backup():
    """Restore database from backup"""
    try:
        if not DatabaseManager:
            return jsonify({
                'success': False,
                'error': 'Database manager not available'
            })
        
        data = request.json or {}
        backup_path = data.get('backup_path')
        
        if not backup_path:
            return jsonify({
                'success': False,
                'error': 'Backup path is required'
            })
        
        db_manager = DatabaseManager()
        success = db_manager.restore_backup(backup_path)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Database restored successfully from {os.path.basename(backup_path)}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to restore database'
            })
            
    except Exception as e:
        logger.error(f"Error restoring backup: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/database/backups', methods=['GET'])
def list_database_backups():
    """List available database backups"""
    try:
        if not DatabaseManager:
            return jsonify({
                'success': False,
                'error': 'Database manager not available'
            })
        
        db_manager = DatabaseManager()
        backups = []
        
        # Get backups from backup directory
        backup_dir = db_manager.backup_dir
        if backup_dir.exists():
            for backup_file in backup_dir.glob('media_processor_backup_*.db*'):
                stat = backup_file.stat()
                backups.append({
                    'path': str(backup_file),
                    'name': backup_file.name,
                    'size': stat.st_size,
                    'created_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'type': 'auto' if '_auto_' in backup_file.name else 'manual'
                })
        
        # Sort by creation time, newest first
        backups.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify({
            'success': True,
            'backups': backups
        })
            
    except Exception as e:
        logger.error(f"Error listing backups: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/database/health', methods=['GET'])
def database_health_check():
    """Get database health status"""
    try:
        if not DatabaseManager:
            return jsonify({
                'success': False,
                'error': 'Database manager not available'
            })
        
        db_manager = DatabaseManager()
        health = db_manager.health_check()
        
        return jsonify({
            'success': True,
            'health': health
        })
            
    except Exception as e:
        logger.error(f"Error checking database health: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/database/info', methods=['GET'])
def get_database_info():
    """Get database information"""
    try:
        db_path = "/var/lib/media-processor/media_processor.db"
        info = {
            'success': True,
            'size': 0,
            'total_files': 0,
            'exists': False
        }
        
        if os.path.exists(db_path):
            info['exists'] = True
            info['size'] = os.path.getsize(db_path)
            
            # Get file count from database
            if DatabaseManager:
                try:
                    db_manager = DatabaseManager()
                    stats = db_manager.get_statistics()
                    total = sum(stats.values()) if stats else 0
                    info['total_files'] = total
                except:
                    pass
        
        # Also check stats.json
        stats_path = "/home/sharvinzlife/media-processor/stats.json"
        if os.path.exists(stats_path):
            try:
                with open(stats_path, 'r') as f:
                    stats_data = json.load(f)
                    if not info['total_files'] and 'history' in stats_data:
                        info['total_files'] = len(stats_data['history'])
            except:
                pass
        
        return jsonify(info)
    except Exception as e:
        logger.error(f"Error getting database info: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/database/sync', methods=['POST'])
def sync_database():
    """Sync database from data sources"""
    try:
        if not DatabaseManager:
            return jsonify({
                'success': False,
                'error': 'Database manager not available'
            })
        
        db_manager = DatabaseManager()
        success = db_manager.sync_data_sources()
        
        if success:
            # Export updated stats
            db_manager.export_statistics_to_json()
            
            return jsonify({
                'success': True,
                'message': 'Database synchronized successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to sync database'
            })
            
    except Exception as e:
        logger.error(f"Error syncing database: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/database/reset', methods=['POST'])
def reset_database():
    """Reset database (delete and recreate)"""
    try:
        if not DatabaseManager:
            return jsonify({
                'success': False,
                'error': 'Database manager not available'
            })
        
        db_path = "/var/lib/media-processor/media_processor.db"
        
        # Backup before reset
        if os.path.exists(db_path):
            backup_path = f"{db_path}.backup.{datetime.now().strftime('%Y%m%d%H%M%S')}"
            shutil.copy2(db_path, backup_path)
            logger.info(f"Created backup before reset: {backup_path}")
        
        # Delete existing database
        if os.path.exists(db_path):
            os.remove(db_path)
            logger.info(f"Removed existing database: {db_path}")
        
        # Create new database
        db_manager = DatabaseManager()
        db_manager.initialize_database()
        
        # Clear stats.json as well
        stats_path = "/home/sharvinzlife/media-processor/stats.json"
        if os.path.exists(stats_path):
            with open(stats_path, 'w') as f:
                json.dump({
                    "lastUpdated": datetime.now().isoformat(),
                    "statistics": {
                        "movies": 0,
                        "malayalamMovies": 0,
                        "tvShows": 0,
                        "malayalamTvShows": 0
                    },
                    "history": []
                }, f, indent=2)
        
        return jsonify({
            'success': True,
            'message': 'Database reset successfully'
        })
        
    except Exception as e:
        logger.error(f"Error resetting database: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/system-logs', methods=['GET'])
def get_system_logs():
    """Get enhanced system logs"""
    try:
        log_type = request.args.get('type', 'processor')
        lines = int(request.args.get('lines', '100'))
        
        if log_type == 'processor':
            service_name = 'media-processor-py.service'
        elif log_type == 'ui':
            service_name = 'media-processor-ui.service'
        elif log_type == 'api':
            service_name = 'media-processor-api.service'
        else:
            service_name = 'media-processor-py.service'
        
        # Get logs using journalctl
        result = subprocess.run(
            ['journalctl', '-u', service_name, '-n', str(lines), '--no-pager'],
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            return result.stdout
        else:
            return f"Error getting logs: {result.stderr}", 500
            
    except Exception as e:
        logger.error(f"Error getting logs: {e}")
        return f"Error getting logs: {str(e)}", 500

@app.route('/api/diagnostics', methods=['GET'])
def get_diagnostics():
    """Redirect to run-diagnostics for compatibility"""
    return run_diagnostics()

@app.route('/api/manual-scan', methods=['POST'])
def manual_scan():
    """Manually scan SMB share for new files"""
    try:
        logger.info("Starting manual scan...")
        
        # Import and run manual scanner
        from manual_scan import ManualScanner
        
        scanner = ManualScanner()
        media_files = scanner.scan_smb_share()
        
        if media_files:
            new_files = scanner.sync_found_files(media_files)
            
            return jsonify({
                'success': True,
                'message': f'Scan completed. Found {len(media_files)} total files, {len(new_files)} new files added.',
                'total_files': len(media_files),
                'new_files': len(new_files),
                'files': new_files[:10]  # Return first 10 new files
            })
        else:
            return jsonify({
                'success': True,
                'message': 'Scan completed. No media files found.',
                'total_files': 0,
                'new_files': 0,
                'files': []
            })
            
    except Exception as e:
        logger.error(f"Manual scan error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

if __name__ == '__main__':
    # Create default config if it doesn't exist
    if not os.path.exists(CONFIG_PATH):
        default_config = {
            'smb_server': 'streamwave.local',
            'smb_share': 'Data-Streamwave',
            'smb_username': 'sharvinzlife',
            'smb_password': '',
            'english_movies_path': 'media/movies',
            'english_tv_path': 'media/tv-shows',
            'malayalam_movies_path': 'media/malayalam-movies',
            'malayalam_tv_path': 'media/malayalam-tv-shows',
            'download_path': '/downloads',
            'processing_enabled': True
        }
        save_config(default_config)
    
    # Create file history if it doesn't exist
    if not os.path.exists(FILE_HISTORY_PATH):
        save_file_history([])
    
    # Start the Flask app
    logger.info("Starting Media Processor API Server")
    app.run(host='0.0.0.0', port=5001, debug=False)
