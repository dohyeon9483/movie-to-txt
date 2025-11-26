@echo off
chcp 65001 >nul
title 영상 음성 변환기

echo ================================
echo   영상 음성 변환기 시작 중...
echo ================================
echo.

REM Python이 설치되어 있는지 확인
python --version >nul 2>&1
if errorlevel 1 (
    echo [오류] Python이 설치되어 있지 않습니다.
    echo Python을 설치한 후 다시 시도해주세요.
    pause
    exit /b 1
)

REM 필요한 패키지가 설치되어 있는지 확인
echo 패키지 확인 중...
python -c "import fastapi, whisper, pydub" >nul 2>&1
if errorlevel 1 (
    echo 필요한 패키지를 설치합니다...
    echo.
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [오류] 패키지 설치 실패
        pause
        exit /b 1
    )
)

REM 서버 시작
echo.
echo 서버를 시작합니다...
echo.
echo ================================
echo   브라우저가 자동으로 열립니다
echo   종료하려면 이 창을 닫으세요
echo ================================
echo.

REM 3초 후 브라우저 열기
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8000"

REM 서버 실행
python main.py

pause


