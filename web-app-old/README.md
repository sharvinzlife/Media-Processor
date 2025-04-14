# 🎬 Media Processor Web Interface

> A modern web interface for the Media Processor automation tool

## 📋 Overview

This web application provides a user-friendly interface to manage, monitor, and configure the Media Processor service. It allows you to control the service, view logs, and customize settings through an intuitive UI.

## ✨ Features

- **📊 Real-time Dashboard**: Monitor service status and processing statistics
- **⚙️ Easy Configuration**: Manage SMB connections and media paths without editing files
- **📝 Log Viewer**: View and filter logs directly in the browser
- **🔄 Service Control**: Start, stop, and restart the service with one click
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🔌 API Integration**: Connects seamlessly with the Media Processor backend

## 🛠️ Technical Stack

- **Frontend**: React, Material UI, Framer Motion, Lottie Animations
- **Backend**: Express.js, Node.js
- **Communication**: RESTful API
- **Styling**: CSS-in-JS with Emotion

## 📦 Installation

### Prerequisites
- Node.js 14+ and npm installed
- Media Processor script (media-processor.sh) properly configured
- Appropriate permissions to manage systemd services

### Frontend Setup
```bash
# Navigate to the web-app directory
cd web-app

# Install dependencies
npm install

# Build for production
npm run build
```

### Backend Setup
```bash
# Navigate to the API directory
cd web-app/api

# Install dependencies
npm install

# Start the API server
npm start
```

## 💻 Development

```bash
# Start React development server
cd web-app
npm start

# In another terminal, start the API server
cd web-app/api
npm run dev
```

## 🚀 Deployment

For production deployment, you can set up the application to run as a service:

```bash
# Create systemd service file
sudo nano /etc/systemd/system/media-processor-ui.service
```

Add the following content:

```ini
[Unit]
Description=Media Processor Web Interface
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/web-app/api
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=PORT=3001
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable media-processor-ui.service
sudo systemctl start media-processor-ui.service
```

## 🔐 Security Considerations

- The application requires sudo access to manage the systemd service
- API endpoints should be protected in a production environment
- Consider using HTTPS for production deployments
- Avoid storing sensitive credentials in plain text

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 