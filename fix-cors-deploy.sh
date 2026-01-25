#!/bin/bash

# ============================================================
# CORS FIX DEPLOYMENT SCRIPT
# ============================================================
# This script fixes the CORS issue on api.3vltn.com
# Run this on your production server as root or with sudo
# ============================================================

echo "🔧 CORS Fix Deployment Script"
echo "================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root or with sudo"
    exit 1
fi

# Step 1: Backup existing nginx config
echo "📦 Step 1: Backing up existing nginx config..."
if [ -f /etc/nginx/sites-available/api.3vltn.com ]; then
    cp /etc/nginx/sites-available/api.3vltn.com /etc/nginx/sites-available/api.3vltn.com.backup.$(date +%Y%m%d_%H%M%S)
    echo "   ✅ Backup created"
else
    echo "   ℹ️ No existing config found, creating new one"
fi

# Step 2: Copy new nginx config
echo ""
echo "📝 Step 2: Installing new nginx config..."
cat > /etc/nginx/sites-available/api.3vltn.com << 'EOF'
server {
    listen 80;
    listen 443 ssl http2;
    server_name api.3vltn.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.3vltn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.3vltn.com/privkey.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Allowed Origins for CORS
    set $cors_origin "";
    
    if ($http_origin ~* (https?://(localhost:3000|localhost:5173|3vltn\.com|www\.3vltn\.com|.*\.vercel\.app))) {
        set $cors_origin $http_origin;
    }

    # CORS Headers
    add_header 'Access-Control-Allow-Origin' $cors_origin always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Max-Age' '86400' always;

    # Handle OPTIONS preflight
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' $cors_origin always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Max-Age' '86400' always;
        add_header 'Content-Length' '0';
        add_header 'Content-Type' 'text/plain charset=UTF-8';
        return 204;
    }

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin $http_origin;
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://127.0.0.1:5000/backend/health;
        proxy_set_header Host $host;
        access_log off;
    }

    access_log /var/log/nginx/api.3vltn.com.access.log;
    error_log /var/log/nginx/api.3vltn.com.error.log warn;
}

server {
    listen 80;
    server_name api.3vltn.com;
    location / {
        return 301 https://$server_name$request_uri;
    }
}
EOF

echo "   ✅ Config file created"

# Step 3: Enable site (create symlink if doesn't exist)
echo ""
echo "🔗 Step 3: Enabling site..."
if [ ! -L /etc/nginx/sites-enabled/api.3vltn.com ]; then
    ln -s /etc/nginx/sites-available/api.3vltn.com /etc/nginx/sites-enabled/api.3vltn.com
    echo "   ✅ Symlink created"
else
    echo "   ℹ️ Site already enabled"
fi

# Step 4: Test nginx configuration
echo ""
echo "🧪 Step 4: Testing nginx configuration..."
if nginx -t; then
    echo "   ✅ Nginx config is valid"
else
    echo "   ❌ Nginx config has errors!"
    echo "   Restoring backup..."
    if [ -f /etc/nginx/sites-available/api.3vltn.com.backup.* ]; then
        cp /etc/nginx/sites-available/api.3vltn.com.backup.* /etc/nginx/sites-available/api.3vltn.com
    fi
    exit 1
fi

# Step 5: Reload nginx
echo ""
echo "🔄 Step 5: Reloading nginx..."
systemctl reload nginx
if [ $? -eq 0 ]; then
    echo "   ✅ Nginx reloaded successfully"
else
    echo "   ❌ Failed to reload nginx"
    exit 1
fi

# Step 6: Check if backend is running
echo ""
echo "🔍 Step 6: Checking backend status..."
if systemctl is-active --quiet node-backend || pm2 list | grep -q "node-backend.*online"; then
    echo "   ✅ Backend is running"
else
    echo "   ⚠️ Backend might not be running"
    echo "   Start it with: pm2 start ecosystem.config.js"
fi

# Step 7: Test CORS
echo ""
echo "🧪 Step 7: Testing CORS..."
curl -I -X OPTIONS https://api.3vltn.com/backend/leads/generate \
    -H "Origin: https://3vltn.com" \
    -H "Access-Control-Request-Method: POST" \
    2>/dev/null | grep -i "access-control" || echo "   ⚠️ No CORS headers found"

echo ""
echo "================================"
echo "✅ CORS Fix Deployed!"
echo "================================"
echo ""
echo "📋 What was fixed:"
echo "   1. Added proper CORS headers to nginx"
echo "   2. Configured OPTIONS preflight handling"
echo "   3. Allowed origin: https://3vltn.com"
echo ""
echo "🧪 Test the fix:"
echo "   Open https://3vltn.com and try the lead generation feature"
echo ""
echo "📊 Monitor logs:"
echo "   sudo tail -f /var/log/nginx/api.3vltn.com.error.log"
echo "   pm2 logs node-backend"
echo ""
