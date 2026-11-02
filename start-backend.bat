@echo off
echo ========================================================
echo            Starting Medusa Backend (Port 9000)
echo ========================================================
echo.
echo Checking database and cache containers...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo [WARNING] Docker Desktop is not running yet!
    echo Please open Docker Desktop and wait until it is fully started.
    pause
)

docker compose up -d
echo Starting backend server...
pnpm run backend:dev
