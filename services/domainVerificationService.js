/**
 * ============================================================
 * DOMAIN VERIFICATION SERVICE
 * ============================================================
 * 
 * Purpose: Unified domain verification supporting multiple methods
 * 
 * Verification Methods (in priority order):
 * 1. Registrar API (Level 3) - Highest confidence
 * 2. Nameserver Check (Level 2) - Medium confidence  
 * 3. DNS TXT Record (Level 1) - Basic confidence
 * 4. Manual Verification (Level 0) - Admin override
 * 
 * Features:
 * - Multi-method verification
 * - Fallback support
 * - Confidence levels
 * - Automatic re-verification
 * ============================================================
 */

const dns = require('dns').promises;
const { query } = require('../config/database');
const { generateToken } = require('./encryptionService').EncryptionService.prototype;

class DomainVerificationService {
  constructor() {
    this.verificationLevels = {
      REGISTRAR_API: { level: 3, name: 'Registrar API', confidence: 'highest' },
      NAMESERVER: { level: 2, name: 'Nameserver', confidence: 'medium' },
      DNS_TXT: { level: 1, name: 'DNS TXT Record', confidence: 'basic' },
      MANUAL: { level: 0, name: 'Manual', confidence: 'manual' }
    };
  }

  /**
   * Generate verification token for DNS TXT record
   * @param {number} userId
   * @param {string} domainName
   * @returns {string}
   */
  generateVerificationToken(userId, domainName) {
    const crypto = require('crypto');
    const data = `${userId}:${domainName}:${Date.now()}`;
    return `domainseller-verify-${crypto.createHash('sha256').update(data).digest('hex').substring(0, 32)}`;
  }

  /**
   * Method 1: Verify via DNS TXT record
   * User adds TXT record: domainseller-verify-xxxxx
   */
  async verifyViaDNS(domainName, expectedToken) {
    try {
      console.log(`🔍 Checking DNS TXT records for ${domainName}...`);
      
      const txtRecords = await dns.resolveTxt(domainName);
      
      // Flatten TXT records (they come as arrays of arrays)
      const flatRecords = txtRecords.map(record => record.join(''));
      
      console.log(`   Found ${flatRecords.length} TXT record(s)`);
      
      // Look for verification token
      const found = flatRecords.some(record => 
        record.includes(expectedToken) || record === expectedToken
      );

      if (found) {
        console.log(`✅ Verification token found in DNS TXT records`);
        return {
          success: true,
          method: 'dns_txt',
          level: this.verificationLevels.DNS_TXT.level,
          message: 'Domain verified via DNS TXT record'
        };
      } else {
        console.log(`❌ Verification token not found in DNS TXT records`);
        return {
          success: false,
          method: 'dns_txt',
          message: 'Verification token not found in DNS records',
          records: flatRecords
        };
      }
    } catch (error) {
      console.error(`❌ DNS lookup failed:`, error.message);
      return {
        success: false,
        method: 'dns_txt',
        message: `DNS lookup failed: ${error.message}`,
        error: error.code
      };
    }
  }

  /**
   * Method 2: Verify via nameserver check
   * Check if domain uses specific nameservers
   */
  async verifyViaNameserver(domainName, expectedNameservers = null) {
    try {
      console.log(`🔍 Checking nameservers for ${domainName}...`);
      
      const nameservers = await dns.resolveNs(domainName);
      
      console.log(`   Found ${nameservers.length} nameserver(s):`, nameservers);

      if (!expectedNameservers || expectedNameservers.length === 0) {
        // Just return the nameservers without verification
        return {
          success: true,
          method: 'nameserver',
          level: this.verificationLevels.NAMESERVER.level,
          nameservers: nameservers,
          message: 'Nameservers retrieved successfully'
        };
      }

      // Check if any expected nameservers match
      const matches = expectedNameservers.some(expected => 
        nameservers.some(ns => ns.toLowerCase().includes(expected.toLowerCase()))
      );

      if (matches) {
        console.log(`✅ Domain uses expected nameservers`);
        return {
          success: true,
          method: 'nameserver',
          level: this.verificationLevels.NAMESERVER.level,
          nameservers: nameservers,
          message: 'Domain verified via nameserver check'
        };
      } else {
        console.log(`❌ Domain does not use expected nameservers`);
        return {
          success: false,
          method: 'nameserver',
          nameservers: nameservers,
          message: 'Nameservers do not match expected values'
        };
      }
    } catch (error) {
      console.error(`❌ Nameserver lookup failed:`, error.message);
      return {
        success: false,
        method: 'nameserver',
        message: `Nameserver lookup failed: ${error.message}`,
        error: error.code
      };
    }
  }

  /**
   * Method 3: Verify via registrar API (handled by domain sync service)
   * This is automatically done when user connects registrar account
   */
  async verifyViaRegistrarAPI(domainName, userId) {
    try {
      console.log(`🔍 Checking registrar API verification for ${domainName}...`);
      
      // Check if domain is verified via registrar
      const result = await query(
        `SELECT 
           d.id,
           d.verification_method,
           d.verification_level,
           d.verification_status,
           d.verified_at,
           ra.registrar
         FROM domains d
         LEFT JOIN registrar_accounts ra ON d.registrar_account_id = ra.id
         WHERE d.name = $1 
           AND d.user_id = $2
           AND d.verification_method = 'registrar_api'
           AND d.verification_status = 'verified'`,
        [domainName, userId]
      );

      if (result.rows.length > 0) {
        const domain = result.rows[0];
        console.log(`✅ Domain verified via ${domain.registrar} API`);
        
        return {
          success: true,
          method: 'registrar_api',
          level: this.verificationLevels.REGISTRAR_API.level,
          registrar: domain.registrar,
          verifiedAt: domain.verified_at,
          message: `Domain verified via ${domain.registrar} registrar API`
        };
      } else {
        console.log(`❌ Domain not verified via registrar API`);
        return {
          success: false,
          method: 'registrar_api',
          message: 'Domain not found or not verified via registrar API'
        };
      }
    } catch (error) {
      console.error(`❌ Registrar API check failed:`, error.message);
      return {
        success: false,
        method: 'registrar_api',
        message: `Registrar API check failed: ${error.message}`
      };
    }
  }

  /**
   * Unified verification: Try all methods in priority order
   * @param {string} domainName
   * @param {number} userId
   * @param {object} options - { token, nameservers, tryAllMethods }
   */
  async verifyDomain(domainName, userId, options = {}) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔐 VERIFYING DOMAIN: ${domainName}`);
    console.log(`👤 User ID: ${userId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const results = [];

    // Try Method 1: Registrar API (highest confidence)
    console.log('\n1️⃣ Trying Registrar API verification...');
    const registrarResult = await this.verifyViaRegistrarAPI(domainName, userId);
    results.push(registrarResult);
    
    if (registrarResult.success) {
      console.log('✅ Domain verified via Registrar API!');
      return this.saveVerificationResult(domainName, userId, registrarResult);
    }

    // Try Method 2: DNS TXT Record (if token provided)
    if (options.token) {
      console.log('\n2️⃣ Trying DNS TXT verification...');
      const dnsResult = await this.verifyViaDNS(domainName, options.token);
      results.push(dnsResult);
      
      if (dnsResult.success) {
        console.log('✅ Domain verified via DNS TXT!');
        return this.saveVerificationResult(domainName, userId, dnsResult);
      }
    }

    // Try Method 3: Nameserver Check (if nameservers provided or just to get info)
    console.log('\n3️⃣ Trying Nameserver verification...');
    const nsResult = await this.verifyViaNameserver(domainName, options.nameservers);
    results.push(nsResult);
    
    if (nsResult.success && options.nameservers) {
      console.log('✅ Domain verified via Nameserver!');
      return this.saveVerificationResult(domainName, userId, nsResult);
    }

    // All methods failed
    console.log('\n❌ All verification methods failed');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return {
      success: false,
      message: 'Domain verification failed - no method succeeded',
      attempts: results
    };
  }

  /**
   * Save successful verification result to database
   */
  async saveVerificationResult(domainName, userId, verificationResult) {
    try {
      const { method, level } = verificationResult;

      // Upsert domain with verification info
      const result = await query(
        `INSERT INTO domains 
          (name, user_id, verification_method, verification_level, verification_status, is_verified,
           verified_at, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'verified', true, NOW(), 'Available', NOW(), NOW())
         ON CONFLICT (name) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           verification_method = EXCLUDED.verification_method,
           verification_level = EXCLUDED.verification_level,
           verification_status = 'verified',
           is_verified = true,
           verified_at = NOW(),
           updated_at = NOW()
         RETURNING id, name, verification_method, verification_level, verified_at`,
        [domainName, userId, method, level]
      );

      console.log('✅ Verification saved to database');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return {
        success: true,
        domain: result.rows[0],
        verification: verificationResult,
        message: `Domain verified successfully via ${method}`
      };
    } catch (error) {
      console.error('❌ Failed to save verification:', error);
      throw error;
    }
  }

  /**
   * Get verification requirements for a domain
   * Returns what the user needs to do to verify
   */
  async getVerificationInstructions(domainName, userId) {
    // Generate token
    const token = this.generateVerificationToken(userId, domainName);

    // Store token in database for later verification
    await query(
      `INSERT INTO domain_verification_tokens 
        (domain_name, user_id, token, method, expires_at, created_at)
       VALUES ($1, $2, $3, 'dns_txt', NOW() + INTERVAL '7 days', NOW())
       ON CONFLICT (domain_name, user_id) DO UPDATE SET
         token = EXCLUDED.token,
         expires_at = EXCLUDED.expires_at,
         created_at = NOW()`,
      [domainName, userId, token]
    );

    return {
      domain: domainName,
      methods: [
        {
          method: 'registrar_api',
          level: 3,
          confidence: 'highest',
          recommended: true,
          instructions: 'Connect your registrar account (GoDaddy, Cloudflare, Namecheap) to automatically verify all your domains.',
          action: 'Go to Settings → Registrar Connections'
        },
        {
          method: 'dns_txt',
          level: 1,
          confidence: 'basic',
          instructions: `Add a TXT record to your domain's DNS settings:`,
          record: {
            type: 'TXT',
            name: '@',
            value: token,
            ttl: 300
          },
          steps: [
            '1. Log in to your domain registrar or DNS provider',
            '2. Go to DNS settings for this domain',
            `3. Add a TXT record with value: ${token}`,
            '4. Wait 5-10 minutes for DNS propagation',
            '5. Click "Verify Domain" button'
          ]
        },
        {
          method: 'nameserver',
          level: 2,
          confidence: 'medium',
          instructions: 'Point your domain to our nameservers (advanced users only)',
          nameservers: [
            'ns1.3vltn.com',
            'ns2.3vltn.com'
          ],
          note: 'This will change your DNS provider. Only use if you understand DNS management.'
        }
      ],
      token: token
    };
  }

  /**
   * Check if domain meets minimum verification level for action
   */
  async canPerformAction(domainName, userId, requiredLevel = 1) {
    const result = await query(
      `SELECT verification_level, verification_status
       FROM domains
       WHERE name = $1 AND user_id = $2`,
      [domainName, userId]
    );

    if (result.rows.length === 0) {
      return { allowed: false, reason: 'Domain not found or not owned by user' };
    }

    const { verification_level, verification_status } = result.rows[0];

    if (verification_status !== 'verified') {
      return { allowed: false, reason: 'Domain verification expired or revoked' };
    }

    if (verification_level < requiredLevel) {
      return { 
        allowed: false, 
        reason: `Action requires verification level ${requiredLevel} or higher. Current level: ${verification_level}`,
        currentLevel: verification_level,
        requiredLevel: requiredLevel
      };
    }

    return { allowed: true, verificationLevel: verification_level };
  }
}

// Create verification token table if needed
async function ensureVerificationTokenTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS domain_verification_tokens (
        id SERIAL PRIMARY KEY,
        domain_name VARCHAR(255) NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(100) NOT NULL,
        method VARCHAR(30) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(domain_name, user_id)
      )
    `);
  } catch (error) {
    console.error('Failed to create verification tokens table:', error);
  }
}

// Initialize
ensureVerificationTokenTable();

// Singleton instance
const domainVerificationService = new DomainVerificationService();

module.exports = {
  DomainVerificationService,
  domainVerificationService
};
