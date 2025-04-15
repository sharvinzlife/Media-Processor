#!/bin/bash
#
# Build Frontend Script
# This script builds the React frontend and copies it to the web-app/build directory
#

echo "Building frontend from web-app-old directory..."

# Navigate to the web-app-old directory
cd web-app-old

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the React application
echo "Building React application..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo "ERROR: Build failed. No build directory found."
    exit 1
fi

# Remove the old build directory
echo "Removing old build directory..."
rm -rf ../web-app/build

# Copy the new build directory
echo "Copying new build files..."
cp -r build ../web-app/

# Return to the original directory
cd ..

echo "Frontend build completed successfully!"
echo "Restarting web interface service..."

# Restart the web interface service
sudo systemctl restart media-processor-web.service

echo "Done! The web interface should now be accessible at http://localhost:3001"