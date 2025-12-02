# Password Reset - Quick Reference

## 🚀 Setup (One Time)

```bash
# 1. Install dependencies (already done)
npm install bcrypt node-fetch@2

# 2. Run database migration
node run-password-reset-migration.js

# 3. Restart server
npm start
```

## 📋 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/backend/users/forgot-password` | Request reset link |
| GET | `/backend/users/verify-reset-token/:token` | Verify token |
| POST | `/backend/users/reset-password` | Reset password |
| POST | `/backend/users/change-password` | Change password (logged in) |
| GET | `/backend/users/reset-password/:token` | HTML redirect page |

## 🧪 Quick Test

```bash
# Test forgot password endpoint
curl -X POST http://localhost:5000/backend/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# Or run the test script
node test-forgot-password.js
```

## 💻 Frontend Code Examples

### Forgot Password Form
```javascript
async function forgotPassword(email) {
  const res = await fetch('/backend/users/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  console.log(data.message);
}
```

### Reset Password Form
```javascript
async function resetPassword(token, newPassword) {
  const res = await fetch('/backend/users/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword })
  });
  const data = await res.json();
  if (data.success) window.location.href = '/login';
}
```

## 📧 Email Preview

Users receive a beautiful HTML email with:
- 🎨 Gradient purple header
- 🔘 Big "Reset Password" button
- 🔗 Copy-paste link backup
- ⏰ 1-hour expiration notice
- ⚠️ Security warnings

## 🔐 Security Features

- ✅ Bcrypt password hashing (10 rounds)
- ✅ Cryptographically random tokens (32 bytes)
- ✅ 1-hour token expiration
- ✅ One-time use tokens
- ✅ Email enumeration protection
- ✅ Password confirmation email

## 📁 Files Created

```
DomainSeller-Backend/
├── database/
│   └── add_password_reset.sql        # Migration SQL
├── routes/
│   └── users.js                      # User routes
├── services/
│   └── authService.js                # Auth logic
├── run-password-reset-migration.js   # Migration runner
├── test-forgot-password.js           # Test script
├── PASSWORD_RESET_GUIDE.md           # Full guide
└── PASSWORD_RESET_QUICK.md           # This file
```

## ✅ Checklist

- [x] Database migration run
- [x] bcrypt installed
- [x] Routes mounted in server.js
- [x] Email service configured
- [x] Server restarted
- [ ] Frontend pages created
- [ ] Test with real email

## 🐛 Common Issues

**Email not sending?**
- Check `.env` has `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `FRONTEND_URL`
- Check email service logs

**Token invalid?**
- Token expires in 1 hour
- Request new reset link

**Password not hashing?**
- Check `bcrypt` is installed: `npm list bcrypt`
- Check database migration completed

## 🎯 Next: Frontend Pages

Create these pages in your frontend:

1. `/forgot-password` - Form to enter email
2. `/reset-password` - Form to enter new password (reads ?token= from URL)
3. `/settings` - Change password form for logged-in users

See `PASSWORD_RESET_GUIDE.md` for detailed frontend examples.

