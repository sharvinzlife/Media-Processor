import React from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import { useNavigate, useLocation } from 'react-router-dom';

// Icons
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import ListAltIcon from '@mui/icons-material/ListAlt';
import FolderIcon from '@mui/icons-material/Folder';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';

const AppSidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  const menuItems = [
    { text: 'Dashboard', icon: <HomeIcon />, path: '/' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    { text: 'Logs', icon: <ListAltIcon />, path: '/logs' },
    { text: 'Media Paths', icon: <FolderIcon />, path: '/media-paths' },
  ];

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
        },
      }}
    >
      <List sx={{ pt: 2 }}>
        <ListItem>
          <ListItemText 
            primary="🎬 Media Processor" 
            primaryTypographyProps={{ 
              variant: 'h6',
              sx: { fontWeight: 'bold' }
            }} 
          />
        </ListItem>
      </List>
      
      <Divider />
      
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(63, 81, 181, 0.15)',
                  '&:hover': {
                    backgroundColor: 'rgba(63, 81, 181, 0.25)',
                  },
                  borderRight: '4px solid #3f51b5',
                },
                borderRadius: 1,
                m: 0.5,
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ my: 2 }} />
      
      <List>
        <ListItem>
          <ListItemText primary="Media Types" primaryTypographyProps={{ variant: 'subtitle2' }} />
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <MovieIcon />
            </ListItemIcon>
            <ListItemText primary="Movies" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <TvIcon />
            </ListItemIcon>
            <ListItemText primary="TV Shows" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default AppSidebar; 