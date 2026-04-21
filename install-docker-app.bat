@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo   Marketplace Card App - Docker Install
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

if exist ".env" (
    echo [OK] Found .env file
) else (
    if exist ".env.example" (
        echo [INFO] .env file not found. Creating it from .env.example...
        copy /Y ".env.example" ".env" >nul
        echo [OK] .env file created. Check API keys before full use.
    ) else (
        echo [WARNING] Neither .env nor .env.example was found.
    )
)

echo.
echo [INFO] Building Docker images...
echo.

docker compose version >nul 2>&1
if not errorlevel 1 (
    docker compose build
    set EXIT_CODE=%ERRORLEVEL%
    goto :finish
)

docker-compose --version >nul 2>&1
if not errorlevel 1 (
    docker-compose build
    set EXIT_CODE=%ERRORLEVEL%
    goto :finish
)

echo [ERROR] Neither "docker compose" nor "docker-compose" is available.
pause
exit /b 1

:finish
echo.
if "%EXIT_CODE%"=="0" (
    echo [OK] Docker images built successfully.
) else (
    echo [ERROR] Docker build failed with exit code %EXIT_CODE%.
)
echo.
pause
exit /b %EXIT_CODE%
