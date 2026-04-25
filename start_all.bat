@echo off
echo ============================================
echo   AI Desktop Assistant - Starting All
echo ============================================
echo.

:: Start backend in new window
echo [1/2] Starting Backend (FastAPI on port 8000)...
start "AI Assistant Backend" cmd /k "cd backend && call venv\Scripts\activate.bat && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait for backend to initialize
timeout /t 5 /nobreak >nul

:: Start frontend in new window
echo [2/2] Starting Frontend (Next.js on port 3000)...
start "AI Assistant Frontend" cmd /k "cd frontend && npm run dev"

:: Wait and open browser
timeout /t 8 /nobreak >nul
echo Opening browser...
start http://localhost:3000

echo.
echo ============================================
echo   Both services started!
echo   Dashboard: http://localhost:3000
echo   API Docs:  http://localhost:8000/docs
echo   Login:     admin / admin123
echo ============================================
echo.
pause
