const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query } = require('../config/database');
const { sendEmail } = require('./emailService');
require('dotenv').config();

/**
 * Authentication Service
 * Handles password hashing, reset tokens, and password reset emails
 */

const SALT_ROUNDS = 10;

/**
 * Hash a password
 * @param {String} password - Plain text password
 * @returns {Promise<String>} Hashed password
 */
const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare password with hash
 * @param {String} password - Plain text password
 * @param {String} hash - Hashed password
 * @returns {Promise<Boolean>} Match result
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate a secure reset token
 * @returns {String} Random token
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Request password reset
 * @param {String} email - User email
 * @returns {Promise<Object>} Result
 */
const requestPasswordReset = async (email) => {
  console.log(`🔐 Password reset requested for: ${email}`);

  try {
    // Check if user exists
    const userResult = await query(
      'SELECT id, email, first_name, last_name, username FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not (security best practice)
      console.log('⚠️  User not found, but returning success for security');
      return {
        success: true,
        message: 'If the email exists, a reset link has been sent'
      };
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = generateResetToken();
    const tokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Store token in database
    await query(
      `UPDATE users 
       SET reset_token = $1, 
           reset_token_expires = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [resetToken, tokenExpires, user.id]
    );

    // Create reset link
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send reset email
    const userName = user.first_name || user.username || 'there';
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🔐 Password Reset</h1>
        </div>
        
        <div style="padding: 40px; background: #f7fafc; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #2d3748; line-height: 1.6;">
            Hi <strong>${userName}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #2d3748; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 40px; 
                      text-decoration: none; 
                      border-radius: 50px; 
                      font-weight: bold; 
                      font-size: 16px;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #718096; line-height: 1.6;">
            Or copy and paste this link into your browser:
          </p>
          
          <p style="font-size: 14px; color: #667eea; word-break: break-all; background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea;">
            ${resetUrl}
          </p>
          
          <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              ⏰ <strong>This link will expire in 1 hour</strong>
            </p>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background: #f8d7da; border-radius: 5px; border-left: 4px solid #dc3545;">
            <p style="margin: 0; font-size: 14px; color: #721c24;">
              ⚠️ <strong>Didn't request this?</strong><br>
              If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #718096; margin-top: 30px; text-align: center;">
            Thanks,<br>
            <strong>The Team</strong>
          </p>
        </div>
      </div>
    `;

    const emailText = `
Hi ${userName},

We received a request to reset your password.

Click this link to reset your password (expires in 1 hour):
${resetUrl}

If you didn't request this, please ignore this email.

Thanks,
The Team
    `;

    await sendEmail({
      to: user.email,
      subject: '🔐 Password Reset Request',
      html: emailHtml,
      text: emailText,
      tags: ['password-reset', 'authentication']
    });

    console.log(`✅ Password reset email sent to: ${email}`);

    return {
      success: true,
      message: 'If the email exists, a reset link has been sent'
    };

  } catch (error) {
    console.error('❌ Error requesting password reset:', error);
    throw error;
  }
};

/**
 * Verify reset token
 * @param {String} token - Reset token
 * @returns {Promise<Object>} User info or null
 */
const verifyResetToken = async (token) => {
  console.log('🔍 Verifying reset token...');

  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, username, reset_token_expires
       FROM users 
       WHERE reset_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      console.log('❌ Invalid reset token');
      return null;
    }

    const user = result.rows[0];

    // Check if token is expired
    if (new Date() > new Date(user.reset_token_expires)) {
      console.log('❌ Reset token expired');
      return null;
    }

    console.log(`✅ Reset token valid for user: ${user.email}`);
    return user;

  } catch (error) {
    console.error('❌ Error verifying reset token:', error);
    throw error;
  }
};

/**
 * Reset password with token
 * @param {String} token - Reset token
 * @param {String} newPassword - New password
 * @returns {Promise<Object>} Result
 */
const resetPassword = async (token, newPassword) => {
  console.log('🔐 Resetting password...');

  try {
    // Verify token first
    const user = await verifyResetToken(token);

    if (!user) {
      return {
        success: false,
        error: 'Invalid or expired reset token'
      };
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await query(
      `UPDATE users 
       SET password_hash = $1,
           reset_token = NULL,
           reset_token_expires = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    console.log(`✅ Password reset successful for user: ${user.email}`);

    // Send confirmation email
    const userName = user.first_name || user.username || 'there';
    
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">✅ Password Changed</h1>
        </div>
        
        <div style="padding: 40px; background: #f7fafc; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #2d3748; line-height: 1.6;">
            Hi <strong>${userName}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #2d3748; line-height: 1.6;">
            Your password has been successfully changed. You can now log in with your new password.
          </p>
          
          <div style="margin-top: 30px; padding: 20px; background: #d1fae5; border-radius: 5px; border-left: 4px solid #10b981;">
            <p style="margin: 0; font-size: 14px; color: #065f46;">
              ✅ <strong>Password updated successfully</strong><br>
              Your account is now secured with your new password.
            </p>
          </div>
          
          <div style="margin-top: 20px; padding: 20px; background: #f8d7da; border-radius: 5px; border-left: 4px solid #dc3545;">
            <p style="margin: 0; font-size: 14px; color: #721c24;">
              ⚠️ <strong>Didn't make this change?</strong><br>
              If you didn't change your password, please contact support immediately.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #718096; margin-top: 30px; text-align: center;">
            Thanks,<br>
            <strong>The Team</strong>
          </p>
        </div>
      </div>
    `;

    const confirmationText = `
Hi ${userName},

Your password has been successfully changed. You can now log in with your new password.

If you didn't make this change, please contact support immediately.

Thanks,
The Team
    `;

    await sendEmail({
      to: user.email,
      subject: '✅ Password Changed Successfully',
      html: confirmationHtml,
      text: confirmationText,
      tags: ['password-changed', 'authentication']
    });

    return {
      success: true,
      message: 'Password reset successful'
    };

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    throw error;
  }
};

/**
 * Change password (for logged in users)
 * @param {Number} userId - User ID
 * @param {String} currentPassword - Current password
 * @param {String} newPassword - New password
 * @returns {Promise<Object>} Result
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  console.log(`🔐 Changing password for user: ${userId}`);

  try {
    // Get current password hash
    const result = await query(
      'SELECT id, email, password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    const user = result.rows[0];

    // Verify current password
    if (user.password_hash) {
      const isValid = await comparePassword(currentPassword, user.password_hash);
      
      if (!isValid) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await query(
      `UPDATE users 
       SET password_hash = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, userId]
    );

    console.log(`✅ Password changed for user: ${userId}`);

    return {
      success: true,
      message: 'Password changed successfully'
    };

  } catch (error) {
    console.error('❌ Error changing password:', error);
    throw error;
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  changePassword
};

