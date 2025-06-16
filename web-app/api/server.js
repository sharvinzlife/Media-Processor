const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Try to load environment variables from .env file
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  console.log('Environment variables loaded from .env file');
} catch (err) {
  console.log('Failed to load dotenv package, using default environment variables:', err.message);
  // Set default values if dotenv fails
  process.env.PORT = process.env.PORT || 3001;
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Persistent stats file
const statsPath = path.join(__dirname, 'stats.json'); // Single source of truth

// Path to main config file
const configPath = process.env.CONFIG_PATH || path.join(__dirname, '../../lib/config.sh');

// Helper to load stats (init if missing)
function loadStats() {
  if (!fs.existsSync(statsPath)) {
    const initialStats = {
      english_movies: 0,
      malayalam_movies: 0,
      english_tv_shows: 0,
      malayalam_tv_shows: 0,
      files: []
    };
    fs.writeFileSync(statsPath, JSON.stringify(initialStats, null, 2));
    return initialStats;
  }
  try {
    const data = fs.readFileSync(statsPath, 'utf8');
    const stats = JSON.parse(data);
    // Ensure all keys exist
    return Object.assign({
      english_movies: 0,
      malayalam_movies: 0,
      english_tv_shows: 0,
      malayalam_tv_shows: 0,
      files: []
    }, stats);
  } catch (e) {
    return { english_movies: 0, malayalam_movies: 0, english_tv_shows: 0, malayalam_tv_shows: 0, files: [] };
  }
}

function saveStats(stats) {
  // Limit file history to 500
  if (stats.files && stats.files.length > 500) stats.files = stats.files.slice(0, 500);
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
}

// API: Get stats and file history
app.get('/api/stats', (req, res) => {
  const stats = loadStats();
  res.json({ success: true, stats });
});

// API: Add processed file (expects { name, type, language, processedAt })
app.post('/api/stats/add', (req, res) => {
  const { name, type, language, processedAt } = req.body;
  if (!name || !type || !language || !processedAt) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  const stats = loadStats();
  // Increment counters
  if (type === 'movie') {
    if (language === 'english') stats.english_movies++;
    if (language === 'malayalam') stats.malayalam_movies++;
  }
  if (type === 'tvshow') {
    if (language === 'english') stats.english_tv_shows++;
    if (language === 'malayalam') stats.malayalam_tv_shows++;
  }
  // Add to file history (keep max 500 for perf)
  stats.files.unshift({ name, type, language, processedAt });
  saveStats(stats);
  res.json({ success: true });
});

// Add processed media endpoint (for Bash/legacy compatibility)
app.post('/api/media/processed', (req, res) => {
  const { name, type, language, processedAt, path, size, status } = req.body;
  if (!name || !type || !language) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  const timestamp = processedAt || new Date().toISOString();
  const stats = loadStats();
  // Increment counters
  if (type === 'movie') {
    if (language === 'english') stats.english_movies++;
    if (language === 'malayalam') stats.malayalam_movies++;
  }
  if (type === 'tvshow') {
    if (language === 'english') stats.english_tv_shows++;
    if (language === 'malayalam') stats.malayalam_tv_shows++;
  }
  // Add to file history with more complete metadata
  stats.files.unshift({
    name,
    type,
    language,
    processedAt: timestamp,
    path: path || '',
    size: size || '',
    status: status || 'success'
  });
  saveStats(stats);
  res.json({ success: true, message: 'Media processed successfully' });
});

// Add failed media endpoint
app.post('/api/media/failed', (req, res) => {
  const { name, type, language, timestamp, path, error } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Missing required field: name' });
  }
  const stats = loadStats();
  // Add to file history with failed status
  stats.files.unshift({
    name,
    type: type || 'unknown',
    language: language || 'unknown',
    processedAt: timestamp || new Date().toISOString(),
    path: path || '',
    status: 'failed',
    error: error || 'Unknown error'
  });
  saveStats(stats);
  res.json({ success: true, message: 'Failed media record added' });
});

// Add update media counts endpoint
app.post('/api/media/update-counts', (req, res) => {
  const stats = loadStats();
  res.json({
    success: true,
    stats: {
      english_movies: stats.english_movies,
      malayalam_movies: stats.malayalam_movies,
      english_tv_shows: stats.english_tv_shows,
      malayalam_tv_shows: stats.malayalam_tv_shows
    }
  });
});

// Add stats update-counts endpoint (alias for media/update-counts)
app.post('/api/stats/update-counts', (req, res) => {
  res.json({ 
    success: true, 
    stats: {
      english_movies: loadStats().english_movies,
      malayalam_movies: loadStats().malayalam_movies,
      english_tv_shows: loadStats().english_tv_shows,
      malayalam_tv_shows: loadStats().malayalam_tv_shows
    }
  });
});

const scriptPath = path.join(__dirname, '../../bin/media-processor.sh');
const logFile = '/home/sharvinzlife/media-processor.log';

app.use(cors());
app.use(express.json());

// Add debugging for static file serving
const staticPath = path.join(__dirname, '../build');
console.log('Serving static files from:', staticPath);
if (fs.existsSync(staticPath)) {
  console.log('Static path exists');
  const files = fs.readdirSync(staticPath);
  console.log('Files in static path:', files);
} else {
  console.log('Static path does not exist');
}

app.use(express.static(staticPath));

// Serve static files from the build directory
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../build/index.html');
  console.log('Serving index.html from:', indexPath);
  if (fs.existsSync(indexPath)) {
    console.log('index.html exists');
    res.sendFile(indexPath);
  } else {
    console.log('index.html does not exist');
    res.status(404).send('index.html not found');
  }
});

// Get service status - improved with multiple detection methods
app.get('/api/status', (req, res) => {
  // First check if the process is running via PS
  exec('ps aux | grep "[m]edia-processor.sh"', (error, stdout, stderr) => {
    if (stdout.trim()) {
      // Process is running via direct execution
      res.json({ status: 'active', uptime: 'unknown' });
    } else {
      // Next try systemctl status with improved error handling
      exec('systemctl is-active media-processor.service', (error, stdout, stderr) => {
        const status = stdout.trim();
        let uptime = '0d 0h 0m';
        
        if (status === 'active') {
          exec('systemctl show media-processor.service --property=ActiveEnterTimestamp', (error, stdout, stderr) => {
            if (!error && stdout) {
              const timestampLine = stdout.trim();
              const timestamp = timestampLine.split('=')[1];
              
              if (timestamp) {
                const startTime = new Date(timestamp);
                const now = new Date();
                const diff = now - startTime;
                
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                
                uptime = `${days}d ${hours}h ${minutes}m`;
              }
            }
            
            res.json({ status, uptime });
          });
        } else {
          // Final fallback - check if the service exists but is inactive
          exec('systemctl list-unit-files | grep media-processor.service', (error, stdout, stderr) => {
            if (stdout.trim()) {
              res.json({ status: 'inactive', uptime });
            } else {
              res.json({ status: 'not-installed', uptime });
            }
          });
        }
      });
    }
  });
});

// Robust restart endpoint
app.post('/api/restart', (req, res) => {
  // Only allow from localhost
  if (req.ip !== '::1' && req.ip !== '127.0.0.1' && req.ip !== '::ffff:127.0.0.1') {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  const restartScript = path.join(__dirname, '../../restart-services.sh');
  if (!fs.existsSync(restartScript)) {
    return res.status(500).json({ success: false, error: 'Restart script not found' });
  }
  exec(`bash "${restartScript}"`, { timeout: 60000 }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ success: false, error: error.message, stdout, stderr });
    }
    res.json({ success: true, stdout, stderr });
  });
});

// Get logs
app.get('/api/logs', (req, res) => {
  fs.readFile(logFile, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to read log file' });
    }
    
    // Split the log into lines and return the last 100 lines
    const logs = data.trim().split('\n').slice(-100);
    res.json({ success: true, logs });
  });
});

// Get settings from the script - updated to read from config.sh
app.get('/api/settings', (req, res) => {
  fs.readFile(configPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to read config file' });
    }
    
    const settings = {};
    const configLines = [
      'SOURCE_DIR',
      'LOG_FILE',
      'SMB_SERVER',
      'SMB_SHARE',
      'SMB_USER',
      'SMB_PASSWORD',
      'SMB_AUTH_METHOD',
      'DRY_RUN',
      'MALAYALAM_MOVIE_PATH',
      'MALAYALAM_TV_PATH',
      'ENGLISH_MOVIE_PATH',
      'ENGLISH_TV_PATH',
      'EXTRACT_AUDIO_TRACKS',
      'EXTRACT_SUBTITLES',
      'PREFERRED_AUDIO_LANGS',
      'PREFERRED_SUBTITLE_LANGS',
      'CLEANUP_RAR_FILES',
      'CLEANUP_EMPTY_DIRS',
      'MIN_RAR_AGE_HOURS'
    ];
    
    configLines.forEach(key => {
      const regex = new RegExp(`${key}=["']?([^"'#]*)["']?`);
      const match = data.match(regex);
      if (match) {
        settings[key] = match[1].trim();
      }
    });
    
    res.json(settings);
  });
});

// Update settings in the script - updated to write to config.sh
app.post('/api/settings', (req, res) => {
  const settings = req.body;
  
  fs.readFile(configPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to read config file' });
    }
    
    let updatedScript = data;
    
    Object.keys(settings).forEach(key => {
      const value = settings[key];
      let regex;
      
      // Handle different types of settings differently
      if (key === 'SMB_PASSWORD' || key === 'SMB_USER' || 
          key.includes('_PATH') || key.includes('_LANGS')) {
        // These settings should be quoted
        regex = new RegExp(`(${key}=)["']?[^"'#]*["']?`, 'g');
        updatedScript = updatedScript.replace(regex, `$1"${value}"`);
      } else {
        // Other settings are typically booleans or simple values
        regex = new RegExp(`(${key}=)[^#\n]*`, 'g');
        updatedScript = updatedScript.replace(regex, `$1${value}`);
      }
    });
    
    fs.writeFile(configPath, updatedScript, 'utf8', (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to write config file' });
      }
      
      res.json({ success: true });
    });
  });
});

// Test SMB connection
app.post('/api/test-connection', (req, res) => {
  const { server, share, user, password, anonymous } = req.body;
  
  let cmd = '';
  if (anonymous) {
    cmd = `smbclient -L ${server} -N`;
  } else {
    cmd = `smbclient -L ${server} -U "${user}%${password}"`;
  }
  
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      return res.json({ success: false, error: stderr || 'Connection failed' });
    }
    
    res.json({ success: true, message: 'Connection successful' });
  });
});

// Diagnose SMB connection issues
app.post('/api/diagnose-smb', (req, res) => {
  // Get settings from request body or config file
  let smbServer, smbShare, smbUser, smbPassword;
  
  if (req.body && req.body.server) {
    // Use the settings provided in the request
    smbServer = req.body.server;
    smbShare = req.body.share;
    smbUser = req.body.user;
    smbPassword = req.body.password;
    
    console.log(`Using provided SMB settings: Server=${smbServer}, Share=${smbShare}, User=${smbUser}`);
  } else {
    // Fall back to settings from config file
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      
      // Extract SMB settings
      const smbServerMatch = data.match(/SMB_SERVER=["']?([^"'#]*)["']?/);
      const smbShareMatch = data.match(/SMB_SHARE=["']?([^"'#]*)["']?/);
      const smbUserMatch = data.match(/SMB_USER=["']?([^"'#]*)["']?/);
      const smbPasswordMatch = data.match(/SMB_PASSWORD=["']?([^"'#]*)["']?/);
      
      smbServer = smbServerMatch ? smbServerMatch[1].trim() : '';
      smbShare = smbShareMatch ? smbShareMatch[1].trim() : '';
      smbUser = smbUserMatch ? smbUserMatch[1].trim() : '';
      smbPassword = smbPasswordMatch ? smbPasswordMatch[1].trim() : '';
      
      console.log(`Using config file SMB settings: Server=${smbServer}, Share=${smbShare}, User=${smbUser}`);
    } catch (err) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to read config file',
        details: err.message
      });
    }
  }
  
  // Validate required fields
  if (!smbServer || !smbShare) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required SMB settings',
      details: 'Server and share are required' 
    });
  }
  
  // Run a series of diagnostic tests
  Promise.all([
    // Test 1: Check if smbclient is installed
    new Promise((resolve) => {
      exec('which smbclient', (error, stdout) => {
        resolve({ 
          test: 'smbclient_installed', 
          success: !error,
          message: error ? 'smbclient is not installed' : 'smbclient is installed',
          output: stdout || null
        });
      });
    }),
    
    // Test 2: Check if server is reachable
    new Promise((resolve) => {
      exec(`ping -c 1 ${smbServer}`, (error, stdout, stderr) => {
        resolve({ 
          test: 'server_reachable', 
          success: !error,
          message: error ? `Server ${smbServer} is not reachable` : `Server ${smbServer} is reachable`,
          output: stdout || stderr || null
        });
      });
    }),
    
    // Test 3: Test basic SMB connection
    new Promise((resolve) => {
      exec(`smbclient -L ${smbServer} -U "${smbUser}%${smbPassword}"`, (error, stdout, stderr) => {
        resolve({ 
          test: 'smb_connection', 
          success: !error,
          message: error ? `Failed to connect to SMB server: ${stderr}` : 'Successfully connected to SMB server',
          output: stdout || stderr || null
        });
      });
    }),
    
    // Test 4: Test connection to specific share
    new Promise((resolve) => {
      exec(`smbclient "//${smbServer}/${smbShare}" -U "${smbUser}%${smbPassword}" -c "ls"`, (error, stdout, stderr) => {
        resolve({ 
          test: 'share_connection', 
          success: !error,
          message: error ? `Failed to connect to share ${smbShare}: ${stderr}` : `Successfully connected to share ${smbShare}`,
          output: stdout || stderr || null
        });
      });
    }),
    
    // Test 5: Check permissions in multiple directories
    new Promise((resolve) => {
      // Check root and key media directories
      const testDirs = [
        '',                  // Root
        'media',             // Main media dir
        'media/movies',      // Movies dir
        'media/tv-shows',    // TV shows dir
        'media/malayalam movies', // Malayalam movies
        'media/malayalam-tv-shows' // Malayalam TV
      ];
      
      let results = {
        test: 'write_permissions',
        success: false,        // Default to false - will set true if ANY directory has permissions
        message: `Testing write permissions in ${testDirs.length} directories`,
        details: [],           // Detailed results for each directory
        overrideWarning: false // Set to true if transfers work despite failed tests
      };
      
      // Load config file to check if transfers are working
      fs.readFile(path.join(__dirname, '../../stats.json'), 'utf8', (err, data) => {
        // Check if transfers are working despite failed tests
        if (!err && data) {
          try {
            const stats = JSON.parse(data);
            // If we had successful transfers in the last 24 hours
            const recentFiles = (stats.recentFiles || []).filter(f => 
              (new Date() - new Date(f.processedAt)) < 24 * 60 * 60 * 1000
            );
            if (recentFiles.length > 0) {
              results.overrideWarning = true;
              results.message += " (Transfers working despite failures)";
            }
          } catch (e) { /* Ignore JSON parse errors */ }
        }
        
        // Use Promise.all to test all directories in parallel
        Promise.all(testDirs.map(dir => {
          return new Promise(resolveTest => {
            const testPath = dir ? dir : "."; // Use . for root
            const testCommand = dir ? 
              `cd "${testPath}"; mkdir test_dir; rmdir test_dir` : // Test in subdir
              `mkdir test_dir; rmdir test_dir`;                    // Test in root
              
            exec(`smbclient "//${smbServer}/${smbShare}" -U "${smbUser}%${smbPassword}" -c "${testCommand}"`, 
              (error, stdout, stderr) => {
                resolveTest({
                  directory: dir || '/' + smbShare,
                  success: !error,
                  detail: error ? `No write permission: ${stderr}` : `Write permission OK`
                });
              });
          });
        })).then(dirResults => {
          // Process all the test results
          results.details = dirResults;
          
          // Set overall success if ANY directory has write permissions
          const anySuccess = dirResults.some(r => r.success);
          
          // If ANY directory has permissions, or transfers are working, mark as success
          results.success = anySuccess || results.overrideWarning;
          
          if (anySuccess) {
            results.message = `Write permissions available in some directories`;
          } else if (results.overrideWarning) {
            results.message = `No write permissions detected, but transfers are working`;
          } else {
            results.message = `No write permissions detected in any tested directory`;
          }
          
          resolve(results);
        }).catch(e => {
          // Handle test failures
          results.message = `Error testing permissions: ${e.message}`;
          resolve(results);
        });
      });
    })
  ]).then(results => {
    res.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      settings: {
        server: smbServer,
        share: smbShare,
        user: smbUser,
        password: '********' // Mask password for security
      },
      tests: results
    });
  }).catch(error => {
    console.error('Error during SMB diagnostics:', error);
    res.status(500).json({ 
      success: false, 
      error: `Diagnostics failed: ${error.toString()}`,
      details: 'An unexpected error occurred during diagnostics' 
    });
  });
});

// Check dependencies
app.get('/api/check-dependencies', (req, res) => {
  const dependencies = ['smbclient', 'mediainfo', 'ffmpeg', 'mkvmerge', 'mkvextract', 'jq'];
  const missing = [];
  
  // Use Promise.all to check all dependencies in parallel
  Promise.all(dependencies.map(dep => {
    return new Promise((resolve) => {
      exec(`which ${dep}`, (error) => {
        if (error) {
          missing.push(dep);
        }
        resolve();
      });
    });
  })).then(() => {
    if (missing.length === 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false, missing });
    }
  });
});

// Service control endpoints
app.post('/api/service/start', (req, res) => {
  exec('sudo systemctl start media-processor.service', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ success: false, error: stderr || 'Failed to start service' });
    }
    
    res.json({ success: true });
  });
});

app.post('/api/service/stop', (req, res) => {
  exec('sudo systemctl stop media-processor.service', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ success: false, error: stderr || 'Failed to stop service' });
    }
    
    res.json({ success: true });
  });
});

app.post('/api/service/restart', (req, res) => {
  // First restart the media processor service
  exec('sudo systemctl restart media-processor.service', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: stderr || 'Failed to restart media-processor service',
        details: error.message
      });
    }
    
    console.log('Successfully restarted media-processor.service, now restarting web service...');
    
    // Queue the web service restart for after the response is sent
    // This ensures the response reaches the client before the server restarts
    setTimeout(() => {
      console.log('Restarting media-processor-web.service...');
      try {
        // Use a synchronous exec to ensure this completes
        require('child_process').execSync('sudo systemctl restart media-processor-web.service');
        console.log('Web service restart initiated successfully');
      } catch (webError) {
        console.error('Failed to restart web service:', webError.message);
      }
    }, 1000); // Wait 1 second before restarting the web service
    
    // Tell the client the restart was successful and to expect reconnection
    res.json({ 
      success: true, 
      message: 'Both services are being restarted. The web interface will reload shortly.',
      willReconnect: true
    });
  });
});

// Diagnostics endpoint - improved with better error handling
app.get('/api/diagnostics', (req, res) => {
  Promise.all([
    // Get system info
    new Promise((resolve) => {
      exec('uname -a', (error, stdout) => {
        resolve({ systemInfo: error ? 'Not available' : stdout.trim() });
      });
    }),
    // Get disk space
    new Promise((resolve) => {
      exec('df -h | grep -E "/$|/home"', (error, stdout) => {
        resolve({ diskSpace: error ? 'Not available' : stdout.trim() });
      });
    }),
    // Get smb version
    new Promise((resolve) => {
      exec('smbclient --version', (error, stdout) => {
        resolve({ smbVersion: error ? 'Not available' : stdout.trim() });
      });
    }),
    // Get ffmpeg version
    new Promise((resolve) => {
      exec('ffmpeg -version | head -n 1', (error, stdout) => {
        resolve({ ffmpegVersion: error ? 'Not available' : stdout.trim() });
      });
    }),
    // Get mediainfo version
    new Promise((resolve) => {
      exec('mediainfo --version', (error, stdout) => {
        resolve({ mediainfoVersion: error ? 'Not available' : stdout.trim() });
      });
    }),
    // Get mkvmerge version
    new Promise((resolve) => {
      exec('mkvmerge --version | head -n 1', (error, stdout) => {
        resolve({ mkvmergeVersion: error ? 'Not available' : stdout.trim() });
      });
    }),
    // Get recent log entries with improved error handling
    new Promise((resolve) => {
      fs.readFile(logFile, 'utf8', (err, data) => {
        // If we can't read the log, return empty logs array
        const logs = err ? [] : data.trim().split('\n').slice(-20);
        resolve({ logs });
      });
    })
  ]).then(results => {
    const diagnosticData = Object.assign({}, ...results);
    
    // Ensure logs is always an array even if undefined
    if (!diagnosticData.logs) {
      diagnosticData.logs = [];
    }
    
    res.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      data: diagnosticData 
    });
  }).catch(error => {
    // Provide a fallback response with empty data
    res.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      data: {
        systemInfo: 'Not available',
        diskSpace: 'Not available',
        smbVersion: 'Not available',
        ffmpegVersion: 'Not available',
        mediainfoVersion: 'Not available',
        mkvmergeVersion: 'Not available',
        logs: []
      },
      warning: 'Some diagnostics information could not be gathered',
      error: error.toString()
    });
  });
});

// API endpoint to test directory-specific permissions
app.get('/api/smb-permissions', (req, res) => {
  const scriptPath = path.join(__dirname, '../../lib/file-transfer.sh');
  
  // Run the test script that checks all media directories
  exec(`bash -c "source ${scriptPath} && check_all_media_permissions"`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to run permission checks',
        details: stderr
      });
    }
    
    // Parse results from stdout in format "dir1:true,dir2:false,..."
    const results = {};
    const entries = stdout.trim().split(',');
    
    entries.forEach(entry => {
      const [dir, perm] = entry.split(':');
      results[dir] = perm === 'true';
    });
    
    // Check if we have any directory with permissions
    const hasAnyPermission = Object.values(results).some(val => val === true);
    
    res.json({
      success: true,
      hasAnyPermission: hasAnyPermission,
      directories: results
    });
  });
});

// Add a catch-all route for debugging
app.use((req, res) => {
  console.log('404 for:', req.url);
  res.status(404).send('Not Found');
});

// Start the server if run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`API server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Log level: ${process.env.LOG_LEVEL || 'info'}`);
  });
}

// Export for potential use elsewhere
module.exports = app;
