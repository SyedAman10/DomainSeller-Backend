#!/bin/bash

# ============================================================
# GODADDY API CONNECTION TEST SCRIPT
# ============================================================
# Purpose: Test your GoDaddy API credentials before connecting
# Usage: ./test-godaddy-api.sh
# ============================================================

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "============================================================"
echo -e "${CYAN}🔑 GODADDY API CONNECTION TEST${NC}"
echo "============================================================"
echo ""

# Prompt for API credentials
echo -e "${YELLOW}Enter your GoDaddy API credentials:${NC}"
echo ""
read -p "API Key: " API_KEY
read -p "API Secret: " API_SECRET

if [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
    echo ""
    echo -e "${RED}❌ Error: API Key and Secret are required${NC}"
    exit 1
fi

echo ""
echo "============================================================"
echo -e "${BLUE}🔍 Testing connection to GoDaddy API...${NC}"
echo "============================================================"
echo ""

# Test the API
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "https://api.godaddy.com/v1/domains" \
  -H "Authorization: sso-key ${API_KEY}:${API_SECRET}" \
  -H "Accept: application/json")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

# Extract response body (all but last line)
BODY=$(echo "$RESPONSE" | head -n-1)

echo -e "${CYAN}HTTP Status Code: ${HTTP_CODE}${NC}"
echo ""

# Check response
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ SUCCESS! Your GoDaddy API credentials are valid!${NC}"
    echo ""
    
    # Parse domain count
    DOMAIN_COUNT=$(echo "$BODY" | grep -o '"domain"' | wc -l)
    
    echo -e "${CYAN}📊 Account Information:${NC}"
    echo "   Domains Found: $DOMAIN_COUNT"
    echo ""
    
    if [ "$DOMAIN_COUNT" -gt 0 ]; then
        echo -e "${CYAN}📋 Your Domains:${NC}"
        # Pretty print domains (requires jq if available)
        if command -v jq &> /dev/null; then
            echo "$BODY" | jq -r '.[] | "   - \(.domain) (\(.status))"'
        else
            echo "$BODY" | grep -o '"domain":"[^"]*"' | sed 's/"domain":"//g' | sed 's/"//g' | sed 's/^/   - /'
        fi
    else
        echo -e "${YELLOW}⚠️  No domains found in this GoDaddy account${NC}"
        echo "   Add domains to your account first"
    fi
    
    echo ""
    echo "============================================================"
    echo -e "${GREEN}🎉 You can now connect this account in DomainSeller!${NC}"
    echo "============================================================"
    
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${RED}❌ AUTHENTICATION FAILED (401)${NC}"
    echo ""
    echo -e "${YELLOW}Problem:${NC} Your API key or secret is incorrect"
    echo ""
    echo -e "${CYAN}Solutions:${NC}"
    echo "   1. Double-check your API Key and Secret for typos"
    echo "   2. Make sure you copied the ENTIRE key and secret"
    echo "   3. Verify no extra spaces were copied"
    echo "   4. Create a new API key at: https://developer.godaddy.com/keys"
    
elif [ "$HTTP_CODE" = "403" ]; then
    echo -e "${RED}❌ ACCESS DENIED (403)${NC}"
    echo ""
    echo -e "${YELLOW}Problem:${NC} Your credentials don't have permission or are for the wrong environment"
    echo ""
    echo -e "${CYAN}Most Common Issue:${NC}"
    echo "   You're using OTE/TEST keys instead of PRODUCTION keys"
    echo ""
    echo -e "${CYAN}Solutions:${NC}"
    echo "   1. Create PRODUCTION keys at: https://developer.godaddy.com/keys"
    echo "   2. Select 'Production' environment (NOT OTE)"
    echo "   3. Enable 'Domain' permissions"
    echo "   4. Make sure your GoDaddy account has active domains"
    echo ""
    echo -e "${CYAN}Error Details:${NC}"
    echo "$BODY" | head -c 500
    
elif [ "$HTTP_CODE" = "429" ]; then
    echo -e "${RED}❌ RATE LIMIT EXCEEDED (429)${NC}"
    echo ""
    echo -e "${YELLOW}Problem:${NC} Too many API requests"
    echo ""
    echo -e "${CYAN}Solution:${NC}"
    echo "   Wait a few minutes before trying again"
    
else
    echo -e "${RED}❌ UNEXPECTED ERROR (${HTTP_CODE})${NC}"
    echo ""
    echo -e "${CYAN}Response:${NC}"
    echo "$BODY" | head -c 500
    echo ""
    echo ""
    echo -e "${CYAN}Troubleshooting:${NC}"
    echo "   1. Check your internet connection"
    echo "   2. Verify GoDaddy API is not down: https://status.godaddy.com"
    echo "   3. Try creating new API credentials"
fi

echo ""
echo "============================================================"
echo -e "${CYAN}📚 Resources:${NC}"
echo "   - Create API Keys: https://developer.godaddy.com/keys"
echo "   - API Docs: https://developer.godaddy.com/doc/endpoint/domains"
echo "   - Setup Guide: ./GODADDY_API_SETUP.md"
echo "============================================================"
echo ""
