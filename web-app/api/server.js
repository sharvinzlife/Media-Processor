const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 3001;
const scriptPath = path.join(__dirname, '../../media-processor.sh');
const logFile = '/home/sharvinzlife/media-processor.log';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../build')));

// Serve static files from the build directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// Get service status
app.get('/api/status', (req, res) => {
  exec('systemctl is-active media-processor.service', (error, stdout, stderr) => {
    const status = stdout.trim();
    let uptime = '0d 0h 0m';
    
    if (status === 'active') {
      exec('systemctl show media-processor.service --property=ActiveEnterTimestamp', (error, stdout, stderr) => {
        if (!error) {
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
      res.json({ status, uptime });
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

// Get settings from the script
app.get('/api/settings', (req, res) => {
  fs.readFile(scriptPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to read script file' });
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

// Update settings in the script
app.post('/api/settings', (req, res) => {
  const settings = req.body;
  
  fs.readFile(scriptPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to read script file' });
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
    
    fs.writeFile(scriptPath, updatedScript, 'utf8', (err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to write script file' });
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

// Check dependencies
app.get('/api/check-dependencies', (req, res) => {
  const dependencies = ['smbclient', 'mediainfo', 'ffmpeg'];
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

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
