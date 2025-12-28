#!/bin/bash

# ESDS Cloud Deployment Script for Money Track
# Run this script on your ESDS server after cloning the repository

echo "🚀 Starting ESDS Deployment for Money Track..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Check Node.js version
NODE_VERSION=$(node -v)
echo "✅ Node.js version: $NODE_VERSION"

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create it with your environment variables."
    echo "Required variables:"
    echo "  - DATABASE_URL"
    echo "  - GROQ_API_KEY"
    echo "  - SESSION_SECRET (optional)"
    echo "  - NODE_ENV=production"
    echo "  - PORT=3000"
    exit 1
fi

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 stop money-track 2>/dev/null || true
pm2 delete money-track 2>/dev/null || true
pm2 start dist/server/node-build.mjs --name money-track
pm2 save

# Setup PM2 startup script
echo "⚙️  Setting up PM2 startup script..."
pm2 startup

echo "✅ Deployment complete!"
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "📝 View logs: pm2 logs money-track"
echo "🔄 Restart app: pm2 restart money-track"
echo "🛑 Stop app: pm2 stop money-track"

