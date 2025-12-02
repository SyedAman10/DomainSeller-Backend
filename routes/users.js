const express = require('express');
const router = express.Router();
const {
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  changePassword
} = require('../services/authService');

/**
 * POST /api/users/forgot-password
 * Request a password reset link
 */
router.post('/forgot-password', async (req, res) => {
  console.log('📧 Password reset requested');

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const result = await requestPasswordReset(email);

    res.json({
      success: true,
      message: 'If the email exists in our system, a password reset link has been sent'
    });

  } catch (error) {
    console.error('❌ Error in forgot-password endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request',
      message: error.message
    });
  }
});

/**
 * GET /api/users/verify-reset-token/:token
 * Verify if a reset token is valid
 */
router.get('/verify-reset-token/:token', async (req, res) => {
  console.log('🔍 Verifying reset token');

  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const user = await verifyResetToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      user: {
        email: user.email,
        name: user.first_name || user.username
      }
    });

  } catch (error) {
    console.error('❌ Error verifying reset token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify reset token',
      message: error.message
    });
  }
});

/**
 * POST /api/users/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  console.log('🔐 Resetting password');

  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password are required'
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    const result = await resetPassword(token, newPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
      message: error.message
    });
  }
});

/**
 * POST /api/users/change-password
 * Change password for logged in user
 */
router.post('/change-password', async (req, res) => {
  console.log('🔐 Changing password for logged in user');

  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'userId, currentPassword, and newPassword are required'
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    const result = await changePassword(userId, currentPassword, newPassword);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Error changing password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      message: error.message
    });
  }
});

/**
 * GET /api/users/reset-password/:token
 * HTML page for password reset (for email links)
 */
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const user = await verifyResetToken(token);

    if (!user) {
      return res.send(`
        <html>
          <head>
            <title>Invalid Reset Link</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
              }
              .container {
                background: white;
                max-width: 500px;
                width: 100%;
                padding: 40px;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
              }
              .icon { font-size: 64px; margin-bottom: 20px; }
              h1 { color: #dc2626; margin: 0 0 20px 0; }
              p { color: #64748b; line-height: 1.6; }
              .btn {
                display: inline-block;
                margin-top: 20px;
                padding: 12px 30px;
                background: #667eea;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">❌</div>
              <h1>Invalid Reset Link</h1>
              <p>This password reset link is invalid or has expired.</p>
              <p>Reset links are only valid for 1 hour.</p>
              <a href="${process.env.FRONTEND_URL}/forgot-password" class="btn">Request New Link</a>
            </div>
          </body>
        </html>
      `);
    }

    // Redirect to frontend reset password page
    res.redirect(`${process.env.FRONTEND_URL}/reset-password?token=${token}`);

  } catch (error) {
    console.error('❌ Error in reset password page:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family:Arial;padding:50px;text-align:center;">
          <h1>❌ Error</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
});

module.exports = router;

