/**
 * ============================================================
 * ENCRYPTION SERVICE
 * ============================================================
 * 
 * Purpose: Secure encryption/decryption for sensitive data
 * Use Case: Registrar API credentials, payment info, etc.
 * 
 * Algorithm: AES-256-GCM (Authenticated Encryption)
 * ============================================================
 */

const crypto = require('crypto');

class EncryptionService {
  constructor() {
    // Get encryption key from environment variable
    this.encryptionKey = process.env.ENCRYPTION_KEY;

    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is not set!');
    }

    // Ensure key is 32 bytes for AES-256
    this.key = this.deriveKey(this.encryptionKey);

    // Algorithm configuration
    this.algorithm = 'aes-256-gcm';
    this.ivLength = 16; // Initialization vector length
    this.authTagLength = 16; // Authentication tag length
  }

  /**
   * Derive a 32-byte key from the encryption key string
   */
  deriveKey(keyString) {
    return crypto
      .createHash('sha256')
      .update(keyString)
      .digest();
  }

  /**
   * Encrypt sensitive data
   * @param {string} plaintext - Data to encrypt
   * @returns {string} Base64-encoded encrypted data with IV and auth tag
   */
  encrypt(plaintext) {
    try {
      if (!plaintext) {
        throw new Error('Cannot encrypt empty data');
      }

      // Generate random initialization vector
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine IV + authTag + encrypted data
      // Format: [IV (16 bytes)][Auth Tag (16 bytes)][Encrypted Data]
      const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]);

      // Return as base64 for storage
      return combined.toString('base64');
    } catch (error) {
      console.error('❌ Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt encrypted data
   * @param {string} encryptedData - Base64-encoded encrypted data
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData) {
        throw new Error('Cannot decrypt empty data');
      }

      // Convert from base64
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract components
      const iv = combined.slice(0, this.ivLength);
      const authTag = combined.slice(this.ivLength, this.ivLength + this.authTagLength);
      const encrypted = combined.slice(this.ivLength + this.authTagLength);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('❌ Decryption error:', error);
      throw new Error('Decryption failed - data may be corrupted or tampered with');
    }
  }

  /**
   * Hash sensitive data (one-way, for comparison only)
   * @param {string} data - Data to hash
   * @returns {string} SHA-256 hash
   */
  hash(data) {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate a secure random token
   * @param {number} length - Token length in bytes (default: 32)
   * @returns {string} Hex-encoded random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Verify if encrypted data is valid (can be decrypted)
   * @param {string} encryptedData
   * @returns {boolean}
   */
  isValid(encryptedData) {
    try {
      this.decrypt(encryptedData);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * ============================================================
 * REGISTRAR CREDENTIALS SERVICE
 * ============================================================
 * 
 * Purpose: Manage encrypted registrar credentials in database
 * ============================================================
 */
class RegistrarCredentialsService {
  constructor(encryptionService, db) {
    this.encryption = encryptionService;
    this.db = db;
  }

  /**
   * Store registrar credentials securely
   */
  async storeCredentials(userId, registrar, apiKey, apiSecret, syncMode = 'verify_only') {
    try {
      console.log(`🔐 Encrypting credentials for ${registrar} (Mode: ${syncMode})...`);

      // Encrypt credentials
      const encryptedKey = this.encryption.encrypt(apiKey);
      const encryptedSecret = apiSecret ? this.encryption.encrypt(apiSecret) : null;

      // Store in database
      const result = await this.db.query(
        `INSERT INTO registrar_accounts 
          (user_id, registrar, encrypted_api_key, encrypted_api_secret, connection_status, sync_mode, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'pending', $5, NOW(), NOW())
         ON CONFLICT (user_id, registrar) 
         DO UPDATE SET 
           encrypted_api_key = EXCLUDED.encrypted_api_key,
           encrypted_api_secret = EXCLUDED.encrypted_api_secret,
           connection_status = 'pending',
           sync_mode = COALESCE($5, registrar_accounts.sync_mode),
           updated_at = NOW()
         RETURNING id`,
        [userId, registrar.toLowerCase(), encryptedKey, encryptedSecret, syncMode]
      );

      console.log(`✅ Credentials stored securely (Account ID: ${result.rows[0].id})`);

      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Error storing credentials:', error);
      throw new Error('Failed to store registrar credentials');
    }
  }

  /**
   * Retrieve and decrypt registrar credentials
   */
  async getCredentials(registrarAccountId) {
    try {
      const result = await this.db.query(
        `SELECT encrypted_api_key, encrypted_api_secret, registrar
         FROM registrar_accounts
         WHERE id = $1`,
        [registrarAccountId]
      );

      if (result.rows.length === 0) {
        throw new Error('Registrar account not found');
      }

      const account = result.rows[0];

      // Decrypt credentials
      const apiKey = this.encryption.decrypt(account.encrypted_api_key);
      const apiSecret = account.encrypted_api_secret
        ? this.encryption.decrypt(account.encrypted_api_secret)
        : null;

      return {
        apiKey,
        apiSecret,
        registrar: account.registrar
      };
    } catch (error) {
      console.error('❌ Error retrieving credentials:', error);
      throw new Error('Failed to retrieve registrar credentials');
    }
  }

  /**
   * Delete registrar credentials
   */
  async deleteCredentials(userId, registrarAccountId) {
    try {
      // Log deletion for audit
      await this.db.query(
        `INSERT INTO domain_verification_log 
          (domain_name, user_id, event_type, reason, created_at)
         VALUES ('N/A', $1, 'registrar_disconnected', 'User disconnected registrar account', NOW())`,
        [userId]
      );

      // Delete credentials
      const result = await this.db.query(
        `DELETE FROM registrar_accounts
         WHERE id = $1 AND user_id = $2
         RETURNING registrar`,
        [registrarAccountId, userId]
      );

      if (result.rows.length > 0) {
        console.log(`✅ Deleted ${result.rows[0].registrar} credentials for user ${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error deleting credentials:', error);
      throw new Error('Failed to delete registrar credentials');
    }
  }

  /**
   * Update connection status
   */
  async updateConnectionStatus(registrarAccountId, status, error = null) {
    try {
      await this.db.query(
        `UPDATE registrar_accounts
         SET connection_status = $1,
             last_sync_error = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [status, error, registrarAccountId]
      );
    } catch (err) {
      console.error('❌ Error updating connection status:', err);
    }
  }
}

/**
 * ============================================================
 * SECURITY LOGGING SERVICE
 * ============================================================
 */
class SecurityLogger {
  constructor(db) {
    this.db = db;
  }

  /**
   * Log domain verification event
   */
  async logVerification(domainName, userId, eventType, details = {}) {
    try {
      await this.db.query(
        `INSERT INTO domain_verification_log
          (domain_name, user_id, event_type, verification_method, registrar_account_id, 
           old_status, new_status, reason, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          domainName,
          userId,
          eventType,
          details.verificationMethod || null,
          details.registrarAccountId || null,
          details.oldStatus || null,
          details.newStatus || null,
          details.reason || null,
          details.ipAddress || null,
          details.userAgent || null
        ]
      );
    } catch (error) {
      console.error('❌ Failed to log verification event:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Log registrar sync event
   */
  async logSync(registrarAccountId, status, stats, error = null) {
    try {
      const startTime = Date.now();

      await this.db.query(
        `INSERT INTO registrar_sync_history
          (registrar_account_id, sync_status, domains_found, domains_added, 
           domains_removed, domains_updated, error_message, api_response_time_ms, 
           started_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          registrarAccountId,
          status,
          stats.found || 0,
          stats.added || 0,
          stats.removed || 0,
          stats.updated || 0,
          error,
          Date.now() - startTime
        ]
      );
    } catch (err) {
      console.error('❌ Failed to log sync event:', err);
    }
  }

  /**
   * Get verification history for a domain
   */
  async getVerificationHistory(domainName, limit = 50) {
    try {
      const result = await this.db.query(
        `SELECT * FROM domain_verification_log
         WHERE domain_name = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [domainName, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching verification history:', error);
      return [];
    }
  }
}

// Singleton instances
let encryptionService = null;
let credentialsService = null;
let securityLogger = null;

/**
 * Initialize services
 */
function initializeSecurityServices(db) {
  if (!encryptionService) {
    encryptionService = new EncryptionService();
  }

  if (!credentialsService) {
    credentialsService = new RegistrarCredentialsService(encryptionService, db);
  }

  if (!securityLogger) {
    securityLogger = new SecurityLogger(db);
  }

  return {
    encryption: encryptionService,
    credentials: credentialsService,
    logger: securityLogger
  };
}

module.exports = {
  EncryptionService,
  RegistrarCredentialsService,
  SecurityLogger,
  initializeSecurityServices
};
