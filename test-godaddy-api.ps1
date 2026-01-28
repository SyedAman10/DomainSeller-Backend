# ============================================================
# GODADDY API CONNECTION TEST SCRIPT (PowerShell)
# ============================================================
# Purpose: Test your GoDaddy API credentials before connecting
# Usage: .\test-godaddy-api.ps1
# ============================================================

# Colors
$Green = 'Green'
$Red = 'Red'
$Yellow = 'Yellow'
$Cyan = 'Cyan'

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "GODADDY API CONNECTION TEST" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Prompt for API credentials
Write-Host "Enter your GoDaddy API credentials:" -ForegroundColor Yellow
Write-Host ""
$ApiKey = Read-Host "API Key"
$ApiSecret = Read-Host "API Secret"

if ([string]::IsNullOrWhiteSpace($ApiKey) -or [string]::IsNullOrWhiteSpace($ApiSecret)) {
    Write-Host ""
    Write-Host "Error: API Key and Secret are required" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Testing connection to GoDaddy API..." -ForegroundColor Blue
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Build authorization header
$authHeader = "sso-key ${ApiKey}:${ApiSecret}"

# Test the API
try {
    $response = Invoke-WebRequest -Uri "https://api.godaddy.com/v1/domains" `
        -Headers @{
            "Authorization" = $authHeader
            "Accept" = "application/json"
        } `
        -Method GET `
        -ErrorAction SilentlyContinue `
        -UseBasicParsing

    $statusCode = $response.StatusCode
    $body = $response.Content

} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $body = ""
    
    try {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $body = $streamReader.ReadToEnd()
        $streamReader.Close()
    } catch {
        $body = $_.Exception.Message
    }
}

Write-Host "HTTP Status Code: $statusCode" -ForegroundColor Cyan
Write-Host ""

# Check response
if ($statusCode -eq 200) {
    Write-Host "SUCCESS! Your GoDaddy API credentials are valid!" -ForegroundColor Green
    Write-Host ""
    
    # Parse domains
    $domains = $body | ConvertFrom-Json
    $domainCount = $domains.Count
    
    Write-Host "Account Information:" -ForegroundColor Cyan
    Write-Host "   Domains Found: $domainCount"
    Write-Host ""
    
    if ($domainCount -gt 0) {
        Write-Host "Your Domains:" -ForegroundColor Cyan
        foreach ($domain in $domains) {
            Write-Host "   - $($domain.domain) ($($domain.status))" -ForegroundColor White
        }
    } else {
        Write-Host "No domains found in this GoDaddy account" -ForegroundColor Yellow
        Write-Host "   Add domains to your account first"
    }
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "You can now connect this account in DomainSeller!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    
} elseif ($statusCode -eq 401) {
    Write-Host "AUTHENTICATION FAILED (401)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Problem: Your API key or secret is incorrect" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Cyan
    Write-Host "   1. Double-check your API Key and Secret for typos"
    Write-Host "   2. Make sure you copied the ENTIRE key and secret"
    Write-Host "   3. Verify no extra spaces were copied"
    Write-Host "   4. Create a new API key at: https://developer.godaddy.com/keys"
    
} elseif ($statusCode -eq 403) {
    Write-Host "ACCESS DENIED (403)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Problem: Your credentials do not have permission or are for the wrong environment" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Most Common Issue:" -ForegroundColor Cyan
    Write-Host "   You are using OTE/TEST keys instead of PRODUCTION keys"
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Cyan
    Write-Host "   1. Create PRODUCTION keys at: https://developer.godaddy.com/keys"
    Write-Host "   2. Select Production environment (NOT OTE)"
    Write-Host "   3. Enable Domain permissions"
    Write-Host "   4. Make sure your GoDaddy account has active domains"
    Write-Host ""
    Write-Host "Error Details:" -ForegroundColor Cyan
    if ($body.Length -gt 500) {
        Write-Host $body.Substring(0, 500)
    } else {
        Write-Host $body
    }
    
} elseif ($statusCode -eq 429) {
    Write-Host "RATE LIMIT EXCEEDED (429)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Problem: Too many API requests" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Solution:" -ForegroundColor Cyan
    Write-Host "   Wait a few minutes before trying again"
    
} else {
    Write-Host "UNEXPECTED ERROR ($statusCode)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    if ($body.Length -gt 500) {
        Write-Host $body.Substring(0, 500)
    } else {
        Write-Host $body
    }
    Write-Host ""
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Cyan
    Write-Host "   1. Check your internet connection"
    Write-Host "   2. Verify GoDaddy API is not down: https://status.godaddy.com"
    Write-Host "   3. Try creating new API credentials"
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Resources:" -ForegroundColor Cyan
Write-Host "   - Create API Keys: https://developer.godaddy.com/keys"
Write-Host "   - API Docs: https://developer.godaddy.com/doc/endpoint/domains"
Write-Host "   - Setup Guide: .\GODADDY_API_SETUP.md"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
