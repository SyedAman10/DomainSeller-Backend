@echo off
echo.
echo ================================================================
echo   ENABLING TEST MODE TRANSFER SIMULATION
echo ================================================================
echo.
echo This will add SKIP_STRIPE_TRANSFER_IN_TEST=true to your .env file
echo.
echo What this does:
echo - Simulates Stripe transfers in test mode
echo - Bypasses "insufficient balance" errors
echo - Allows full testing of escrow flow
echo - Only affects TEST mode (production always does real transfers)
echo.
pause
echo.
echo Adding to .env file...
echo SKIP_STRIPE_TRANSFER_IN_TEST=true >> .env
echo.
echo ✅ Done!
echo.
echo Now restart your server:
echo   pm2 restart all
echo.
echo Or manually restart if not using PM2
echo.
pause

