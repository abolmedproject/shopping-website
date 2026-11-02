@echo off
echo ========================================================
echo        Starting Medusa Commerce Full-Stack
echo ========================================================
echo.

echo [1/3] Checking Docker containers (PostgreSQL and Redis)...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo [WARNING] Docker Desktop is not running yet!
    echo Please open Docker Desktop and wait until it is fully started,
    echo then press any key to continue...
    pause >nul
)

docker compose up -d

echo.
echo [2/3] Starting Medusa Backend (Port 9000, Admin at /app)...
start "Medusa Backend and Admin (Port 9000)" cmd /k "pnpm run backend:dev"

echo.
echo [3/3] Starting Next.js Storefront (Port 8000)...
start "Next.js Storefront (Port 8000)" cmd /k "pnpm run storefront:dev"

echo.
echo ========================================================
echo Services are starting in separate windows:
echo - Storefront:       http://localhost:8000
echo - Medusa Backend:   http://localhost:9000
echo - Admin Dashboard:  http://localhost:9000/app
echo.
echo Admin credentials:
echo - Email:    admin@medusa-test.com
echo - Password: supersecret123
echo ========================================================
pause
