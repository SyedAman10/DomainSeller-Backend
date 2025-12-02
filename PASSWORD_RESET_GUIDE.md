# Password Reset Feature

Complete forgot password functionality with email support.

## 🚀 Quick Start

### 1. Run Database Migration

```bash
node run-password-reset-migration.js
```

This adds the following columns to the `users` table:
- `password_hash` - Stores hashed passwords
- `reset_token` - Temporary token for password reset
- `reset_token_expires` - Expiration timestamp for token

### 2. Restart Backend Server

```bash
npm start
```

### 3. Test the Feature

```bash
node test-forgot-password.js
```

---

## 📖 API Endpoints

### Request Password Reset

**POST** `/backend/users/forgot-password`

Request a password reset link to be sent via email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If the email exists in our system, a password reset link has been sent"
}
```

**Email Sent:**
- Beautiful HTML email with reset link
- Link expires in 1 hour
- Includes security warnings

---

### Verify Reset Token

**GET** `/backend/users/verify-reset-token/:token`

Check if a reset token is valid before showing the reset form.

**Response (Valid Token):**
```json
{
  "success": true,
  "message": "Token is valid",
  "user": {
    "email": "user@example.com",
    "name": "John"
  }
}
```

**Response (Invalid/Expired Token):**
```json
{
  "success": false,
  "error": "Invalid or expired reset token"
}
```

---

### Reset Password

**POST** `/backend/users/reset-password`

Actually reset the password with a valid token.

**Request Body:**
```json
{
  "token": "abc123def456...",
  "newPassword": "MyNewPassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

**Response (Invalid Token):**
```json
{
  "success": false,
  "error": "Invalid or expired reset token"
}
```

**Password Requirements:**
- Minimum 8 characters
- No maximum length

---

### Change Password (Logged In Users)

**POST** `/backend/users/change-password`

Change password for an already logged-in user.

**Request Body:**
```json
{
  "userId": 1,
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 🎨 Frontend Integration

### Step 1: Forgot Password Page

```javascript
async function handleForgotPassword(email) {
  const response = await fetch('/backend/users/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await response.json();
  
  if (data.success) {
    alert('Check your email for reset instructions!');
  }
}
```

### Step 2: Reset Password Page

```javascript
// Get token from URL: /reset-password?token=abc123
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Verify token first
async function verifyToken() {
  const response = await fetch(`/backend/users/verify-reset-token/${token}`);
  const data = await response.json();
  
  if (!data.success) {
    showError('Invalid or expired reset link');
    return false;
  }
  
  return true;
}

// Reset password
async function handleResetPassword(newPassword) {
  const response = await fetch('/backend/users/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      token,
      newPassword 
    })
  });

  const data = await response.json();
  
  if (data.success) {
    alert('Password reset successful! Please log in.');
    window.location.href = '/login';
  }
}
```

### Step 3: Change Password (Settings Page)

```javascript
async function handleChangePassword(currentPassword, newPassword) {
  const response = await fetch('/backend/users/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      userId: currentUser.id,
      currentPassword,
      newPassword 
    })
  });

  const data = await response.json();
  
  if (data.success) {
    alert('Password changed successfully!');
  } else {
    alert(data.error);
  }
}
```

---

## 📧 Email Templates

### Password Reset Email

The system sends a beautifully designed HTML email with:
- 🔐 Eye-catching gradient header
- 🔘 Big "Reset Password" button
- 🔗 Copy-paste link option
- ⏰ Expiration warning (1 hour)
- ⚠️ Security notice
- 📱 Mobile responsive design

### Password Changed Confirmation

After successful reset, users receive:
- ✅ Confirmation that password was changed
- 🔒 Security alert if they didn't make the change
- 📧 Professional branding

---

## 🔐 Security Features

### Token Security
- Tokens are cryptographically random (32 bytes)
- Tokens expire after 1 hour
- One-time use only (cleared after reset)
- Stored as plain text (can be hashed if needed)

### Password Security
- Passwords are hashed with bcrypt
- Salt rounds: 10
- Minimum length: 8 characters
- No password history (can be added)

### Email Security
- Doesn't reveal if email exists (prevents enumeration)
- Same response for valid and invalid emails
- Clear security warnings in emails

---

## 🧪 Testing

### Test Flow

1. **Request Reset:**
```bash
curl -X POST http://localhost:5000/backend/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'
```

2. **Check Email** and copy the token from the link

3. **Verify Token:**
```bash
curl http://localhost:5000/backend/users/verify-reset-token/TOKEN_HERE
```

4. **Reset Password:**
```bash
curl -X POST http://localhost:5000/backend/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_HERE","newPassword":"newpass123"}'
```

---

## 🐛 Troubleshooting

### Email Not Sending

**Check:**
1. `.env` has `MAILGUN_API_KEY` and `MAILGUN_DOMAIN`
2. `FRONTEND_URL` is set correctly
3. Email service is working (check `emailService.js`)

**Test email service:**
```javascript
const { sendEmail } = require('./services/emailService');

sendEmail({
  to: 'your@email.com',
  subject: 'Test',
  text: 'Test email',
  html: '<p>Test email</p>'
});
```

### Token Invalid/Expired

**Reasons:**
- Token is older than 1 hour
- Token already used
- Wrong token copied

**Fix:**
- Request a new reset link
- Copy the full token from email

### Password Not Resetting

**Check:**
1. Database migration was run
2. `password_hash` column exists in `users` table
3. `bcrypt` package is installed

---

## 📊 Database Schema

```sql
-- Users table columns added:
ALTER TABLE users 
ADD COLUMN password_hash VARCHAR(255),
ADD COLUMN reset_token VARCHAR(255),
ADD COLUMN reset_token_expires TIMESTAMP;

-- Indexes created:
CREATE INDEX idx_users_reset_token ON users(reset_token);
CREATE INDEX idx_users_email ON users(email);
```

---

## 🎯 Next Steps

### Optional Enhancements

1. **Rate Limiting**
   - Limit reset requests per email (e.g., max 3 per hour)
   - Prevent spam/abuse

2. **Password History**
   - Prevent reusing last N passwords
   - Store hashed previous passwords

3. **2FA Support**
   - Require 2FA code for password reset
   - SMS or authenticator app

4. **Account Lockout**
   - Lock account after N failed reset attempts
   - Auto-unlock after time period

5. **Audit Log**
   - Log all password changes
   - Track IP addresses and timestamps

---

## 📞 Support

If you encounter issues:
1. Check server logs for detailed errors
2. Verify database migration completed
3. Test email service separately
4. Check `.env` configuration

---

## ✅ Feature Complete

- ✅ Database migration
- ✅ Password hashing with bcrypt
- ✅ Reset token generation
- ✅ Email with reset link
- ✅ Token validation
- ✅ Password reset
- ✅ Change password (logged in)
- ✅ Beautiful HTML emails
- ✅ Security best practices
- ✅ Error handling
- ✅ Documentation
- ✅ Test scripts

🎉 **Your password reset feature is ready to use!**

