#!/bin/bash

# VidFab AI Video Platform - Docker Logs Script
# Author: VidFab Team
# Description: View Docker container logs

set -e

echo "🐳 VidFab Docker Logs Viewer"
echo ""

# Check if any arguments are passed
if [ $# -eq 0 ]; then
    echo "📋 Available services:"
    docker compose ps --services 2>/dev/null | while read -r service; do
        echo "   - $service"
    done
    echo ""
    echo "💡 Usage:"
    echo "   ./scripts/docker-logs.sh [service_name] [options]"
    echo ""
    echo "📝 Examples:"
    echo "   ./scripts/docker-logs.sh app              # View app logs"
    echo "   ./scripts/docker-logs.sh app -f           # Follow app logs"
    echo "   ./scripts/docker-logs.sh redis            # View Redis logs"
    echo "   ./scripts/docker-logs.sh                  # Show all logs"
    echo ""

    # Show all logs by default
    echo "📊 Showing logs from all services (last 50 lines):"
    docker compose logs --tail=50
else
    SERVICE_NAME=$1
    shift  # Remove service name from arguments

    echo "📊 Showing logs for service: $SERVICE_NAME"
    echo "🔄 Press Ctrl+C to exit"
    echo ""

    # Pass remaining arguments to docker compose logs
    docker compose logs "$@" "$SERVICE_NAME"
fi