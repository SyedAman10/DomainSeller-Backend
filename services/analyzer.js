const fetch = require('node-fetch');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';

let lastRequestAt = 0;
let rateLimitedUntil = 0;
let throttleChain = Promise.resolve();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const clampScore = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const toTier = (score) => {
  if (score >= 80) return 'tier_1';
  if (score >= 60) return 'tier_2';
  if (score >= 40) return 'tier_3';
  return 'tier_4';
};

const parseMoney = (value) => {
  const n = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return Math.round(n);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getPrompt = (domain) =>
  `Analyze "${domain}" for fair market resale value today. Return JSON only with fields:
{
  "score": number (0-100),
  "fair_market_price_usd": number,
  "low_estimate_usd": number,
  "high_estimate_usd": number,
  "confidence": number (0-1),
  "reasoning": string (max 35 words)
}`;

const normalizeAnalysis = (domain, parsed) => {
  const score = clampScore(parsed.score);
  const tier = toTier(score);
  const reasoning = String(parsed.reasoning || 'No reasoning provided').slice(0, 5000);
  const modelPrice =
    parseMoney(parsed.fair_market_price_usd) ??
    parseMoney(parsed.price_usd) ??
    parseMoney(parsed.price) ??
    parseMoney(parsed.low_estimate_usd && parsed.high_estimate_usd
      ? (Number(parsed.low_estimate_usd) + Number(parsed.high_estimate_usd)) / 2
      : null) ??
    0;
  const estimatedPriceUsd = clamp(modelPrice, 0, 10000000);

  return { score, tier, reasoning, estimatedPriceUsd };
};

const parseAnthropicTextPayload = (text) => {
  try {
    return JSON.parse(text);
  } catch (_) {
    // Try to recover JSON content if model wraps it in markdown or extra text.
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Unable to parse Anthropic response as JSON');
  }
};

const parseStructuredJson = (text) => {
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Unable to parse model response as JSON');
  }
};

const shouldFallbackToOpenAI = (message) => {
  const value = String(message || '').toLowerCase();
  return (
    value.includes('credit balance is too low') ||
    value.includes('plans & billing') ||
    value.includes('purchase credits') ||
    value.includes('insufficient') ||
    value.includes('billing')
  );
};

const analyzeDomainWithOpenAI = async (domain) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured for fallback');
  }

  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 20000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        max_tokens: Number(process.env.OPENAI_MAX_TOKENS || 120),
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a domain valuation assistant. Return only JSON with score, fair_market_price_usd, low_estimate_usd, high_estimate_usd, confidence, reasoning.'
          },
          {
            role: 'user',
            content: getPrompt(domain)
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${body}`);
    }

    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenAI API returned empty content');
    }

    const parsed = parseStructuredJson(text);
    const normalized = normalizeAnalysis(domain, parsed);

    return { ...normalized, provider: 'openai' };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`OpenAI request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const waitForRateLimit = async () => {
  const minDelayMs = Number(process.env.ANTHROPIC_MIN_DELAY_MS || 1300);
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < minDelayMs) {
    await delay(minDelayMs - elapsed);
  }
  lastRequestAt = Date.now();
};

const waitForRateLimitCooldown = async () => {
  const remaining = rateLimitedUntil - Date.now();
  if (remaining > 0) {
    await delay(remaining);
  }
};

const waitForThrottleSlot = async () => {
  const previous = throttleChain;
  let releaseNext;
  throttleChain = new Promise((resolve) => {
    releaseNext = resolve;
  });

  await previous;
  await waitForRateLimitCooldown();
  await waitForRateLimit();
  releaseNext();
};

const analyzeDomain = async (domain) => {
  if (!process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY) {
    return analyzeDomainWithOpenAI(domain);
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    throw new Error('Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is configured');
  }

  const max429Retries = Number(process.env.ANTHROPIC_429_MAX_RETRIES || 5);

  for (let attempt = 0; attempt <= max429Retries; attempt += 1) {
    await waitForThrottleSlot();

    const timeoutMs = Number(process.env.ANTHROPIC_TIMEOUT_MS || 20000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_API_VERSION,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
          max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS || 120),
          temperature: 0,
          system:
            'You are a domain valuation assistant. Return only valid JSON with score, fair_market_price_usd, low_estimate_usd, high_estimate_usd, confidence, reasoning.',
          messages: [
            {
              role: 'user',
              content: getPrompt(domain)
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('retry-after');
          const retrySeconds = Number(retryAfterHeader);
          const fallbackBase = Number(process.env.ANTHROPIC_RATE_LIMIT_COOLDOWN_MS || 30000);
          const backoffMs = fallbackBase * Math.max(1, attempt + 1);
          const cooldownMs =
            Number.isFinite(retrySeconds) && retrySeconds > 0 ? retrySeconds * 1000 : backoffMs;

          rateLimitedUntil = Date.now() + cooldownMs;
          const body = await response.text();
          if (attempt < max429Retries) {
            continue;
          }
          throw new Error(`Anthropic API error 429: ${body}`);
        }
        const body = await response.text();
        if (response.status === 400 && shouldFallbackToOpenAI(body) && process.env.OPENAI_API_KEY) {
          return analyzeDomainWithOpenAI(domain);
        }
        throw new Error(`Anthropic API error ${response.status}: ${body}`);
      }

      const payload = await response.json();
      const text = payload?.content?.[0]?.text;
      if (!text) {
        throw new Error('Anthropic API returned empty content');
      }

      const parsed = parseAnthropicTextPayload(text);
      const normalized = normalizeAnalysis(domain, parsed);

      return { ...normalized, provider: 'anthropic' };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Anthropic request timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Anthropic analysis failed after retries');
};

module.exports = {
  analyzeDomain,
  toTier
};
