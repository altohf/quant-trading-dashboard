#!/bin/bash
# ============================================================
# Quant Trading Dashboard - DigitalOcean Deployment Script
# ============================================================
# This script sets up a fresh Ubuntu droplet for the trading dashboard
# Run as root or with sudo privileges
# ============================================================

set -e

echo "=============================================="
echo "Quant Trading Dashboard - Server Setup"
echo "=============================================="

# Update system
echo "[1/8] Updating system packages..."
apt-get update && apt-get upgrade -y

# Install Node.js 22
echo "[2/8] Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install pnpm
echo "[3/8] Installing pnpm..."
npm install -g pnpm

# Install PM2 for process management
echo "[4/8] Installing PM2..."
npm install -g pm2

# Install Nginx
echo "[5/8] Installing Nginx..."
apt-get install -y nginx

# Install Git
echo "[6/8] Installing Git..."
apt-get install -y git

# Create app directory
echo "[7/8] Setting up application directory..."
mkdir -p /var/www/quant-dashboard
cd /var/www/quant-dashboard

# Clone repository
echo "[8/8] Cloning repository..."
git clone https://github.com/altohf/quant-trading-dashboard.git .

echo "=============================================="
echo "Base setup complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Create .env file with your environment variables"
echo "2. Run: pnpm install"
echo "3. Run: pnpm build"
echo "4. Run: pm2 start dist/index.js --name quant-dashboard"
echo "5. Configure Nginx (see nginx.conf in deploy folder)"
echo ""
