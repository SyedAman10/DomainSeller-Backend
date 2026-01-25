#!/bin/bash

# ============================================================
# COMPLETE FIX: Nginx Timeout + Check Current Config
# ============================================================

echo "🔧 Complete Fix for Lead Generation"
echo "====================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root or with sudo"
    exit 1
fi

# Step 1: Check current nginx config
echo "📋 Step 1: Checking current nginx configuration..."
echo ""
if [ -f /etc/nginx/sites-available/api.3vltn.com ]; then
    echo "Current proxy_read_timeout values:"
    grep -n "proxy_read_timeout" /etc/nginx/sites-available/api.3vltn.com || echo "   No timeout settings found"
    echo ""
else
    echo "   ❌ Config file not found!"
    exit 1
fi

# Step 2: Backup
echo "📦 Step 2: Backing up configuration..."
cp /etc/nginx/sites-available/api.3vltn.com /etc/nginx/sites-available/api.3vltn.com.backup.$(date +%Y%m%d_%H%M%S)
echo "   ✅ Backup created"
echo ""

# Step 3: Create new config with proper CORS and timeouts
echo "📝 Step 3: Writing new configuration..."

cat > /etc/nginx/sites-available/api.3vltn.com << 'ENDOFCONFIG'
# API subdomain configuration with CORS and extended timeouts
map $http_origin $cors_origin {
    default "";
    "~^https?://(localhost:3000|localhost:5173|3vltn\.com|www\.3vltn\.com|.*\.vercel\.app)$" $http_origin;
}

server {
    listen 443 ssl http2;
    server_name api.3vltn.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.3vltn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.3vltn.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Client settings
    client_max_body_size 10M;

    # CORS headers for all responses
    add_header 'Access-Control-Allow-Origin' $cors_origin always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;

    # Handle OPTIONS preflight globally
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' $cors_origin always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Max-Age' '86400' always;
        add_header 'Content-Length' '0';
        add_header 'Content-Type' 'text/plain';
        return 204;
    }

    # Special location for lead generation - EXTENDED TIMEOUT (3 minutes)
    location /backend/leads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        
        # EXTENDED TIMEOUTS for lead generation (180 seconds = 3 minutes)
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;
        proxy_read_timeout 180s;
        
        # Standard proxy headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin $http_origin;
        
        # Disable buffering for streaming responses
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    # Default location for all other endpoints - NORMAL TIMEOUT (60 seconds)
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        
        # Normal timeouts (60 seconds)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Standard proxy headers
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

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000/backend/health;
        proxy_set_header Host $host;
        access_log off;
    }

    # Logging
    access_log /var/log/nginx/api.3vltn.com.access.log;
    error_log /var/log/nginx/api.3vltn.com.error.log warn;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.3vltn.com;
    return 301 https://$server_name$request_uri;
}
ENDOFCONFIG

echo "   ✅ New configuration written"
echo ""

# Step 4: Test nginx config
echo "🧪 Step 4: Testing nginx configuration..."
nginx -t 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Nginx config is VALID"
else
    echo "   ❌ Nginx config has errors! Restoring backup..."
    LATEST_BACKUP=$(ls -t /etc/nginx/sites-available/api.3vltn.com.backup.* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        cp "$LATEST_BACKUP" /etc/nginx/sites-available/api.3vltn.com
        echo "   ✅ Backup restored"
    fi
    exit 1
fi
echo ""

# Step 5: Reload nginx
echo "🔄 Step 5: Reloading nginx..."
systemctl reload nginx
if [ $? -eq 0 ]; then
    echo "   ✅ Nginx reloaded successfully"
else
    echo "   ❌ Failed to reload nginx"
    systemctl status nginx
    exit 1
fi
echo ""

# Step 6: Verify the changes
echo "🔍 Step 6: Verifying timeout configuration..."
echo "Current timeout settings:"
grep "proxy_read_timeout" /etc/nginx/sites-available/api.3vltn.com
echo ""

# Step 7: Test CORS
echo "🧪 Step 7: Testing CORS headers..."
curl -I -X OPTIONS https://api.3vltn.com/backend/leads/generate \
  -H "Origin: https://3vltn.com" \
  -H "Access-Control-Request-Method: POST" 2>/dev/null | grep -i "access-control" | head -3
echo ""

echo "=============================================="
echo "✅ Configuration Applied Successfully!"
echo "=============================================="
echo ""
echo "📋 What changed:"
echo "   - /backend/leads/* endpoints: 180 second timeout ⏰"
echo "   - All other endpoints: 60 second timeout"
echo "   - CORS properly configured with map directive"
echo "   - OPTIONS preflight handled correctly"
echo ""
echo "🧪 Test from frontend now!"
echo ""
echo "📊 Monitor in real-time:"
echo "   pm2 logs node-backend --lines 50"
echo ""
