/**
 * Lead Classification Service
 * 
 * Analyzes text content to detect domain buyer intent and classify leads
 * as HOT, WARM, or COLD based on keyword matching and scoring
 */

/**
 * HOT Intent Keywords - Strong buying signals
 */
const HOT_KEYWORDS = [
  // Direct buying intent
  'looking to buy domain',
  'want to buy domain',
  'need to buy domain',
  'purchase domain name',
  'buy premium domain',
  'buy domain for',
  'interested in buying domain',
  'domain wanted',
  'need domain name',
  'looking for domain',
  'searching for domain',
  'acquire domain',
  'domain acquisition',
  'buy exact match domain',
  'buy brandable domain',
  'buy .com domain',
  'domain for sale',
  'how to buy domain',
  'where to buy domain',
  'best place to buy domain',
  
  // Urgency signals
  'urgent domain need',
  'need domain asap',
  'need domain immediately',
  'domain needed urgently',
  
  // Budget signals
  'budget for domain',
  'willing to pay for domain',
  'domain budget',
  'how much for domain',
  'domain price',
  'pay premium for domain',
  
  // Direct asks
  'domain broker',
  'help me find domain',
  'domain marketplace',
  'aftermarket domain',
  'premium domain',
  'aged domain'
];

/**
 * WARM Intent Keywords - Moderate buying signals
 */
const WARM_KEYWORDS = [
  // Startup/brand naming
  'startup name ideas',
  'startup name',
  'brand name ideas',
  'brand name',
  'company name ideas',
  'business name ideas',
  'naming my startup',
  'naming my business',
  'launching startup',
  'starting new business',
  'new company name',
  
  // Domain research
  'domain name ideas',
  'domain suggestions',
  'good domain names',
  'available domain names',
  'check domain availability',
  'domain name generator',
  'brandable domain names',
  'short domain names',
  'domain extensions',
  '.com alternatives',
  
  // Brand building
  'building online presence',
  'create website',
  'establish online brand',
  'digital brand',
  'online identity',
  'web presence',
  
  // Industry specific
  'saas domain name',
  'ecommerce domain',
  'tech startup domain',
  'fintech domain',
  'crypto domain',
  'nft domain',
  'web3 domain'
];

/**
 * COLD Intent Keywords - Weak or informational signals
 */
const COLD_KEYWORDS = [
  'what is a domain',
  'domain meaning',
  'free domain',
  'domain registration',
  'how domains work',
  'domain basics',
  'learn about domains'
];

/**
 * Negative Keywords - Filters out non-buyers
 */
const NEGATIVE_KEYWORDS = [
  'sell my domain',
  'selling domain',
  'domain appraisal',
  'value my domain',
  'free domain parking',
  'domain expired',
  'renew domain',
  'transfer domain',
  'domain registrar',
  'godaddy',
  'namecheap',
  'hosting provider'
];

/**
 * Calculate intent score and classify lead
 * @param {string} title - SERP result title
 * @param {string} snippet - SERP result snippet
 * @returns {Object} - Classification result
 */
function classifyLead(title, snippet) {
  const text = `${title || ''} ${snippet || ''}`.toLowerCase();
  
  let hotScore = 0;
  let warmScore = 0;
  let coldScore = 0;
  let matchedKeywords = [];
  
  // Check for negative keywords first (disqualifiers)
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      return {
        intent: 'COLD',
        score: 0,
        matchedKeywords: [keyword],
        reason: 'Contains negative/seller keywords'
      };
    }
  }
  
  // Score HOT keywords (highest weight)
  for (const keyword of HOT_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      hotScore += 10;
      matchedKeywords.push(keyword);
    }
  }
  
  // Score WARM keywords (medium weight)
  for (const keyword of WARM_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      warmScore += 5;
      matchedKeywords.push(keyword);
    }
  }
  
  // Score COLD keywords (low weight)
  for (const keyword of COLD_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      coldScore += 2;
      matchedKeywords.push(keyword);
    }
  }
  
  // Calculate total score
  const totalScore = hotScore + warmScore + coldScore;
  
  // Determine intent classification
  let intent;
  let confidenceScore;
  
  if (hotScore >= 10) {
    intent = 'HOT';
    confidenceScore = Math.min(100, 70 + hotScore);
  } else if (warmScore >= 10 || (hotScore > 0 && warmScore > 0)) {
    intent = 'WARM';
    confidenceScore = Math.min(100, 40 + warmScore + (hotScore * 2));
  } else if (totalScore > 0) {
    intent = 'COLD';
    confidenceScore = Math.min(100, 20 + totalScore);
  } else {
    intent = 'COLD';
    confidenceScore = 10;
  }
  
  return {
    intent,
    score: confidenceScore,
    matchedKeywords: [...new Set(matchedKeywords)], // Remove duplicates
    hotScore,
    warmScore,
    coldScore,
    totalScore
  };
}

/**
 * Batch classify multiple leads
 * @param {Array} leads - Array of lead objects with title and snippet
 * @returns {Array} - Array of leads with classification
 */
function classifyLeadsBatch(leads) {
  return leads.map(lead => {
    const classification = classifyLead(lead.title, lead.snippet);
    
    return {
      ...lead,
      intent: classification.intent,
      confidence_score: classification.score,
      matched_keywords: classification.matchedKeywords
    };
  });
}

/**
 * Get statistics about classification results
 * @param {Array} classifiedLeads - Array of classified leads
 * @returns {Object} - Statistics
 */
function getClassificationStats(classifiedLeads) {
  const stats = {
    total: classifiedLeads.length,
    hot: classifiedLeads.filter(l => l.intent === 'HOT').length,
    warm: classifiedLeads.filter(l => l.intent === 'WARM').length,
    cold: classifiedLeads.filter(l => l.intent === 'COLD').length,
    avgConfidence: 0,
    topKeywords: {}
  };
  
  // Calculate average confidence
  if (stats.total > 0) {
    const totalConfidence = classifiedLeads.reduce((sum, l) => sum + (l.confidence_score || 0), 0);
    stats.avgConfidence = Math.round(totalConfidence / stats.total);
  }
  
  // Get top keywords
  const keywordCounts = {};
  classifiedLeads.forEach(lead => {
    if (lead.matched_keywords) {
      lead.matched_keywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
    }
  });
  
  // Sort keywords by frequency
  stats.topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [key, val]) => {
      obj[key] = val;
      return obj;
    }, {});
  
  return stats;
}

/**
 * Re-classify a lead with updated text
 * @param {string} title - New title
 * @param {string} snippet - New snippet
 * @param {string} additionalText - Additional text from crawling
 * @returns {Object} - New classification
 */
function reclassifyLead(title, snippet, additionalText = '') {
  const combinedText = `${title} ${snippet} ${additionalText}`;
  return classifyLead(combinedText, '');
}

/**
 * Validate if a lead should be crawled for contact info
 * Only HOT and WARM leads should be crawled to save resources
 * @param {string} intent - Lead intent (HOT/WARM/COLD)
 * @returns {boolean} - Whether to crawl
 */
function shouldCrawlLead(intent) {
  return intent === 'HOT' || intent === 'WARM';
}

/**
 * Get human-readable intent description
 * @param {string} intent - Intent classification
 * @returns {string} - Description
 */
function getIntentDescription(intent) {
  const descriptions = {
    HOT: '🔥 High buying intent - Ready to purchase',
    WARM: '🌤️ Moderate interest - Researching options',
    COLD: '❄️ Low intent - Informational/casual browsing'
  };
  
  return descriptions[intent] || 'Unknown intent';
}

/**
 * Filter out low-quality leads
 * @param {Array} leads - Array of classified leads
 * @param {number} minConfidence - Minimum confidence score (0-100)
 * @returns {Array} - Filtered leads
 */
function filterLowQualityLeads(leads, minConfidence = 20) {
  return leads.filter(lead => lead.confidence_score >= minConfidence);
}

module.exports = {
  classifyLead,
  classifyLeadsBatch,
  getClassificationStats,
  reclassifyLead,
  shouldCrawlLead,
  getIntentDescription,
  filterLowQualityLeads,
  HOT_KEYWORDS,
  WARM_KEYWORDS,
  COLD_KEYWORDS
};

