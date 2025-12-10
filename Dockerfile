# 멀티스테이지 빌드를 사용하여 이미지 크기 최적화
FROM python:3.12-slim as builder

# 빌드에 필요한 패키지만 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치 (CPU 전용 PyTorch)
WORKDIR /app
COPY requirements.txt .

# PyTorch CPU 버전 설치 (더 작은 크기)
RUN pip install --no-cache-dir --user \
    torch torchaudio --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir --user -r requirements.txt

# 최종 이미지
FROM python:3.12-slim

# 런타임에 필요한 패키지만 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Python 패키지 복사
COPY --from=builder /root/.local /root/.local

# 환경 변수 설정
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV WHISPER_CACHE_DIR=/tmp/whisper-cache

# 작업 디렉토리 설정
WORKDIR /app

# 애플리케이션 파일 복사
COPY . .

# 포트 노출
EXPOSE 8000

# Whisper 모델은 런타임에 다운로드되므로 이미지에 포함되지 않음
# 실행 명령
CMD ["python", "start_server.py"]

