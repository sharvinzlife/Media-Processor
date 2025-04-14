const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration file paths
const MEDIA_PROCESSOR_SCRIPT = '/home/sharvinzlife/Documents/JDownloader/media-processor.sh';
const LOG_FILE = '/home/sharvinzlife/media-processor.log';

app.use(cors());
app.use(express.json());

// Serve static files if they exist
app.use(express.static(path.join(__dirname, '../build')));

// API endpoints
app.get('/api/status', (req, res) => {
  exec('systemctl is-active media-processor.service', (err, stdout, stderr) => {
    const status = stdout.trim() === 'active' ? 'running' : 'stopped';
    res.json({ status });
  });
});

app.get('/api/logs', (req, res) => {
  fs.readFile(LOG_FILE, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading log file' });
    }
    const lines = data.split('\n').reverse().slice(0, 100);
    res.json({ logs: lines });
  });
});

// Get current configuration
app.get('/api/config', (req, res) => {
  fs.readFile(MEDIA_PROCESSOR_SCRIPT, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading configuration' });
    }
    
    // Parse configuration values from the script
    const config = {
      sourceDir: extractConfigValue(data, 'SOURCE_DIR'),
      smbServer: extractConfigValue(data, 'SMB_SERVER'),
      smbShare: extractConfigValue(data, 'SMB_SHARE'),
      smbUser: extractConfigValue(data, 'SMB_USER'),
      smbAuthMethod: extractConfigValue(data, 'SMB_AUTH_METHOD'),
      malayalamMoviePath: extractConfigValue(data, 'MALAYALAM_MOVIE_PATH'),
      malayalamTvPath: extractConfigValue(data, 'MALAYALAM_TV_PATH'),
      englishMoviePath: extractConfigValue(data, 'ENGLISH_MOVIE_PATH'),
      englishTvPath: extractConfigValue(data, 'ENGLISH_TV_PATH'),
      cleanupRarFiles: extractConfigValue(data, 'CLEANUP_RAR_FILES'),
      cleanupEmptyDirs: extractConfigValue(data, 'CLEANUP_EMPTY_DIRS'),
      minRarAgeHours: extractConfigValue(data, 'MIN_RAR_AGE_HOURS')
    };
    
    res.json(config);
  });
});

// Update configuration
app.post('/api/config', (req, res) => {
  const { config } = req.body;
  
  if (!config) {
    return res.status(400).json({ error: 'Configuration data is required' });
  }
  
  fs.readFile(MEDIA_PROCESSOR_SCRIPT, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading script file' });
    }
    
    // Update configuration values
    let updatedScript = data;
    
    if (config.sourceDir) {
      updatedScript = updateConfigValue(updatedScript, 'SOURCE_DIR', config.sourceDir);
    }
    if (config.smbServer) {
      updatedScript = updateConfigValue(updatedScript, 'SMB_SERVER', config.smbServer);
    }
    if (config.smbShare) {
      updatedScript = updateConfigValue(updatedScript, 'SMB_SHARE', config.smbShare);
    }
    if (config.malayalamMoviePath) {
      updatedScript = updateConfigValue(updatedScript, 'MALAYALAM_MOVIE_PATH', config.malayalamMoviePath);
    }
    if (config.malayalamTvPath) {
      updatedScript = updateConfigValue(updatedScript, 'MALAYALAM_TV_PATH', config.malayalamTvPath);
    }
    if (config.englishMoviePath) {
      updatedScript = updateConfigValue(updatedScript, 'ENGLISH_MOVIE_PATH', config.englishMoviePath);
    }
    if (config.englishTvPath) {
      updatedScript = updateConfigValue(updatedScript, 'ENGLISH_TV_PATH', config.englishTvPath);
    }
    if (config.cleanupRarFiles !== undefined) {
      updatedScript = updateConfigValue(updatedScript, 'CLEANUP_RAR_FILES', config.cleanupRarFiles.toString());
    }
    if (config.cleanupEmptyDirs !== undefined) {
      updatedScript = updateConfigValue(updatedScript, 'CLEANUP_EMPTY_DIRS', config.cleanupEmptyDirs.toString());
    }
    
    // Write the updated script back to file
    fs.writeFile(MEDIA_PROCESSOR_SCRIPT, updatedScript, 'utf8', (writeErr) => {
      if (writeErr) {
        return res.status(500).json({ error: 'Error writing configuration' });
      }
      
      res.json({ success: true, message: 'Configuration updated successfully' });
    });
  });
});

// Service control endpoints
app.post('/api/service/:action', (req, res) => {
  const { action } = req.params;
  
  if (!['start', 'stop', 'restart'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  const scriptPath = '/home/sharvinzlife/Documents/JDownloader/service-control.sh';
  
  console.log(`Executing: ${scriptPath} ${action}`);
  
  // Use the wrapper script that has appropriate permissions
  exec(`${scriptPath} ${action}`, (err, stdout, stderr) => {
    if (err) {
      console.error(`Service control error (${action}):`, err);
      console.error('Stderr:', stderr);
      console.error('Stdout:', stdout);
      
      return res.status(500).json({ 
        success: false,
        error: `Failed to ${action} service. Check that you have necessary permissions.`, 
        details: stderr || err.message 
      });
    }
    
    console.log('Service control succeeded:', stdout);
    res.json({ success: true, message: `Service ${action} initiated successfully` });
  });
});

// Add a diagnostic endpoint
app.get('/api/diagnostics', (req, res) => {
  const results = {
    systemCtlAccess: false,
    serviceExists: false,
    serviceStatus: null,
    permissions: {},
    user: null,
    logs: {
      readable: false,
      writeable: false,
      lastLines: []
    }
  };
  
  // Get current user
  exec('whoami', (err, stdout, stderr) => {
    results.user = stdout.trim();
    
    // Check systemctl access
    exec('systemctl --version', (err, stdout, stderr) => {
      results.systemCtlAccess = !err;
      
      // Check if service exists
      exec('systemctl list-unit-files | grep media-processor', (err, stdout, stderr) => {
        results.serviceExists = !err && stdout.includes('media-processor');
        
        // Check service status if it exists
        if (results.serviceExists) {
          exec('systemctl status media-processor.service', (err, stdout, stderr) => {
            if (!err) {
              if (stdout.includes('Active: active')) {
                results.serviceStatus = 'running';
              } else if (stdout.includes('Active: inactive')) {
                results.serviceStatus = 'stopped';
              } else {
                results.serviceStatus = 'unknown';
              }
            }
            
            // Check log file access
            fs.access(LOG_FILE, fs.constants.R_OK, (err) => {
              results.logs.readable = !err;
              
              fs.access(LOG_FILE, fs.constants.W_OK, (err) => {
                results.logs.writeable = !err;
                
                // Get last few lines of log if readable
                if (results.logs.readable) {
                  try {
                    const logData = fs.readFileSync(LOG_FILE, 'utf8');
                    results.logs.lastLines = logData.split('\n').slice(-5);
                  } catch (e) {
                    results.logs.lastLines = [`Error reading log: ${e.message}`];
                  }
                }
                
                // Send results
                res.json(results);
              });
            });
          });
        } else {
          res.json(results);
        }
      });
    });
  });
});

// Helper function to extract config values from script
function extractConfigValue(scriptContent, key) {
  const regex = new RegExp(`${key}=["']?([^"'\\n]*)["']?`);
  const match = scriptContent.match(regex);
  return match ? match[1] : '';
}

// Helper function to update config values in script
function updateConfigValue(scriptContent, key, value) {
  // If the value contains spaces, ensure it's quoted
  const quotedValue = value.includes(' ') ? `"${value}"` : value;
  const regex = new RegExp(`(${key}=)["']?[^"'\\n]*["']?`, 'g');
  return scriptContent.replace(regex, `$1${quotedValue}`);
}

// Catch-all route to return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
