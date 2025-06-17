import React, { useState, useEffect } from 'react';
import StatusIndicator from './StatusIndicator';
import axios from 'axios';

// Set the base URL for all axios requests
axios.defaults.baseURL = 'http://localhost:5001';

function StatusControls() {
  const [status, setStatus] = useState('Unknown');
  const [isRestarting, setIsRestarting] = useState(false);
  const [uptime, setUptime] = useState('');
  
  // Function to fetch status
  const fetchStatus = async () => {
    try {
      const response = await axios.get('/api/status');
      setStatus(response.data.status === 'active' ? 'Running' : 'Stopped');
      setUptime(response.data.uptime || '');
    } catch (error) {
      console.error('Error fetching status:', error);
      setStatus('Unknown');
    }
  };
  
  // Initial status fetch
  useEffect(() => {
    fetchStatus();
    
    // Set up polling for status updates
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Handle restart button click
  const handleRestart = async () => {
    try {
      setIsRestarting(true);
      
      const response = await axios.post('/api/service/restart');
      
      if (response.data.success) {
        // Keep showing restarting animation for a reasonable time
        // The actual services will take some time to restart
        setTimeout(() => {
          fetchStatus();
          setIsRestarting(false);
        }, 15000); // Show restarting for 15 seconds
      } else {
        alert('Failed to restart: ' + (response.data.error || 'Unknown error'));
        setIsRestarting(false);
      }
    } catch (error) {
      console.error('Error restarting service:', error);
      alert('Error restarting service: ' + error.message);
      setIsRestarting(false);
    }
  };
  
  // Handle stop button click
  const handleStop = async () => {
    try {
      const response = await axios.post('/api/service/stop');
      if (response.data.success) {
        fetchStatus();
      } else {
        alert('Failed to stop: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error stopping service:', error);
      alert('Error stopping service: ' + error.message);
    }
  };
  
  // Handle start button click
  const handleStart = async () => {
    try {
      const response = await axios.post('/api/service/start');
      if (response.data.success) {
        fetchStatus();
      } else {
        alert('Failed to start: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error starting service:', error);
      alert('Error starting service: ' + error.message);
    }
  };
  
  return (
    <div className="status-controls">
      <div className="status-section">
        <h2>Status & Controls</h2>
        <div className="status-display">
          <StatusIndicator status={status} isRestarting={isRestarting} />
          {uptime && <div className="uptime">Uptime: {uptime}</div>}
        </div>
      </div>
      
      <div className="controls-section">
        {status === 'Running' && !isRestarting && (
          <>
            <button className="stop-button" onClick={handleStop}>
              <span className="icon">■</span> Stop
            </button>
            <button className="restart-button" onClick={handleRestart}>
              <span className="icon">↻</span> Restart
            </button>
          </>
        )}
        
        {status === 'Stopped' && !isRestarting && (
          <button className="start-button" onClick={handleStart}>
            <span className="icon">▶</span> Start
          </button>
        )}
        
        {isRestarting && (
          <button className="restart-button" disabled>
            <span className="icon spinning">↻</span> Restarting...
          </button>
        )}
        
        <button className="diagnostics-button" onClick={() => window.location.href = '/diagnostics'}>
          <span className="icon">🔍</span> Run Diagnostics
        </button>
      </div>
    </div>
  );
}

export default StatusControls;