/**
 * ============================================================
 * REGISTRAR ADAPTER INTERFACE
 * ============================================================
 * 
 * Purpose: Unified interface for all registrar integrations
 * Allows adding new registrars without changing core logic
 * 
 * Supported Registrars (Priority Order):
 * - P0: GoDaddy, Cloudflare
 * - P1: Namecheap
 * - P2: Dynadot, Porkbun
 * ============================================================
 */

/**
 * Base Registrar Adapter Interface
 * All registrar adapters must implement this interface
 */
class RegistrarAdapter {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.registrarName = 'base';
  }

  /**
   * Test API connection and credentials validity
   * @returns {Promise<{success: boolean, message: string, accountInfo?: object}>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented');
  }

  /**
   * Fetch all domains owned by this account
   * @returns {Promise<string[]>} Array of domain names
   */
  async fetchDomains() {
    throw new Error('fetchDomains() must be implemented');
  }

  /**
   * Fetch detailed domain information (optional)
   * @param {string} domainName
   * @returns {Promise<object>} Domain details
   */
  async getDomainDetails(domainName) {
    throw new Error('getDomainDetails() is not implemented for this registrar');
  }

  /**
   * Get rate limit information
   * @returns {object} Rate limit details
   */
  getRateLimits() {
    return {
      requestsPerHour: 60,
      requestsPerDay: 1000
    };
  }

  /**
   * Normalize domain name (remove www, convert to lowercase, etc.)
   * @param {string} domain
   * @returns {string}
   */
  normalizeDomain(domain) {
    return domain
      .toLowerCase()
      .replace(/^www\./, '')
      .trim();
  }
}

/**
 * ============================================================
 * GODADDY ADAPTER
 * ============================================================
 * Priority: P0
 * Docs: https://developer.godaddy.com/doc/endpoint/domains
 */
class GoDaddyAdapter extends RegistrarAdapter {
  constructor(credentials) {
    super(credentials);
    this.registrarName = 'godaddy';
    this.baseUrl = process.env.GODADDY_API_URL || 'https://api.godaddy.com';
    this.version = 'v1';
  }

  /**
   * Get authorization header for GoDaddy API
   */
  getAuthHeader() {
    return `sso-key ${this.apiKey}:${this.apiSecret}`;
  }

  /**
   * Test GoDaddy API connection
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/v1/domains`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }

        // Check for common GoDaddy errors
        let errorMessage = `GoDaddy API error: ${response.status} - ${errorText}`;
        let hint = null;

        if (response.status === 403) {
          errorMessage = 'GoDaddy API credentials are invalid or do not have permission';
          hint = 'MOST COMMON ISSUE: GoDaddy requires 10+ domains OR Domain Pro Plan for API access!\n\n' +
                 'Solutions:\n' +
                 '1. Use OTE/Test environment (no restrictions):\n' +
                 '   - Set GODADDY_API_URL=https://api.ote-godaddy.com in .env\n' +
                 '   - Use TEST API keys\n' +
                 '2. For Production:\n' +
                 '   - Add 10+ domains to your account, OR\n' +
                 '   - Subscribe to "Discount Domain Club - Domain Pro Plan"\n' +
                 '3. Verify your API key has "Domain" permissions\n' +
                 '4. Consider using Cloudflare or Namecheap (no minimums)';
        } else if (response.status === 401) {
          errorMessage = 'GoDaddy API authentication failed';
          hint = 'Your API key or secret is incorrect. Please check your GoDaddy API credentials.';
        } else if (response.status === 429) {
          errorMessage = 'GoDaddy API rate limit exceeded';
          hint = 'Please wait a few minutes before trying again.';
        }

        return {
          success: false,
          message: errorMessage,
          hint: hint,
          statusCode: response.status,
          errorCode: errorData.code,
          errorDetails: errorData.message
        };
      }

      const domains = await response.json();
      
      return {
        success: true,
        message: 'GoDaddy connection successful',
        accountInfo: {
          domainsCount: domains.length,
          registrar: 'GoDaddy'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.toString()
      };
    }
  }

  /**
   * Fetch all domains from GoDaddy account
   */
  async fetchDomains() {
    try {
      console.log('🔍 Fetching domains from GoDaddy...');
      
      const response = await fetch(`${this.baseUrl}/v1/domains`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`GoDaddy API error: ${response.status}`);
      }

      const domains = await response.json();
      
      // GoDaddy returns array of domain objects with 'domain' property
      const domainNames = domains
        .filter(d => d.status === 'ACTIVE') // Only active domains
        .map(d => this.normalizeDomain(d.domain));

      console.log(`✅ Found ${domainNames.length} active domains on GoDaddy`);
      
      return domainNames;
    } catch (error) {
      console.error('❌ GoDaddy fetch error:', error);
      throw error;
    }
  }

  /**
   * Get detailed domain information
   */
  async getDomainDetails(domainName) {
    try {
      const response = await fetch(`${this.baseUrl}/v1/domains/${domainName}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch domain details: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Error fetching domain details for ${domainName}:`, error);
      throw error;
    }
  }

  getRateLimits() {
    return {
      requestsPerHour: 60,
      requestsPerDay: 1000,
      burstLimit: 10
    };
  }
}

/**
 * ============================================================
 * CLOUDFLARE ADAPTER
 * ============================================================
 * Priority: P0
 * Docs: https://api.cloudflare.com/
 */
class CloudflareAdapter extends RegistrarAdapter {
  constructor(credentials) {
    super(credentials);
    this.registrarName = 'cloudflare';
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
    // For Cloudflare: apiKey = API Token, apiSecret = Account ID (optional)
  }

  /**
   * Get authorization header for Cloudflare API
   */
  getAuthHeader() {
    return `Bearer ${this.apiKey}`;
  }

  /**
   * Test Cloudflare API connection
   */
  async testConnection() {
    try {
      // Test with user/zones endpoint
      const response = await fetch(`${this.baseUrl}/zones?per_page=1`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: `Cloudflare API error: ${errorData.errors?.[0]?.message || response.status}`,
          statusCode: response.status
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        message: 'Cloudflare connection successful',
        accountInfo: {
          domainsCount: data.result_info?.total_count || 0,
          registrar: 'Cloudflare'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.toString()
      };
    }
  }

  /**
   * Fetch all domains from Cloudflare account
   */
  async fetchDomains() {
    try {
      console.log('🔍 Fetching domains from Cloudflare...');
      
      let allDomains = [];
      let page = 1;
      let hasMore = true;
      const perPage = 50;

      while (hasMore) {
        const response = await fetch(
          `${this.baseUrl}/zones?per_page=${perPage}&page=${page}`,
          {
            method: 'GET',
            headers: {
              'Authorization': this.getAuthHeader(),
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Cloudflare API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.result) {
          const domainNames = data.result
            .filter(zone => zone.status === 'active')
            .map(zone => this.normalizeDomain(zone.name));
          
          allDomains = allDomains.concat(domainNames);
          
          // Check if there are more pages
          const totalPages = Math.ceil(data.result_info.total_count / perPage);
          hasMore = page < totalPages;
          page++;
        } else {
          hasMore = false;
        }
      }

      console.log(`✅ Found ${allDomains.length} active domains on Cloudflare`);
      
      return allDomains;
    } catch (error) {
      console.error('❌ Cloudflare fetch error:', error);
      throw error;
    }
  }

  getRateLimits() {
    return {
      requestsPerHour: 1200, // Cloudflare has generous limits
      requestsPerDay: 20000,
      burstLimit: 100
    };
  }
}

/**
 * ============================================================
 * NAMECHEAP ADAPTER
 * ============================================================
 * Priority: P1
 * Docs: https://www.namecheap.com/support/api/
 */
class NamecheapAdapter extends RegistrarAdapter {
  constructor(credentials) {
    super(credentials);
    this.registrarName = 'namecheap';
    this.baseUrl = process.env.NAMECHEAP_API_URL || 'https://api.namecheap.com/xml.response';
    this.username = credentials.username || credentials.apiKey;
    this.clientIp = credentials.clientIp || '0.0.0.0'; // Required by Namecheap
  }

  /**
   * Build Namecheap API request URL
   */
  buildRequestUrl(command, extraParams = {}) {
    const params = new URLSearchParams({
      ApiUser: this.username,
      ApiKey: this.apiSecret,
      UserName: this.username,
      ClientIp: this.clientIp,
      Command: command,
      ...extraParams
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Parse Namecheap XML response
   */
  async parseXmlResponse(response) {
    const text = await response.text();
    // Simple XML parsing - in production, use a proper XML parser
    const domainMatches = text.matchAll(/<DomainName[^>]*>([^<]+)<\/DomainName>/g);
    return Array.from(domainMatches, m => m[1]);
  }

  /**
   * Test Namecheap API connection
   */
  async testConnection() {
    try {
      const url = this.buildRequestUrl('namecheap.domains.getList', { PageSize: 1 });
      
      const response = await fetch(url, {
        method: 'GET'
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Namecheap API error: ${response.status}`,
          statusCode: response.status
        };
      }

      const text = await response.text();
      const isSuccess = text.includes('Status="OK"');
      
      return {
        success: isSuccess,
        message: isSuccess ? 'Namecheap connection successful' : 'Authentication failed',
        accountInfo: {
          registrar: 'Namecheap'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.toString()
      };
    }
  }

  /**
   * Fetch all domains from Namecheap account
   */
  async fetchDomains() {
    try {
      console.log('🔍 Fetching domains from Namecheap...');
      
      let allDomains = [];
      let page = 1;
      const pageSize = 100;
      let hasMore = true;

      while (hasMore) {
        const url = this.buildRequestUrl('namecheap.domains.getList', {
          PageSize: pageSize,
          Page: page
        });

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Namecheap API error: ${response.status}`);
        }

        const domains = await this.parseXmlResponse(response);
        
        if (domains.length > 0) {
          allDomains = allDomains.concat(domains.map(d => this.normalizeDomain(d)));
          page++;
          hasMore = domains.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`✅ Found ${allDomains.length} domains on Namecheap`);
      
      return allDomains;
    } catch (error) {
      console.error('❌ Namecheap fetch error:', error);
      throw error;
    }
  }

  getRateLimits() {
    return {
      requestsPerHour: 20, // Namecheap has strict limits
      requestsPerDay: 200,
      burstLimit: 3
    };
  }
}

/**
 * ============================================================
 * REGISTRAR ADAPTER FACTORY
 * ============================================================
 */
class RegistrarAdapterFactory {
  /**
   * Create appropriate adapter based on registrar code
   * @param {string} registrarCode - 'godaddy', 'cloudflare', 'namecheap', etc.
   * @param {object} credentials - API credentials
   * @returns {RegistrarAdapter}
   */
  static create(registrarCode, credentials) {
    const normalizedCode = registrarCode.toLowerCase();

    switch (normalizedCode) {
      case 'godaddy':
        return new GoDaddyAdapter(credentials);
      
      case 'cloudflare':
        return new CloudflareAdapter(credentials);
      
      case 'namecheap':
        return new NamecheapAdapter(credentials);
      
      // Add more registrars here as needed
      
      default:
        throw new Error(`Unsupported registrar: ${registrarCode}`);
    }
  }

  /**
   * Get list of supported registrars
   */
  static getSupportedRegistrars() {
    return [
      { code: 'godaddy', name: 'GoDaddy', priority: 1, status: 'active' },
      { code: 'cloudflare', name: 'Cloudflare', priority: 1, status: 'active' },
      { code: 'namecheap', name: 'Namecheap', priority: 2, status: 'active' },
      { code: 'dynadot', name: 'Dynadot', priority: 3, status: 'coming_soon' },
      { code: 'porkbun', name: 'Porkbun', priority: 3, status: 'coming_soon' }
    ];
  }

  /**
   * Check if registrar is supported
   */
  static isSupported(registrarCode) {
    return ['godaddy', 'cloudflare', 'namecheap'].includes(registrarCode.toLowerCase());
  }
}

module.exports = {
  RegistrarAdapter,
  GoDaddyAdapter,
  CloudflareAdapter,
  NamecheapAdapter,
  RegistrarAdapterFactory
};
