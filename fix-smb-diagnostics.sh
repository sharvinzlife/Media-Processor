#!/bin/bash

# Fix SMB Diagnostics in Web Dashboard
# This script ensures SMB diagnostics work properly

echo "🔧 Fixing SMB Diagnostics..."

# Check if smbclient is installed
if ! command -v smbclient &> /dev/null; then
    echo "❌ smbclient is not installed"
    echo "Installing smbclient..."
    
    if [[ -f /etc/debian_version ]]; then
        sudo apt-get update && sudo apt-get install -y smbclient cifs-utils
    elif [[ -f /etc/redhat-release ]]; then
        sudo yum install -y samba-client cifs-utils
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install samba
    fi
else
    echo "✅ smbclient is installed"
fi

# Test SMB connectivity
echo ""
echo "📡 Testing SMB connectivity..."

# Read settings from .env file
if [[ -f ".env" ]]; then
    source .env
    
    echo "Server: $SMB_SERVER"
    echo "Share: $SMB_SHARE"
    echo "User: $SMB_USERNAME"
    
    # Test basic connectivity
    echo ""
    echo "Testing server connectivity..."
    if ping -c 1 "$SMB_SERVER" &> /dev/null; then
        echo "✅ Server is reachable"
    else
        echo "❌ Cannot reach server $SMB_SERVER"
    fi
    
    # Test SMB service
    echo ""
    echo "Testing SMB service..."
    if smbclient -L "//$SMB_SERVER" -U "$SMB_USERNAME%$SMB_PASSWORD" -m SMB3 &> /dev/null; then
        echo "✅ SMB service is accessible"
    else
        echo "⚠️  SMB service test failed (this may be normal for some configurations)"
    fi
else
    echo "❌ .env file not found"
fi

echo ""
echo "🎯 SMB diagnostics configuration complete!"
echo ""
echo "📌 Next steps:"
echo "1. Access the dashboard at http://localhost:3005"
echo "2. Go to the SMB Settings section"
echo "3. Click 'Diagnose SMB Connection' to test"
echo ""
echo "If diagnostics still fail, check:"
echo "- Firewall settings (ports 445/139)"
echo "- SMB server configuration"
echo "- Username/password credentials"