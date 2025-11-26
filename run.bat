@echo off
title MP4 to Text Converter

echo ================================
echo   Starting Server...
echo ================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed.
    pause
    exit /b 1
)

REM Check if packages are installed
echo Checking packages...
python -c "import fastapi, uvicorn, whisper, pydub, google.generativeai" >nul 2>&1
if errorlevel 1 (
    echo Installing required packages...
    echo This may take a few minutes on first run...
    echo.
    pip install -r requirements.txt
    echo.
    echo Installation complete!
) else (
    echo All packages are already installed.
)

REM Start server
echo.
echo ================================
echo   Server URL: http://localhost:8000
echo   Browser will open automatically
echo   Press Ctrl+C to stop
echo ================================
echo.

REM Open browser after 3 seconds
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8000"

REM Run server
python main.py

pause

