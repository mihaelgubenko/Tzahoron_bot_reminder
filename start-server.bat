@echo off
chcp 65001 >nul
cls
echo ================================================
echo   Liora Landing Page - Server Startup
echo ================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking Node.js...
node --version
echo.

REM Check if dependencies are installed
echo [2/3] Checking dependencies...
if not exist "node_modules\express" (
    echo Dependencies not found. Installing...
    echo This may take a minute, please wait...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies
        echo Please check the error above
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
) else (
    echo Dependencies found. Skipping installation.
)
echo.

REM Start server and open browser
echo [3/3] Starting server...
echo.
echo ================================================
echo   Server Information
echo ================================================
echo.
echo Main page:    http://localhost:3000
echo Admin panel:  http://localhost:3000/admin.html
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul

REM Open main page
start http://localhost:3000

REM Wait and open admin panel
timeout /t 2 /nobreak >nul
start http://localhost:3000/admin.html

echo.
echo ================================================
echo   Server is running!
echo ================================================
echo.
echo Press Ctrl+C to stop the server
echo.
echo ================================================
echo.

REM Start server (this will block until Ctrl+C)
node server.js

pause
