"""
파일 메타데이터 저장 및 관리 시스템
JSON 파일 기반 데이터베이스
"""
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict

DB_FILE = Path("files_db.json")

def init_db():
    """데이터베이스 초기화"""
    if not DB_FILE.exists():
        save_db({"files": []})

def load_db() -> Dict:
    """데이터베이스 로드"""
    if not DB_FILE.exists():
        init_db()
    
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {"files": []}

def save_db(data: Dict):
    """데이터베이스 저장"""
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def create_file_record(filename: str, file_type: str, original_text: str) -> Dict:
    """새 파일 레코드 생성"""
    file_id = str(uuid.uuid4())
    record = {
        "id": file_id,
        "filename": filename,
        "type": file_type,  # recording, video, audio, text
        "uploaded_at": datetime.now().isoformat(),
        "original_text": original_text,
        "summaries": {}
    }
    
    db = load_db()
    db["files"].append(record)
    save_db(db)
    
    return record

def get_all_files() -> List[Dict]:
    """모든 파일 목록 조회"""
    db = load_db()
    # 최신순 정렬
    files = sorted(db["files"], key=lambda x: x["uploaded_at"], reverse=True)
    return files

def get_file_by_id(file_id: str) -> Optional[Dict]:
    """ID로 파일 조회"""
    db = load_db()
    for file in db["files"]:
        if file["id"] == file_id:
            return file
    return None

def update_summary(file_id: str, summary_type: str, summary_text: str) -> bool:
    """파일에 요약 추가/업데이트"""
    db = load_db()
    for file in db["files"]:
        if file["id"] == file_id:
            file["summaries"][summary_type] = summary_text
            file["last_updated"] = datetime.now().isoformat()
            save_db(db)
            return True
    return False

def delete_summary(file_id: str, summary_type: str) -> bool:
    """파일의 특정 요약 삭제"""
    db = load_db()
    for file in db["files"]:
        if file["id"] == file_id:
            if "summaries" not in file:
                file["summaries"] = {}
            if summary_type in file["summaries"]:
                del file["summaries"][summary_type]
                file["last_updated"] = datetime.now().isoformat()
                save_db(db)
            return True  # 파일이 존재하면 요약이 없어도 성공으로 처리
    return False

def delete_file(file_id: str) -> bool:
    """파일 삭제"""
    db = load_db()
    original_length = len(db["files"])
    db["files"] = [f for f in db["files"] if f["id"] != file_id]
    
    if len(db["files"]) < original_length:
        save_db(db)
        return True
    return False

def search_files(query: str) -> List[Dict]:
    """파일 검색"""
    db = load_db()
    query_lower = query.lower()
    
    results = []
    for file in db["files"]:
        if (query_lower in file["filename"].lower() or
            query_lower in file["original_text"].lower()):
            results.append(file)
    
    return sorted(results, key=lambda x: x["uploaded_at"], reverse=True)

# 초기화
init_db()

