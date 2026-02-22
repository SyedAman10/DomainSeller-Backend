const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const {
  validateReferralCode,
  applyReferralCode,
  getReferralStats,
  createCustomReferralCode
} = require('../services/referralService');

/**
 * GET /api/referrals/validate/:code
 * Validate a referral code
 */
router.get('/validate/:code', async (req, res) => {
  console.log(`🔍 Validating referral code: ${req.params.code}`);
  
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Code is required'
      });
    }

    const validation = await validateReferralCode(code);
    
    if (!validation.valid) {
      return res.status(404).json({
        success: false,
        error: validation.error
      });
    }

    res.json({
      success: true,
      valid: true,
      code: code.toUpperCase(),
      ...validation
    });

  } catch (error) {
    console.error('Error validating referral code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate code',
      message: error.message
    });
  }
});

/**
 * POST /api/referrals/apply
 * Apply a referral code to a user (used during signup)
 */
router.post('/apply', async (req, res) => {
  console.log('🎁 Applying referral code...');
  
  try {
    const { userId, referralCode, metadata } = req.body;
    
    if (!userId || !referralCode) {
      return res.status(400).json({
        success: false,
        error: 'userId and referralCode are required'
      });
    }

    const result = await applyReferralCode(userId, referralCode, metadata);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Error applying referral code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply referral code',
      message: error.message
    });
  }
});

/**
 * GET /api/referrals/stats/:userId
 * Get referral statistics for a user
 */
router.get('/stats/:userId', async (req, res) => {
  console.log(`📊 Fetching referral stats for user ${req.params.userId}`);
  
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const stats = await getReferralStats(parseInt(userId));
    
    if (!stats.success) {
      return res.status(404).json(stats);
    }

    res.json(stats);

  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

/**
 * GET /api/referrals/dashboard/:userId
 * Get complete referral dashboard data
 */
router.get('/dashboard/:userId', async (req, res) => {
  console.log(`📊 Loading referral dashboard for user ${req.params.userId}`);
  
  try {
    const { userId } = req.params;
    
    // Get user info and referral code
    const userInfo = await query(
      `SELECT 
        id,
        username,
        email,
        referral_code,
        total_referrals,
        total_commission_earned,
        subscription_plan
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userInfo.rows[0];

    // Get referral stats
    const stats = await getReferralStats(parseInt(userId));

    // Get commission breakdown
    const commissionBreakdown = await query(
      `SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total
       FROM referral_commissions
       WHERE referrer_user_id = $1
       GROUP BY status`,
      [userId]
    );

    // Get monthly performance
    const monthlyPerformance = await query(
      `SELECT 
        DATE_TRUNC('month', signup_date) as month,
        COUNT(*) as signups,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as conversions,
        SUM(commission_earned) as commission
       FROM referrals
       WHERE referrer_user_id = $1
         AND signup_date >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', signup_date)
       ORDER BY month DESC`,
      [userId]
    );

    // Get top referrals
    const topReferrals = await query(
      `SELECT 
        r.*,
        u.username,
        u.email,
        u.subscription_plan,
        u.subscription_status
       FROM referrals r
       JOIN users u ON r.referred_user_id = u.id
       WHERE r.referrer_user_id = $1
       ORDER BY r.commission_earned DESC
       LIMIT 5`,
      [userId]
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        referralCode: user.referral_code,
        totalReferrals: user.total_referrals,
        totalCommissionEarned: user.total_commission_earned,
        subscriptionPlan: user.subscription_plan
      },
      stats: stats.stats,
      commissionBreakdown: commissionBreakdown.rows,
      monthlyPerformance: monthlyPerformance.rows,
      topReferrals: topReferrals.rows,
      recentReferrals: stats.recentReferrals,
      pendingCommissions: stats.pendingCommissions
    });

  } catch (error) {
    console.error('Error loading referral dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard',
      message: error.message
    });
  }
});

/**
 * GET /api/referrals/my-code/:userId
 * Get user's referral code and shareable link
 */
router.get('/my-code/:userId', async (req, res) => {
  console.log(`🔗 Getting referral code for user ${req.params.userId}`);
  
  try {
    const { userId } = req.params;
    
    const result = await query(
      'SELECT referral_code, username, total_referrals FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    const frontendUrl = process.env.FRONTEND_URL || 'https://3vltn.com';
    
    res.json({
      success: true,
      referralCode: user.referral_code,
      shareableLink: `${frontendUrl}/signup?ref=${user.referral_code}`,
      totalReferrals: user.total_referrals,
      shareText: `Join me on 3VLTN! Use my referral code ${user.referral_code} to get started.`,
      socialLinks: {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join me on 3VLTN! Use code ${user.referral_code}`)}&url=${encodeURIComponent(`${frontendUrl}/signup?ref=${user.referral_code}`)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${frontendUrl}/signup?ref=${user.referral_code}`)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${frontendUrl}/signup?ref=${user.referral_code}`)}`
      }
    });

  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referral code',
      message: error.message
    });
  }
});

/**
 * GET /api/referrals/leaderboard
 * Get top referrers leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  console.log('🏆 Loading referral leaderboard...');
  
  try {
    const { limit = 20, timeframe = 'all' } = req.query;
    
    let timeCondition = '';
    if (timeframe === 'month') {
      timeCondition = "AND r.signup_date >= NOW() - INTERVAL '30 days'";
    } else if (timeframe === 'week') {
      timeCondition = "AND r.signup_date >= NOW() - INTERVAL '7 days'";
    }

    const leaderboard = await query(
      `SELECT 
        u.id,
        u.username,
        u.referral_code,
        COUNT(r.id) as total_referrals,
        COUNT(CASE WHEN r.status = 'converted' THEN 1 END) as conversions,
        SUM(r.commission_earned) as total_commission,
        u.created_at as member_since
       FROM users u
       LEFT JOIN referrals r ON r.referrer_user_id = u.id ${timeCondition}
       GROUP BY u.id, u.username, u.referral_code, u.created_at
       HAVING COUNT(r.id) > 0
       ORDER BY total_commission DESC, total_referrals DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      timeframe,
      leaderboard: leaderboard.rows.map((row, index) => ({
        rank: index + 1,
        ...row
      }))
    });

  } catch (error) {
    console.error('Error loading leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load leaderboard',
      message: error.message
    });
  }
});

/**
 * POST /api/referrals/create-code
 * Create a custom referral code (admin only)
 */
router.post('/create-code', async (req, res) => {
  console.log('🎟️  Creating custom referral code...');
  
  try {
    const { adminKey, ...codeData } = req.body;
    
    // Simple admin verification (you should implement proper auth)
    // For now, check against an admin key in env
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const result = await createCustomReferralCode(codeData);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Error creating custom code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create code',
      message: error.message
    });
  }
});

/**
 * GET /api/referrals/commissions/:userId
 * Get commission history for a user
 */
router.get('/commissions/:userId', async (req, res) => {
  console.log(`💰 Fetching commissions for user ${req.params.userId}`);
  
  try {
    const { userId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    
    let statusCondition = '';
    const params = [userId];
    
    if (status) {
      statusCondition = 'AND status = $2';
      params.push(status);
    }

    const commissions = await query(
      `SELECT 
        rc.*,
        u.username as referred_username,
        u.email as referred_email,
        r.referred_user_plan
       FROM referral_commissions rc
       JOIN referrals r ON rc.referral_id = r.id
       JOIN users u ON rc.referred_user_id = u.id
       WHERE rc.referrer_user_id = $1 ${statusCondition}
       ORDER BY rc.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    // Get totals
    const totals = await query(
      `SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount
       FROM referral_commissions
       WHERE referrer_user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      commissions: commissions.rows,
      totals: totals.rows[0],
      pagination: {
        limit,
        offset,
        hasMore: commissions.rows.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commissions',
      message: error.message
    });
  }
});

/**
 * POST /api/referrals/request-payout
 * Request a commission payout
 */
router.post('/request-payout', async (req, res) => {
  console.log('💸 Processing payout request...');
  
  try {
    const { userId, amount, paymentMethod, paymentEmail } = req.body;
    
    if (!userId || !amount || !paymentMethod || !paymentEmail) {
      return res.status(400).json({
        success: false,
        error: 'userId, amount, paymentMethod, and paymentEmail are required'
      });
    }

    // Check if user has enough commission
    const balance = await query(
      `SELECT 
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as available_balance
       FROM referral_commissions
       WHERE referrer_user_id = $1`,
      [userId]
    );

    const availableBalance = balance.rows[0]?.available_balance || 0;
    
    if (availableBalance < amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: $${availableBalance}`
      });
    }

    // Minimum payout check ($50)
    if (amount < 50) {
      return res.status(400).json({
        success: false,
        error: 'Minimum payout amount is $50'
      });
    }

    // Get approved commissions to include in payout
    const commissionsToInclude = await query(
      `SELECT id
       FROM referral_commissions
       WHERE referrer_user_id = $1 
         AND status = 'approved'
       ORDER BY created_at ASC`,
      [userId]
    );

    const commissionIds = commissionsToInclude.rows.map(row => row.id);

    // Create payout request
    const payout = await query(
      `INSERT INTO referral_payouts (
        user_id,
        amount,
        payment_method,
        payment_email,
        commission_ids,
        commission_count,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *`,
      [userId, amount, paymentMethod, paymentEmail, commissionIds, commissionIds.length]
    );

    // Mark commissions as being processed
    await query(
      `UPDATE referral_commissions
       SET status = 'paid'
       WHERE id = ANY($1)`,
      [commissionIds]
    );

    res.json({
      success: true,
      payout: payout.rows[0],
      message: 'Payout request submitted successfully. It will be processed within 5-7 business days.'
    });

  } catch (error) {
    console.error('Error requesting payout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request payout',
      message: error.message
    });
  }
});

/**
 * GET /api/referrals/payouts/:userId
 * Get payout history for a user
 */
router.get('/payouts/:userId', async (req, res) => {
  console.log(`💳 Fetching payouts for user ${req.params.userId}`);
  
  try {
    const { userId } = req.params;
    
    const payouts = await query(
      `SELECT *
       FROM referral_payouts
       WHERE user_id = $1
       ORDER BY requested_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      payouts: payouts.rows
    });

  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payouts',
      message: error.message
    });
  }
});

module.exports = router;

