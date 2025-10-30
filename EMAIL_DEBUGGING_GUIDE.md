# Email Debugging Guide

Complete guide to understanding email sending logs and troubleshooting issues.

---

## 🎯 What Was Added

### 1. **Email Sending Detailed Logs** (`services/emailService.js`)
Every email attempt now logs:
- ✅ Recipient information
- ✅ Email subject and content size
- ✅ Mailgun configuration (domain, from address)
- ✅ Sandbox domain warnings
- ✅ Success messages with Mailgun message IDs
- ✅ Detailed error messages with HTTP status codes
- ✅ Specific solutions for each error type

### 2. **Scheduled Email Processor Logs** (`services/emailQueue.js`)
The cron job now provides:
- ✅ Processor start/stop notifications
- ✅ Complete list of emails to be sent
- ✅ Individual email processing status
- ✅ Database update confirmations
- ✅ Success/failure summary statistics
- ✅ Detailed error messages for failures

---

## 📊 Log Examples

### Startup Logs

When your server starts, you'll see:

```
════════════════════════════════════════════════════════════
🚀 EMAIL QUEUE PROCESSOR - STARTING
════════════════════════════════════════════════════════════
📅 Cron Schedule: */5 * * * *
⏰ Interval: Every 5 minutes
🔄 First run: In 5 seconds
📧 Will check for scheduled emails and send automatically
════════════════════════════════════════════════════════════
```

### Successful Email Send

```
============================================================
📧 SENDING EMAIL
⏰ Time: 2025-10-30T14:22:00.000Z
📨 To: buyer@example.com
📝 Subject: Why example.com is perfect for you
🏷️  Tags: campaign-123, scheduled
🌐 Mailgun Domain: sandbox123.mailgun.org
📮 From: noreply@sandbox123.mailgun.org
============================================================
📄 Content: HTML (523 characters)
🚀 Sending request to Mailgun API...
✅ SUCCESS! Email sent to buyer@example.com
📬 Message ID: <20251030142200.abc123@sandbox.mailgun.org>
💬 Mailgun Response: Queued. Thank you.
============================================================
```

### Failed Email Send

```
============================================================
❌ FAILED to send email to buyer@example.com
🔴 Error Type: AxiosError
📡 HTTP Status: 403
💬 Mailgun Message: Forbidden
📋 Full Response: {
  "message": "Free accounts are for test purposes only. Please verify your account."
}
🚫 FORBIDDEN: Check domain authorization or sandbox recipient list

💡 POSSIBLE SOLUTIONS:
   1. Using sandbox domain? Add recipient to authorized list
   2. Visit: https://app.mailgun.com/app/sending/domains
   3. Or upgrade to a verified domain
============================================================
```

### Processor Summary

```
════════════════════════════════════════════════════════════
✅ SCHEDULED EMAIL PROCESSING COMPLETE
📊 Summary:
   ✅ Successful: 3
   ❌ Failed: 1
   📧 Total: 4
════════════════════════════════════════════════════════════
```

---

## 🔍 How to Debug Issues

### Step 1: Check if Email Queue is Running

Look for this in your console when server starts:
```
🚀 EMAIL QUEUE PROCESSOR - STARTING
```

If you don't see it, the queue isn't starting.

### Step 2: Check Scheduled Emails

```bash
curl http://localhost:5000/api/campaigns/YOUR_CAMPAIGN_ID/scheduled
```

Look for:
- `status`: Should be `"pending"` for emails waiting to send
- `scheduled_for`: Should be a future time
- `send_status`: Shows `"ready"`, `"soon"`, or `"waiting"`

### Step 3: Watch the Console Logs

When the cron runs (every 5 minutes), you'll see:
```
════════════════════════════════════════════════════════════
🔄 SCHEDULED EMAIL PROCESSOR - RUNNING
```

This will show you:
1. How many emails found
2. Details of each email
3. Success or failure for each
4. Final summary

### Step 4: Identify the Error

Common errors and their meanings:

| HTTP Status | Error | Meaning | Solution |
|-------------|-------|---------|----------|
| 403 | Forbidden | Sandbox domain, recipient not authorized | Add recipient to authorized list |
| 401 | Unauthorized | Invalid API key | Check MAILGUN_API_KEY in .env |
| 400 | Bad Request | Invalid email format or parameters | Check email address format |
| 404 | Not Found | Domain doesn't exist | Verify MAILGUN_DOMAIN setting |

---

## 🐛 Common Issues & Solutions

### Issue: Emails Stay in "pending" Status

**Symptoms:**
- Status never changes from `"pending"`
- No logs in console

**Cause:** Email queue processor not running

**Solution:**
1. Check server logs for processor startup message
2. Restart your server
3. Verify `startEmailQueue()` is called in `server.js`

---

### Issue: Emails Marked as "failed"

**Symptoms:**
- Status changes to `"failed"`
- Error logs in console

**Cause:** Mailgun API returned an error OR database constraint violation

**Solution:**
1. Read the console error logs
2. Check the HTTP status code
3. Follow the suggested solutions in the logs
4. Common fix: Add recipient to sandbox authorized list

---

### Issue: Duplicate Key Constraint Error

**Symptoms:**
```
duplicate key value violates unique constraint "sent_emails_user_id_campaign_id_buyer_id_key"
```

**Cause:** The system tried to insert a duplicate record into `sent_emails` table for the same user, campaign, and buyer combination.

**Solution:**
✅ **Already Fixed!** The code now uses `ON CONFLICT DO UPDATE` to handle duplicates gracefully.

If you still see this error:
1. This means the email was already sent before
2. The record will be updated with the new information
3. This is safe to ignore - the email won't be sent twice

**What was changed:**
- `INSERT` statements now use `ON CONFLICT (user_id, campaign_id, buyer_id) DO UPDATE`
- Duplicate entries update the existing record instead of failing
- No more constraint violation errors

---

### Issue: Sandbox Domain Restrictions

**Symptoms:**
```
⚠️  WARNING: Using Mailgun SANDBOX domain!
⚠️  Recipient must be in authorized recipients list
```

**Solution Option 1: Add Authorized Recipients (Quick)**
1. Visit: https://app.mailgun.com/app/sending/domains
2. Click your sandbox domain
3. Go to "Authorized Recipients"
4. Add recipient email
5. Verify the email

**Solution Option 2: Use Real Domain (Production)**
1. Add your domain to Mailgun
2. Configure DNS records
3. Update `.env`:
```bash
MAILGUN_DOMAIN=yourdomain.com
MAILGUN_FROM_EMAIL=noreply@yourdomain.com
```

---

### Issue: Network Errors

**Symptoms:**
```
🌐 NETWORK ERROR: No response from Mailgun
```

**Possible Causes:**
- Internet connection issues
- Firewall blocking outbound requests
- Mailgun API downtime
- DNS issues

**Solution:**
1. Check internet connection
2. Try accessing https://api.mailgun.net in browser
3. Check firewall settings
4. Wait and retry if Mailgun is down

---

## 🧪 Manual Testing

### Test Email Processor Manually

Create a test script `test-email-processor.js`:

```javascript
require('dotenv').config();
const { processScheduledEmails } = require('./services/emailQueue');

(async () => {
  console.log('🧪 Manually running email processor...\n');
  await processScheduledEmails();
  console.log('\n✅ Test complete!');
  process.exit(0);
})();
```

Run it:
```bash
node test-email-processor.js
```

### Test Single Email Send

Create `test-single-email.js`:

```javascript
require('dotenv').config();
const { sendEmail } = require('./services/emailService');

(async () => {
  try {
    console.log('🧪 Testing single email send...\n');
    
    const result = await sendEmail({
      to: 'your-email@example.com',
      subject: 'Test Email',
      html: '<p>This is a test email</p>',
      tags: ['test']
    });
    
    console.log('\n✅ Success!', result);
  } catch (error) {
    console.error('\n❌ Failed:', error);
  }
  
  process.exit(0);
})();
```

Run it:
```bash
node test-single-email.js
```

---

## 📋 Checklist for Production

Before going live, ensure:

- [ ] Using a verified domain (not sandbox)
- [ ] MAILGUN_API_KEY is set correctly
- [ ] MAILGUN_DOMAIN is your verified domain
- [ ] MAILGUN_FROM_EMAIL uses your domain
- [ ] DNS records are configured for your domain
- [ ] Email queue processor starts successfully
- [ ] Test emails are being sent
- [ ] Logs show successful sends
- [ ] No 403 forbidden errors
- [ ] Scheduled emails are processing every 5 minutes

---

## 🔧 Configuration

### Environment Variables

```bash
# Required
MAILGUN_API_KEY=key-your-api-key-here
MAILGUN_DOMAIN=yourdomain.com

# Optional
MAILGUN_FROM_EMAIL=noreply@yourdomain.com  # Defaults to noreply@MAILGUN_DOMAIN
QUEUE_CHECK_INTERVAL=*/5 * * * *           # Defaults to every 5 minutes
```

### Cron Schedule Format

```
*/5 * * * *  = Every 5 minutes
*/10 * * * * = Every 10 minutes
0 * * * *    = Every hour
0 */2 * * *  = Every 2 hours
```

---

## 📞 Support

If you're still having issues:

1. Check the [API_REFERENCE.md](./API_REFERENCE.md) troubleshooting section
2. Review your console logs for error details
3. Verify Mailgun account status and credits
4. Check Mailgun dashboard for sending logs

---

**Last Updated:** October 30, 2025

