#!/bin/bash

# ============================================================
# FINAL CORS FIX: Remove Nginx CORS (Let Backend Handle It)
# ============================================================

echo "🔧 Fixing Duplicate CORS Headers"
echo "================================="
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root or with sudo"
    exit 1
fi

echo "📦 Backing up configuration..."
cp /etc/nginx/sites-available/api.3vltn.com /etc/nginx/sites-available/api.3vltn.com.backup.$(date +%Y%m%d_%H%M%S)
echo "   ✅ Backup created"
echo ""

echo "📝 Writing nginx config (NO CORS headers - backend handles it)..."

cat > /etc/nginx/sites-available/api.3vltn.com << 'ENDOFCONFIG'
server {
    listen 443 ssl http2;
    server_name api.3vltn.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.3vltn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.3vltn.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    client_max_body_size 10M;

    # Special location for lead generation - EXTENDED TIMEOUT
    location /backend/leads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        
        # EXTENDED TIMEOUTS for lead generation (180 seconds)
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
        
        # Let backend handle CORS (don't add nginx CORS headers)
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    # Default location for all other endpoints
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
        
        # Let backend handle CORS
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000/backend/health;
        proxy_set_header Host $host;
        access_log off;
    }

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

echo "   ✅ Configuration written (NO CORS headers from nginx)"
echo ""

echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "   ✅ Config is VALID!"
else
    echo "   ❌ Config has errors. Restoring backup..."
    LATEST_BACKUP=$(ls -t /etc/nginx/sites-available/api.3vltn.com.backup.* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        cp "$LATEST_BACKUP" /etc/nginx/sites-available/api.3vltn.com
    fi
    exit 1
fi
echo ""

echo "🔄 Reloading nginx..."
systemctl reload nginx
if [ $? -eq 0 ]; then
    echo "   ✅ Nginx reloaded!"
else
    echo "   ❌ Failed to reload"
    exit 1
fi
echo ""

echo "================================="
echo "✅ CORS FIX APPLIED!"
echo "================================="
echo ""
echo "📋 What changed:"
echo "   - Removed ALL CORS headers from nginx"
echo "   - Backend handles CORS (already configured)"
echo "   - No more duplicate headers!"
echo "   - Lead endpoints: 180s timeout ✅"
echo ""
echo "🧪 Test from frontend - it should work now!"
echo ""
