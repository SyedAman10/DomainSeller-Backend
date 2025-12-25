#!/bin/bash
# Quick Deployment Script
# Usage: ./deploy.sh

echo ""
echo "============================================================"
echo "🚀 DEPLOYING DOMAINSELLER BACKEND"
echo "============================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo -e "${RED}✗ Error: server.js not found!${NC}"
    echo "  Please run this script from the project root directory"
    exit 1
fi

# Step 1: Pull latest code
echo -e "${YELLOW}→ Pulling latest code...${NC}"
git pull
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Git pull failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Step 2: Install dependencies (if package.json changed)
echo -e "${YELLOW}→ Checking dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies up to date${NC}"
echo ""

# Step 3: Run database migrations
echo -e "${YELLOW}→ Running database migrations...${NC}"
npm run migrate
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Migration failed!${NC}"
    echo "  Please check the error above and fix before continuing"
    exit 1
fi
echo -e "${GREEN}✓ Migrations complete${NC}"
echo ""

# Step 4: Restart PM2
echo -e "${YELLOW}→ Restarting backend...${NC}"
pm2 restart node-backend
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ PM2 restart failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend restarted${NC}"
echo ""

# Step 5: Wait for server to start
echo -e "${YELLOW}→ Waiting for server to start...${NC}"
sleep 3

# Step 6: Health check
echo -e "${YELLOW}→ Running health check...${NC}"
HEALTH_CHECK=$(curl -s https://api.3vltn.com/backend/health)
if echo "$HEALTH_CHECK" | grep -q "OK"; then
    echo -e "${GREEN}✓ Server is healthy!${NC}"
else
    echo -e "${RED}✗ Health check failed!${NC}"
    echo "  Response: $HEALTH_CHECK"
    exit 1
fi
echo ""

# Step 7: Test referral endpoint
echo -e "${YELLOW}→ Testing referral system...${NC}"
REFERRAL_CHECK=$(curl -s https://api.3vltn.com/backend/referrals/validate/SUPER2025)
if echo "$REFERRAL_CHECK" | grep -q "success"; then
    echo -e "${GREEN}✓ Referral system working!${NC}"
else
    echo -e "${YELLOW}⚠ Referral endpoint returned unexpected response${NC}"
    echo "  Response: $REFERRAL_CHECK"
fi
echo ""

# Summary
echo "============================================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "============================================================"
echo ""
echo "Next steps:"
echo "  1. Check PM2 logs: pm2 logs node-backend --lines 50"
echo "  2. Test Stripe approval: Visit approval email link"
echo "  3. Configure Mailgun webhook (if not done)"
echo ""
echo "Useful commands:"
echo "  pm2 status           - Check PM2 status"
echo "  pm2 logs node-backend - View logs"
echo "  npm run migrate:status - Check migrations"
echo ""
echo "🎉 Happy selling!"
echo ""

