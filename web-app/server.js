const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Try to load environment variables from .env file  
try {
  const dotenv = require('dotenv');
  const envPath = path.resolve(__dirname, '../.env');
  
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`Environment variables loaded from ${envPath}`);
    
    // Debug: Print key environment variables (hide sensitive data)
    console.log('Environment Variables:');
    console.log('- PORT:', process.env.PORT || '3005');
    console.log('- SMB_SERVER:', process.env.SMB_SERVER || 'not set');
    console.log('- SMB_SHARE:', process.env.SMB_SHARE || 'not set');
    console.log('- SMB_USERNAME:', process.env.SMB_USERNAME || 'not set');
    console.log('- SMB_PASSWORD:', process.env.SMB_PASSWORD ? '******' : 'not set');
  } else {
    console.log(`No .env file found at ${envPath}, using environment variables`);
  }
} catch (err) {
  console.log('Failed to load dotenv package:', err.message);
  // Set default values if dotenv fails
  process.env.PORT = process.env.PORT || 3005;
}

const app = express();
const port = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React build directory with cache control
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
  // Check if media_processor.py process is running
  exec('pgrep -f "media_processor.py"', (error, stdout, stderr) => {
    const isRunning = !error && stdout.trim().length > 0;
    res.json({ status: isRunning ? 'active' : 'inactive' });
  });
});

app.get('/api/logs', (req, res) => {
  // Read logs from multiple files with optional parameters
  const logFiles = [
    '/home/sharvinzlife/media-processor/logs/api_server.log',
    '/home/sharvinzlife/media-processor/logs/media_processor.log',
    '/home/sharvinzlife/media-processor/logs/media_processor_py.log',
    '/home/sharvinzlife/media-processor/logs/web_interface.log'
  ];
  
  const maxLines = req.query.maxLines || 50;
  const level = req.query.level; // Optional filter by log level
  
  // Create command to read from multiple log files
  const existingFiles = logFiles.filter(file => {
    try {
      require('fs').accessSync(file);
      return true;
    } catch (e) {
      return false;
    }
  });
  
  if (existingFiles.length === 0) {
    res.json({
      success: true,
      logs: [{
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'No log files found. System logs will appear here once services start running.',
        source: 'system'
      }],
      error: null,
      note: 'No log files available'
    });
    return;
  }
  
  // Combine logs from all files
  let command = `cat ${existingFiles.join(' ')} | tail -n 200`;
  
  // Add grep filter for log level if specified
  if (level && level !== 'all') {
    command += ` | grep -i "${level}"`;
  }
  
  // Limit final output
  command += ` | tail -n ${maxLines}`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      res.json({
        success: false,
        logs: [],
        error: stderr || error.message
      });
      return;
    }
    
    const logLines = stdout.split('\n').filter(line => line.trim() && line !== '---');
    
    // Parse logs into structured format
    const logs = logLines.map(line => {
      // Try to parse Python log format: YYYY-MM-DD HH:MM:SS,mmm - source - level - message
      const pythonMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - ([^-]+) - ([^-]+) - (.+)$/);
      if (pythonMatch) {
        return {
          timestamp: pythonMatch[1],
          level: pythonMatch[3].trim(),
          message: pythonMatch[4].trim(),
          source: pythonMatch[2].trim()
        };
      }
      
      // Try to parse structured log format: [timestamp] [level] message
      const bracketMatch = line.match(/^\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.+)$/);
      if (bracketMatch) {
        return {
          timestamp: bracketMatch[1],
          level: bracketMatch[2],
          message: bracketMatch[3],
          source: 'media-processor'
        };
      }
      
      // Check for Node.js error patterns
      if (line.includes('Error:') || line.includes('error')) {
        return {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: line,
          source: 'system'
        };
      }
      
      // Check for info patterns
      if (line.includes('INFO') || line.includes('info')) {
        return {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: line,
          source: 'system'
        };
      }
      
      // Fallback to simple format
      return {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: line,
        source: 'system'
      };
    });
    
    // Sort logs by timestamp (most recent first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      success: true,
      logs: logs.length > 0 ? logs.slice(0, maxLines) : [],
      error: null,
      note: `Showing last ${maxLines} log entries from ${existingFiles.length} log files${level ? ` filtered by ${level}` : ''}`
    });
  });
});

// Clear logs endpoint
app.post('/api/logs/clear', (req, res) => {
  const logFile = '/home/sharvinzlife/media-processor/logs/media_processor.log';
  
  // Backup existing logs before clearing
  const backupFile = `/home/sharvinzlife/media-processor/logs/media_processor_backup_${Date.now()}.log`;
  
  exec(`cp "${logFile}" "${backupFile}" && echo "" > "${logFile}"`, (error, stdout, stderr) => {
    if (error) {
      res.json({
        success: false,
        error: stderr || error.message
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Logs cleared successfully',
      backup: backupFile
    });
  });
});

// Server-Sent Events endpoint for streaming logs
app.get('/api/logs/stream', (req, res) => {
  // Set up Server-Sent Events headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'log',
    message: 'Connected to log stream - loading recent logs...'
  })}\n\n`);

  let followProcess = null;
  let isConnected = true;
  let heartbeatInterval = null;

  // First, send some recent logs to give immediate feedback
  const logFile = '/home/sharvinzlife/media-processor/logs/media_processor.log';
  exec(`tail -n 20 "${logFile}"`, (error, stdout, stderr) => {
    if (!isConnected) return;
    
    if (!error && stdout) {
      const lines = stdout.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (line.trim()) {
          res.write(`data: ${JSON.stringify({
            type: 'log',
            message: line
          })}\n\n`);
        }
      });
    }
    
    // Send a marker to indicate we're switching to live mode
    res.write(`data: ${JSON.stringify({
      type: 'log',
      message: '--- Switching to live log stream ---'
    })}\n\n`);
    
    // Now start the live stream
    startLogFollow();
  });

  // Send heartbeat every 30 seconds to keep connection alive
  heartbeatInterval = setInterval(() => {
    if (isConnected) {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        message: 'Connection alive'
      })}\n\n`);
    }
  }, 30000);

  // Function to start following logs
  function startLogFollow() {
    // Use spawn for better streaming support - follow the log file
    followProcess = spawn('tail', [
      '-f',
      '/home/sharvinzlife/media-processor/logs/media_processor.log'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    followProcess.stdout.on('data', (data) => {
      if (!isConnected) return;

      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (line.trim()) {
          res.write(`data: ${JSON.stringify({
            type: 'log',
            message: line
          })}\n\n`);
        }
      });
    });

    followProcess.stderr.on('data', (data) => {
      if (!isConnected) return;

      const errorMsg = data.toString();
      console.error('journalctl stderr:', errorMsg);
      
      // Only send meaningful errors to the client
      if (!errorMsg.includes('Hint: You are currently not seeing messages from other users')) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: `Error reading logs: ${errorMsg}`
        })}\n\n`);
      }
    });

    followProcess.on('error', (error) => {
      if (!isConnected) return;

      console.error('Log follow process error:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: `Log follow process error: ${error.message}`
      })}\n\n`);
    });

    followProcess.on('exit', (code, signal) => {
      if (!isConnected) return;

      console.log('Log follow process exited with code:', code, 'signal:', signal);
      if (code !== 0 && code !== null) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: `Log follow process exited with code ${code}`
        })}\n\n`);
      }
    });
  }

  // Handle client disconnect
  req.on('close', () => {
    isConnected = false;
    console.log('Log stream client disconnected');
    
    // Clean up resources
    if (followProcess && !followProcess.killed) {
      followProcess.kill('SIGTERM');
      followProcess = null;
    }
    
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });

  req.on('error', (error) => {
    console.error('Log stream request error:', error);
    isConnected = false;
    
    // Clean up resources
    if (followProcess && !followProcess.killed) {
      followProcess.kill('SIGTERM');
      followProcess = null;
    }
    
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
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
  
  const statsFilePath = path.join(__dirname, 'stats.json');
  
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

// Stats endpoint - proxy to Python API
app.get('/api/stats', (req, res) => {
  // Read stats directly from local JSON file
  const statsPath = path.join(__dirname, 'stats.json');
  
  try {
    // Force fresh read from file
    const data = fs.readFileSync(statsPath, 'utf8');
    const stats = JSON.parse(data);
    
    // Debug logging (commented out to reduce log verbosity)
    // console.log('Stats loaded from file:', {
    //   english_movies: stats.english_movies,
    //   malayalam_movies: stats.malayalam_movies,
    //   malayalam_tv_shows: stats.malayalam_tv_shows,
    //   files_count: stats.files ? stats.files.length : 0
    // });
    
    // Return stats and files
    res.json({
      success: true,
      stats: {
        english_movies: stats.english_movies || 0,
        malayalam_movies: stats.malayalam_movies || 0,
        english_tv_shows: stats.english_tv_shows || 0,
        malayalam_tv_shows: stats.malayalam_tv_shows || 0
      },
      files: stats.files || []
    });
  } catch (error) {
    console.error('Error reading stats file:', error);
    res.json({
      success: false,
      stats: {
        english_movies: 0,
        malayalam_movies: 0,
        english_tv_shows: 0,
        malayalam_tv_shows: 0
      },
      files: [],
      error: error.message
    });
  }
});

// SMB connection test endpoint - uses provided credentials
app.post('/api/test-connection', (req, res) => {
  const { server, share, username, password } = req.body;
  
  console.log('Testing SMB connection with provided credentials:');
  console.log('- Server:', server);
  console.log('- Share:', share);
  console.log('- Username:', username);
  console.log('- Password:', password ? 'provided' : 'not provided');
  
  // For SMB connections with complex passwords, use a credentials file approach
  const tmpCredFile = path.join(__dirname, `.smb_test_${Date.now()}`);
  fs.writeFileSync(tmpCredFile, `username=${username}\npassword=${password}\n`, { mode: 0o600 });
  
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
  const { server, share, username, password } = req.body;
  
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
  fs.writeFileSync(tmpCredFile, `username=${username}\npassword=${password}\n`, { mode: 0o600 });
  
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
        username,
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
  // Use our manual restart script
  const stopScript = '/home/sharvinzlife/media-processor/stop-services.sh';
  const startScript = '/home/sharvinzlife/media-processor/start-services.sh';
  
  // First stop services (keeping web interface running)
  exec(`bash "${stopScript}" --keep-web`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: stderr || 'Failed to stop services',
        details: error.message
      });
    }
    
    console.log('Services stopped successfully, now restarting...');
    
    // Wait a moment then start services
    setTimeout(() => {
      exec(`bash "${startScript}"`, (startError, startStdout, startStderr) => {
        if (startError) {
          console.error('Failed to restart services:', startError);
          return;
        }
        console.log('Services restarted successfully');
      });
    }, 2000);
    
    // Tell the client the restart was successful
    res.json({ 
      success: true, 
      message: 'Services are being restarted.',
      willReconnect: false
    });
  });
});

// Legacy stop endpoint - now handled by the Python API via /api/service/:action
app.post('/api/service/stop', (req, res) => {
  const stopScript = '/home/sharvinzlife/media-processor/stop-services.sh';
  exec(`bash "${stopScript}" --keep-web`, (error, stdout, stderr) => {
    if (error) {
      console.error('Failed to stop services:', error);
      return res.status(500).json({ 
        success: false, 
        error: stderr || 'Failed to stop services',
        details: error.message 
      });
    }
    res.json({ success: true });
  });
});

app.post('/api/service/start', (req, res) => {
  const startScript = '/home/sharvinzlife/media-processor/start-services.sh';
  exec(`bash "${startScript}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Failed to start services:', error);
      return res.status(500).json({ 
        success: false, 
        error: stderr || 'Failed to start services',
        details: error.message 
      });
    }
    res.json({ success: true });
  });
});

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
        let jsonString = jsonMatch[0];
        
        // Clean up malformed JSON - fix newlines in string values
        jsonString = jsonString.replace(/("webUi"\s*:\s*"[^"]*)\n([^"]*")/g, '$1 $2');
        jsonString = jsonString.replace(/("webUi"\s*:\s*")([^"]*\n[^"]*)(")/, '$1$2$3'.replace(/\n/g, ' '));
        
        // Clean any other potential newlines within quoted strings
        jsonString = jsonString.replace(/"([^"]*)\n([^"]*)"/g, '"$1 $2"');
        
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

// Add this to your server.js file where other routes are defined
app.post('/api/stats/add', (req, res) => {
  const { filename, type, language, success } = req.body;
  
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
        username,
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
  const statsFilePath = path.join(__dirname, 'stats.json');
  
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
  const statsFilePath = path.join(__dirname, 'stats.json');
  
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

// Proxy routes to Python API server
const PYTHON_API_URL = 'http://127.0.0.1:5001';


// Settings endpoint - reads from .env file and maps to frontend field names
app.get('/api/settings', async (req, res) => {
  try {
    const envPath = path.join(__dirname, '../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Helper function to get env value
    const getEnvValue = (key) => {
      const regex = new RegExp(`^\\s*${key}\\s*=\\s*["']?([^"'#\\n\\r]*)["']?`, 'm');
      const match = envContent.match(regex);
      return match ? match[1].trim() : '';
    };
    
    // Map .env variables to frontend field names
    const settings = {
      // SMB connection settings
      smb_server: getEnvValue('SMB_SERVER'),
      smb_share: getEnvValue('SMB_SHARE'),
      smb_username: getEnvValue('SMB_USERNAME'),
      smb_password: getEnvValue('SMB_PASSWORD'),
      
      // Path settings
      download_dir: getEnvValue('SOURCE_DIR'),
      english_movies_path: getEnvValue('ENGLISH_MOVIE_PATH'),
      english_tv_path: getEnvValue('ENGLISH_TV_PATH'),
      malayalam_movies_path: getEnvValue('MALAYALAM_MOVIE_PATH'),
      malayalam_tv_path: getEnvValue('MALAYALAM_TV_PATH'),
      
      // Processing settings
      processing_enabled: getEnvValue('DRY_RUN') !== 'true',
      dry_run: getEnvValue('DRY_RUN') === 'true',
      extract_languages: getEnvValue('EXTRACT_AUDIO_TRACKS') === 'true'
    };
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Settings read error:', error);
    res.status(500).json({ success: false, error: 'Failed to read settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Map frontend field names back to .env variable names
    const envMapping = {
      smb_server: 'SMB_SERVER',
      smb_share: 'SMB_SHARE', 
      smb_username: 'SMB_USERNAME',
      smb_password: 'SMB_PASSWORD',
      download_dir: 'SOURCE_DIR',
      english_movies_path: 'ENGLISH_MOVIE_PATH',
      english_tv_path: 'ENGLISH_TV_PATH',
      malayalam_movies_path: 'MALAYALAM_MOVIE_PATH',
      malayalam_tv_path: 'MALAYALAM_TV_PATH',
      dry_run: 'DRY_RUN',
      extract_languages: 'EXTRACT_AUDIO_TRACKS'
    };
    
    // Update each setting in the .env file
    Object.entries(settings).forEach(([frontendKey, value]) => {
      const envKey = envMapping[frontendKey];
      if (envKey) {
        // Convert boolean values to strings
        let envValue = value;
        if (typeof value === 'boolean') {
          envValue = value ? 'true' : 'false';
        }
        
        const regex = new RegExp(`^\\s*${envKey}\\s*=.*$`, 'm');
        const newLine = `${envKey}="${envValue}"`;
        
        if (envContent.match(regex)) {
          envContent = envContent.replace(regex, newLine);
        } else {
          envContent += `\n${newLine}`;
        }
      }
    });
    
    fs.writeFileSync(envPath, envContent);
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Settings write error:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// Database endpoints - proxy to Python API
app.get('/api/database/health', async (req, res) => {
  try {
    const response = await axios.get('http://127.0.0.1:5001/api/database/health');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get database health'
    });
  }
});

app.get('/api/database/backups', async (req, res) => {
  try {
    const response = await axios.get('http://127.0.0.1:5001/api/database/backups');
    res.json(response.data);
  } catch (error) {
    res.json({
      success: false,
      backups: []
    });
  }
});

app.get('/api/database/info', async (req, res) => {
  try {
    const response = await axios.get('http://127.0.0.1:5001/api/database/info');
    res.json(response.data);
  } catch (error) {
    res.json({
      success: false,
      exists: false,
      size: 0,
      total_files: 0
    });
  }
});

app.post('/api/database/backup', async (req, res) => {
  try {
    const response = await axios.post('http://127.0.0.1:5001/api/database/backup', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database backup failed'
    });
  }
});

app.post('/api/database/sync', async (req, res) => {
  try {
    const response = await axios.post('http://127.0.0.1:5001/api/database/sync', req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database sync failed'
    });
  }
});

// Handle 404 and serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Media Processor dashboard listening on port ${port}`);
});