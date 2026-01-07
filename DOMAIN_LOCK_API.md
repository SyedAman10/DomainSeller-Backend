# Domain Lock Check API Documentation

## Endpoint: Check Domain Lock Status

**URL:** `POST /backend/domains/check-lock-status`

Checks if a domain is locked for transfer by performing a WHOIS lookup. This is a critical step before attempting any domain transfer.

---

## Request

### Headers
```
Content-Type: application/json
```

### Body
```json
{
  "domainName": "example.com"
}
```

**Parameters:**
- `domainName` (string, required) - The domain name to check

---

## Response

### Success Response (Unlocked Domain)

```json
{
  "success": true,
  "domainName": "example.com",
  "isLocked": false,
  "status": "unlocked",
  "statusCodes": ["ok", "clientUpdateProhibited"],
  "canTransfer": true,
  "registrar": "GoDaddy.com, LLC",
  "expiryDate": "2025-12-15T00:00:00.000Z",
  "nameservers": [
    "ns1.example.com",
    "ns2.example.com"
  ],
  "message": "✅ Domain is UNLOCKED and ready for transfer.",
  "unlockInstructions": null,
  "detailedInfo": {
    "registrar": "GoDaddy.com, LLC",
    "expiresOn": "2025-12-15T00:00:00.000Z",
    "nameservers": [
      "ns1.example.com",
      "ns2.example.com"
    ]
  }
}
```

### Success Response (Locked Domain)

```json
{
  "success": true,
  "domainName": "example.com",
  "isLocked": true,
  "status": "locked",
  "statusCodes": [
    "clientTransferProhibited",
    "serverTransferProhibited"
  ],
  "canTransfer": false,
  "registrar": "GoDaddy.com, LLC",
  "expiryDate": "2025-12-15T00:00:00.000Z",
  "nameservers": [
    "ns1.example.com",
    "ns2.example.com"
  ],
  "message": "⚠️ Domain transfer is LOCKED. You must unlock it at your registrar before transfer.",
  "unlockInstructions": {
    "steps": [
      "Log in to your GoDaddy account",
      "Go to \"My Products\" → \"Domains\"",
      "Click on the domain you want to unlock",
      "Scroll down to \"Additional Settings\"",
      "Toggle \"Domain Lock\" to OFF",
      "Confirm the change"
    ],
    "estimatedTime": "5 minutes",
    "url": "https://www.godaddy.com/help/unlock-my-domain-410"
  },
  "detailedInfo": {
    "registrar": "GoDaddy.com, LLC",
    "expiresOn": "2025-12-15T00:00:00.000Z",
    "nameservers": [
      "ns1.example.com",
      "ns2.example.com"
    ]
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "domainName is required"
}
```

```json
{
  "success": false,
  "error": "Invalid domain name format"
}
```

```json
{
  "success": false,
  "domainName": "example.com",
  "error": "WHOIS lookup failed",
  "message": "Unable to verify transfer lock status. Please check manually with your registrar.",
  "canTransfer": null
}
```

---

## Status Codes

### HTTP Status Codes
- `200 OK` - Request successful (domain checked)
- `400 Bad Request` - Invalid request (missing/invalid domain name)
- `500 Internal Server Error` - Server error during WHOIS lookup

### Domain Status Codes (EPP)
Common EPP status codes returned in `statusCodes`:

- `ok` - Domain is available for transfer
- `clientTransferProhibited` - Transfer locked by registrar (can be unlocked by owner)
- `serverTransferProhibited` - Transfer locked by registry (usually requires support ticket)
- `clientUpdateProhibited` - Domain details locked for editing
- `serverUpdateProhibited` - Domain details locked by registry
- `pendingTransfer` - Transfer is currently in progress
- `redemptionPeriod` - Domain expired and in grace period

---

## Transfer Lock Indicators

The system checks for these indicators in WHOIS data:

1. **clientTransferProhibited** - Most common, can be unlocked by owner
2. **serverTransferProhibited** - Requires registrar support
3. **transfer-lock** - Generic lock indicator
4. **transferProhibited** - General transfer block

If **any** of these are found, `isLocked` will be `true`.

---

## Registrar-Specific Unlock Instructions

The system provides unlock instructions for these registrars:

### GoDaddy
- 5 minute process
- Steps: Login → My Products → Domains → Toggle Domain Lock OFF
- Help URL: https://www.godaddy.com/help/unlock-my-domain-410

### Namecheap
- 5 minute process  
- Steps: Login → Domain List → Manage → Domain Lock → Unlock
- Help URL: https://www.namecheap.com/support/knowledgebase/article.aspx/268/

### Cloudflare
- Instant process
- Steps: Dashboard → Manage → Configuration → Unlock Domain
- Help URL: https://developers.cloudflare.com/registrar/get-started/transfer-domain/

### Google Domains
- 2 minute process
- Steps: My Domains → Select → Registration → Unlock
- Help URL: https://support.google.com/domains/answer/3251242

### Other Registrars
- Generic instructions provided
- User directed to contact registrar support

---

## Frontend Integration Example

### React Component

```jsx
import { useState } from 'react';

function DomainLockChecker() {
  const [domain, setDomain] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const checkLockStatus = async () => {
    setChecking(true);
    setResult(null);

    try {
      const response = await fetch('/backend/domains/check-lock-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainName: domain })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to check domain status'
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="domain-checker">
      <input
        type="text"
        placeholder="example.com"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
      />
      <button onClick={checkLockStatus} disabled={checking}>
        {checking ? 'Checking...' : 'Check Lock Status'}
      </button>

      {result && (
        <div className={`result ${result.isLocked ? 'locked' : 'unlocked'}`}>
          {result.success ? (
            <>
              <div className="status">
                {result.isLocked ? '🔒 Domain is LOCKED' : '✅ Domain is UNLOCKED'}
              </div>
              
              <div className="details">
                <p><strong>Registrar:</strong> {result.registrar}</p>
                <p><strong>Expires:</strong> {new Date(result.expiryDate).toLocaleDateString()}</p>
                <p><strong>Can Transfer:</strong> {result.canTransfer ? 'Yes' : 'No'}</p>
              </div>

              {result.isLocked && result.unlockInstructions && (
                <div className="unlock-instructions">
                  <h4>How to Unlock:</h4>
                  <ol>
                    {result.unlockInstructions.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  <a href={result.unlockInstructions.url} target="_blank">
                    View Full Instructions →
                  </a>
                  <p>Estimated time: {result.unlockInstructions.estimatedTime}</p>
                </div>
              )}
            </>
          ) : (
            <div className="error">{result.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Vanilla JavaScript

```javascript
async function checkDomainLock(domainName) {
  try {
    const response = await fetch('/backend/domains/check-lock-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domainName })
    });

    const data = await response.json();

    if (data.success) {
      if (data.isLocked) {
        console.log('⚠️ Domain is locked');
        console.log('Instructions:', data.unlockInstructions);
        return { canTransfer: false, reason: 'Domain is locked' };
      } else {
        console.log('✅ Domain is ready for transfer');
        return { canTransfer: true };
      }
    } else {
      console.error('Failed to check:', data.error);
      return { canTransfer: null, error: data.error };
    }
  } catch (error) {
    console.error('Request failed:', error);
    return { canTransfer: null, error: error.message };
  }
}

// Usage
const result = await checkDomainLock('example.com');
if (result.canTransfer) {
  // Proceed with transfer
  proceedToTransfer();
} else if (result.canTransfer === false) {
  // Show unlock instructions
  showUnlockInstructions();
} else {
  // Error occurred
  showError(result.error);
}
```

---

## Use Cases

### 1. Pre-Transfer Validation

Check domain before showing transfer form:

```javascript
// Before showing "Initiate Transfer" button
const lockStatus = await checkDomainLock(domainName);

if (lockStatus.isLocked) {
  showWarning('Domain must be unlocked first');
  showUnlockButton(lockStatus.unlockInstructions);
} else {
  enableTransferButton();
}
```

### 2. Seller Onboarding

Verify domain eligibility when seller adds domain:

```javascript
// When seller adds domain to portfolio
const status = await checkDomainLock(newDomain);

if (!status.canTransfer) {
  alert('This domain cannot be transferred. Please unlock it first.');
  showUnlockGuide(status.unlockInstructions);
}
```

### 3. Real-Time Transfer Monitoring

Check status during transfer process:

```javascript
// Poll every 5 minutes during transfer
setInterval(async () => {
  const status = await checkDomainLock(domainInTransfer);
  
  if (!status.isLocked && previouslyLocked) {
    notifySeller('Domain has been unlocked! Transfer can proceed.');
  }
}, 5 * 60 * 1000);
```

---

## Best Practices

1. **Cache Results**: WHOIS lookups can be slow. Cache results for 5-10 minutes.

2. **Handle Errors Gracefully**: WHOIS may fail. Always have fallback UI.

3. **Show Progress**: WHOIS lookups take 2-5 seconds. Show loading state.

4. **Provide Context**: Explain WHY domain needs to be unlocked.

5. **Direct Links**: Link directly to registrar's unlock page when possible.

6. **Validate Input**: Check domain format before making request.

---

## Rate Limiting

⚠️ WHOIS servers have rate limits. Implement caching:

```javascript
// Cache lock status for 10 minutes
const cache = new Map();

async function getCachedLockStatus(domain) {
  const cached = cache.get(domain);
  
  if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
    return cached.data;
  }
  
  const data = await checkDomainLock(domain);
  cache.set(domain, { data, timestamp: Date.now() });
  
  return data;
}
```

---

## Testing

### Test with Known Domains

```bash
# Locked domain (most domains)
curl -X POST http://localhost:5000/backend/domains/check-lock-status \
  -H "Content-Type: application/json" \
  -d '{"domainName": "google.com"}'

# Your own domain
curl -X POST http://localhost:5000/backend/domains/check-lock-status \
  -H "Content-Type: application/json" \
  -d '{"domainName": "yourtest.com"}'
```

### Expected Response Times

- Fast WHOIS servers: 1-3 seconds
- Slow WHOIS servers: 5-10 seconds
- Timeout: 30 seconds (implement timeout handling)

---

## Troubleshooting

### Issue: "Unable to verify transfer lock status"

**Causes:**
- WHOIS server is down
- Domain doesn't exist
- Network issues
- Rate limiting

**Solution:** 
- Retry after 1 minute
- Use cached data if available
- Show manual check option

### Issue: Status codes are confusing

**Solution:** Use simplified UI:
```
isLocked = true  → "Domain is locked 🔒"
isLocked = false → "Domain is unlocked ✅"
canTransfer = null → "Unable to verify ⚠️"
```

---

## Next Steps

After checking lock status:

1. **If Locked** → Show unlock instructions
2. **If Unlocked** → Proceed to get auth code
3. **If Error** → Allow manual verification

---

**Last Updated:** January 5, 2026  
**Version:** 1.0.0  
**Endpoint:** `/backend/domains/check-lock-status`

