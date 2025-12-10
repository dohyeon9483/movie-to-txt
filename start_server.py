"""
영상 음성 변환기 실행 스크립트
더블클릭으로 실행하면 자동으로 서버를 시작하고 브라우저를 엽니다.
"""
import os
import sys
import time
import webbrowser
import subprocess
from pathlib import Path

def check_dependencies():
    """필요한 패키지가 설치되어 있는지 확인"""
    print("패키지 확인 중...")
    try:
        import fastapi
        import whisper
        import pydub
        import uvicorn
        print("✓ 모든 패키지가 설치되어 있습니다.")
        return True
    except ImportError as e:
        print(f"✗ 필요한 패키지가 없습니다: {e}")
        print("\n패키지를 설치하시겠습니까? (Y/n): ", end="")
        response = input().strip().lower()
        if response in ['', 'y', 'yes']:
            print("\n패키지 설치 중...")
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            return True
        return False

def check_ffmpeg():
    """ffmpeg가 설치되어 있는지 확인"""
    try:
        subprocess.run(["ffmpeg", "-version"], 
                      stdout=subprocess.DEVNULL, 
                      stderr=subprocess.DEVNULL, 
                      check=True)
        print("✓ ffmpeg가 설치되어 있습니다.")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("✗ ffmpeg가 설치되어 있지 않습니다.")
        print("  오디오 추출을 위해 ffmpeg가 필요합니다.")
        print("  설치 방법: https://www.gyan.dev/ffmpeg/builds/")
        return False

def start_server():
    """서버를 시작하고 브라우저를 엽니다"""
    import uvicorn
    import threading
    
    # Railway나 다른 클라우드 환경에서는 PORT 환경 변수 사용
    port = int(os.environ.get("PORT", 8000))
    is_railway = os.environ.get("RAILWAY_ENVIRONMENT") is not None
    
    # 로컬 환경에서만 브라우저 열기
    if not is_railway:
        def open_browser():
            time.sleep(3)
            print("\n브라우저를 엽니다...")
            webbrowser.open(f"http://localhost:{port}")
        
        browser_thread = threading.Thread(target=open_browser, daemon=True)
        browser_thread.start()
    
    # 서버 시작
    print("\n" + "="*50)
    print("  영상 음성 변환기 서버 시작")
    print(f"  URL: http://0.0.0.0:{port}")
    if not is_railway:
        print("  종료하려면 Ctrl+C를 누르세요")
    print("="*50 + "\n")
    
    # main.py의 app을 import해서 실행
    from main import app
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

def main():
    """메인 실행 함수"""
    print("="*50)
    print("  🎬 영상 음성 변환기")
    print("="*50)
    print()
    
    # 현재 디렉토리를 스크립트 위치로 변경
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # 의존성 확인
    if not check_dependencies():
        print("\n패키지 설치가 필요합니다.")
        input("엔터를 눌러 종료...")
        sys.exit(1)
    
    # ffmpeg 확인
    if not check_ffmpeg():
        print("\n경고: ffmpeg가 없으면 일부 기능이 작동하지 않을 수 있습니다.")
        print("계속하시겠습니까? (y/N): ", end="")
        response = input().strip().lower()
        if response not in ['y', 'yes']:
            sys.exit(1)
    
    print()
    print("💡 AI 요약 기능을 사용하려면 웹 UI의 설정에서 Gemini API 키를 입력하세요.")
    print()
    
    # 서버 시작
    try:
        start_server()
    except KeyboardInterrupt:
        print("\n\n서버를 종료합니다...")
    except Exception as e:
        print(f"\n오류 발생: {e}")
        input("엔터를 눌러 종료...")
        sys.exit(1)

if __name__ == "__main__":
    main()


