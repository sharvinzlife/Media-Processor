# Media Processor Web Interface

A comprehensive web interface for managing, monitoring, and configuring the Media Processor service.

## Overview

The Media Processor Web Interface provides a user-friendly dashboard to control the Media Processor script, which automates the organization and transfer of media files from JDownloader to an SMB share. This web application makes it easy to monitor the service status, view logs, and configure settings without editing the script directly.

## Features

- **Real-time Dashboard**: Monitor the status of the Media Processor service, including uptime and activity
- **Easy Configuration**: Update all settings including SMB credentials, paths, and processing options
- **Log Viewer**: View the most recent logs to troubleshoot issues
- **Service Control**: Start, stop, or restart the Media Processor service directly from the web interface
- **Responsive Design**: Works on desktops, tablets, and mobile devices
- **API Integration**: RESTful API for seamless integration with other applications

## Technical Stack

**Frontend:**
- React
- Material UI
- Framer Motion (animations)
- Lottie Animations

**Backend:**
- Express.js
- Node.js

## Installation

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- The Media Processor script already set up
- sudo privileges for service management

### Frontend Setup

```bash
cd web-app
npm install
npm run build
```

### Backend Setup

```bash
cd web-app/api
npm install
```

## Development

To start the React development server:

```bash
cd web-app
npm start
```

To start the API server:

```bash
cd web-app/api
node server.js
```

## Deployment

### Setting up as a systemd service

Create a file at `/etc/systemd/system/media-processor-web.service` with the following content:

```
[Unit]
Description=Media Processor Web Interface
After=network.target

[Service]
WorkingDirectory=/home/sharvinzlife/Documents/JDownloader/web-app/api
ExecStart=/usr/bin/node server.js
Restart=always
User=sharvinzlife
Environment=PORT=3001
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then enable and start the service:

```bash
sudo systemctl enable media-processor-web.service
sudo systemctl start media-processor-web.service
```

## Security Considerations

- The web interface requires sudo access to control the media-processor service
- API endpoints should be protected if exposed outside your local network
- Consider using HTTPS if deployed over the internet
- Avoid storing sensitive credentials in plain text

## License

This project is licensed under the MIT License - see the LICENSE file for details. 