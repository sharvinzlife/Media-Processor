#!/bin/bash
echo "Checking Media Processor UI service..."
SERVICE_STATUS=$(systemctl is-active media-processor-ui.service)
if [ "$SERVICE_STATUS" = "active" ]; then
  echo "✅ Service is running"
else
  echo "❌ Service is not running"
fi

echo "Checking web server response..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
if [ "$RESPONSE" = "200" ]; then
  echo "✅ Web server is responding"
else
  echo "❌ Web server is not responding (HTTP $RESPONSE)"
fi

# Check diagnostics sudo permissions
echo "Checking diagnostics permissions..."
if sudo -n systemctl status media-processor.service &>/dev/null; then
  echo "✅ Sudo diagnostics permissions are configured"
else
  echo "❌ Sudo diagnostics permissions are NOT configured"
  echo "  Run 'sudo ./setup-diagnostics-sudo.sh' to fix this issue"
fi
