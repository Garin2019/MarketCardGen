@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo   Marketplace Card App - Docker Start
echo ==========================================
echo.

docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or is not available in PATH.
    echo Install Docker Desktop and try again.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is installed, but Docker Desktop is not running.
    echo Start Docker Desktop and try again.
    pause
    exit /b 1
)

echo.
echo [INFO] Starting containers...
echo.

docker compose version >nul 2>&1
if not errorlevel 1 (
    docker compose up
    set EXIT_CODE=%ERRORLEVEL%
    goto :finish
)

docker-compose --version >nul 2>&1
if not errorlevel 1 (
    docker-compose up
    set EXIT_CODE=%ERRORLEVEL%
    goto :finish
)

echo [ERROR] Neither "docker compose" nor "docker-compose" is available.
pause
exit /b 1

:finish
echo.
if "%EXIT_CODE%"=="0" (
    echo [OK] Docker containers stopped normally.
) else (
    echo [ERROR] Docker start command finished with exit code %EXIT_CODE%.
)
echo.
pause
exit /b %EXIT_CODE%
