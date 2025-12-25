@echo off
REM Quick Deployment Script for Windows
REM Usage: deploy.bat

echo.
echo ============================================================
echo 🚀 DEPLOYING DOMAINSELLER BACKEND
echo ============================================================
echo.

REM Check if we're in the right directory
if not exist "server.js" (
    echo ✗ Error: server.js not found!
    echo   Please run this script from the project root directory
    exit /b 1
)

REM Step 1: Pull latest code
echo → Pulling latest code...
git pull
if %errorlevel% neq 0 (
    echo ✗ Git pull failed!
    exit /b 1
)
echo ✓ Code updated
echo.

REM Step 2: Install dependencies
echo → Checking dependencies...
call npm install
echo ✓ Dependencies up to date
echo.

REM Step 3: Run database migrations
echo → Running database migrations...
call npm run migrate
if %errorlevel% neq 0 (
    echo ✗ Migration failed!
    echo   Please check the error above and fix before continuing
    exit /b 1
)
echo ✓ Migrations complete
echo.

echo ============================================================
echo ✅ LOCAL BUILD COMPLETE!
echo ============================================================
echo.
echo To deploy to production server:
echo   1. Commit changes: git add . ^&^& git commit -m "Update"
echo   2. Push: git push
echo   3. SSH to server: ssh root@your-server
echo   4. Run: cd /root/DomainSeller-Backend ^&^& ./deploy.sh
echo.
echo Or deploy directly from Windows:
echo   1. Push code: git push
echo   2. SSH and deploy:
echo      ssh root@your-server "cd /root/DomainSeller-Backend && bash deploy.sh"
echo.
pause

