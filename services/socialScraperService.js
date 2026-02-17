const { ApifyClient } = require('apify-client');
require('dotenv').config();

const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

const runRedditScraper = async () => {
    const input = {
        searches: ["domain sale", "buying domain", "startup naming", "brand name help", "purchase domain", "sell domain", "domain buyers", "domain sellers", "startup founders"],
        sort: "new",
        maxItems: 20,
        proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] }
    };

    try {
        console.log("🚀 Running Reddit Scraper...");
        const run = await client.actor("trudax/reddit-scraper-lite").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        return items;
    } catch (error) {
        console.error("Reddit Scraper Error:", error.message);
        return [];
    }
};

const runFacebookScraper = async () => {
    const input = {
        startUrls: [{ url: "https://www.facebook.com/groups/535342753181963" }],
        resultsLimit: 20,
        viewOption: "CHRONOLOGICAL",
        useProxy: true
    };

    try {
        console.log("🚀 Running Facebook Scraper...");
        const run = await client.actor("apify/facebook-groups-scraper").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        return items;
    } catch (error) {
        console.error("Facebook Scraper Error:", error.message);
        return [];
    }
};

const runTwitterScraper = async () => {
    const input = {
        "searchTerms": [
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
        maxItems: 20,
        sort: "Latest",
        tweetLanguage: "en"
    };

    try {
        console.log("🚀 Running Twitter Scraper...");
        const run = await client.actor("apidojo/tweet-scraper").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        return items;
    } catch (error) {
        console.error("Twitter Scraper Error:", error.message);
        return [];
    }
};

module.exports = { runRedditScraper, runFacebookScraper, runTwitterScraper };