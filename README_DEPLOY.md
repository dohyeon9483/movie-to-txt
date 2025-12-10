# 배포 가이드

## 🚂 Railway 배포 (권장)

Railway는 Python 백엔드와 ML 모델 실행에 최적화된 플랫폼입니다.

### 배포 방법

1. [Railway](https://railway.app)에 접속하여 GitHub 계정으로 로그인
2. "New Project" → "Deploy from GitHub repo" 선택
3. `dohyeon9483/movie-to-txt` 저장소 선택
4. 자동으로 배포가 시작됩니다

### 환경 변수 설정 (선택사항)

Railway 대시보드에서 환경 변수를 추가할 수 있습니다:
- `GEMINI_API_KEY`: Gemini API 키 (선택사항)

### 장점

- ✅ Python 백엔드에 최적화
- ✅ ML 모델 실행에 충분한 메모리
- ✅ 무료 플랜 제공 ($5 크레딧/월)
- ✅ 자동 HTTPS 및 도메인 제공
- ✅ 간단한 설정

---

## ▲ Vercel 배포 (제한적)

Vercel은 Whisper 같은 대용량 ML 모델 실행에는 적합하지 않지만, 시도해볼 수 있습니다.

### 문제점

- ❌ 메모리 제한 (8GB)
- ❌ Whisper 모델이 매우 큼 (140MB+)
- ❌ 서버리스 환경 제약

### 최적화 방법

1. Whisper 모델을 더 작은 것으로 변경:
   ```python
   # main.py에서
   model = whisper.load_model("tiny")  # base 대신 tiny 사용
   ```

2. 모델 지연 로딩:
   ```python
   # 첫 요청 시에만 모델 로드
   model = None
   def get_model():
       global model
       if model is None:
           model = whisper.load_model("tiny")
       return model
   ```

### 배포 방법

1. Vercel CLI 설치: `npm i -g vercel`
2. 프로젝트 디렉토리에서: `vercel`
3. 또는 GitHub 저장소를 Vercel에 연결

---

## 🌐 Render 배포

Render도 Python 백엔드 배포에 좋은 선택입니다.

### 배포 방법

1. [Render](https://render.com)에 접속
2. "New Web Service" 선택
3. GitHub 저장소 연결
4. 설정:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python start_server.py`
   - **Environment**: Python 3

---

## 📝 권장사항

**가장 좋은 선택: Railway**
- Python 백엔드에 최적화
- ML 모델 실행 가능
- 무료 플랜 제공
- 간단한 설정

**대안: Render**
- 무료 플랜 제공
- Python 지원
- 쉬운 설정

**비권장: Vercel**
- 메모리 제한으로 인한 OOM 오류
- ML 모델 실행에 부적합

