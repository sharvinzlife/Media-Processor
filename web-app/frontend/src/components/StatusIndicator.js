import React, { useState, useEffect } from 'react';
import './StatusIndicator.css'; // You'll need to create this CSS file

function StatusIndicator({ status, isRestarting }) {
  // Determine the status text and class
  let statusText = status;
  let statusClass = status.toLowerCase();
  
  // Override with restarting animation if isRestarting is true
  if (isRestarting) {
    statusText = "Restarting";
    statusClass = "restarting";
  }
  
  // For the animation dots when restarting
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    let interval;
    if (isRestarting) {
      // Create the animated dots
      interval = setInterval(() => {
        setDots(prev => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRestarting]);
  
  return (
    <div className={`status-indicator ${statusClass}`}>
      {statusText}{isRestarting ? dots : ''}
    </div>
  );
}

export default StatusIndicator;