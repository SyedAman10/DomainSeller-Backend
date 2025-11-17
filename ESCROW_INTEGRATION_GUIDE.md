# 🔒 Escrow Integration Guide

## Overview

The DomainSeller-Backend now supports **automatic escrow payment link generation**! When a buyer asks for a payment link, the AI agent will automatically generate a secure Escrow.com payment link.

## How It Works

```
1. 👤 Buyer sends email: "How can I pay for this domain?"
2. 🤖 AI Agent detects payment request
3. 💰 System generates Escrow.com payment link
4. 📧 Email sent with secure payment link included
```

## Features

✅ **Automatic Detection** - AI detects when buyer wants to pay  
✅ **Secure Escrow** - Integration with Escrow.com API  
✅ **Manual Fallback** - Works even without API credentials  
✅ **Transaction Tracking** - All escrow transactions stored in database  
✅ **Flexible Fee Options** - Buyer pays, seller pays, or split 50/50  
✅ **Webhook Support** - Automatic status updates from Escrow.com

## Setup

### 1. Run Database Migration

```bash
# Connect to your database and run the migration
psql $NEON_DATABASE_URL -f database/add_escrow_support.sql
```

Or use the setup script:

```bash
node setup-escrow.js
```

### 2. Configure Environment Variables (Optional)

Add to your `.env` file:

```bash
# Escrow.com API Configuration (OPTIONAL - works without this)
ESCROW_API_URL=https://api.escrow.com/2017-09-01
ESCROW_EMAIL=your-email@example.com
ESCROW_API_KEY=your_escrow_api_key
```

**Note:** The system works **without** API credentials by generating manual Escrow.com links!

### 3. Connect User Escrow Account (Optional)

Users can connect their escrow account for API integration:

```bash
curl -X POST https://3vltn.com/backend/escrow/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 12,
    "escrowEmail": "seller@example.com",
    "escrowApiKey": "optional_api_key",
    "escrowProvider": "escrow.com"
  }'
```

## API Endpoints

### Connect Escrow Account

```bash
POST /backend/escrow/connect
{
  "userId": 12,
  "escrowEmail": "seller@example.com",
  "escrowApiKey": "optional",
  "escrowApiSecret": "optional",
  "escrowProvider": "escrow.com"
}
```

### Check Escrow Status

```bash
GET /backend/escrow/status/:userId
```

### Get Campaign Transactions

```bash
GET /backend/escrow/transactions/:campaignId
```

### Configure Campaign Escrow Settings

```bash
PUT /backend/escrow/campaign/:campaignId/settings
{
  "escrowEnabled": true,
  "escrowFeePayer": "buyer",  // "buyer", "seller", or "split"
  "askingPrice": 5000
}
```

### Disconnect Escrow Account

```bash
POST /backend/escrow/disconnect
{
  "userId": 12
}
```

## How Buyers Trigger Escrow Links

The AI automatically detects these buyer messages:

✅ "How can I pay?"  
✅ "Send me a payment link"  
✅ "I'm ready to buy"  
✅ "What's the payment process?"  
✅ "How do I purchase?"  
✅ "Can you send me the escrow link?"  
✅ "I want to proceed with payment"  

## Example Email Flow

### Buyer Email:
```
Hi, I'm interested in buying this domain. How can I pay for it?
```

### AI Response:
```
Hi John,

Great to hear you're ready to move forward! I'll send you the secure payment 
link right away.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 **SECURE PAYMENT LINK**

To complete your purchase securely through Escrow.com:

🔗 https://www.escrow.com/transaction/abc123

💰 Amount: $5,000 USD
🛡️ Protected by Escrow.com
📋 Escrow fees paid by buyer

Escrow.com ensures safe transfer - your payment is protected until you 
receive the domain.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
Your Name
```

## Database Schema

### New Tables

**escrow_transactions** - Tracks all escrow payments
- `transaction_id` - Escrow.com transaction ID
- `campaign_id` - Related campaign
- `buyer_email` - Buyer's email
- `domain_name` - Domain being sold
- `amount` - Sale price
- `status` - pending, funded, completed, cancelled
- `escrow_url` - Payment link

### New Columns

**users table:**
- `escrow_email` - User's escrow account email
- `escrow_enabled` - Whether escrow is connected
- `escrow_api_key` - API credentials (encrypted)
- `escrow_provider` - Provider name (default: escrow.com)

**campaigns table:**
- `escrow_enabled` - Enable escrow for this campaign
- `escrow_fee_payer` - Who pays fees (buyer/seller/split)
- `asking_price` - Domain asking price

## Testing

### Test Payment Link Generation

1. **Send test email to your campaign:**
```
Subject: Payment inquiry
Body: How can I pay for this domain?
```

2. **Check the AI response** - Should include escrow link

3. **Verify in database:**
```sql
SELECT * FROM escrow_transactions 
WHERE campaign_id = 'your_campaign_id';
```

### Test API Endpoints

```bash
# Check escrow status
curl https://3vltn.com/backend/escrow/status/12

# Get campaign transactions
curl https://3vltn.com/backend/escrow/transactions/campaign_123
```

## Configuration Options

### Per-Campaign Settings

```javascript
// Set asking price for campaign
PUT /backend/escrow/campaign/campaign_123/settings
{
  "askingPrice": 5000,
  "escrowFeePayer": "buyer",  // Options: "buyer", "seller", "split"
  "escrowEnabled": true
}
```

### Fee Payer Options

- **buyer** - Buyer pays all escrow fees (most common)
- **seller** - Seller pays all escrow fees
- **split** - Fees split 50/50

## Manual vs API Mode

### Manual Mode (No API Key)
- Generates pre-filled Escrow.com link
- Buyer completes transaction on Escrow.com
- No automatic status updates

### API Mode (With API Key)
- Creates transaction via Escrow.com API
- Automatic status tracking
- Webhook updates

**Both modes work great!** Manual mode is perfect for getting started.

## Webhooks (Optional)

Configure Escrow.com to send webhooks to:

```
https://3vltn.com/escrow/webhook
```

This enables automatic status updates when:
- Buyer funds the transaction
- Transaction completes
- Transaction is cancelled

## Troubleshooting

### Escrow link not appearing?

1. Check buyer's message contains payment keywords
2. Verify campaign has `asking_price` set
3. Check logs for escrow generation errors

### Want to customize the escrow section?

Edit the escrow section format in:
```
routes/inbound.js (lines ~257-267)
```

### Need different escrow provider?

The system is designed for Escrow.com but can be adapted. Contact support for custom integrations.

## Security Notes

🔒 **API Keys** - Store securely, never commit to git  
🔒 **Database** - Encrypt sensitive fields in production  
🔒 **HTTPS** - Always use SSL for API calls  
🔒 **Webhooks** - Verify signatures in production

## Support

Need help? Check:
- [Escrow.com API Docs](https://www.escrow.com/apidocs)
- [API Reference](./API_REFERENCE.md)
- [Setup Guide](./SETUP.md)

## What's Next?

✅ Escrow integration is ready!
✅ AI automatically sends payment links
✅ Works without API credentials
✅ Track all transactions in database

Your domain selling just got a whole lot easier! 🚀

