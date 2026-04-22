#!/bin/bash

# Default port
PORT=7777

# Check if port argument is provided
if [ $# -gt 0 ]; then
  PORT=$1
fi

# Check if port is a valid number
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
  echo "Error: Port must be a number"
  echo "Usage: $0 [port]"
  echo "Example: $0 8080"
  exit 1
fi

# Check if port is in valid range
if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
  echo "Error: Port must be between 1 and 65535"
  exit 1
fi

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Error: Port $PORT is already in use"
  echo "Please choose a different port or stop the process using this port"
  exit 1
fi

echo "Starting web server on port $PORT..."
echo "Open your browser and go to: http://localhost:$PORT"
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
cd web_visu
python3 -m http.server $PORT

