import os
import tempfile
import uuid
import json
import asyncio
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv
from pydantic import BaseModel

import whisper
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydub import AudioSegment
import google.generativeai as genai

import database as db

# Pydantic 모델
class ApiKeyRequest(BaseModel):
    api_key: Optional[str] = ""

# 환경 변수 로드
load_dotenv()

app = FastAPI(title="MP4 to Text Converter")

# Gemini API 설정 (사용자가 직접 입력)
gemini_api_key = None
gemini_model = None

def set_gemini_api_key(api_key: str) -> bool:
    """Gemini API 키 설정"""
    global gemini_api_key, gemini_model
    try:
        genai.configure(api_key=api_key)
        # gemini-2.0-flash: 최신 모델, 저렴하고 빠름 (무료 티어 10 RPM, 100만 토큰/분)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # 간단한 테스트로 API 키 검증
        test_response = model.generate_content("Hi")
        
        # 테스트 성공하면 전역 변수에 저장
        gemini_model = model
        gemini_api_key = api_key
        print("✓ Gemini API 연결 완료! (모델: gemini-2.0-flash-exp)")
        return True
    except Exception as e:
        print(f"Gemini API 연결 실패: {e}")
        gemini_model = None
        gemini_api_key = None
        return False

# 디렉토리 생성
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# 정적 파일 서빙
app.mount("/static", StaticFiles(directory="static"), name="static")

# Whisper 모델 로드 (base 모델 사용, 더 큰 모델이 필요하면 'medium' 또는 'large'로 변경)
print("Whisper 모델을 로드하는 중...")
model = whisper.load_model("base")
print("Whisper 모델 로드 완료!")


async def send_progress(message: str, progress: int, status: str = "processing"):
    """진행 상황 메시지를 생성합니다."""
    data = {
        "message": message,
        "progress": progress,
        "status": status
    }
    return f"data: {json.dumps(data)}\n\n"


def extract_audio_from_video(video_path: str, audio_path: str) -> bool:
    """MP4 비디오에서 오디오를 추출합니다."""
    try:
        # pydub을 사용하여 오디오 추출
        video = AudioSegment.from_file(video_path, format="mp4")
        video.export(audio_path, format="wav")
        return True
    except Exception as e:
        print(f"오디오 추출 오류: {e}")
        return False


def transcribe_audio(audio_path: str, language: str = "ko") -> Optional[str]:
    """Whisper를 사용하여 오디오를 텍스트로 변환합니다."""
    try:
        result = model.transcribe(audio_path, language=language, fp16=False, verbose=False)
        return result["text"]
    except Exception as e:
        print(f"음성 인식 오류: {e}")
        return None


async def summarize_with_gemini(text: str, summary_type: str = "general") -> Optional[str]:
    """Gemini API로 텍스트를 요약합니다."""
    if not gemini_model or not gemini_api_key:
        return "⚠ Gemini API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요."
    
    try:
        prompts = {
            "general": f"""다음 텍스트를 명확하고 간결하게 요약해주세요. 
핵심 내용을 3-5개의 주요 포인트로 정리하세요.

텍스트:
{text}

요약:""",
            
            "meeting": f"""다음 회의 내용을 회의록 형식으로 정리해주세요:

[원본]
{text}

[회의록 형식]
## 📋 회의 개요

## 💬 주요 논의 사항
- 

## ✅ 결정 사항
- 

## 📌 향후 계획
- 

## 🔔 기타 사항
- """,
            
            "lecture": f"""다음 강의 내용을 학습 노트 형식으로 요약해주세요:

[강의 내용]
{text}

[학습 노트]
## 📚 핵심 개념
- 

## 💡 주요 내용
1. 

## 📝 예시/사례
- 

## 🎯 핵심 요점
- """,
            
            "youtube": f"""다음 영상 내용을 유튜브 요약 형식으로 정리해주세요:

[영상 내용]
{text}

[요약]
## 🎬 영상 개요
- 

## ⏱ 주요 내용
- 

## 💎 핵심 메시지
- 

## 📌 타임라인 요약
- """,
            
            "conversation": f"""다음 대화 내용을 정리해주세요:

[대화 내용]
{text}

[정리]
## 💬 대화 주제
- 

## 📝 주요 토픽
1. 

## 🗣 핵심 의견
- 

## 📌 결론
- """
        }
        
        prompt = prompts.get(summary_type, prompts["general"])
        
        # Gemini API 호출
        response = await asyncio.to_thread(gemini_model.generate_content, prompt)
        return response.text
        
    except Exception as e:
        print(f"Gemini 요약 오류: {e}")
        return f"요약 생성 중 오류가 발생했습니다: {str(e)}"


@app.get("/", response_class=HTMLResponse)
async def read_root():
    """메인 페이지를 반환합니다."""
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()


async def process_single_file(file: UploadFile, file_index: int, total_files: int):
    """단일 파일을 처리하고 진행 상황을 생성합니다."""
    file_prefix = f"[{file_index}/{total_files}] {file.filename}"
    
    # 파일 확장자 검증 및 타입 확인
    filename_lower = file.filename.lower()
    
    # 지원하는 확장자
    video_extensions = ('.mp4', '.mov', '.avi', '.mkv', '.webm')
    audio_extensions = ('.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac', '.wma', '.opus', '.webm')
    text_extensions = ('.txt',)
    
    is_video = filename_lower.endswith(video_extensions)
    is_audio = filename_lower.endswith(audio_extensions)
    is_text = filename_lower.endswith(text_extensions)
    
    if not (is_video or is_audio or is_text):
        yield await send_progress(
            f"{file_prefix}: 지원하지 않는 파일 형식입니다. (지원: 영상/음성/텍스트)", 
            0, 
            "error"
        )
        return
    
    # 고유한 파일명 생성
    unique_id = str(uuid.uuid4())
    video_path = UPLOAD_DIR / f"{unique_id}.mp4"
    audio_path = UPLOAD_DIR / f"{unique_id}.wav"
    
    try:
        # 1. 파일 업로드 중
        yield await send_progress(f"{file_prefix}: 업로드 중...", 5, "processing")
        content = await file.read()
        
        # 2. 파일 저장 중
        yield await send_progress(f"{file_prefix}: 파일 저장 중...", 15, "processing")
        with open(video_path, "wb") as buffer:
            buffer.write(content)
        print(f"비디오 파일 저장 완료: {video_path}")
        
        # 3. 파일 검증 중
        yield await send_progress(f"{file_prefix}: 파일 검증 중...", 25, "processing")
        await asyncio.sleep(0.3)  # 사용자가 진행 상황을 볼 수 있도록
        
        # TXT 파일인 경우 텍스트 직접 읽기
        if is_text:
            yield await send_progress(f"{file_prefix}: 텍스트 파일 읽는 중...", 30, "processing")
            try:
                text = content.decode('utf-8')
            except UnicodeDecodeError:
                # UTF-8 실패 시 다른 인코딩 시도
                try:
                    text = content.decode('cp949')
                except:
                    text = content.decode('latin-1')
            
            yield await send_progress(f"{file_prefix}: 텍스트 읽기 완료", 90, "processing")
            print(f"텍스트 파일 읽기 완료! 텍스트 길이: {len(text)}")
            
        # 음성 파일인 경우 오디오 추출 건너뛰기
        elif is_audio:
            # 음성 파일은 그대로 사용
            yield await send_progress(f"{file_prefix}: 음성 파일 확인 완료", 30, "processing")
            
            # WAV 형식이 아니면 변환
            if not filename_lower.endswith('.wav'):
                yield await send_progress(f"{file_prefix}: 음성 형식 변환 중...", 40, "processing")
                try:
                    audio = AudioSegment.from_file(video_path)
                    audio.export(audio_path, format="wav")
                except Exception as e:
                    print(f"음성 형식 변환 오류: {e}")
                    yield await send_progress(f"{file_prefix}: 음성 형식 변환 실패", 0, "error")
                    return
            else:
                # 이미 WAV 파일이면 그대로 사용
                import shutil
                shutil.copy(video_path, audio_path)
            
            yield await send_progress(f"{file_prefix}: 음성 파일 준비 완료", 55, "processing")
        else:
            # 영상 파일인 경우 오디오 추출
            # 4. 오디오 추출 준비
            yield await send_progress(f"{file_prefix}: 오디오 추출 준비 중...", 30, "processing")
            await asyncio.sleep(0.2)
            
            # 5. 오디오 추출 중
            yield await send_progress(f"{file_prefix}: 오디오 추출 중...", 35, "processing")
            print("오디오 추출 중...")
            try:
                success = await asyncio.to_thread(extract_audio_from_video, str(video_path), str(audio_path))
                if not success:
                    yield await send_progress(f"{file_prefix}: 오디오 추출 실패", 0, "error")
                    return
            except Exception as e:
                print(f"오디오 추출 오류: {e}")
                yield await send_progress(f"{file_prefix}: 오디오 추출 실패 - {str(e)}", 0, "error")
                return
            
            # 6. 오디오 추출 완료
            yield await send_progress(f"{file_prefix}: 오디오 추출 완료", 55, "processing")
            print("오디오 추출 완료!")
        
        # 텍스트 파일이 아닌 경우만 음성 인식 수행
        if not is_text:
            # 7. 음성 인식 준비
            yield await send_progress(f"{file_prefix}: 음성 인식 엔진 준비 중...", 60, "processing")
            await asyncio.sleep(0.2)
            
            # 8. 음성 인식 중 (가장 시간이 오래 걸림)
            # 별도 스레드에서 실행하여 이벤트 루프 블로킹 방지
            yield await send_progress(f"{file_prefix}: 음성 인식 중... (시간이 다소 걸릴 수 있습니다)", 65, "processing")
            print("음성 인식 중...")
            
            # 비동기로 실행하여 타임아웃 방지
            try:
                text = await asyncio.to_thread(transcribe_audio, str(audio_path), "ko")
            except Exception as e:
                print(f"음성 인식 오류: {e}")
                yield await send_progress(f"{file_prefix}: 음성 인식 실패 - {str(e)}", 0, "error")
                return
            
            if text is None:
                yield await send_progress(f"{file_prefix}: 음성 인식 실패", 0, "error")
                return
            
            # 9. 음성 인식 완료
            yield await send_progress(f"{file_prefix}: 음성 인식 완료", 90, "processing")
            print(f"음성 인식 완료! 텍스트 길이: {len(text)}")
        
        # 10. 데이터베이스에 저장
        yield await send_progress(f"{file_prefix}: 데이터베이스 저장 중...", 93, "processing")
        
        # 파일 타입 결정
        if file.filename.startswith("recording_"):
            file_type = "recording"
        elif is_text:
            file_type = "text"
        elif is_video:
            file_type = "video"
        else:
            file_type = "audio"
        
        # DB에 저장
        file_record = db.create_file_record(
            filename=file.filename,
            file_type=file_type,
            original_text=text
        )
        file_id = file_record["id"]
        
        # 11. 후처리 중
        yield await send_progress(f"{file_prefix}: 결과 정리 중...", 96, "processing")
        await asyncio.sleep(0.2)
        
        # 12. 완료
        result = {
            "message": f"{file_prefix}: 완료!",
            "progress": 100,
            "status": "completed",
            "filename": file.filename,
            "text": text,
            "file_id": file_id  # 파일 ID 추가
        }
        yield f"data: {json.dumps(result)}\n\n"
        
    except Exception as e:
        print(f"오류 발생: {e}")
        error_msg = f"{file_prefix}: 처리 중 오류 발생 - {str(e)}"
        yield await send_progress(error_msg, 0, "error")
    
    finally:
        # 임시 파일 정리
        try:
            if video_path.exists():
                video_path.unlink()
            if audio_path.exists():
                audio_path.unlink()
        except Exception as e:
            print(f"임시 파일 삭제 오류: {e}")


@app.post("/upload")
async def upload_videos(files: List[UploadFile] = File(...)):
    """여러 MP4 파일을 업로드하고 텍스트로 변환합니다 (SSE 스트리밍)."""
    
    async def event_generator():
        try:
            total_files = len(files)
            yield await send_progress(f"총 {total_files}개 파일 처리 시작", 0, "started")
            
            # 각 파일을 순차적으로 처리
            for idx, file in enumerate(files, 1):
                async for progress_msg in process_single_file(file, idx, total_files):
                    yield progress_msg
            
            # 모든 파일 처리 완료
            yield await send_progress("모든 파일 처리 완료!", 100, "all_completed")
            
        except Exception as e:
            print(f"전체 처리 오류: {e}")
            yield await send_progress(f"오류 발생: {str(e)}", 0, "error")
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# ============ 대시보드 API ============

@app.get("/api/files")
async def get_all_files():
    """모든 파일 목록 조회"""
    try:
        files = db.get_all_files()
        # 텍스트 길이 제한 (목록에서는 전체 텍스트 불필요)
        for file in files:
            if len(file.get("original_text", "")) > 200:
                file["text_preview"] = file["original_text"][:200] + "..."
            else:
                file["text_preview"] = file.get("original_text", "")
            # 목록에서는 전체 텍스트 제거 (성능)
            file.pop("original_text", None)
        
        return {"success": True, "files": files}
    except Exception as e:
        print(f"파일 목록 조회 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files/{file_id}")
async def get_file_detail(file_id: str):
    """파일 상세 정보 조회"""
    try:
        file = db.get_file_by_id(file_id)
        if not file:
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
        return {"success": True, "file": file}
    except HTTPException:
        raise
    except Exception as e:
        print(f"파일 조회 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/files/{file_id}/summary/{summary_type}")
async def delete_summary_api(file_id: str, summary_type: str):
    """요약 삭제"""
    try:
        success = db.delete_summary(file_id, summary_type)
        if not success:
            raise HTTPException(status_code=404, detail="요약을 찾을 수 없습니다.")
        return {"success": True, "message": "요약이 삭제되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"요약 삭제 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/files/{file_id}")
async def delete_file_api(file_id: str):
    """파일 삭제"""
    try:
        success = db.delete_file(file_id)
        if not success:
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
        return {"success": True, "message": "파일이 삭제되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"파일 삭제 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/files/{file_id}/summarize")
async def generate_summary(file_id: str, summary_type: str):
    """파일 요약 생성"""
    try:
        # 파일 조회
        file = db.get_file_by_id(file_id)
        if not file:
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
        
        # 이미 해당 타입의 요약이 있는지 확인
        if summary_type in file.get("summaries", {}):
            return {
                "success": True,
                "summary": file["summaries"][summary_type],
                "cached": True
            }
        
        # 요약 생성
        original_text = file.get("original_text", "")
        if not original_text:
            raise HTTPException(status_code=400, detail="원본 텍스트가 없습니다.")
        
        summary = await summarize_with_gemini(original_text, summary_type)
        
        # DB에 저장
        db.update_summary(file_id, summary_type, summary)
        
        return {
            "success": True,
            "summary": summary,
            "cached": False
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"요약 생성 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search")
async def search_files_api(q: str):
    """파일 검색"""
    try:
        results = db.search_files(q)
        # 텍스트 미리보기만 포함
        for file in results:
            if len(file.get("original_text", "")) > 200:
                file["text_preview"] = file["original_text"][:200] + "..."
            else:
                file["text_preview"] = file.get("original_text", "")
            file.pop("original_text", None)
        
        return {"success": True, "results": results}
    except Exception as e:
        print(f"검색 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ API 키 설정 ============

@app.post("/api/set-api-key")
async def set_api_key(request: ApiKeyRequest):
    """Gemini API 키 설정 및 검증 (빈 문자열로 삭제 가능)"""
    try:
        print(f"[DEBUG] API 키 설정 요청 수신: request={request}")
        print(f"[DEBUG] request.api_key 값: {request.api_key}")
        
        # request.api_key가 None이거나 없을 수 있으므로 안전하게 처리
        api_key = (request.api_key or "").strip()
        print(f"[DEBUG] 처리된 api_key: '{api_key}' (길이: {len(api_key)})")
        
        # 빈 문자열인 경우 API 키 삭제
        if not api_key:
            global gemini_api_key, gemini_model
            gemini_api_key = None
            gemini_model = None
            return JSONResponse({"success": True, "message": "API 키가 삭제되었습니다."})
        
        # 유효성 검사
        if len(api_key) < 10:
            return JSONResponse({"success": False, "message": "유효하지 않은 API 키입니다."})
        
        success = set_gemini_api_key(api_key)
        
        if success:
            return JSONResponse({"success": True, "message": "API 키가 성공적으로 설정되었습니다!"})
        else:
            return JSONResponse({"success": False, "message": "API 키 검증에 실패했습니다. 올바른 키인지 확인해주세요."})
    except AttributeError as e:
        print(f"API 키 요청 파싱 오류: {e}")
        return JSONResponse({"success": False, "message": f"요청 형식 오류: {str(e)}"}, status_code=400)
    except Exception as e:
        print(f"API 키 설정 오류: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse({"success": False, "message": f"오류가 발생했습니다: {str(e)}"}, status_code=500)


@app.get("/api/check-api-key")
async def check_api_key():
    """API 키 설정 상태 확인"""
    return {
        "success": True,
        "has_key": gemini_api_key is not None,
        "key_preview": f"{gemini_api_key[:10]}..." if gemini_api_key else None
    }


if __name__ == "__main__":
    import uvicorn
    # Railway나 다른 클라우드 환경에서는 PORT 환경 변수 사용
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

