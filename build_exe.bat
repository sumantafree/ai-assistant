@echo off
setlocal enabledelayedexpansion
echo.
echo ====================================================
echo   AI Desktop Assistant - Build Windows Installer
echo ====================================================
echo.

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend
set DESKTOP=%ROOT%desktop
set DIST=%ROOT%dist
set BACKEND_DIST=%ROOT%backend-dist
set FRONTEND_DIST=%ROOT%frontend-dist

:: ── Pre-flight checks ────────────────────────────────
echo [CHECK] Verifying setup...

if not exist "%BACKEND%\venv\Scripts\python.exe" (
    echo [ERROR] Python venv not found!
    echo Please run install_dependencies.bat first
    pause & exit /b 1
)

if not exist "%FRONTEND%\node_modules" (
    echo [ERROR] Frontend node_modules not found!
    echo Please run install_dependencies.bat first
    pause & exit /b 1
)

if not exist "%BACKEND%\.env" (
    echo [ERROR] backend\.env not found!
    echo Please run install_dependencies.bat first
    pause & exit /b 1
)

echo [OK] All prerequisites found
echo.

:: ── STEP 1: Generate Icons ───────────────────────────
echo [1/4] Generating app icons...
if not exist "%DESKTOP%\assets" mkdir "%DESKTOP%\assets"

"%BACKEND%\venv\Scripts\pip.exe" install pillow --quiet 2>nul
"%BACKEND%\venv\Scripts\python.exe" "%DESKTOP%\assets\create-icons.py" 2>nul

if not exist "%DESKTOP%\assets\icon.ico" (
    echo [WARN] Custom icon generation failed - creating minimal fallback icon...
    "%BACKEND%\venv\Scripts\python.exe" -c "
from PIL import Image, ImageDraw
import os
out = r'%DESKTOP%\assets'
img = Image.new('RGBA', (256,256), (37,99,235,255))
d = ImageDraw.Draw(img)
img.save(os.path.join(out, 'icon.png'))
img.save(os.path.join(out, 'tray-icon.png'))
img.save(os.path.join(out, 'icon.ico'), format='ICO', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
print('Fallback icons created')
" 2>nul
)
echo [OK] Icons ready
echo.

:: ── STEP 2: Build Backend .exe ───────────────────────
echo [2/4] Building Python backend into .exe...
echo       (This takes 5-10 minutes - please wait)
echo.

if not exist "%BACKEND_DIST%" mkdir "%BACKEND_DIST%"

cd "%BACKEND%"
call venv\Scripts\activate.bat

:: Set PYTHONPATH to find all modules
set PYTHONPATH=%BACKEND%;%ROOT%;%ROOT%ai-agents;%ROOT%automation;%ROOT%database;%ROOT%voice

pyinstaller backend.spec ^
    --clean ^
    --noconfirm ^
    --distpath "%BACKEND_DIST%"

if errorlevel 1 (
    echo.
    echo [ERROR] PyInstaller failed!
    echo.
    echo Common fixes:
    echo   1. Run: install_dependencies.bat
    echo   2. Check the error message above
    echo   3. Try the ALTERNATIVE BUILD below
    echo.
    echo ─────────────────────────────────────────────────
    echo ALTERNATIVE: Create a portable version instead
    echo Run: build_portable.bat  (no PyInstaller needed)
    echo ─────────────────────────────────────────────────
    pause & exit /b 1
)

if not exist "%BACKEND_DIST%\ai-assistant-backend.exe" (
    echo [ERROR] Backend exe not found after build!
    pause & exit /b 1
)

echo [OK] Backend .exe created: %BACKEND_DIST%\ai-assistant-backend.exe
echo      Size:
dir "%BACKEND_DIST%\ai-assistant-backend.exe" | find "ai-assistant"
echo.

:: ── STEP 3: Build Next.js Frontend ───────────────────
echo [3/4] Building Next.js frontend...
echo       (This takes 2-4 minutes)
echo.

cd "%FRONTEND%"
call npm run build

if errorlevel 1 (
    echo [ERROR] Next.js build failed!
    pause & exit /b 1
)

:: Copy standalone output
if not exist "%FRONTEND_DIST%" mkdir "%FRONTEND_DIST%"
if exist "%FRONTEND%\.next\standalone" (
    xcopy "%FRONTEND%\.next\standalone\*" "%FRONTEND_DIST%\" /E /I /Q /Y >nul
    xcopy "%FRONTEND%\.next\static" "%FRONTEND_DIST%\.next\static\" /E /I /Q /Y >nul
    if exist "%FRONTEND%\public" xcopy "%FRONTEND%\public" "%FRONTEND_DIST%\public\" /E /I /Q /Y >nul
    echo [OK] Frontend built (standalone mode)
) else (
    echo [WARN] Standalone output not found, copying .next folder...
    xcopy "%FRONTEND%\.next" "%FRONTEND_DIST%\.next\" /E /I /Q /Y >nul
    copy "%FRONTEND%\package.json" "%FRONTEND_DIST%\" >nul
    echo [OK] Frontend build copied
)
echo.

:: ── STEP 4: Build Electron Installer ─────────────────
echo [4/4] Building Electron Windows installer...
echo       (Creates the final Setup.exe)
echo.

cd "%DESKTOP%"
call npm run build

if errorlevel 1 (
    echo [ERROR] Electron builder failed!
    echo Check the error above.
    pause & exit /b 1
)

:: ── Done ─────────────────────────────────────────────
echo.
echo ====================================================
echo   BUILD COMPLETE!
echo ====================================================
echo.

if exist "%DIST%" (
    echo Installer file:
    dir "%DIST%\*.exe" /B 2>nul
    echo.
    echo Full path: %DIST%\
    explorer "%DIST%"
) else (
    echo [WARN] dist\ folder not found, check desktop\dist\
    if exist "%DESKTOP%\dist" (
        dir "%DESKTOP%\dist\*.exe" /B 2>nul
        explorer "%DESKTOP%\dist"
    )
)

echo.
echo HOW TO INSTALL ON ANOTHER PC:
echo   1. Copy the Setup.exe to the target laptop
echo   2. Double-click it to install
echo   3. After install, edit: resources\backend\.env
echo      Add: GEMINI_API_KEY=your-key-here
echo   4. Launch from desktop shortcut
echo   5. Login: admin / admin123
echo.
pause
