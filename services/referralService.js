const { query } = require('../config/database');

/**
 * Generate a unique referral code for a user
 * @param {Number} userId - User ID
 * @param {String} username - Username to base code on
 * @returns {Promise<String>} Generated referral code
 */
const generateUserReferralCode = async (userId, username) => {
  try {
    const result = await query(
      'SELECT generate_referral_code($1) as code',
      [userId]
    );
    return result.rows[0].code;
  } catch (error) {
    console.error('Error generating referral code:', error);
    // Fallback: create simple code
    const timestamp = Date.now().toString().slice(-4);
    const userPart = username.substring(0, 6).toUpperCase();
    return `${userPart}${timestamp}`;
  }
};

/**
 * Validate a referral code
 * @param {String} code - Referral code to validate
 * @returns {Promise<Object>} Validation result with code details
 */
const validateReferralCode = async (code) => {
  try {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Invalid code format' };
    }

    // Check in referral_codes table (super codes and promotional codes)
    const codeResult = await query(
      `SELECT 
        rc.*,
        u.username as owner_username,
        u.email as owner_email
       FROM referral_codes rc
       LEFT JOIN users u ON rc.user_id = u.id
       WHERE rc.code = $1 AND rc.is_active = true`,
      [code.toUpperCase()]
    );

    if (codeResult.rows.length > 0) {
      const codeData = codeResult.rows[0];
      
      // Check if code has expired
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        return { valid: false, error: 'Code has expired' };
      }
      
      // Check if code has uses remaining
      if (codeData.uses_remaining !== null && codeData.uses_remaining <= 0) {
        return { valid: false, error: 'Code has reached maximum uses' };
      }
      
      return {
        valid: true,
        codeType: codeData.code_type,
        bonusType: codeData.bonus_type,
        bonusValue: codeData.bonus_value,
        bonusPlan: codeData.bonus_plan,
        bonusDuration: codeData.bonus_duration_days,
        commissionRate: codeData.commission_rate,
        ownerId: codeData.user_id,
        ownerUsername: codeData.owner_username,
        description: codeData.description,
        codeId: codeData.id
      };
    }

    // Check in users table (user referral codes)
    const userResult = await query(
      `SELECT 
        id,
        username,
        email,
        referral_code
       FROM users
       WHERE referral_code = $1`,
      [code.toUpperCase()]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      
      return {
        valid: true,
        codeType: 'user',
        bonusType: 'default',
        bonusValue: 0,
        commissionRate: 10.00, // Default 10% commission
        ownerId: user.id,
        ownerUsername: user.username,
        description: `Referral from ${user.username}`
      };
    }

    return { valid: false, error: 'Code not found' };
    
  } catch (error) {
    console.error('Error validating referral code:', error);
    return { valid: false, error: 'Validation failed' };
  }
};

/**
 * Apply referral code to a new user signup
 * @param {Number} newUserId - ID of the newly registered user
 * @param {String} referralCode - Referral code used
 * @param {Object} metadata - Additional metadata (IP, user agent, etc)
 * @returns {Promise<Object>} Result of applying referral
 */
const applyReferralCode = async (newUserId, referralCode, metadata = {}) => {
  console.log(`🎁 Applying referral code: ${referralCode} for user ${newUserId}`);
  
  try {
    // Validate the code
    const validation = await validateReferralCode(referralCode);
    
    if (!validation.valid) {
      console.log(`❌ Invalid referral code: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    // Get new user details
    const newUserResult = await query(
      'SELECT email, username FROM users WHERE id = $1',
      [newUserId]
    );
    
    if (newUserResult.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }
    
    const newUser = newUserResult.rows[0];

    // Update the new user with referral information
    await query(
      `UPDATE users 
       SET referred_by_user_id = $1,
           referred_by_code = $2,
           referral_bonus_applied = true
       WHERE id = $3`,
      [validation.ownerId, referralCode.toUpperCase(), newUserId]
    );

    // Create referral record
    const referralResult = await query(
      `INSERT INTO referrals (
        referrer_user_id,
        referred_user_id,
        referral_code_id,
        referral_code,
        status,
        bonus_type,
        bonus_value,
        referred_user_email,
        referrer_ip,
        referrer_user_agent,
        utm_source,
        utm_medium,
        utm_campaign
      ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        validation.ownerId,
        newUserId,
        validation.codeId || null,
        referralCode.toUpperCase(),
        validation.bonusType,
        validation.bonusValue,
        newUser.email,
        metadata.ip || null,
        metadata.userAgent || null,
        metadata.utm_source || null,
        metadata.utm_medium || null,
        metadata.utm_campaign || null
      ]
    );

    const referralId = referralResult.rows[0].id;

    // Update referrer's total referrals
    await query(
      'UPDATE users SET total_referrals = total_referrals + 1 WHERE id = $1',
      [validation.ownerId]
    );

    // Update referral code usage
    if (validation.codeId) {
      await query(
        `UPDATE referral_codes 
         SET total_uses = total_uses + 1,
             total_signups = total_signups + 1,
             uses_remaining = CASE 
               WHEN uses_remaining IS NOT NULL THEN uses_remaining - 1 
               ELSE NULL 
             END
         WHERE id = $1`,
        [validation.codeId]
      );
    }

    // Apply bonus if applicable
    let bonusApplied = false;
    let bonusDetails = null;

    if (validation.bonusType === 'free_month' && validation.bonusPlan) {
      // Apply 1 month free Professional plan
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (validation.bonusDuration || 30));
      
      await query(
        `UPDATE users 
         SET subscription_plan = $1,
             subscription_status = 'active',
             subscription_started_at = NOW(),
             subscription_ends_at = $2
         WHERE id = $3`,
        [validation.bonusPlan, endDate, newUserId]
      );
      
      bonusApplied = true;
      bonusDetails = {
        type: 'free_month',
        plan: validation.bonusPlan,
        duration: validation.bonusDuration,
        endsAt: endDate
      };
    } else if (validation.bonusType === 'free_trial_extension') {
      // Extend free trial
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + (validation.bonusValue || 7));
      
      await query(
        'UPDATE users SET free_trial_ends_at = $1 WHERE id = $2',
        [trialEnd, newUserId]
      );
      
      bonusApplied = true;
      bonusDetails = {
        type: 'trial_extension',
        days: validation.bonusValue,
        endsAt: trialEnd
      };
    }

    if (bonusApplied) {
      await query(
        `UPDATE referrals 
         SET bonus_applied = true, bonus_applied_at = NOW() 
         WHERE id = $1`,
        [referralId]
      );
    }

    console.log(`✅ Referral code applied successfully. Bonus: ${bonusApplied}`);

    return {
      success: true,
      referralId,
      referrerId: validation.ownerId,
      referrerUsername: validation.ownerUsername,
      bonusApplied,
      bonusDetails,
      commissionRate: validation.commissionRate,
      message: validation.description
    };

  } catch (error) {
    console.error('Error applying referral code:', error);
    return { success: false, error: 'Failed to apply referral code' };
  }
};

/**
 * Get referral stats for a user
 * @param {Number} userId - User ID
 * @returns {Promise<Object>} Referral statistics
 */
const getReferralStats = async (userId) => {
  try {
    // Get basic stats
    const stats = await query(
      `SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_referrals,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_referrals,
        SUM(commission_earned) as total_commission_earned,
        SUM(commission_paid) as total_commission_paid,
        SUM(commission_pending) as total_commission_pending
       FROM referrals
       WHERE referrer_user_id = $1`,
      [userId]
    );

    // Get recent referrals
    const recentReferrals = await query(
      `SELECT 
        r.*,
        u.username as referred_username,
        u.email as referred_email,
        u.subscription_plan,
        u.subscription_status
       FROM referrals r
       JOIN users u ON r.referred_user_id = u.id
       WHERE r.referrer_user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [userId]
    );

    // Get user's referral code
    const userCode = await query(
      'SELECT referral_code FROM users WHERE id = $1',
      [userId]
    );

    // Get pending commissions
    const pendingCommissions = await query(
      `SELECT 
        SUM(amount) as total_pending
       FROM referral_commissions
       WHERE referrer_user_id = $1 AND status = 'pending'`,
      [userId]
    );

    return {
      success: true,
      referralCode: userCode.rows[0]?.referral_code,
      stats: stats.rows[0],
      recentReferrals: recentReferrals.rows,
      pendingCommissions: pendingCommissions.rows[0]?.total_pending || 0
    };

  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return { success: false, error: 'Failed to fetch stats' };
  }
};

/**
 * Record a commission when a referred user makes a payment
 * @param {Number} referralId - Referral ID
 * @param {Number} amount - Payment amount
 * @param {String} type - Commission type (signup, subscription, renewal)
 * @returns {Promise<Object>} Commission record
 */
const recordCommission = async (referralId, amount, type = 'subscription') => {
  try {
    // Get referral details
    const referral = await query(
      `SELECT 
        r.*,
        rc.commission_rate,
        rc.commission_type
       FROM referrals r
       LEFT JOIN referral_codes rc ON r.referral_code_id = rc.id
       WHERE r.id = $1`,
      [referralId]
    );

    if (referral.rows.length === 0) {
      return { success: false, error: 'Referral not found' };
    }

    const ref = referral.rows[0];
    const commissionRate = ref.commission_rate || 10.00;
    const commissionAmount = (amount * commissionRate) / 100;

    // Create commission record
    const commission = await query(
      `INSERT INTO referral_commissions (
        referral_id,
        referrer_user_id,
        referred_user_id,
        amount,
        commission_type,
        commission_rate,
        base_amount,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *`,
      [
        referralId,
        ref.referrer_user_id,
        ref.referred_user_id,
        commissionAmount,
        type,
        commissionRate,
        amount
      ]
    );

    // Update referral totals
    await query(
      `UPDATE referrals 
       SET commission_earned = commission_earned + $1,
           commission_pending = commission_pending + $1,
           last_commission_date = NOW(),
           status = 'converted'
       WHERE id = $2`,
      [commissionAmount, referralId]
    );

    // Update user totals
    await query(
      'UPDATE users SET total_commission_earned = total_commission_earned + $1 WHERE id = $2',
      [commissionAmount, ref.referrer_user_id]
    );

    console.log(`✅ Commission recorded: $${commissionAmount} for referral ${referralId}`);

    return {
      success: true,
      commission: commission.rows[0]
    };

  } catch (error) {
    console.error('Error recording commission:', error);
    return { success: false, error: 'Failed to record commission' };
  }
};

/**
 * Create a custom referral code (for admin or special users)
 * @param {Object} codeData - Code configuration
 * @returns {Promise<Object>} Created code
 */
const createCustomReferralCode = async (codeData) => {
  try {
    const {
      code,
      codeType = 'promotional',
      userId = null,
      bonusType,
      bonusValue,
      bonusPlan = null,
      bonusDuration = 30,
      commissionRate = 10,
      commissionType = 'recurring',
      maxUses = null,
      expiresAt = null,
      description = ''
    } = codeData;

    // Check if code already exists
    const existing = await validateReferralCode(code);
    if (existing.valid) {
      return { success: false, error: 'Code already exists' };
    }

    const result = await query(
      `INSERT INTO referral_codes (
        code,
        code_type,
        user_id,
        is_active,
        uses_remaining,
        max_uses,
        bonus_type,
        bonus_value,
        bonus_plan,
        bonus_duration_days,
        commission_rate,
        commission_type,
        expires_at,
        description,
        created_by_admin
      ) VALUES ($1, $2, $3, true, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      RETURNING *`,
      [
        code.toUpperCase(),
        codeType,
        userId,
        maxUses,
        maxUses,
        bonusType,
        bonusValue,
        bonusPlan,
        bonusDuration,
        commissionRate,
        commissionType,
        expiresAt,
        description
      ]
    );

    return {
      success: true,
      code: result.rows[0]
    };

  } catch (error) {
    console.error('Error creating custom referral code:', error);
    return { success: false, error: 'Failed to create code' };
  }
};

module.exports = {
  generateUserReferralCode,
  validateReferralCode,
  applyReferralCode,
  getReferralStats,
  recordCommission,
  createCustomReferralCode
};

