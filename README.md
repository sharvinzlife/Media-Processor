# 🎬 Media Processor

> Automated media organizer for JDownloader with web interface

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📋 Overview

Media Processor is an intelligent automation tool that monitors your JDownloader directory, processes media files, and organizes them into a structured library on your network storage. It handles file renaming, categorization, and cleanup to maintain a clean and well-organized media collection.

The system consists of:
- **Backend Script**: A bash script that handles media detection, processing, and SMB transfers
- **Web Interface**: A modern React application for configuration and monitoring

![Media Processor Workflow](https://via.placeholder.com/800x400.png?text=Media+Processor+Workflow)

## ✨ Features

### Core Features
- **🔍 Intelligent Media Detection**: Automatically identifies TV shows and movies
- **🌐 Language Classification**: Sorts content between Malayalam and English media
- **🧹 Filename Cleaning**: Removes common prefixes, site references, and fixes spacing
- **🗂️ Automatic Organization**: Creates appropriate folder structures for movies and TV shows
- **🌐 SMB Integration**: Seamlessly copies processed files to network storage
- **♻️ Automatic Cleanup**: Immediately removes leftover RAR files and empty directories after successful processing
- **📝 Detailed Logging**: Keeps track of all operations for easy troubleshooting
- **🧪 Dry Run Mode**: Test functionality without modifying any files

### Web Interface Features
- **📊 Real-time Dashboard**: Monitor service status and processing statistics
- **⚙️ Easy Configuration**: Manage SMB connections and media paths without editing files
- **📝 Log Viewer**: View and filter logs directly in the browser
- **🔄 Service Control**: Start, stop, and restart the service with one click
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🌓 Dark/Light Mode**: Toggle between themes with a persistent preference
- **🔍 Media Path Browser**: Easily set and navigate your media directories
- **🌟 Modern UI**: Glassmorphism design with smooth animations and transitions

## 🎨 UI/UX Improvements

The web interface features:

- **Glassmorphism Header**: A modern sticky navigation bar with blur effects that stays at the top while scrolling
- **Adaptive Theme**: Smart theme detection that automatically applies your system preference
- **Animated Components**: Smooth transitions for cards, buttons, and status changes
- **Toast Notifications**: Non-intrusive feedback system for user actions
- **Responsive Layout**: Adapts to any screen size from mobile to desktop
- **Dashboard Cards**: At-a-glance information with hover effects
- **Icon Library**: Comprehensive set of intuitive icons for better visual communication
- **Accessibility**: High contrast ratios and keyboard navigation support

## 🛠️ Requirements

- Linux-based operating system
- Bash shell
- `smbclient` package for SMB/CIFS connectivity
- Network storage with SMB/CIFS support
- Node.js 14+ and npm (for web interface)
- Sufficient disk space for temporary file processing

## 📦 Quick Setup

### Simple Setup (One Command)

```bash
# Navigate to the project directory
cd /home/sharvinzlife/Documents/JDownloader

# Run the setup script
./setup.sh
```

The setup script will:
1. Make the media processor script executable
2. Install all web interface dependencies
3. Configure and enable systemd services
4. Start both services

### Accessing the Web Interface

Once installed, access the web interface at:
```
http://localhost:3001
```

If accessing from another device, replace "localhost" with your server's IP address.

## ⚙️ Configuration

### Script Configuration

The script has several configurable options at the top:

```bash
# Basic Configuration
SOURCE_DIR="/path/to/downloads/"        # Directory to monitor
LOG_FILE="/path/to/media-processor.log" # Log file location
SMB_SERVER="your-server"                # SMB server address
SMB_SHARE="your-share"                  # SMB share name

# SMB Authentication
SMB_USER="username"                     # SMB username
SMB_PASSWORD="password"                 # SMB password
SMB_AUTH_METHOD="user"                  # Options: user, anonymous

# Media Paths
MALAYALAM_MOVIE_PATH="media/malayalam movies"
MALAYALAM_TV_PATH="media/malayalam-tv-shows"
ENGLISH_MOVIE_PATH="media/movies"
ENGLISH_TV_PATH="media/tv-shows"

# Cleanup Options
CLEANUP_RAR_FILES=true                  # Enable RAR file cleanup
CLEANUP_EMPTY_DIRS=true                 # Enable empty directory cleanup
MIN_RAR_AGE_HOURS=0                     # Set to 0 for immediate cleanup
```

### Web Interface Configuration

All configuration can be managed through the web interface once running. The interface connects to the API server which manipulates the script configuration file.

## 🚀 Manual Service Setup

If you prefer to set up the services manually:

### Backend Script Service

```bash
sudo tee /etc/systemd/system/media-processor.service > /dev/null << EOL
[Unit]
Description=Media Processor Service
After=network.target

[Service]
Type=simple
User=$(whoami)
ExecStart=/home/sharvinzlife/Documents/JDownloader/media-processor.sh
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOL

sudo systemctl enable media-processor.service
sudo systemctl start media-processor.service
```

### Web Interface Service

```bash
sudo tee /etc/systemd/system/media-processor-ui.service > /dev/null << EOL
[Unit]
Description=Media Processor Web Interface
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=/home/sharvinzlife/Documents/JDownloader/web-app/api
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=PORT=3001
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

sudo systemctl enable media-processor-ui.service
sudo systemctl start media-processor-ui.service
```

## 📊 How It Works

1. **Monitoring**: The script continuously monitors your download directory for new media files
2. **Detection**: When a new file is found, it checks if it's a TV show or movie and identifies the language
3. **Processing**: The file is renamed, removing common prefixes and cleaning up the filename
4. **Organization**: Appropriate folder structures are created on your network storage
5. **Transfer**: The processed file is copied to the network storage in the correct folder
6. **Verification**: The script verifies the file was copied successfully
7. **Cleanup**: Original files, RAR files, and empty directories are immediately removed after verification

## 🔄 Media Organization Structure

```
Media Share
├── movies/                     # English movies
│   ├── Movie Title 1/
│   │   └── Movie Title 1.mkv
│   └── Movie Title 2/
│       └── Movie Title 2.mp4
├── tv-shows/                   # English TV shows
│   ├── Show Name 1/
│   │   ├── Show Name 1 S01E01.mkv
│   │   └── Show Name 1 S01E02.mkv
│   └── Show Name 2/
│       └── Show Name 2 S01E01.mp4
├── malayalam movies/           # Malayalam movies
│   └── Malayalam Movie Title/
│       └── Malayalam Movie Title.mkv
└── malayalam-tv-shows/         # Malayalam TV shows
    └── Malayalam Show/
        └── Malayalam Show S01E01.mkv
```

## 🌐 Web Interface Implementation

The web interface is built with a modern technology stack and follows industry best practices:

### Frontend
- **HTML5/CSS3**: Modern web standards for structure and styling
- **Bootstrap 5**: Responsive grid system and UI components
- **JavaScript (ES6+)**: Modern JavaScript for enhanced interactivity
- **Lottie Animations**: Vector animations for status indicators
- **LocalStorage API**: Persistent theme preferences and settings
- **Fetch API**: Asynchronous communication with the backend

### Backend API
- **Express.js**: Lightweight Node.js web framework
- **RESTful Architecture**: Clean API endpoints following REST principles
- **File System Operations**: Direct configuration file manipulation
- **Process Management**: Service control through systemd
- **Static File Serving**: Efficient delivery of frontend assets
- **Environment Variables**: Secure configuration management

### Web Interface Features
- **Dashboard**: View service status, processing statistics, and recent activity
- **Settings**: Configure SMB connections, paths, and processing options
- **Logs**: View detailed logs of the processor's activity
- **Media Paths**: Manage directory paths for different media types
- **Theme Switcher**: Toggle between light and dark modes with persistent preference
- **Responsive Design**: Adapts to any screen size from mobile to desktop
- **Service Controls**: Start, stop, and restart the service with one click

### Recent UI Improvements
- Added a sticky glassmorphism header that elegantly adapts when scrolling
- Enhanced theme toggle with improved visibility and contrast
- Implemented persistent theme preference using localStorage
- Optimized dark mode color palette for better readability
- Added subtle animations for state changes and interactions
- Improved mobile responsiveness for all screen sizes

Access the web interface at `http://your-server:3001` after starting the service.

## 💻 Development

### Frontend Development
```bash
# Start React development server
cd web-app
npm start
```

### Backend API Development
```bash
# Start API server in development mode
cd web-app/api
npm run dev
```

## 🐛 Troubleshooting

### Common Issues

```bash
# Check the log file for details
tail -f /home/sharvinzlife/media-processor.log

# Check service status
sudo systemctl status media-processor.service
sudo systemctl status media-processor-ui.service
```

- **Script Not Found**: Ensure you're in the correct directory `/home/sharvinzlife/Documents/JDownloader/`
- **SMB Connection Failures**: Verify server address, share name, and credentials
- **Permission Issues**: Ensure the user running the script has appropriate permissions
- **Missing Files**: Check that smbclient is installed (`sudo apt install smbclient`)
- **Web Interface Errors**: Check that Node.js is properly installed and the API server is running

## 🔐 Security Considerations

- The application requires sudo access to manage the systemd service
- API endpoints should be protected in a production environment
- Consider using HTTPS for production deployments
- Avoid storing sensitive credentials in plain text

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔄 Recent Updates

### 2023-10-17
- Implemented a modern web interface with real-time monitoring
- Added dark/light theme toggle with persistent preference
- Improved the UI with glassmorphism and sticky header

### 2023-10-16
- Enhanced RAR file cleanup to happen immediately after successful media processing
- Fixed various UI issues in both light and dark themes
- Added comprehensive documentation for the web interface

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 