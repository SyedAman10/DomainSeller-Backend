const { ApifyClient } = require('apify-client');
require('dotenv').config();

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

// Default Facebook Groups (if user doesn't provide one)
const DEFAULT_FB_GROUPS = [
    "https://www.facebook.com/groups/3280541332233338", // Group 1
    "https://www.facebook.com/groups/domainbusiness",   // Group 2
    "https://www.facebook.com/groups/bestwebhostingdomainflip", // Group 3
    "https://www.facebook.com/groups/shopifyfordummies", // Group 4
    "https://www.facebook.com/groups/saasfounders"       // Group 5
];

const runRedditScraper = async (limit = 20) => {
    const input = {
        searches: ["domain sale", "buying domain", "startup naming", "brand name help", "purchase domain", "sell domain"],
        sort: "new",
        maxItems: parseInt(limit), // Dynamic Limit
        proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] }
    };

    try {
        console.log(`🚀 Running Reddit Scraper (Limit: ${limit})...`);
        const run = await client.actor("trudax/reddit-scraper-lite").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        return items;
    } catch (error) {
        console.error("Reddit Scraper Error:", error.message);
        return [];
    }
};

const runFacebookScraper = async (limit = 20, customUrl = null) => {
    // 1. Determine URL: Use custom if provided, otherwise pick random default
    const targetUrl = customUrl || DEFAULT_FB_GROUPS[Math.floor(Math.random() * DEFAULT_FB_GROUPS.length)];

    const input = {
        startUrls: [{ url: targetUrl }],
        resultsLimit: parseInt(limit),
        viewOption: "CHRONOLOGICAL",
        useProxy: true
    };

    try {
        console.log(`🚀 Running Facebook Scraper on ${targetUrl} (Limit: ${limit})...`);
        const run = await client.actor("apify/facebook-groups-scraper").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        return items;
    } catch (error) {
        console.error("Facebook Scraper Error:", error.message);
        return [];
    }
};

const runTwitterScraper = async (limit = 20) => {
    const input = {
        searchTerms: [
            "selling domain",
            "buying domain",
            "domain for sale",
            "need a domain name",
            "startup naming help",
            "domain sale",
            "startup naming",
            "brand name help",
            "purchase domain",
            "sell domain",
            "domain buyers",
            "domain sellers",
            "startup founders"
        ],
        maxItems: parseInt(limit),
        sort: "Latest",
        tweetLanguage: "en"
    };

    try {
        console.log(`🚀 Running Twitter Scraper (Limit: ${limit})...`);
        const run = await client.actor("apidojo/tweet-scraper").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        return items;
    } catch (error) {
        console.error("Twitter Scraper Error:", error.message);
        return [];
    }
};

module.exports = { runRedditScraper, runFacebookScraper, runTwitterScraper };