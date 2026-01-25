#!/bin/bash

# ============================================================
# FIX NGINX TIMEOUT FOR LEAD GENERATION API (CORRECTED)
# ============================================================

echo "🔧 Fixing Nginx Timeout for Lead Generation"
echo "=============================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root or with sudo"
    exit 1
fi

# Backup existing config
echo "📦 Step 1: Backing up existing nginx config..."
cp /etc/nginx/sites-available/api.3vltn.com /etc/nginx/sites-available/api.3vltn.com.backup.$(date +%Y%m%d_%H%M%S)
echo "   ✅ Backup created"

# Update nginx config with proper timeouts and CORS
echo ""
echo "📝 Step 2: Updating nginx config with extended timeouts..."

cat > /etc/nginx/sites-available/api.3vltn.com << 'EOF'
server {
    listen 80;
    listen 443 ssl http2;
    server_name api.3vltn.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.3vltn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.3vltn.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    client_max_body_size 10M;

    # Handle OPTIONS preflight requests (must be first)
    location / {
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' $http_origin always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' '86400' always;
            add_header 'Content-Length' '0';
            add_header 'Content-Type' 'text/plain';
            return 204;
        }

        # CORS headers for all responses
        add_header 'Access-Control-Allow-Origin' $http_origin always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;

        # Proxy settings
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
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

    # Special location for lead generation (longer timeout)
    location /backend/leads/ {
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' $http_origin always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Max-Age' '86400' always;
            add_header 'Content-Length' '0';
            add_header 'Content-Type' 'text/plain';
            return 204;
        }

        # CORS headers
        add_header 'Access-Control-Allow-Origin' $http_origin always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;

        # Extended timeouts for lead generation
        proxy_pass http://127.0.0.1:5000/backend/leads/;
        proxy_http_version 1.1;
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;
        proxy_read_timeout 180s;
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
        add_header 'Access-Control-Allow-Origin' $http_origin always;
        proxy_pass http://127.0.0.1:5000/backend/health;
        proxy_set_header Host $host;
        access_log off;
    }

    access_log /var/log/nginx/api.3vltn.com.access.log;
    error_log /var/log/nginx/api.3vltn.com.error.log warn;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.3vltn.com;
    location / {
        return 301 https://$server_name$request_uri;
    }
}
EOF

echo "   ✅ Config updated with:"
echo "      - Lead generation timeout: 180 seconds"
echo "      - Other endpoints timeout: 60 seconds"
echo "      - Proper CORS headers"

# Test nginx config
echo ""
echo "🧪 Step 3: Testing nginx configuration..."
if nginx -t; then
    echo "   ✅ Nginx config is valid"
else
    echo "   ❌ Nginx config has errors!"
    echo ""
    echo "Restoring backup..."
    LATEST_BACKUP=$(ls -t /etc/nginx/sites-available/api.3vltn.com.backup.* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        cp "$LATEST_BACKUP" /etc/nginx/sites-available/api.3vltn.com
        echo "   ✅ Backup restored"
    fi
    exit 1
fi

# Reload nginx
echo ""
echo "🔄 Step 4: Reloading nginx..."
systemctl reload nginx
if [ $? -eq 0 ]; then
    echo "   ✅ Nginx reloaded successfully"
else
    echo "   ❌ Failed to reload nginx"
    exit 1
fi

echo ""
echo "=============================================="
echo "✅ Fix Applied Successfully!"
echo "=============================================="
echo ""
echo "📋 What was fixed:"
echo "   1. Lead generation endpoints now have 180s timeout"
echo "   2. CORS headers are properly configured"
echo "   3. Other endpoints keep 60s timeout"
echo ""
echo "🧪 Test again from frontend - it should work now!"
echo ""
