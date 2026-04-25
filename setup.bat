@echo off
echo ============================================
echo   AI Desktop Assistant - Full Setup
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.10+ from https://python.org
    pause
    exit /b 1
)
echo [OK] Python found

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found

echo.
echo [1/4] Setting up Python backend...
cd backend

:: Create virtual environment
if not exist venv (
    python -m venv venv
    echo [OK] Virtual environment created
)

:: Activate and install
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
echo [OK] Python packages installed

:: Copy .env
if not exist .env (
    copy .env.example .env
    echo [IMPORTANT] Created backend\.env - EDIT IT with your API keys!
)

:: Seed database
python ..\database\seed.py
echo [OK] Database seeded

cd ..
echo.
echo [2/4] Setting up Next.js frontend...
cd frontend

if not exist node_modules (
    call npm install --legacy-peer-deps
)
echo [OK] Frontend dependencies installed

cd ..
echo.
echo [3/4] Setting up Electron desktop...
cd desktop

if not exist node_modules (
    call npm install
)
echo [OK] Electron dependencies installed

cd ..
echo.
echo ============================================
echo   SETUP COMPLETE!
echo ============================================
echo.
echo NEXT STEPS:
echo.
echo 1. Edit backend\.env with your API keys:
echo    - GEMINI_API_KEY (from Google AI Studio)
echo    - SMTP_USER / SMTP_PASSWORD (Gmail App Password)
echo.
echo 2. Run the application:
echo    start_all.bat
echo.
echo OR run services separately:
echo    start_backend.bat
echo    start_frontend.bat
echo.
echo Demo login: admin / admin123
echo.
pause
