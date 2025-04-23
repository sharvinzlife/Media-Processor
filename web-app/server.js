const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.get('/api/status', (req, res) => {
  exec('systemctl is-active media-processor.service', (error, stdout, stderr) => {
    const status = stdout.trim();
    res.json({ status: status === 'active' ? 'active' : 'inactive' });
  });
});

app.get('/api/logs', (req, res) => {
  exec('journalctl -u media-processor.service -n 50 --no-pager', (error, stdout, stderr) => {
    res.json({ 
      success: !error, 
      logs: !error ? stdout.split('\n') : [],
      error: error ? stderr : null
    });
  });
});

// File history endpoint with persistent storage
app.get('/api/file-history', (req, res) => {
  const historyDbPath = path.join(__dirname, 'file_history.json');
  
  try {
    // Create the file if it doesn't exist
    if (!fs.existsSync(historyDbPath)) {
      // Generate sample data
      const { generateSampleHistory } = require('./generate_sample_history');
      const sampleData = generateSampleHistory(50);
      fs.writeFileSync(historyDbPath, JSON.stringify(sampleData, null, 2));
      console.log(`Created sample history with ${sampleData.files.length} entries`);
    }
    
    // Read the history from the file
    const historyData = JSON.parse(fs.readFileSync(historyDbPath, 'utf8'));
    
    res.json({ success: true, history: historyData.files });
  } catch (error) {
    console.error('Error reading file history:', error);
    res.json({ success: false, history: [], error: error.message });
  }
});

// Endpoint to add a new file to the history
app.post('/api/file-history', (req, res) => {
  const { filename, type, language } = req.body;
  
  if (!filename || !type || !language) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  const historyDbPath = path.join(__dirname, 'file_history.json');
  
  try {
    // Create the file if it doesn't exist
    if (!fs.existsSync(historyDbPath)) {
      fs.writeFileSync(historyDbPath, JSON.stringify({ files: [] }));
    }
    
    // Read the history from the file
    const historyData = JSON.parse(fs.readFileSync(historyDbPath, 'utf8'));
    
    // Add the new file to the history
    historyData.files.unshift({
      date: new Date().toISOString(),
      filename,
      type,
      language
    });
    
    // Limit the history to 500 entries
    if (historyData.files.length > 500) {
      historyData.files = historyData.files.slice(0, 500);
    }
    
    // Write the updated history back to the file
    fs.writeFileSync(historyDbPath, JSON.stringify(historyData, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  try {
    // Count files in each directory
    const statsData = {
      englishMovies: countFilesInDirectory('/mnt/media/movies'),
      malayalamMovies: countFilesInDirectory('/mnt/media/malayalam movies'),
      englishTV: countFilesInDirectory('/mnt/media/tv-shows'),
      malayalamTV: countFilesInDirectory('/mnt/media/malayalam-tv-shows')
    };
    
    res.json({ success: true, stats: statsData });
  } catch (error) {
    res.json({ success: false, stats: { englishMovies: 0, malayalamMovies: 0, englishTV: 0, malayalamTV: 0 }, error: error.message });
  }
});

// Helper function to count files in a directory
function countFilesInDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      return fs.readdirSync(dirPath).length;
    }
    return 0;
  } catch (error) {
    console.error(`Error counting files in ${dirPath}:`, error);
    return 0;
  }
}

// SMB connection test endpoint
app.post('/api/test-connection', (req, res) => {
  const { server, share, user, password } = req.body;
  
  // Create a temporary script to test the connection
  const scriptContent = `
    #!/bin/bash
    SERVER="${server}"
    SHARE="${share}"
    USER="${user}"
    PASS="${password}"
    
    # Try to list the share contents
    smbclient -L //$SERVER -U $USER%$PASS -m SMB3 > /dev/null 2>&1
    RESULT=$?
    
    if [ $RESULT -eq 0 ]; then
      echo "success"
    else
      echo "failed"
    fi
  `;
  
  const tempScriptPath = path.join(__dirname, 'temp_smb_test.sh');
  fs.writeFileSync(tempScriptPath, scriptContent);
  fs.chmodSync(tempScriptPath, '755');
  
  exec(tempScriptPath, (error, stdout, stderr) => {
    // Clean up the temporary script
    fs.unlinkSync(tempScriptPath);
    
    if (stdout.trim() === 'success') {
      res.json({ success: true, message: 'Connection successful' });
    } else {
      res.json({ success: false, error: 'Connection failed', details: stderr });
    }
  });
});

// SMB diagnostics endpoint
app.post('/api/diagnose-smb', (req, res) => {
  const { server, share, user, password } = req.body;
  
  if (!server || !share) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Server and share are required'
    });
  }
  
  // Create a temporary script to run diagnostics
  const scriptContent = `#!/bin/bash
SERVER="${server}"
SHARE="${share}"
USER="${user}"
PASS="${password}"

# Testing network connectivity
ping -c 2 $SERVER > /dev/null 2>&1
PING_RESULT=$?

# Testing SMB connection
smbclient -L //$SERVER -U "$USER%$PASS" -m SMB3 > /dev/null 2>&1
SMB_CONN_RESULT=$?

# Testing share access
smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "ls" > /dev/null 2>&1
SHARE_ACCESS_RESULT=$?

# Testing write permissions
TMP_FILE="test_$(date +%s).txt"
smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "put /dev/null $TMP_FILE; rm $TMP_FILE" > /dev/null 2>&1
WRITE_PERM_RESULT=$?

# Output results in a format that's easier to parse
echo "PING_RESULT=$PING_RESULT"
echo "SMB_CONN_RESULT=$SMB_CONN_RESULT"
echo "SHARE_ACCESS_RESULT=$SHARE_ACCESS_RESULT"
echo "WRITE_PERM_RESULT=$WRITE_PERM_RESULT"
`;
  
  const tempScriptPath = path.join(__dirname, 'temp_smb_diag.sh');
  fs.writeFileSync(tempScriptPath, scriptContent);
  fs.chmodSync(tempScriptPath, '755');
  
  exec(tempScriptPath, (error, stdout, stderr) => {
    // Clean up the temporary script
    try {
      fs.unlinkSync(tempScriptPath);
    } catch (e) {
      console.error('Error removing temp script:', e);
    }
    
    try {
      // Parse the output into a structured object
      const lines = stdout.trim().split('\n');
      const results = {};
      
      lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          results[key] = parseInt(value) === 0 ? 'success' : 'failed';
        }
      });
      
      // Create tests array for compatibility with frontend
      const tests = [
        {
          test: 'server_reachable',
          success: results.PING_RESULT === 'success',
          message: results.PING_RESULT === 'success' 
            ? `Server ${server} is reachable` 
            : `Server ${server} is not reachable`
        },
        {
          test: 'smb_connection',
          success: results.SMB_CONN_RESULT === 'success',
          message: results.SMB_CONN_RESULT === 'success'
            ? 'Successfully connected to SMB server'
            : 'Failed to connect to SMB server'
        },
        {
          test: 'share_connection',
          success: results.SHARE_ACCESS_RESULT === 'success',
          message: results.SHARE_ACCESS_RESULT === 'success'
            ? `Successfully connected to share ${share}`
            : `Failed to connect to share ${share}`
        },
        {
          test: 'write_permissions',
          success: results.WRITE_PERM_RESULT === 'success',
          message: results.WRITE_PERM_RESULT === 'success'
            ? `Have write permissions on share ${share}`
            : `No write permissions on share ${share}`
        }
      ];
      
      res.json({ 
        success: true,
        timestamp: new Date().toISOString(),
        settings: {
          server,
          share,
          user,
          password: '********' // Mask password for security
        },
        results: {
          ping: results.PING_RESULT || 'failed',
          smbConnection: results.SMB_CONN_RESULT || 'failed',
          shareAccess: results.SHARE_ACCESS_RESULT || 'failed',
          writePermission: results.WRITE_PERM_RESULT || 'failed'
        },
        tests: tests // Add tests array for compatibility
      });
    } catch (e) {
      console.error('Error parsing SMB diagnostics:', e, 'stdout:', stdout, 'stderr:', stderr);
      res.json({ 
        success: false,
        settings: {
          server,
          share,
          user,
          password: '********' // Mask password for security
        },
        error: 'Failed to parse diagnostics results', 
        details: e.message,
        stdout: stdout,
        stderr: stderr 
      });
    }
  });
});

app.post('/api/service/start', (req, res) => {
  exec('sudo systemctl start media-processor.service', (error, stdout, stderr) => {
    res.json({ success: !error, error: error ? stderr : null });
  });
});

app.post('/api/service/stop', (req, res) => {
  exec('sudo systemctl stop media-processor.service', (error, stdout, stderr) => {
    res.json({ success: !error, error: error ? stderr : null });
  });
});

app.post('/api/service/restart', (req, res) => {
  exec('sudo systemctl restart media-processor.service', (error, stdout, stderr) => {
    res.json({ success: !error, error: error ? stderr : null });
  });
});

// Run diagnostics endpoint
app.get('/api/diagnostics', (req, res) => {
  // Create a more comprehensive diagnostics script
  const scriptContent = `
    #!/bin/bash
    
    # Check if the media-processor service is running
    SERVICE_STATUS=$(systemctl is-active media-processor.service 2>/dev/null || echo "not-found")
    
    # Check disk space
    DISK_SPACE=$(df -h / | awk 'NR==2 {print $5}')
    
    # Check memory usage
    MEMORY_USAGE=$(free -h | grep Mem | awk '{print $3 "/" $2}')
    
    # Check system uptime
    UPTIME=$(uptime -p)
    
    # Check if required tools are installed
    FFMPEG_INSTALLED="false"
    if command -v ffmpeg &> /dev/null; then
      FFMPEG_INSTALLED="true"
    fi
    
    SMBCLIENT_INSTALLED="false"
    if command -v smbclient &> /dev/null; then
      SMBCLIENT_INSTALLED="true"
    fi
    
    MEDIAINFO_INSTALLED="false"
    if command -v mediainfo &> /dev/null; then
      MEDIAINFO_INSTALLED="true"
    fi
    
    # Output as JSON
    echo "{"
    echo "  \"serviceStatus\": \"$SERVICE_STATUS\","
    echo "  \"diskSpace\": \"$DISK_SPACE\","
    echo "  \"memoryUsage\": \"$MEMORY_USAGE\","
    echo "  \"uptime\": \"$UPTIME\","
    echo "  \"tools\": {"
    echo "    \"ffmpeg\": $FFMPEG_INSTALLED,"
    echo "    \"smbclient\": $SMBCLIENT_INSTALLED,"
    echo "    \"mediainfo\": $MEDIAINFO_INSTALLED"
    echo "  }"
    echo "}"
  `;
  
  const tempScriptPath = path.join(__dirname, 'temp_diagnostics.sh');
  fs.writeFileSync(tempScriptPath, scriptContent);
  fs.chmodSync(tempScriptPath, '755');
  
  exec(tempScriptPath, (error, stdout, stderr) => {
    // Clean up the temporary script
    fs.unlinkSync(tempScriptPath);
    
    try {
      const results = JSON.parse(stdout.trim());
      res.json({ 
        success: true, 
        results,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Error parsing diagnostics results:', e);
      res.json({ 
        success: false, 
        error: 'Failed to parse diagnostics results', 
        stdout: stdout,
        stderr: stderr 
      });
    }
  });
});

// Enhanced SMB write permissions diagnostics
app.post('/api/diagnose-smb-write', (req, res) => {
  const { server, share, user, password } = req.body;
  
  if (!server || !share) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Server and share are required'
    });
  }
  
  // Create a temporary script to run detailed write permission diagnostics
  const scriptContent = `#!/bin/bash
SERVER="${server}"
SHARE="${share}"
USER="${user}"
PASS="${password}"

echo "=== SMB Write Permission Diagnostics ==="
echo "Testing connection to $SERVER/$SHARE as $USER"

# Test basic connection
echo "1. Testing basic SMB connection..."
smbclient -L //$SERVER -U "$USER%$PASS" -m SMB3
BASIC_CONN=$?
echo "Basic connection result: $BASIC_CONN (0=success)"

# Test share listing
echo "2. Testing share listing..."
smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "ls"
SHARE_LIST=$?
echo "Share listing result: $SHARE_LIST (0=success)"

# Test directory creation
echo "3. Testing directory creation..."
TEST_DIR="test_dir_$(date +%s)"
smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "mkdir $TEST_DIR"
DIR_CREATE=$?
echo "Directory creation result: $DIR_CREATE (0=success)"

# Test file creation
echo "4. Testing file creation..."
TEST_FILE="test_file_$(date +%s).txt"
echo "Test content" > /tmp/$TEST_FILE
smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "put /tmp/$TEST_FILE $TEST_FILE"
FILE_CREATE=$?
echo "File creation result: $FILE_CREATE (0=success)"

# Test file deletion
echo "5. Testing file deletion..."
smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "rm $TEST_FILE"
FILE_DELETE=$?
echo "File deletion result: $FILE_DELETE (0=success)"

# Test directory deletion
echo "6. Testing directory deletion..."
smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "rmdir $TEST_DIR"
DIR_DELETE=$?
echo "Directory deletion result: $DIR_DELETE (0=success)"

# Clean up
rm -f /tmp/$TEST_FILE

# Summary
echo "=== Summary ==="
echo "Basic connection: $([ $BASIC_CONN -eq 0 ] && echo "SUCCESS" || echo "FAILED")"
echo "Share listing: $([ $SHARE_LIST -eq 0 ] && echo "SUCCESS" || echo "FAILED")"
echo "Directory creation: $([ $DIR_CREATE -eq 0 ] && echo "SUCCESS" || echo "FAILED")"
echo "File creation: $([ $FILE_CREATE -eq 0 ] && echo "SUCCESS" || echo "FAILED")"
echo "File deletion: $([ $FILE_DELETE -eq 0 ] && echo "SUCCESS" || echo "FAILED")"
echo "Directory deletion: $([ $DIR_DELETE -eq 0 ] && echo "SUCCESS" || echo "FAILED")"

# Output machine-readable results
echo "BASIC_CONN=$BASIC_CONN"
echo "SHARE_LIST=$SHARE_LIST"
echo "DIR_CREATE=$DIR_CREATE"
echo "FILE_CREATE=$FILE_CREATE"
echo "FILE_DELETE=$FILE_DELETE"
echo "DIR_DELETE=$DIR_DELETE"
`;
  
  const tempScriptPath = path.join(__dirname, 'temp_smb_write_diag.sh');
  fs.writeFileSync(tempScriptPath, scriptContent);
  fs.chmodSync(tempScriptPath, '755');
  
  exec(tempScriptPath, (error, stdout, stderr) => {
    // Clean up the temporary script
    try {
      fs.unlinkSync(tempScriptPath);
    } catch (e) {
      console.error('Error removing temp script:', e);
    }
    
    // Extract the machine-readable results
    const results = {};
    const lines = stdout.split('\n');
    
    // Parse the key-value pairs at the end of the output
    for (const line of lines) {
      const match = line.match(/^([A-Z_]+)=(\d+)$/);
      if (match) {
        results[match[1]] = parseInt(match[2]) === 0 ? 'success' : 'failed';
      }
    }
    
    // Send the full output for detailed analysis
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      settings: {
        server,
        share,
        user,
        password: '********' // Mask password for security
      },
      results: results,
      fullOutput: stdout,
      stderr: stderr || null
    });
  });
});
// Add this to your server.js file where other routes are defined
app.post('/api/stats/add', (req, res) => {
  const { filename, type, language, success } = req.body;
  
  // Add the file to your history storage (database, file, etc.)
  // This depends on how you're storing file history
  
  // For example, if you're using a simple JSON file:
  const historyFile = path.join(__dirname, 'file-history.json');
  let history = [];
  
  try {
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
    
    history.push({
      filename,
      type,
      language,
      success,
      timestamp: new Date().toISOString()
    });
    
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving file history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Add the media update-counts endpoint
app.post('/api/media/update-counts', (req, res) => {
  // This endpoint updates the media counts in the stats
  // First, let's load the current stats
  const historyDbPath = path.join(__dirname, 'file_history.json');
  let historyData = { files: [], stats: { english_movies: 0, malayalam_movies: 0, english_tv_shows: 0, malayalam_tv_shows: 0 } };
  
  try {
    // Create the file if it doesn't exist
    if (fs.existsSync(historyDbPath)) {
      historyData = JSON.parse(fs.readFileSync(historyDbPath, 'utf8'));
    } else {
      fs.writeFileSync(historyDbPath, JSON.stringify(historyData, null, 2));
    }
    
    // Make sure stats object exists
    if (!historyData.stats) {
      historyData.stats = { 
        english_movies: 0, 
        malayalam_movies: 0, 
        english_tv_shows: 0, 
        malayalam_tv_shows: 0 
      };
    }
    
    // Return the current stats
    res.json({ 
      success: true, 
      stats: {
        english_movies: historyData.stats.english_movies || 0,
        malayalam_movies: historyData.stats.malayalam_movies || 0,
        english_tv_shows: historyData.stats.english_tv_shows || 0,
        malayalam_tv_shows: historyData.stats.malayalam_tv_shows || 0
      }
    });
  } catch (error) {
    console.error('Error updating media counts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stats: { 
        english_movies: 0, 
        malayalam_movies: 0, 
        english_tv_shows: 0, 
        malayalam_tv_shows: 0 
      }
    });
  }
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});So