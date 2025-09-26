#!/bin/bash

# ===========================================
# VidFab AI Video Platform
# Redis Development Startup Script
# ===========================================

echo "🚀 Starting Redis for VidFab development..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Redis container already exists and is running
if docker ps -q -f name=vidfab-redis | grep -q .; then
    echo "✅ Redis container is already running"
    docker ps -f name=vidfab-redis --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "📦 Starting Redis container..."

    # Start Redis using Docker Compose
    docker-compose up -d redis

    if [ $? -eq 0 ]; then
        echo "✅ Redis started successfully!"
        echo "🔗 Redis is available at: localhost:6379"
        echo "🏥 Health check will run in 5 seconds..."

        # Wait for Redis to be ready
        sleep 5

        # Test connection
        if docker exec vidfab-redis redis-cli ping > /dev/null 2>&1; then
            echo "✅ Redis health check passed!"
        else
            echo "⚠️  Redis health check failed. Container may still be starting..."
        fi
    else
        echo "❌ Failed to start Redis container"
        exit 1
    fi
fi

echo ""
echo "📋 Redis Container Status:"
docker ps -f name=vidfab-redis --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "💡 Useful commands:"
echo "  - View logs: docker logs vidfab-redis -f"
echo "  - Stop Redis: docker-compose down"
echo "  - Redis CLI: docker exec -it vidfab-redis redis-cli"
echo "  - Start Redis Commander (GUI): docker-compose --profile debug up -d redis-commander"
echo "    Then visit: http://localhost:8081 (admin/admin123)"