const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Config file path
const CONFIG_FILE = path.join(__dirname, '..', '..', 'media-processor.sh');
const SERVICE_FILE = path.join(__dirname, '..', '..', 'media-processor.service');

// Helper function to parse config values from the bash script
function parseConfigValue(content, key) {
  const regex = new RegExp(`${key}="(.*?)"`, 'm');
  const match = content.match(regex);
  return match ? match[1] : '';
}

// Helper function to update config value in the bash script
function updateConfigValue(content, key, value) {
  const regex = new RegExp(`(${key}=").*?(")`, 'm');
  return content.replace(regex, `$1${value}$2`);
}

// API routes
app.get('/api/config', (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return res.status(404).json({ error: 'Config file not found' });
    }

    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    
    const config = {
      source_dir: parseConfigValue(content, 'SOURCE_DIR'),
      log_file: parseConfigValue(content, 'LOG_FILE'),
      smb_server: parseConfigValue(content, 'SMB_SERVER'),
      smb_share: parseConfigValue(content, 'SMB_SHARE'),
      smb_user: parseConfigValue(content, 'SMB_USER'),
      smb_password: parseConfigValue(content, 'SMB_PASSWORD'),
      smb_auth_method: parseConfigValue(content, 'SMB_AUTH_METHOD'),
      dry_run: parseConfigValue(content, 'DRY_RUN'),
      malayalam_movie_path: parseConfigValue(content, 'MALAYALAM_MOVIE_PATH'),
      malayalam_tv_path: parseConfigValue(content, 'MALAYALAM_TV_PATH'),
      english_movie_path: parseConfigValue(content, 'ENGLISH_MOVIE_PATH'),
      english_tv_path: parseConfigValue(content, 'ENGLISH_TV_PATH'),
      cleanup_rar_files: parseConfigValue(content, 'CLEANUP_RAR_FILES'),
      cleanup_empty_dirs: parseConfigValue(content, 'CLEANUP_EMPTY_DIRS'),
      min_rar_age_hours: parseConfigValue(content, 'MIN_RAR_AGE_HOURS')
    };

    res.json(config);
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

app.put('/api/config', (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return res.status(404).json({ error: 'Config file not found' });
    }

    let content = fs.readFileSync(CONFIG_FILE, 'utf8');
    const updates = req.body;

    // Update only the values provided in the request
    for (const [key, value] of Object.entries(updates)) {
      const configKey = key.toUpperCase();
      content = updateConfigValue(content, configKey, value);
    }

    fs.writeFileSync(CONFIG_FILE, content, 'utf8');
    
    // Restart the service
    exec('sudo systemctl restart media-processor.service', (error) => {
      if (error) {
        console.error('Error restarting service:', error);
        return res.status(500).json({ error: 'Failed to restart service' });
      }
      
      res.json({ message: 'Configuration updated successfully' });
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

app.get('/api/logs', (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return res.status(404).json({ error: 'Config file not found' });
    }

    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    const logFile = parseConfigValue(content, 'LOG_FILE');
    
    if (!fs.existsSync(logFile)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    // Read the last 100 lines of the log file
    exec(`tail -n 100 ${logFile}`, (error, stdout) => {
      if (error) {
        console.error('Error reading log file:', error);
        return res.status(500).json({ error: 'Failed to read log file' });
      }
      
      res.json({ logs: stdout.split('\n') });
    });
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

app.get('/api/status', (req, res) => {
  exec('systemctl is-active media-processor.service', (error, stdout) => {
    const status = stdout.trim() === 'active' ? 'running' : 'stopped';
    res.json({ status });
  });
});

app.post('/api/service/:action', (req, res) => {
  const { action } = req.params;
  
  if (!['start', 'stop', 'restart'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  exec(`sudo systemctl ${action} media-processor.service`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error ${action}ing service:`, error);
      return res.status(500).json({ error: `Failed to ${action} service` });
    }
    
    res.json({ message: `Service ${action}ed successfully` });
  });
});

app.get('/api/paths', (req, res) => {
  exec('find /home -type d -maxdepth 3 | sort', (error, stdout) => {
    if (error) {
      console.error('Error finding paths:', error);
      return res.status(500).json({ error: 'Failed to find paths' });
    }
    
    const paths = stdout.split('\n').filter(Boolean);
    res.json({ paths });
  });
});

app.get('/api/smb-servers', (req, res) => {
  exec('avahi-browse -at | grep "_smb._tcp" | grep "=" | cut -d";" -f4,7 | tr ";" " "', (error, stdout) => {
    // Even if there's an error, we can still return discovered servers or an empty array
    const servers = (stdout || '').split('\n')
      .filter(Boolean)
      .map(line => {
        const [name, ip] = line.trim().split(' ');
        return { name, ip };
      });
    
    res.json({ servers });
  });
});

app.get('/api/smb-shares/:server', (req, res) => {
  const { server } = req.params;
  const { username, password } = req.query;
  
  let command = `smbclient -L ${server} -N`;
  if (username && password) {
    command = `smbclient -L ${server} -U "${username}%${password}"`;
  } else if (username) {
    command = `smbclient -L ${server} -U "${username}"`;
  }
  
  exec(`${command} | grep Disk | awk '{print $1}'`, (error, stdout) => {
    // Even if there's an error, we can still return discovered shares or an empty array
    const shares = (stdout || '').split('\n').filter(Boolean);
    res.json({ shares });
  });
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '..', 'build')));

// For any request that doesn't match an API route, serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 