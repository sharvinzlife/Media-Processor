import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography, Box, Button, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Icons
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import FolderIcon from '@mui/icons-material/Folder';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';

// Lottie animations
import processingAnimation from '../utils/animations/processing-animation.json';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
};

const Dashboard = () => {
  const [status, setStatus] = useState('unknown');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mediaProcessed: 0,
    moviesProcessed: 0,
    tvShowsProcessed: 0,
    pendingFiles: 0
  });

  useEffect(() => {
    fetchServiceStatus();
    // In a real app, you would fetch actual stats
    // For now we'll use mock data
    setStats({
      mediaProcessed: 246,
      moviesProcessed: 172,
      tvShowsProcessed: 74,
      pendingFiles: 12
    });
    setLoading(false);
  }, []);

  const fetchServiceStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/status');
      setStatus(response.data.status);
    } catch (error) {
      console.error('Error fetching service status:', error);
      toast.error('Failed to fetch service status');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceAction = async (action) => {
    try {
      setLoading(true);
      await axios.post(`http://localhost:3001/api/service/${action}`);
      toast.success(`Service ${action}ed successfully`);
      // Wait a moment for the service to fully start/stop before checking status
      setTimeout(() => {
        fetchServiceStatus();
      }, 1000);
    } catch (error) {
      console.error(`Error ${action}ing service:`, error);
      toast.error(`Failed to ${action} service`);
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
            Dashboard
          </Typography>
        </motion.div>

        <Grid container spacing={3}>
          {/* Service Status Card */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 240,
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Service Status
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box 
                    sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      bgcolor: status === 'running' ? 'success.main' : 'error.main',
                      mr: 1,
                      animation: status === 'running' ? 'pulse 1.5s infinite' : 'none',
                      '@keyframes pulse': {
                        '0%': { opacity: 0.5, transform: 'scale(0.8)' },
                        '50%': { opacity: 1, transform: 'scale(1.2)' },
                        '100%': { opacity: 0.5, transform: 'scale(0.8)' },
                      }
                    }} 
                  />
                  <Typography variant="body1">
                    {loading ? 'Checking status...' : `Service is ${status === 'running' ? 'running' : 'stopped'}`}
                  </Typography>
                </Box>
                
                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {loading ? (
                    <CircularProgress />
                  ) : (
                    <Box sx={{ textAlign: 'center' }}>
                      {status === 'running' ? (
                        <Lottie 
                          animationData={processingAnimation} 
                          style={{ width: 100, height: 100 }}
                        />
                      ) : (
                        <Typography variant="body1" color="text.secondary">
                          Media processing is currently inactive
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    startIcon={<RefreshIcon />}
                    onClick={fetchServiceStatus}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                  
                  {status === 'running' ? (
                    <Button 
                      variant="contained" 
                      color="error" 
                      startIcon={<StopIcon />}
                      onClick={() => handleServiceAction('stop')}
                      disabled={loading}
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button 
                      variant="contained" 
                      color="success" 
                      startIcon={<PlayArrowIcon />}
                      onClick={() => handleServiceAction('start')}
                      disabled={loading}
                    >
                      Start
                    </Button>
                  )}
                </Box>
              </Paper>
            </motion.div>
          </Grid>

          {/* Stats Card */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 240,
                  borderRadius: 3
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Processing Statistics
                </Typography>
                
                <Grid container spacing={2} sx={{ flexGrow: 1 }}>
                  <Grid item xs={6}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        bgcolor: 'background.default',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <MovieIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h4">{stats.moviesProcessed}</Typography>
                      <Typography variant="body2" color="text.secondary">Movies</Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        bgcolor: 'background.default',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <TvIcon sx={{ fontSize: 32, color: 'secondary.main', mb: 1 }} />
                      <Typography variant="h4">{stats.tvShowsProcessed}</Typography>
                      <Typography variant="body2" color="text.secondary">TV Shows</Typography>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Media Files Processed
                    </Typography>
                    <Typography variant="h5">
                      {stats.mediaProcessed}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Pending Files
                    </Typography>
                    <Typography variant="h5" color={stats.pendingFiles > 0 ? 'warning.main' : 'text.primary'}>
                      {stats.pendingFiles}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </motion.div>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { time: '10:30 AM', message: 'Processed "The Matrix (1999).mkv"', icon: <MovieIcon /> },
                    { time: '09:45 AM', message: 'Processed "Breaking Bad S01E01.mp4"', icon: <TvIcon /> },
                    { time: '09:12 AM', message: 'Cleaned up empty directory "Download123"', icon: <FolderIcon /> },
                    { time: '08:55 AM', message: 'Processed "Inception (2010).mkv"', icon: <MovieIcon /> },
                    { time: '08:30 AM', message: 'Service started', icon: <PlayArrowIcon /> }
                  ].map((activity, index) => (
                    <Box 
                      key={index}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        p: 1,
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'background.default' }
                      }}
                    >
                      <Box sx={{ 
                        mr: 2, 
                        bgcolor: 'background.default', 
                        p: 1, 
                        borderRadius: '50%',
                        display: 'flex'
                      }}>
                        {activity.icon}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2">{activity.message}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">{activity.time}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
};

export default Dashboard; 