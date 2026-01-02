#!/bin/bash

# Raven Docs Quick Setup Script
# This script helps you get Raven Docs running quickly with Docker

set -e

echo "🚀 Raven Docs Quick Setup"
echo "====================="
echo ""

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "Checking prerequisites..."
check_command docker
check_command docker-compose
echo "✅ All prerequisites met!"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    
    # Generate APP_SECRET if not already set
    if grep -q "your_secret_here" .env; then
        echo "🔐 Generating secure APP_SECRET..."
        SECRET=$(openssl rand -hex 32)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/your_secret_here/$SECRET/" .env
        else
            # Linux
            sed -i "s/your_secret_here/$SECRET/" .env
        fi
    fi
    
    echo "⚠️  Please edit .env to configure your database passwords!"
    echo "   Press Enter when ready to continue..."
    read
else
    echo "✅ .env file already exists"
fi

# Start services
echo ""
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Exit"; then
    echo "❌ Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi

echo ""
echo "✅ Services started successfully!"
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
docker-compose exec -T raven-docs pnpm migration:latest || {
    echo "⚠️  Migrations might have already been run or there was an error."
    echo "   Check the logs if you encounter issues."
}

echo ""
echo "🎉 Raven Docs is ready!"
echo "=================================="
echo ""
echo "📍 Access Raven Docs at: http://localhost:3000"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart services: docker-compose restart"
echo "   - Update Raven Docs: docker-compose pull && docker-compose up -d"
echo ""
echo "📚 For more information, visit: https://raven-docs.local/docs"
echo ""
echo "💡 First time? Create your admin account at http://localhost:3000/auth/setup"