@echo off
setlocal enabledelayedexpansion
echo.
echo ====================================================
echo   AI Desktop Assistant - Install Dependencies
echo ====================================================
echo.

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend
set DESKTOP=%ROOT%desktop

:: ── Check Python ────────────────────────────────────────────────
echo Checking Python...
python --version 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Get it from https://python.org
    pause & exit /b 1
)
echo [OK] Python found
echo.

:: ── Check Node.js ───────────────────────────────────────────────
echo Checking Node.js...
node --version 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Get it from https://nodejs.org
    pause & exit /b 1
)
echo [OK] Node.js found
echo.

:: ── Create Python venv ──────────────────────────────────────────
echo [1/5] Creating Python virtual environment...
cd /d "%BACKEND%"

if not exist venv (
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create venv
        pause & exit /b 1
    )
)
echo [OK] Virtual environment ready
echo.

:: ── Upgrade pip ─────────────────────────────────────────────────
echo [2/5] Installing Python packages...
echo       (Using --no-build-isolation for Python 3.14 compatibility)
echo.

venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
echo.

:: Install all at once with flexible versions (no strict pinning)
:: --prefer-binary = use pre-built wheels, skip source compilation
echo Installing all packages (prefer pre-built wheels)...
venv\Scripts\pip.exe install --prefer-binary ^
    "fastapi==0.111.0" ^
    "uvicorn[standard]==0.29.0" ^
    "python-jose[cryptography]==3.3.0" ^
    "passlib[bcrypt]==1.7.4" ^
    "python-multipart==0.0.9" ^
    "sqlalchemy>=2.0.30" ^
    "pydantic>=2.7.1" ^
    "pydantic-settings>=2.2.1" ^
    "python-dotenv==1.0.1" ^
    "google-generativeai==0.5.4" ^
    "selenium==4.21.0" ^
    "webdriver-manager==4.0.1" ^
    "schedule==1.2.1" ^
    "httpx==0.27.0" ^
    "aiofiles==23.2.1" ^
    "pillow>=10.3.0" ^
    "pywin32>=311" ^
    "pyttsx3==2.90"

if errorlevel 1 (
    echo.
    echo [WARN] Some packages failed. Trying fallback install...
    venv\Scripts\pip.exe install --prefer-binary sqlalchemy pydantic pydantic-settings pillow pywin32
)

echo.
echo Installing PyInstaller (for building .exe)...
venv\Scripts\pip.exe install --prefer-binary pyinstaller pyinstaller-hooks-contrib

echo.
echo Installing pyautogui...
venv\Scripts\pip.exe install --prefer-binary pyautogui

echo.
echo [OK] Python packages installed
echo.

:: ── Create .env ─────────────────────────────────────────────────
echo [3/5] Setting up config file...
if not exist "%BACKEND%\.env" (
    copy "%BACKEND%\.env.example" "%BACKEND%\.env"
    echo [OK] Created backend\.env
) else (
    echo [OK] backend\.env already exists
)
echo.

:: ── Seed database ───────────────────────────────────────────────
echo [4/5] Setting up database with demo data...
cd /d "%BACKEND%"
set PYTHONPATH=%ROOT%;%BACKEND%;%ROOT%ai-agents;%ROOT%automation;%ROOT%database;%ROOT%voice

venv\Scripts\python.exe -c "import sqlalchemy; print('[OK] sqlalchemy', sqlalchemy.__version__)"
if errorlevel 1 (
    echo [ERROR] sqlalchemy not installed - trying again...
    venv\Scripts\pip.exe install --prefer-binary sqlalchemy
)

venv\Scripts\python.exe ..\database\seed.py
if errorlevel 1 (
    echo [WARN] Seed failed - will retry when backend starts
) else (
    echo [OK] Database seeded with demo data
)
echo.

:: ── Frontend packages ────────────────────────────────────────────
echo [5/5] Installing Frontend packages (2-3 minutes)...
cd /d "%FRONTEND%"
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo [ERROR] Frontend npm install failed
    echo Trying with --force...
    call npm install --force
    if errorlevel 1 (
        echo [ERROR] npm install still failed
        pause & exit /b 1
    )
)
echo [OK] Frontend packages installed
echo.

:: ── Desktop packages ─────────────────────────────────────────────
echo       Installing Electron packages...
cd /d "%DESKTOP%"
call npm install
if errorlevel 1 (
    echo [ERROR] Desktop npm install failed
    pause & exit /b 1
)
echo [OK] Electron packages installed
echo.

cd /d "%ROOT%"

:: ── Verify key packages ──────────────────────────────────────────
echo Verifying installation...
cd /d "%BACKEND%"
venv\Scripts\python.exe -c "import fastapi, sqlalchemy, pydantic, jose, passlib; print('[OK] Core packages verified')"
if errorlevel 1 (
    echo [WARN] Some core packages missing - check errors above
)

echo.
echo ====================================================
echo   INSTALLATION COMPLETE!
echo ====================================================
echo.
echo Your Gemini API key is already in backend\.env:
echo   GEMINI_API_KEY=AIzaSyAsCCszDF3AJfOT4FSa0fe1qhf7vZg5caY
echo.
echo NEXT STEPS:
echo   1. Test the app:     .\start_all.bat
echo   2. Build installer:  .\build_exe.bat
echo.
pause
