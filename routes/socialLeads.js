const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth } = require('../middleware/auth'); // Uses your existing Auth middleware
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

// Helper: Processor
const processAndSaveLeads = async (items, platform, userId) => {
    let savedCount = 0;

    for (const item of items) {
        const leadData = normalizeItem(item, platform);

        // Validation
        if (!leadData.content || leadData.content.length < 5) continue;
        const isDomainRelated = DOMAIN_KEYWORDS.some(k => leadData.content.toLowerCase().includes(k));
        if (!isDomainRelated) continue;

        // AI Analysis
        const aiResult = await analyzeSocialLead(leadData.content, platform);

        // Save High/Medium Intent Leads
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
        }
    }
    return savedCount;
};

/**
 * POST /api/social-leads/run/:platform
 * Platforms: reddit, facebook, twitter
 * Requires: X-User-Id header or Bearer Token
 */
router.post('/run/:platform', requireAuth, async (req, res) => {
    const { platform } = req.params;
    const userId = req.user.id; // Extracted from auth middleware

    console.log(`🚀 User ${userId} starting ${platform} scrape...`);

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
 * Get leads for the logged-in user
 */
router.get('/', requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await query(
            'SELECT * FROM social_leads WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;