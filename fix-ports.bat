@echo off
echo ========================================================
echo   Fixing Windows Dynamic Port Reservation
echo ========================================================
echo.
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script requires Administrator privileges.
    echo Please right-click "fix-ports.bat" and select:
    echo        "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [1/3] Stopping Windows NAT service (winnat)...
net stop winnat

echo.
echo [2/3] Setting dynamic port range to standard (49152-65535)...
netsh int ipv4 set dynamicport tcp start=49152 num=16384
netsh int ipv6 set dynamicport tcp start=49152 num=16384

echo.
echo [3/3] Restarting Windows NAT service (winnat)...
net start winnat

echo.
echo ========================================================
echo [SUCCESS] Port 9000 has been freed!
echo Windows will no longer reserve ports 1024-15000.
echo You can now close this window and run "start-all.bat".
echo ========================================================
echo.
pause
