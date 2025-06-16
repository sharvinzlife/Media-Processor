const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Try to load environment variables from .env file
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  console.log('Environment variables loaded from .env file');
  
  // Debug: Print SMB environment variables
  console.log('SMB Environment Variables:');
  console.log('- SMB_SERVER:', process.env.SMB_SERVER);
  console.log('- SMB_SHARE:', process.env.SMB_SHARE);
  console.log('- SMB_USERNAME:', process.env.SMB_USERNAME);
  console.log('- SMB_PASSWORD:', process.env.SMB_PASSWORD ? '******' : 'not set');
  console.log('- SMB_DOMAIN:', process.env.SMB_DOMAIN || 'not set');
} catch (err) {
  console.log('Failed to load dotenv package, using default environment variables:', err.message);
  // Set default values if dotenv fails
  process.env.PORT = process.env.PORT || 3001;
}

const app = express();
const port = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the build directory with cache control
app.use(express.static(path.join(__dirname, 'build'), {
  setHeaders: (res, path) => {
    // Set cache control headers to prevent caching during development
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.get('/api/status', (req, res) => {
  exec('systemctl is-active media-processor-py.service', (error, stdout, stderr) => {
    const status = stdout.trim();
    res.json({ status: status === 'active' ? 'active' : 'inactive' });
  });
});

app.get('/api/logs', (req, res) => {
  exec('journalctl -u media-processor-py.service -n 50 --no-pager', (error, stdout, stderr) => {
    res.json({ 
      success: !error, 
      logs: !error ? stdout.split('\n') : [],
      error: error ? stderr : null
    });
  });
});

// API endpoint for getting file history - forward to Python API
app.get('/api/file-history', (req, res) => {
  // Forward the request to the Python API server
  axios.get('http://127.0.0.1:5001/api/file-history')
    .then(response => {
      const data = response.data;
      
      // If the Python API returns data, enhance it with emojis
      if (data.history && Array.isArray(data.history)) {
        const enhancedHistory = data.history.map(file => {
          // Set emoji based on file type
          let typeEmoji = '📄';
          if (file.type === 'movie') {
            typeEmoji = '🎬';
          } else if (file.type === 'tvshow') {
            typeEmoji = '📺';
          }
          
          // Set emoji based on language
          let langEmoji = '🌐';
          if (file.language === 'malayalam') {
            langEmoji = '🇮🇳';
          } else if (file.language === 'english') {
            langEmoji = '🇬🇧';
          } else if (file.language === 'tamil') {
            langEmoji = '🇮🇳';
          } else if (file.language === 'hindi') {
            langEmoji = '🇮🇳';
          }
          
          // Set emoji based on status
          let statusEmoji = '⏳';
          if (file.status === 'success') {
            statusEmoji = '✅';
          } else if (file.status === 'failed') {
            statusEmoji = '❌';
          } else if (file.status === 'skipped') {
            statusEmoji = '⏭️';
          } else if (file.status === 'processing') {
            statusEmoji = '⚙️';
          }
          
          // Limit filename display length and clean up the name
          let displayName = file.name || 'Unknown file';
          if (displayName.length > 50) {
            displayName = displayName.substring(0, 47) + '...';
          }
          
          // Clean up common patterns in filenames for better display
          displayName = displayName
            .replace(/^www\.\w+\.\w+\s*-\s*/, '') // Remove website prefixes
            .replace(/_mal_extracted\.mkv$/, '.mkv') // Clean extraction suffix
            .replace(/\s+-\s+TRUE\s+WEB-DL/, ' WEB-DL') // Clean up TRUE WEB-DL
            .replace(/\s+\(DD\+[\d\.\s]+\)/, '') // Remove audio details
            .replace(/\s+-\s+\d+GB\s+-\s+ESub/, '') // Remove size and subtitle info
            .trim();
          
          return {
            ...file,
            typeEmoji,
            langEmoji,
            statusEmoji,
            displayName
          };
        });
        
        // Return enhanced data
        res.json({
          ...data,
          history: enhancedHistory
        });
      } else {
        // Return data as-is if no history array
        res.json(data);
      }
    })
    .catch(error => {
      console.error('Error fetching file history from Python API:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch file history',
        error: error.message,
        history: []
      });
    });
});

// Endpoint to add a new file to the history
app.post('/api/file-history', (req, res) => {
  const { filename, type, language } = req.body;
  
  if (!filename || !type || !language) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  const statsFilePath = path.join(__dirname, 'api', 'stats.json');
  
  try {
    // Create the file if it doesn't exist
    if (!fs.existsSync(statsFilePath)) {
      fs.writeFileSync(statsFilePath, JSON.stringify({
        english_movies: 0,
        malayalam_movies: 0,
        english_tv_shows: 0,
        malayalam_tv_shows: 0,
        files: []
      }, null, 2));
    }
    
    // Read the stats from the file
    const statsData = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
    
    // Make sure files array exists
    if (!statsData.files) {
      statsData.files = [];
    }
    
    // Add the new file to the history
    statsData.files.unshift({
      name: filename,
      type: type.toLowerCase(),
      language: language.toLowerCase(),
      processedAt: new Date().toISOString()
    });
    
    // Limit the history to 500 entries
    if (statsData.files.length > 500) {
      statsData.files = statsData.files.slice(0, 500);
    }
    
    // Update the counts
    const fileKey = `${language.toLowerCase()}_${type.toLowerCase() === 'tvshow' ? 'tv_shows' : 'movies'}`;
    if (statsData[fileKey] !== undefined) {
      statsData[fileKey] += 1;
    }
    
    // Write the updated stats back to the file
    fs.writeFileSync(statsFilePath, JSON.stringify(statsData, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  try {
    const statsFilePath = path.join(__dirname, 'api', 'stats.json');
    
    // Check if the stats file exists
    if (!fs.existsSync(statsFilePath)) {
      // Return empty stats
      return res.json({
        success: true,
        stats: {
          english_movies: 0,
          malayalam_movies: 0,
          english_tv_shows: 0,
          malayalam_tv_shows: 0,
          files: []
        }
      });
    }
    
    // Read the stats from the file
    const statsData = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
    
    res.json({ 
      success: true, 
      stats: {
        english_movies: statsData.english_movies || 0,
        malayalam_movies: statsData.malayalam_movies || 0,
        english_tv_shows: statsData.english_tv_shows || 0,
        malayalam_tv_shows: statsData.malayalam_tv_shows || 0,
        files: statsData.files || []
      }
    });
  } catch (error) {
    res.json({
      success: false,
      stats: {
        english_movies: 0,
        malayalam_movies: 0,
        english_tv_shows: 0,
        malayalam_tv_shows: 0,
        files: []
      },
      error: error.message
    });
  }
});

// SMB connection test endpoint - simplified for faster response
app.post('/api/test-connection', (req, res) => {
  const { server, share, user, password } = req.body;
  
  console.log('Testing SMB connection with provided credentials:');
  console.log('- Server:', server);
  console.log('- Share:', share);
  console.log('- User:', user);
  console.log('- Password:', password ? 'provided' : 'not provided');
  
  // For SMB connections with complex passwords, use a credentials file approach
  const tmpCredFile = path.join(__dirname, `.smb_test_${Date.now()}`);
  fs.writeFileSync(tmpCredFile, `username=${user}\npassword=${password}\n`, { mode: 0o600 });
  
  // Try anonymous connection first to see if the server is reachable
  const anonymousCommand = `smbclient -L //${server} -N -t 3 -c 'exit' 2>&1`;
  
  console.log('Trying anonymous connection first...');
  exec(anonymousCommand, (anonError, anonStdout, anonStderr) => {
    const anonSuccess = !anonError;
    console.log('Anonymous connection result:', anonSuccess ? 'SUCCESS' : 'FAILED');
    
    if (anonError) {
      console.log('Anonymous connection error:', anonStderr || anonError.message);
    }
    
    // Now try with credentials - using credentials file
    const authCommand = `smbclient -L //${server} -A ${tmpCredFile} -m SMB3 -t 3 -c 'exit' 2>&1`;
    
    console.log('Trying authenticated connection...');
    exec(authCommand, (authError, authStdout, authStderr) => {
      const authSuccess = !authError;
      console.log('Authenticated connection result:', authSuccess ? 'SUCCESS' : 'FAILED');
      
      if (authError) {
        console.log('Authenticated connection error output:', authStderr || authStdout || authError.message);
        
        // Check if it's a logon failure
        const isLogonFailure = (authStderr || authStdout || '').includes('NT_STATUS_LOGON_FAILURE');
        
        // Clean up the credentials file in case of error
        try {
          fs.unlinkSync(tmpCredFile);
        } catch (e) {
          console.error('Error removing credentials file:', e);
        }
        
        if (isLogonFailure) {
          return res.json({
            success: false,
            message: 'Authentication failed: Username or password incorrect',
            details: 'NT_STATUS_LOGON_FAILURE',
            anonymousWorks: anonSuccess
          });
        }
      }
      
      // If authentication was successful, also test connecting to the share
      if (authSuccess && share) {
        const shareCommand = `smbclient "//${server}/${share}" -A ${tmpCredFile} -m SMB3 -t 3 -c 'ls' 2>&1`;
        
        console.log('Testing access to specific share...');
        exec(shareCommand, (shareError, shareStdout, shareStderr) => {
          // Clean up the credentials file
          try {
            fs.unlinkSync(tmpCredFile);
          } catch (e) {
            console.error('Error removing credentials file:', e);
          }
          
          const shareSuccess = !shareError;
          console.log('Share access result:', shareSuccess ? 'SUCCESS' : 'FAILED');
          
          if (shareError) {
            console.log('Share access error:', shareStderr || shareStdout || shareError.message);
            
            // Send response indicating auth works but share access fails
            return res.json({
              success: false, 
              message: 'Server connection successful but share access failed',
              details: shareStderr || shareStdout || shareError.message,
              anonymousWorks: anonSuccess,
              authWorks: true,
              shareWorks: false
            });
          }
          
          // Everything succeeded
          res.json({ 
            success: true, 
            message: 'Connection to server and share successful',
            details: '',
            anonymousWorks: anonSuccess,
            authWorks: true,
            shareWorks: true
          });
        });
      } else {
        // Clean up the credentials file
        try {
          fs.unlinkSync(tmpCredFile);
        } catch (e) {
          console.error('Error removing credentials file:', e);
        }
        
        // Send response based on auth result but include anonymous result
        res.json({ 
          success: authSuccess, 
          message: authSuccess ? 'Connection successful' : 'Connection failed with credentials',
          details: authError ? (authStderr || authStdout || authError.message) : '',
          anonymousWorks: anonSuccess,
          authWorks: authSuccess,
          shareWorks: null // Not tested
        });
      }
    });
  });
});

// SMB diagnostics endpoint - optimized for faster response
app.post('/api/diagnose-smb', (req, res) => {
  const { server, share, user, password } = req.body;
  
  if (!server || !share) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Server and share are required'
    });
  }
  
  console.log(`Running comprehensive SMB diagnostics for ${server}/${share}...`);
  
  // For SMB connections with complex passwords, use a credentials file approach
  const tmpCredFile = path.join(__dirname, `.smb_cred_${Date.now()}`);
  fs.writeFileSync(tmpCredFile, `username=${user}\npassword=${password}\n`, { mode: 0o600 });
  
  // Run multiple SMB commands in parallel for faster results
  Promise.all([
    // Test 0: Check if we can ping the server
    new Promise((resolve) => {
      exec(`ping -c 1 -W 2 ${server}`, (error) => {
        resolve({ 
          test: 'ping', 
          success: !error,
          message: !error ? `Server ${server} is pingable` : `Server ${server} is not pingable`,
          emoji: !error ? '✅' : '❌'
        });
      });
    }),
    
    // Test 1: Try anonymous connection to server
    new Promise((resolve) => {
      exec(`smbclient -L //${server} -N -t 2 -c 'exit' 2>&1`, (error, stdout, stderr) => {
        const output = stdout || stderr || '';
        const anonymousWorks = !error;
        resolve({ 
          test: 'anonymous_connection', 
          success: anonymousWorks,
          message: anonymousWorks ? 'Anonymous SMB connection works' : 'Anonymous SMB connection failed',
          emoji: anonymousWorks ? '✅' : '❌',
          output: output,
          critical: false  // Mark as non-critical
        });
      });
    }),
    
    // Test 2: Basic connection to server with auth - using credentials file
    new Promise((resolve) => {
      const authCommand = `smbclient -L //${server} -A ${tmpCredFile} -m SMB3 -t 2 -c 'exit' 2>&1`;
      exec(authCommand, (error, stdout, stderr) => {
        const output = stdout || stderr || '';
        const isLogonFailure = output.includes('NT_STATUS_LOGON_FAILURE');
        
        resolve({ 
          test: 'smb_connection', 
          success: !error,
          message: !error ? 'Successfully connected to SMB server' : 
                  isLogonFailure ? 'Authentication failed: Username or password incorrect' : 'Failed to connect to SMB server',
          emoji: !error ? '✅' : '❌',
          output: output,
          authError: isLogonFailure
        });
      });
    }),
    
    // Test 3: Connection to specific share - using credentials file
    new Promise((resolve) => {
      const shareCommand = `smbclient "//${server}/${share}" -A ${tmpCredFile} -m SMB3 -t 2 -c 'ls' 2>&1`;
      exec(shareCommand, (error, stdout, stderr) => {
        const output = stdout || stderr || '';
        resolve({ 
          test: 'share_connection', 
          success: !error,
          message: !error ? `Successfully connected to share ${share}` : `Failed to connect to share ${share}`,
          emoji: !error ? '✅' : '❌',
          output: output
        });
      });
    }),
    
    // Test 4: Anonymous connection to share - REMOVED
    // This test was causing the red notification in the UI
    
    // Test 5: Quick write permission test (create and delete a test directory) - using credentials file
    new Promise((resolve) => {
      const testDir = `test_${Date.now()}`;
      const writeCommand = `smbclient "//${server}/${share}" -A ${tmpCredFile} -m SMB3 -t 2 -c "mkdir ${testDir}; rmdir ${testDir}" 2>&1`;
      exec(writeCommand, (error, stdout, stderr) => {
        const output = stdout || stderr || '';
        resolve({ 
          test: 'write_permissions', 
          success: !error,
          message: !error ? 'Write permissions confirmed' : 'No write permissions or test failed',
          emoji: !error ? '✅' : '❌',
          output: output
        });
      });
    })
  ]).then(results => {
    // Clean up the credentials file
    try {
      fs.unlinkSync(tmpCredFile);
    } catch (e) {
      console.error('Error removing credentials file:', e);
    }
    
    // Determine if server is reachable based on ping
    const pingSuccess = results.find(r => r.test === 'ping')?.success || false;
    const anonymousWorks = results.find(r => r.test === 'anonymous_connection')?.success || false;
    
    const authWorks = results.find(r => r.test === 'smb_connection')?.success || false;
    const isLogonFailure = results.find(r => r.test === 'smb_connection')?.authError || false;
    
    // Add diagnostic messages based on test results
    let diagnosticMessage = '';
    let fixSuggestions = [];
    
    if (!pingSuccess) {
      diagnosticMessage = '❌ The server is not reachable on the network. Check that the server is online and the hostname is correct.';
      fixSuggestions.push('Verify the server is powered on and connected to the network');
      fixSuggestions.push('Check if the hostname is correct or try using IP address instead');
    } else if (anonymousWorks && !authWorks && isLogonFailure) {
      diagnosticMessage = '🔑 The server is reachable but authentication is failing. Your username or password appears to be incorrect.';
      fixSuggestions.push('Double-check username and password');
      fixSuggestions.push('Verify there are no typos in the credentials');
      fixSuggestions.push('Confirm the credentials with your administrator');
      
    } else if (pingSuccess && !anonymousWorks && !authWorks) {
      diagnosticMessage = '🛑 The server blocks all SMB connections. It might have a firewall or SMB is disabled.';
      fixSuggestions.push('Check if the server has SMB service running');
      fixSuggestions.push('Verify firewall settings allow SMB connections (ports 139/445)');
    } else if (authWorks && !results.find(r => r.test === 'share_connection')?.success) {
      diagnosticMessage = '📁 Connected to server but cannot access share. The share name might be incorrect or you lack permissions.';
      fixSuggestions.push('Verify the share name is correct');
      fixSuggestions.push('Check that your user has permission to access this share');
    }
      
    res.json({ 
      success: true,
      timestamp: new Date().toISOString(),
      settings: {
        server,
        share,
        user,
        password: '********' // Mask password for security
      },
      diagnosticMessage,
      fixSuggestions,
      tests: results
    });
    
    console.log(`SMB diagnostics completed with ${results.filter(r => r.success).length}/${results.length} successful tests`);
  }).catch(error => {
    // Clean up the credentials file in case of error
    try {
      fs.unlinkSync(tmpCredFile);
    } catch (e) {
      console.error('Error removing credentials file:', e);
    }
    
    console.error('Error running SMB diagnostics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to run SMB diagnostics',
      details: error.toString() 
    });
  });
});

app.post('/api/service/restart', (req, res) => {
  // First restart the Python media processor service
  exec('sudo systemctl restart media-processor-py.service', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: stderr || 'Failed to restart media-processor-py service',
        details: error.message
      });
    }
    
    console.log('Successfully restarted media-processor-py.service, now restarting API service...');
    
    // Next restart the API service
    exec('sudo systemctl restart media-processor-api.service', (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ 
          success: false, 
          error: stderr || 'Failed to restart media-processor-api service',
          details: error.message
        });
      }
      
      console.log('Successfully restarted media-processor-api.service, now queueing web UI service restart...');
      
      // Queue the web UI service restart for after the response is sent
      // This ensures the response reaches the client before the server restarts
      setTimeout(() => {
        console.log('Restarting media-processor-ui.service...');
        try {
          // Use a synchronous exec to ensure this completes
          require('child_process').execSync('sudo systemctl restart media-processor-ui.service');
          console.log('Web UI service restart initiated successfully');
        } catch (webError) {
          console.error('Failed to restart web UI service:', webError.message);
        }
      }, 1000); // Wait 1 second before restarting the web UI service
      
      // Tell the client the restart was successful and to expect reconnection
      res.json({ 
        success: true, 
        message: 'All services are being restarted. The web interface will reload shortly.',
        willReconnect: true
      });
    });
  });
});

// Legacy stop endpoint - now handled by the Python API via /api/service/:action
// app.post('/api/service/stop', (req, res) => {
//   exec('sudo systemctl stop media-processor-py.service && sudo systemctl stop media-processor-api.service', (error, stdout, stderr) => {
//     res.json({ success: !error, error: error ? stderr : null });
//   });
// });

// Run diagnostics endpoint
app.get('/api/diagnostics', (req, res) => {
  // Create a more comprehensive diagnostics script
  const scriptContent = `
    #!/bin/bash
    
    # Check if the media-processor-py service is running
    SERVICE_STATUS=$(sudo systemctl is-active media-processor-py.service 2>/dev/null || echo "not-found")
    
    # Check disk space
    DISK_SPACE=$(sudo df -h / | awk 'NR==2 {print $5}')
    
    # Check memory usage
    MEMORY_USAGE=$(sudo free -h | grep Mem | awk '{print $3 "/" $2}')
    
    # Check system uptime
    UPTIME=$(sudo uptime -p)
    
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
    
    # Output as JSON - make sure we only output valid JSON
    echo "{"
    echo "  \\"serviceStatus\\": \\"$SERVICE_STATUS\\","
    echo "  \\"diskSpace\\": \\"$DISK_SPACE\\","
    echo "  \\"memoryUsage\\": \\"$MEMORY_USAGE\\","
    echo "  \\"uptime\\": \\"$UPTIME\\","
    echo "  \\"tools\\": {"
    echo "    \\"ffmpeg\\": $FFMPEG_INSTALLED,"
    echo "    \\"smbclient\\": $SMBCLIENT_INSTALLED,"
    echo "    \\"mediainfo\\": $MEDIAINFO_INSTALLED"
    echo "  }"
    echo "}"
  `;
  
  const tempScriptPath = path.join(__dirname, 'temp_diagnostics.sh');
  fs.writeFileSync(tempScriptPath, scriptContent);
  fs.chmodSync(tempScriptPath, '755');
  
  console.log('Executing basic diagnostics script');
  
  exec(tempScriptPath, (error, stdout, stderr) => {
    // Clean up the temporary script
    fs.unlinkSync(tempScriptPath);
    
    console.log('Basic diagnostics raw output:', stdout.substring(0, 100) + '...');
    
    // Log any errors
    if (error) {
      console.error('Basic diagnostics execution error:', error);
    }
    if (stderr) {
      console.error('Basic diagnostics stderr:', stderr);
    }
    
    try {
      // Extract just the JSON part from the output
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonString = jsonMatch[0];
        const results = JSON.parse(jsonString);
        res.json({ 
          success: true, 
          results,
          timestamp: new Date().toISOString()
        });
      } else {
        res.json({
          success: false,
          error: 'No valid JSON found in script output',
          stdout: stdout,
          stderr: stderr || null
        });
      }
    } catch (e) {
      console.error('Error parsing diagnostics results:', e);
      res.json({ 
        success: false, 
        error: 'Failed to parse diagnostics results: ' + e.message, 
        stdout: stdout,
        stderr: stderr || null
      });
    }
  });
});

// Alternative method using the dedicated diagnostics script
app.get('/api/system-diagnostics', (req, res) => {
  // Use the dedicated diagnostics script 
  const diagnosticsScript = '/usr/local/bin/media-processor-diagnostics';
  
  // Check if the script exists first
  if (!fs.existsSync(diagnosticsScript)) {
    console.error(`Diagnostics script not found at: ${diagnosticsScript}`);
    return res.json({
      success: false,
      error: 'Diagnostics script not found',
      path: diagnosticsScript
    });
  }
  
  // Log the exact command we're executing
  const cmd = `sudo "${diagnosticsScript}"`;
  console.log(`Executing diagnostics command: ${cmd}`);
  
  exec(cmd, (error, stdout, stderr) => {
    console.log('Diagnostics raw output:', stdout.substring(0, 100) + '...');
    
    // Log any errors
    if (error) {
      console.error('Diagnostics script execution error:', error);
    }
    if (stderr) {
      console.error('Diagnostics script stderr:', stderr);
    }
    
    try {
      // Extract just the JSON part from the output
      // Look for content between the first '{' and the last '}'
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonString = jsonMatch[0];
        const results = JSON.parse(jsonString);
        res.json({ 
          success: true, 
          results,
          timestamp: new Date().toISOString()
        });
      } else {
        // If no JSON found, return the raw output
        res.json({
          success: false,
          error: 'No valid JSON found in script output',
          stdout: stdout,
          stderr: stderr || null
        });
      }
    } catch (e) {
      console.error('Error parsing diagnostics results:', e);
      res.json({ 
        success: false, 
        error: 'Failed to parse diagnostics results: ' + e.message, 
        stdout: stdout,
        stderr: stderr || null
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
sudo smbclient -L //$SERVER -U "$USER%$PASS" -m SMB3
BASIC_CONN=$?
echo "Basic connection result: $BASIC_CONN (0=success)"

# Test share listing
echo "2. Testing share listing..."
sudo smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "ls"
SHARE_LIST=$?
echo "Share listing result: $SHARE_LIST (0=success)"

# Check common media directories that might have different permissions
echo "3. Detecting existing media directories..."
# Use arrays to track directories and their access status
declare -a MEDIA_DIRS=("" "media" "media/movies" "media/tv-shows" "media/malayalam movies" "media/malayalam-tv-shows")
declare -a DIR_ACCESS=()
declare -a DIR_WRITE=()

# Test each directory
for dir in "\${MEDIA_DIRS[@]}"; do
  echo "Testing directory: \${dir:-root}"
  # Test access (ls)
  if [ -z "$dir" ]; then
    # Root directory
    sudo smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "ls" > /dev/null 2>&1
  else
    # Subdirectory
    sudo smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "cd \\"$dir\\"; ls" > /dev/null 2>&1
  fi
  access_result=$?
  DIR_ACCESS+=($access_result)
  
  if [ $access_result -eq 0 ]; then
    echo "✓ Can access: \${dir:-root}"
    
    # Test write permission by creating/deleting a test directory
    TEST_DIR="test_dir_$(date +%s)_\${RANDOM}"
    if [ -z "$dir" ]; then
      # Root directory
      sudo smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "mkdir \$TEST_DIR; rmdir \$TEST_DIR" > /dev/null 2>&1
    else
      # Subdirectory
      sudo smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "cd \\"$dir\\"; mkdir \$TEST_DIR; rmdir \$TEST_DIR" > /dev/null 2>&1
    fi
    write_result=$?
    DIR_WRITE+=($write_result)
    
    if [ $write_result -eq 0 ]; then
      echo "✓ Can write to: \${dir:-root}"
    else
      echo "✗ Cannot write to: \${dir:-root}"
    fi
  else
    echo "✗ Cannot access: \${dir:-root}"
    DIR_WRITE+=(1) # Cannot write if cannot access
  fi
done

# Test directory creation in root
echo "4. Testing directory creation in root..."
TEST_DIR="test_dir_$(date +%s)"
sudo smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "mkdir \$TEST_DIR"
DIR_CREATE=$?
echo "Directory creation result: $DIR_CREATE (0=success)"

# Only proceed with file tests if directory was created
if [ $DIR_CREATE -eq 0 ]; then
  # Test file creation
  echo "5. Testing file creation..."
  TEST_FILE="\$TEST_DIR/test_file_$(date +%s).txt"
  echo "Test content" > /tmp/test_file.txt
  
  # Try to upload it
  sudo smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "put /tmp/test_file.txt \$TEST_FILE"
  FILE_CREATE=$?
  echo "File creation result: $FILE_CREATE (0=success)"

  # Test file deletion
  echo "6. Testing file deletion..."
  sudo smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "rm \$TEST_FILE"
  FILE_DELETE=$?
  echo "File deletion result: $FILE_DELETE (0=success)"

  # Test directory deletion
  echo "7. Testing directory deletion..."
  sudo smbclient //$SERVER/$SHARE -U "$USER%$PASS" -m SMB3 -c "rmdir \$TEST_DIR"
  DIR_DELETE=$?
  echo "Directory deletion result: $DIR_DELETE (0=success)"
else
  echo "Directory creation failed, skipping file tests"
  FILE_CREATE=1
  FILE_DELETE=1
  DIR_DELETE=1
fi

# Clean up
rm -f /tmp/test_file.txt

# Summary
echo "=== Summary ==="
echo "Basic connection: $([ $BASIC_CONN -eq 0 ] && echo "SUCCESS" || echo "FAILED")"
echo "Share listing: $([ $SHARE_LIST -eq 0 ] && echo "SUCCESS" || echo "FAILED")"
echo "Directory creation: $([ $DIR_CREATE -eq 0 ] && echo "SUCCESS" || echo "FAILED")"
echo "File creation: $([ $FILE_CREATE -eq 0 ] && echo "SUCCESS" || echo "FAILED")"
echo "File deletion: $([ $FILE_DELETE -eq 0 ] && echo "SUCCESS" || echo "FAILED")"
echo "Directory deletion: $([ $DIR_DELETE -eq 0 ] && echo "SUCCESS" || echo "FAILED")"

# Individual directory results
for ((i=0; i<\${#MEDIA_DIRS[@]}; i++)); do
  dir="\${MEDIA_DIRS[$i]}"
  dir_name="\${dir:-root}"
  access="\${DIR_ACCESS[$i]}"
  write="\${DIR_WRITE[$i]}"
  echo "Directory '\$dir_name': Access=$([ $access -eq 0 ] && echo "SUCCESS" || echo "FAILED"), Write=$([ $write -eq 0 ] && echo "SUCCESS" || echo "FAILED")"
done

# Output machine-readable results
echo "BASIC_CONN=$BASIC_CONN"
echo "SHARE_LIST=$SHARE_LIST"
echo "DIR_CREATE=$DIR_CREATE"
echo "FILE_CREATE=$FILE_CREATE"
echo "FILE_DELETE=$FILE_DELETE"
echo "DIR_DELETE=$DIR_DELETE"

# Output directory-specific results
for ((i=0; i<\${#MEDIA_DIRS[@]}; i++)); do
  dir="\${MEDIA_DIRS[$i]}"
  dir_name="\${dir:-root}"
  access="\${DIR_ACCESS[$i]}"
  write="\${DIR_WRITE[$i]}"
  echo "DIR_\${i}_NAME=\$dir_name"
  echo "DIR_\${i}_ACCESS=\$access"
  echo "DIR_\${i}_WRITE=\$write"
done
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
    const directoryResults = [];
    const lines = stdout.split('\n');
    
    // Parse the key-value pairs at the end of the output
    for (const line of lines) {
      const matchStandard = line.match(/^([A-Z_]+)=(\d+)$/);
      if (matchStandard) {
        results[matchStandard[1]] = parseInt(matchStandard[2]) === 0 ? 'success' : 'failed';
      }
      
      // Parse directory-specific results
      const matchDir = line.match(/^DIR_(\d+)_([A-Z]+)=(.+)$/);
      if (matchDir) {
        const index = parseInt(matchDir[1]);
        const key = matchDir[2].toLowerCase();
        const value = matchDir[3];
        
        // Create directory entry if it doesn't exist
        if (!directoryResults[index]) {
          directoryResults[index] = {};
        }
        
        // Store value, converting numeric status codes to success/failed
        if (key === 'access' || key === 'write') {
          directoryResults[index][key] = parseInt(value) === 0 ? 'success' : 'failed';
        } else {
          directoryResults[index][key] = value;
        }
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
      directoryResults: directoryResults,
      fullOutput: stdout,
      stderr: stderr || null
    });
  });
});

// Add this to your server.js file where other routes are defined
app.post('/api/stats/add', (req, res) => {
  const { filename, type, language, success } = req.body;
  
  // Use the same stats.json file for all history tracking
  const statsFilePath = path.join(__dirname, 'api', 'stats.json');
  
  try {
    // Create or read the stats file
    let statsData = {
      english_movies: 0,
      malayalam_movies: 0,
      english_tv_shows: 0,
      malayalam_tv_shows: 0,
      files: []
    };
    
    if (fs.existsSync(statsFilePath)) {
      statsData = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
    }
    
    // Make sure files array exists
    if (!statsData.files) {
      statsData.files = [];
    }
    
    // Add the new file to the history
    statsData.files.unshift({
      name: filename,
      type: type.toLowerCase(),
      language: language.toLowerCase(),
      processedAt: new Date().toISOString()
    });
    
    // Limit the history to 500 entries
    if (statsData.files.length > 500) {
      statsData.files = statsData.files.slice(0, 500);
    }
    
    // Update the appropriate count
    const fileKey = `${language.toLowerCase()}_${type.toLowerCase() === 'tvshow' ? 'tv_shows' : 'movies'}`;
    if (statsData[fileKey] !== undefined) {
      statsData[fileKey] += 1;
    }
    
    fs.writeFileSync(statsFilePath, JSON.stringify(statsData, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving file history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add the media update-counts endpoint
app.post('/api/media/update-counts', (req, res) => {
  // This endpoint updates the media counts in the stats
  const statsFilePath = path.join(__dirname, 'api', 'stats.json');
  
  try {
    // Create or read the stats file
    let statsData = {
        english_movies: 0, 
        malayalam_movies: 0, 
        english_tv_shows: 0, 
      malayalam_tv_shows: 0,
      files: []
      };
    
    if (fs.existsSync(statsFilePath)) {
      statsData = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
    }
    
    // Return the current stats
    res.json({ 
      success: true, 
      stats: {
        english_movies: statsData.english_movies || 0,
        malayalam_movies: statsData.malayalam_movies || 0,
        english_tv_shows: statsData.english_tv_shows || 0,
        malayalam_tv_shows: statsData.malayalam_tv_shows || 0
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

// Add a new endpoint to expose SMB settings from environment variables to the frontend
app.get('/api/smb-settings', (req, res) => {
  // Return the SMB settings from environment variables
  res.json({
    success: true,
    settings: {
      server: process.env.SMB_SERVER || '',
      share: process.env.SMB_SHARE || '',
      username: process.env.SMB_USERNAME || '',
      password: process.env.SMB_PASSWORD || ''
    }
  });
});

// Test endpoint for file managers
app.get('/api/test-file-managers', (req, res) => {
  const { exec } = require('child_process');
  
  const managers = ['xdg-open', 'nautilus', 'thunar', 'dolphin', 'pcmanfm', 'caja'];
  const results = {};
  
  let completed = 0;
  
  managers.forEach(manager => {
    exec(`which ${manager}`, (error) => {
      results[manager] = !error;
      completed++;
      
      if (completed === managers.length) {
        res.json({ available: results });
      }
    });
  });
});

// Test endpoint to open a simple directory
app.post('/api/test-open-home', (req, res) => {
  const { exec } = require('child_process');
  const homeDir = process.env.HOME || '/home';
  
  console.log('🧪 Testing file manager with home directory:', homeDir);
  
  exec(`xdg-open '${homeDir}' || nautilus '${homeDir}' || thunar '${homeDir}'`, (error, stdout, stderr) => {
    if (error) {
      console.error('🧪 Test failed:', error.message);
      res.json({ success: false, error: error.message, path: homeDir });
    } else {
      console.log('🧪 Test succeeded');
      res.json({ success: true, message: 'Home directory opened', path: homeDir });
    }
  });
});

// Open file location endpoint
app.post('/api/open-location', (req, res) => {
  const { exec } = require('child_process');
  const { filePath } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ success: false, error: 'File path is required' });
  }
  
  console.log('📂 Attempting to open file location:', filePath);
  
  // Decode URL encoding if present
  let decodedPath = filePath;
  try {
    decodedPath = decodeURIComponent(filePath);
    console.log('📂 Decoded path:', decodedPath);
  } catch (e) {
    console.log('📂 Path not URL encoded, using as-is');
  }
  
  // Build full path - try multiple common locations
  const possiblePaths = [
    decodedPath, // Use decoded path as-is if absolute
    path.join('/', decodedPath), // Prepend root
    path.join('/media', decodedPath), // Common media mount point
    path.join('/mnt', decodedPath), // Alternative mount point
    path.join(process.env.HOME || '/home/user', decodedPath) // User home directory
  ].filter(p => p && p.length > 0);
  
  console.log('📂 Possible paths to try:', possiblePaths);
  
  // Find the first path that exists
  let validPath = null;
  for (const testPath of possiblePaths) {
    const folderPath = path.dirname(testPath);
    console.log('📂 Testing folder:', folderPath);
    
    if (require('fs').existsSync(folderPath)) {
      validPath = folderPath;
      console.log('📂 Found valid folder:', validPath);
      break;
    }
  }
  
  if (!validPath) {
    console.error('❌ No valid folder path found');
    return res.json({ 
      success: false, 
      error: 'Folder not found. Tried paths: ' + possiblePaths.map(p => path.dirname(p)).join(', ')
    });
  }
  
  // Escape the path properly for shell commands
  const escapedPath = validPath.replace(/'/g, "'\\''");
  
  // Use single quotes to handle spaces and special characters better
  const commands = [
    `xdg-open '${escapedPath}'`,
    `nautilus '${escapedPath}'`,
    `thunar '${escapedPath}'`,
    `dolphin '${escapedPath}'`,
    `pcmanfm '${escapedPath}'`
  ];
  
  console.log('📂 Escaped path:', escapedPath);
  console.log('📂 Commands to try:', commands);
  
  let commandIndex = 0;
  
  function tryNextCommand() {
    if (commandIndex >= commands.length) {
      console.error('❌ All commands failed');
      return res.json({ 
        success: false, 
        error: `No file manager could open: ${validPath}. Available managers may not be installed.`
      });
    }
    
    const command = commands[commandIndex];
    console.log(`📂 Trying command ${commandIndex + 1}: ${command}`);
    
    exec(command, { timeout: 3000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Command ${commandIndex + 1} failed:`, error.message);
        commandIndex++;
        tryNextCommand();
      } else {
        console.log(`✅ Command ${commandIndex + 1} succeeded`);
        console.log('📂 stdout:', stdout);
        console.log('📂 stderr:', stderr);
        
        res.json({ 
          success: true, 
          message: `File location opened: ${validPath}`,
          path: validPath,
          usedCommand: command
        });
      }
    });
  }
  
  tryNextCommand();
});

// Handle 404 and serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Media Processor dashboard listening on port ${port}`);
});