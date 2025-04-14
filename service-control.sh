#!/bin/bash

ACTION=$1
SERVICE_NAME="media-processor.service"

if [[ "$ACTION" != "start" && "$ACTION" != "stop" && "$ACTION" != "restart" ]]; then
  echo "Invalid action: $ACTION"
  echo "Usage: $0 [start|stop|restart]"
  exit 1
fi

echo "Controlling service: $SERVICE_NAME"
echo "Action: $ACTION"

# Execute the systemctl command
sudo systemctl $ACTION $SERVICE_NAME
exit $?
