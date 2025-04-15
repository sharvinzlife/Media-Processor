const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 3001;
const scriptPath = path.join(__dirname, '../../bin/media-processor.sh');
const configPath = path.join(__dirname, '../../lib/config.sh');
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
app.get('/api/diagnose-smb', (req, res) => {
  // Get settings from config file
  fs.readFile(configPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to read config file' });
    }
    
    // Extract SMB settings
    const smbServerMatch = data.match(/SMB_SERVER=["']?([^"'#]*)["']?/);
    const smbShareMatch = data.match(/SMB_SHARE=["']?([^"'#]*)["']?/);
    const smbUserMatch = data.match(/SMB_USER=["']?([^"'#]*)["']?/);
    const smbPasswordMatch = data.match(/SMB_PASSWORD=["']?([^"'#]*)["']?/);
    
    const smbServer = smbServerMatch ? smbServerMatch[1].trim() : '';
    const smbShare = smbShareMatch ? smbShareMatch[1].trim() : '';
    const smbUser = smbUserMatch ? smbUserMatch[1].trim() : '';
    const smbPassword = smbPasswordMatch ? smbPasswordMatch[1].trim() : '';
    
    // Run a series of diagnostic tests
    Promise.all([
      // Test 1: Check if smbclient is installed
      new Promise((resolve) => {
        exec('which smbclient', (error) => {
          resolve({ 
            test: 'smbclient_installed', 
            success: !error,
            message: error ? 'smbclient is not installed' : 'smbclient is installed'
          });
        });
      }),
      
      // Test 2: Check if server is reachable
      new Promise((resolve) => {
        exec(`ping -c 1 ${smbServer}`, (error) => {
          resolve({ 
            test: 'server_reachable', 
            success: !error,
            message: error ? `Server ${smbServer} is not reachable` : `Server ${smbServer} is reachable`
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
            output: stdout
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
            output: stdout
          });
        });
      }),
      
      // Test 5: Check permissions
      new Promise((resolve) => {
        exec(`smbclient "//${smbServer}/${smbShare}" -U "${smbUser}%${smbPassword}" -c "mkdir test_dir; rmdir test_dir"`, (error, stdout, stderr) => {
          resolve({ 
            test: 'write_permissions', 
            success: !error,
            message: error ? `No write permissions on share ${smbShare}: ${stderr}` : `Have write permissions on share ${smbShare}`,
            output: stdout
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
      res.status(500).json({ 
        success: false, 
        error: error.toString() 
      });
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
  exec('sudo systemctl restart media-processor.service', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ success: false, error: stderr || 'Failed to restart service' });
    }
    
    res.json({ success: true });
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

// Add a catch-all route for debugging
app.use((req, res) => {
  console.log('404 for:', req.url);
  res.status(404).send('Not Found');
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
