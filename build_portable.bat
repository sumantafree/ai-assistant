@echo off
setlocal enabledelayedexpansion
echo.
echo ====================================================
echo   AI Desktop Assistant - Build PORTABLE Version
echo   (No PyInstaller needed - simpler and faster!)
echo ====================================================
echo.
echo This creates a folder you can zip and share.
echo The target PC needs Python installed.
echo Use build_exe.bat for a true single-installer.
echo.

set ROOT=%~dp0
set OUT=%ROOT%portable-build
set APP=%OUT%\AI-Desktop-Assistant

:: ── Clean output ─────────────────────────────────────
if exist "%APP%" rmdir /s /q "%APP%"
mkdir "%APP%"
mkdir "%APP%\backend"
mkdir "%APP%\frontend"
mkdir "%APP%\database"
mkdir "%APP%\ai-agents"
mkdir "%APP%\automation"
mkdir "%APP%\voice"
mkdir "%APP%\launcher"

echo [1/5] Copying backend source...
xcopy "%ROOT%backend\*.py" "%APP%\backend\" /Q /Y >nul
xcopy "%ROOT%backend\api" "%APP%\backend\api\" /E /I /Q /Y >nul
xcopy "%ROOT%backend\core" "%APP%\backend\core\" /E /I /Q /Y >nul
xcopy "%ROOT%backend\.env" "%APP%\backend\" /Q /Y >nul
copy "%ROOT%backend\requirements.txt" "%APP%\backend\" >nul

xcopy "%ROOT%database\*.py" "%APP%\database\" /Q /Y >nul
xcopy "%ROOT%ai-agents\*.py" "%APP%\ai-agents\" /Q /Y >nul
xcopy "%ROOT%automation\*.py" "%APP%\automation\" /Q /Y >nul
xcopy "%ROOT%voice\*.py" "%APP%\voice\" /Q /Y >nul
echo [OK] Backend source copied

echo [2/5] Building Next.js frontend...
cd "%ROOT%frontend"
call npm run build 2>nul
if exist ".next\standalone" (
    xcopy ".next\standalone\*" "%APP%\frontend\" /E /I /Q /Y >nul
    xcopy ".next\static" "%APP%\frontend\.next\static\" /E /I /Q /Y >nul
    if exist "public" xcopy "public" "%APP%\frontend\public\" /E /I /Q /Y >nul
    echo [OK] Frontend built (standalone)
) else (
    echo [WARN] Building in dev mode (standalone not available)
    copy "package.json" "%APP%\frontend\" >nul
)
cd "%ROOT%"

echo [3/5] Creating launcher scripts...

:: Python setup script
(
echo @echo off
echo echo Setting up AI Desktop Assistant...
echo cd /d "%%~dp0"
echo python -m pip install -r backend\requirements.txt --quiet
echo python database\seed.py
echo echo Setup complete!
echo pause
) > "%APP%\setup.bat"

:: Start script
(
echo @echo off
echo echo Starting AI Desktop Assistant...
echo cd /d "%%~dp0"
echo set PYTHONPATH=%%~dp0;%%~dp0backend;%%~dp0ai-agents;%%~dp0automation;%%~dp0database;%%~dp0voice
echo start "Backend" cmd /c "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"
echo timeout /t 5 /nobreak ^>nul
echo start "Frontend" cmd /c "node frontend\server.js"
echo timeout /t 6 /nobreak ^>nul
echo start http://localhost:3000
echo echo.
echo echo AI Assistant is running!
echo echo Dashboard: http://localhost:3000
echo echo Login: admin / admin123
) > "%APP%\Start AI Assistant.bat"

echo [4/5] Copying config files...
copy "%ROOT%backend\.env" "%APP%\backend\.env" >nul

echo [5/5] Creating README...
(
echo AI Desktop Assistant - Portable Version
echo =========================================
echo.
echo REQUIREMENTS:
echo   - Python 3.10 or higher
echo   - Node.js 18 or higher
echo.
echo FIRST TIME SETUP:
echo   1. Run setup.bat  (installs Python packages^)
echo   2. Edit backend\.env - add your GEMINI_API_KEY
echo      Get free key: https://aistudio.google.com/app/apikey
echo.
echo TO RUN:
echo   Double-click: Start AI Assistant.bat
echo.
echo LOGIN:
echo   URL: http://localhost:3000
echo   Username: admin
echo   Password: admin123
) > "%APP%\README.txt"

:: ── Create ZIP ────────────────────────────────────────
echo.
echo Creating ZIP archive...
cd "%OUT%"
powershell -Command "Compress-Archive -Path 'AI-Desktop-Assistant' -DestinationPath 'AI-Desktop-Assistant-Portable.zip' -Force"

echo.
echo ====================================================
echo   PORTABLE BUILD COMPLETE!
echo ====================================================
echo.
echo Output folder: %OUT%\
echo ZIP file: %OUT%\AI-Desktop-Assistant-Portable.zip
echo.
echo To use on another PC:
echo   1. Copy the ZIP to the target PC
echo   2. Extract it
echo   3. Run setup.bat (once)
echo   4. Run "Start AI Assistant.bat"
echo.
explorer "%OUT%"
pause
