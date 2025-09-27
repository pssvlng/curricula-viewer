#!/bin/bash
set -e

# Wait for Virtuoso to start
echo "Waiting for Virtuoso to start..."
until curl -s http://localhost:8890/sparql > /dev/null; do
    sleep 5
done

echo "Virtuoso started, installing Conductor..."

# Install the Conductor VAD package
echo "Installing Conductor VAD package..."
isql 1111 dba dba << EOF
VAD_INSTALL('/opt/virtuoso-opensource/vad/conductor_dav.vad', 0);
shutdown;
EOF

echo "Conductor installed successfully"
