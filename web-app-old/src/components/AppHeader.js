import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

// Icons
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import ListAltIcon from '@mui/icons-material/ListAlt';
import FolderIcon from '@mui/icons-material/Folder';

const AppHeader = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <AppBar position="static" color="primary" elevation={0}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={toggleSidebar}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h5" component="div" sx={{ 
            fontWeight: 'bold', 
            mr: 4,
            display: 'flex',
            alignItems: 'center' 
          }}>
            🎬 Media Processor
          </Typography>
        </motion.div>
        
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1, flexGrow: 1 }}>
          <Button 
            color="inherit" 
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
            variant={isActive('/') ? 'contained' : 'text'}
            sx={{ borderRadius: 2 }}
          >
            Dashboard
          </Button>
          
          <Button 
            color="inherit" 
            startIcon={<SettingsIcon />}
            onClick={() => navigate('/settings')}
            variant={isActive('/settings') ? 'contained' : 'text'}
            sx={{ borderRadius: 2 }}
          >
            Settings
          </Button>
          
          <Button 
            color="inherit" 
            startIcon={<ListAltIcon />}
            onClick={() => navigate('/logs')}
            variant={isActive('/logs') ? 'contained' : 'text'}
            sx={{ borderRadius: 2 }}
          >
            Logs
          </Button>
          
          <Button 
            color="inherit" 
            startIcon={<FolderIcon />}
            onClick={() => navigate('/media-paths')}
            variant={isActive('/media-paths') ? 'contained' : 'text'}
            sx={{ borderRadius: 2 }}
          >
            Media Paths
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader; 