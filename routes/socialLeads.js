const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { runRedditScraper, runFacebookScraper, runTwitterScraper } = require('../services/socialScraperService');
const { analyzeSocialLead } = require('../services/socialAiService');

const DOMAIN_KEYWORDS = ["domain", ".com", "selling", "buying", "brand name", "startup name", ".pk", ".in", ".co"];

// Helper: Normalize Data
const normalizeItem = (item, platform) => {
    let data = {};

    if (platform === 'facebook') {
        data = {
            content: item.text || "",
            url: item.url,
            source: item.groupTitle || "Facebook Group",
            author_name: item.user ? item.user.name : "Unknown",
            author_id: item.user ? item.user.id : null,
        };
    } else if (platform === 'reddit') {
        data = {
            content: `${item.title || ''}\n${item.body || ''}`.trim(),
            url: item.url,
            source: item.communityName || item.parsedCommunityName || "Unknown Subreddit",
            author_name: item.username || "Unknown",
            author_id: item.userId || null,
        };
    } else if (platform === 'twitter') {
        const author = item.author || item.user || {};
        const username = author.userName || author.screen_name || "unknown";
        const tweetId = item.id || item.id_str;
        data = {
            content: item.text || item.full_text || "",
            url: `https://twitter.com/${username}/status/${tweetId}`,
            source: "Twitter Search",
            author_name: author.name || username,
            author_id: username,
        };
    }
    return data;
};

// Helper: Verify User Exists in EITHER table
const verifyUserExists = async (userId) => {
    try {
        // Check both tables for the ID
        const result = await query(
            `SELECT id FROM users WHERE id = $1 
             UNION 
             SELECT id FROM dashboard_users WHERE id = $1 
             LIMIT 1`,
            [userId]
        );
        return result.rows.length > 0;
    } catch (error) {
        console.error("User Verification Error:", error);
        return false;
    }
};

// Helper: Processor
const processAndSaveLeads = async (items, platform, userId) => {
    let savedCount = 0;

    for (const item of items) {
        const leadData = normalizeItem(item, platform);

        // 1. Basic Validation
        if (!leadData.content || leadData.content.length < 5) continue;

        // 2. Keyword Filter
        const isDomainRelated = DOMAIN_KEYWORDS.some(k => leadData.content.toLowerCase().includes(k));
        if (!isDomainRelated) continue;

        // 3. DUPLICATE CHECK (Prevent Saving if Author + Content exists)
        try {
            const existingCheck = await query(
                `SELECT id FROM social_leads 
                 WHERE user_id = $1 
                 AND platform = $2 
                 AND author_name = $3 
                 AND content = $4 
                 LIMIT 1`,
                [userId, platform, leadData.author_name, leadData.content]
            );

            if (existingCheck.rows.length > 0) {
                console.log(`⚠️ Duplicate skipped: ${leadData.author_name}`);
                continue;
            }
        } catch (dbError) {
            console.error("Database check error:", dbError);
            continue;
        }

        // 4. AI Analysis
        const aiResult = await analyzeSocialLead(leadData.content, platform);

        // 5. Save High/Medium Intent Leads
        if (["buyer", "seller", "founder"].includes(aiResult.intent) && aiResult.score !== "low") {
            await query(
                `INSERT INTO social_leads 
                (user_id, platform, content, url, source_group_subreddit, author_name, author_id, intent, score, context, outreach_draft)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    userId,
                    platform,
                    leadData.content,
                    leadData.url,
                    leadData.source,
                    leadData.author_name,
                    leadData.author_id,
                    aiResult.intent,
                    aiResult.score,
                    aiResult.context,
                    aiResult.outreach
                ]
            );
            savedCount++;
            console.log(`✅ Saved new lead: ${leadData.author_name}`);
        }
    }
    return savedCount;
};

/**
 * POST /api/social-leads/run/:platform
 * Platforms: reddit, facebook, twitter
 */
router.post('/run/:platform', requireAuth, async (req, res) => {
    const { platform } = req.params;
    const userId = req.user.id;

    // 1. VERIFY USER EXISTS IN EITHER TABLE BEFORE SCRAPING
    const isValidUser = await verifyUserExists(userId);
    if (!isValidUser) {
        console.error(`❌ User ID ${userId} not found in 'users' OR 'dashboard_users'`);
        return res.status(404).json({ error: "User ID invalid. Please log in again." });
    }

    console.log(`🚀 User ${userId} verified. Starting ${platform} scrape...`);

    try {
        let items = [];
        if (platform === 'reddit') items = await runRedditScraper();
        else if (platform === 'facebook') items = await runFacebookScraper();
        else if (platform === 'twitter') items = await runTwitterScraper();
        else return res.status(400).json({ error: "Invalid platform" });

        const savedCount = await processAndSaveLeads(items, platform, userId);

        res.json({
            success: true,
            platform,
            scanned: items.length,
            saved: savedCount,
            message: `Scraped ${items.length} items, saved ${savedCount} qualified leads.`
        });

    } catch (error) {
        console.error("Scrape Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/social-leads
 * Admins see all, Users see theirs.
 */
router.get('/', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        let result;

        if (userRole === 'admin') {
            result = await query('SELECT * FROM social_leads ORDER BY created_at DESC');
        } else {
            result = await query(
                'SELECT * FROM social_leads WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
        }

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error fetching leads:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;