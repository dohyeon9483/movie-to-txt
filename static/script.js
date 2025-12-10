// DOM 요소
const modeSelection = document.getElementById('modeSelection');
const recordSection = document.getElementById('recordSection');
const uploadSection = document.getElementById('uploadSection');
const resultSection = document.getElementById('resultSection');
const dashboardSection = document.getElementById('dashboardSection');
const settingsSection = document.getElementById('settingsSection');

// 네비게이션
const navHome = document.getElementById('navHome');
const navDashboard = document.getElementById('navDashboard');
const navSettings = document.getElementById('navSettings');

// 모드 선택
const recordModeCard = document.getElementById('recordMode');
const uploadModeCard = document.getElementById('uploadMode');

// 뒤로 가기 버튼들
const backToModeFromRecord = document.getElementById('backToModeFromRecord');
const backToModeFromUpload = document.getElementById('backToModeFromUpload');
const backToModeFromResult = document.getElementById('backToModeFromResult');

// 대시보드
const filesTable = document.getElementById('filesTable');
const searchInput = document.getElementById('searchInput');
const newFileBtn = document.getElementById('newFileBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

// 설정
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyStatus = document.getElementById('apiKeyStatus');

// 모달
const fileModal = document.getElementById('fileModal');
const modalFilename = document.getElementById('modalFilename');
const modalBody = document.getElementById('modalBody');
const modalDownloadBtn = document.getElementById('modalDownloadBtn');
const modalSummarizeBtn = document.getElementById('modalSummarizeBtn');
const modalDeleteSummaryBtn = document.getElementById('modalDeleteSummaryBtn');
const modalClose = document.querySelector('.modal-close');

// 녹음 관련
const startRecordBtn = document.getElementById('startRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const processRecordBtn = document.getElementById('processRecordBtn');
const recordIcon = document.getElementById('recordIcon');
const recordPulse = document.getElementById('recordPulse');
const recordStatusText = document.getElementById('recordStatusText');
const recordTime = document.getElementById('recordTime');

// 업로드 관련
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const progressSection = document.getElementById('progressSection');
const filesProgress = document.getElementById('filesProgress');

// 결과 관련
const resultsContainer = document.getElementById('resultsContainer');
const downloadAllBtn = document.getElementById('downloadAllBtn');

// 전역 변수
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingInterval;
let recordedBlob = null;
let completedResults = [];
let fileProgressTrackers = {};
let currentFileId = null;
let currentTab = 'original';

// ============ 네비게이션 ============
navHome.addEventListener('click', () => {
    navHome.classList.add('active');
    navDashboard.classList.remove('active');
    navSettings.classList.remove('active');
    showSection('mode');
});

navDashboard.addEventListener('click', () => {
    navDashboard.classList.add('active');
    navHome.classList.remove('active');
    navSettings.classList.remove('active');
    showSection('dashboard');
    loadDashboard();
});

navSettings.addEventListener('click', () => {
    navSettings.classList.add('active');
    navHome.classList.remove('active');
    navDashboard.classList.remove('active');
    showSection('settings');
    checkApiKeyStatus();
});

// ============ 모드 선택 ============
recordModeCard.addEventListener('click', () => {
    showSection('record');
});

uploadModeCard.addEventListener('click', () => {
    showSection('upload');
});

// 뒤로 가기
backToModeFromRecord.addEventListener('click', () => {
    stopRecording();
    showSection('mode');
});

backToModeFromUpload.addEventListener('click', () => {
    showSection('mode');
});

backToModeFromResult.addEventListener('click', () => {
    resetAll();
    showSection('mode');
});

function showSection(section) {
    modeSelection.classList.add('hidden');
    recordSection.classList.add('hidden');
    uploadSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    settingsSection.classList.add('hidden');
    
    switch(section) {
        case 'mode':
            modeSelection.classList.remove('hidden');
            break;
        case 'record':
            recordSection.classList.remove('hidden');
            break;
        case 'upload':
            uploadSection.classList.remove('hidden');
            break;
        case 'result':
            resultSection.classList.remove('hidden');
            break;
        case 'dashboard':
            dashboardSection.classList.remove('hidden');
            break;
        case 'settings':
            settingsSection.classList.remove('hidden');
            break;
    }
}

// ============ 녹음 기능 ============
startRecordBtn.addEventListener('click', startRecording);
stopRecordBtn.addEventListener('click', stopRecording);
processRecordBtn.addEventListener('click', processRecording);

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        
        // UI 업데이트
        startRecordBtn.classList.add('hidden');
        stopRecordBtn.classList.remove('hidden');
        processRecordBtn.classList.add('hidden');
        
        recordIcon.textContent = '🔴';
        recordPulse.classList.add('recording');
        recordStatusText.textContent = '녹음 중...';
        
        // 타이머 시작
        recordingStartTime = Date.now();
        recordingInterval = setInterval(updateRecordingTime, 1000);
        
    } catch (error) {
        alert('마이크 접근 권한이 필요합니다.\n브라우저 설정에서 마이크 권한을 허용해주세요.');
        console.error('녹음 오류:', error);
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(recordingInterval);
        
        // UI 업데이트
        startRecordBtn.classList.remove('hidden');
        stopRecordBtn.classList.add('hidden');
        processRecordBtn.classList.remove('hidden');
        
        recordIcon.textContent = '✅';
        recordPulse.classList.remove('recording');
        recordStatusText.textContent = '녹음 완료!';
    } else {
        // 녹음 중이 아닐 때 초기화
        clearInterval(recordingInterval);
        recordTime.textContent = '00:00';
        recordIcon.textContent = '🎤';
        recordPulse.classList.remove('recording');
        recordStatusText.textContent = '녹음 준비';
        recordedBlob = null;
        
        startRecordBtn.classList.remove('hidden');
        stopRecordBtn.classList.add('hidden');
        processRecordBtn.classList.add('hidden');
    }
}

function updateRecordingTime() {
    const elapsed = Date.now() - recordingStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    recordTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function processRecording() {
    if (!recordedBlob) {
        alert('녹음된 파일이 없습니다.');
        return;
    }
    
    // 업로드 섹션으로 전환
    showSection('upload');
    
    // 날짜-시간 형식의 파일명 생성
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
                    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(now.getDate()).padStart(2, '0') + '-' +
                    String(now.getHours()).padStart(2, '0') + '-' + 
                    String(now.getMinutes()).padStart(2, '0') + '-' + 
                    String(now.getSeconds()).padStart(2, '0');
    
    // 업로드 섹션으로 이동하여 처리
    const file = new File([recordedBlob], `recording_${dateStr}.webm`, { type: 'audio/webm' });
    
    // 약간의 딜레이 후 처리 시작 (UI 전환이 완료되도록)
    setTimeout(async () => {
        dropZone.style.display = 'none';
        progressSection.classList.remove('hidden');
        
        await handleFiles([file]);
    }, 100);
}

// ============ 파일 업로드 기능 ============
dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        handleFiles(files);
    }
});

// 드래그 앤 드롭
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        handleFiles(files);
    }
});

async function handleFiles(files) {
    if (files.length === 0) return;
    
    // 초기화
    completedResults = [];
    fileProgressTrackers = {};
    filesProgress.innerHTML = '';
    resultsContainer.innerHTML = '';
    
    // UI 업데이트
    dropZone.style.display = 'none';
    progressSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    
    // 각 파일에 대한 진행 상황 UI 생성
    files.forEach((file, index) => {
        const trackerId = `file-${index}`;
        fileProgressTrackers[trackerId] = createFileProgressTracker(file.name, trackerId);
        filesProgress.appendChild(fileProgressTrackers[trackerId].element);
    });
    
    // FormData 생성
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });
    
    try {
        // SSE로 업로드 및 진행 상황 수신
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('업로드 실패');
        }
        
        // SSE 스트림 읽기
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        handleProgressUpdate(data);
                    } catch (e) {
                        console.error('JSON 파싱 오류:', e);
                    }
                }
            }
        }
        
        // 결과 표시
        if (completedResults.length > 0) {
            showResults();
        }
        
    } catch (error) {
        console.error('오류:', error);
        alert(`오류가 발생했습니다: ${error.message}`);
        resetUploadUI();
    }
}

function createFileProgressTracker(filename, trackerId) {
    const element = document.createElement('div');
    element.className = 'file-progress-item';
    element.id = trackerId;
    
    element.innerHTML = `
        <div class="file-progress-header">
            <div class="file-name" title="${filename}">${filename}</div>
            <div class="file-status processing">대기 중</div>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
            <div class="progress-text">0%</div>
        </div>
    `;
    
    return {
        element,
        updateProgress: (progress, message, status) => {
            const progressFill = element.querySelector('.progress-fill');
            const progressText = element.querySelector('.progress-text');
            const statusBadge = element.querySelector('.file-status');
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            
            statusBadge.className = `file-status ${status}`;
            if (status === 'completed') {
                statusBadge.textContent = '완료';
            } else if (status === 'error') {
                statusBadge.textContent = '오류';
            } else {
                statusBadge.textContent = '처리 중';
            }
        }
    };
}

function handleProgressUpdate(data) {
    const { message, progress, status, filename, text } = data;
    
    if (message && message.includes('[')) {
        const match = message.match(/\[(\d+)\/\d+\]/);
        if (match) {
            const fileIndex = parseInt(match[1]) - 1;
            const trackerId = `file-${fileIndex}`;
            const tracker = fileProgressTrackers[trackerId];
            
            if (tracker) {
                tracker.updateProgress(progress, message, status);
                
                if (status === 'completed' && text !== undefined) {
                    completedResults.push({ filename, text });
                }
            }
        }
    }
    
    console.log('진행 상황:', data);
}

function showResults() {
    showSection('result');
    
    completedResults.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        resultItem.innerHTML = `
            <div class="result-item-header">
                <div class="result-filename">${result.filename}</div>
                <button class="btn-download-single" data-index="${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    다운로드
                </button>
            </div>
            <div class="result-text">${result.text || '(텍스트 없음)'}</div>
        `;
        
        resultsContainer.appendChild(resultItem);
        
        const downloadBtn = resultItem.querySelector('.btn-download-single');
        downloadBtn.addEventListener('click', () => {
            downloadSingleResult(result.filename, result.text);
        });
    });
}

function downloadSingleResult(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\.[^/.]+$/, '') + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

downloadAllBtn.addEventListener('click', () => {
    if (completedResults.length === 0) return;
    
    completedResults.forEach((result, index) => {
        setTimeout(() => {
            downloadSingleResult(result.filename, result.text);
        }, index * 300);
    });
    
    if (completedResults.length > 1) {
        setTimeout(() => {
            alert(`${completedResults.length}개의 파일 다운로드가 시작되었습니다!`);
        }, 100);
    }
});

function resetUploadUI() {
    dropZone.style.display = 'block';
    progressSection.classList.add('hidden');
    fileInput.value = '';
    filesProgress.innerHTML = '';
}

function resetAll() {
    // 녹음 초기화
    stopRecording();
    recordedBlob = null;
    
    // 업로드 초기화
    resetUploadUI();
    
    // 결과 초기화
    resultsContainer.innerHTML = '';
    completedResults = [];
    fileProgressTrackers = {};
}

// ============ 대시보드 기능 ============

async function loadDashboard() {
    filesTable.innerHTML = '<div class="loading">파일 목록을 불러오는 중...</div>';
    
    try {
        const response = await fetch('/api/files');
        const data = await response.json();
        
        if (data.success) {
            renderFilesTable(data.files);
        } else {
            filesTable.innerHTML = '<div class="loading">파일을 불러올 수 없습니다.</div>';
        }
    } catch (error) {
        console.error('파일 목록 로드 오류:', error);
        filesTable.innerHTML = '<div class="loading">오류가 발생했습니다.</div>';
    }
}

function renderFilesTable(files) {
    if (files.length === 0) {
        filesTable.innerHTML = '<div class="loading">파일이 없습니다. 새로 추가해보세요!</div>';
        return;
    }
    
    let html = '';
    
    files.forEach(file => {
        const date = new Date(file.uploaded_at);
        const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
        
        html += '<div class="file-row">';
        html += `<div><input type="checkbox" class="file-checkbox" data-file-id="${file.id}" data-filename="${file.filename}"></div>`;
        html += `<div class="file-info-name">${file.filename}</div>`;
        html += `<div><span class="file-info-type ${file.type}">${getTypeLabel(file.type)}</span></div>`;
        html += `<div class="file-info-date">${dateStr}</div>`;
        html += `<div class="file-actions">`;
        html += `<button class="btn-file-action view" onclick="openFileModal('${file.id}')">보기</button>`;
        html += `<button class="btn-file-action delete" onclick="deleteFile('${file.id}')">삭제</button>`;
        html += `</div>`;
        html += '</div>';
    });
    
    filesTable.innerHTML = html;
}

function getTypeLabel(type) {
    const labels = {
        'recording': '녹음',
        'video': '영상',
        'audio': '음성',
        'text': '텍스트'
    };
    return labels[type] || type;
}

// 검색 기능
searchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    
    if (query.length === 0) {
        loadDashboard();
        return;
    }
    
    if (query.length < 2) return;
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success) {
            renderFilesTable(data.results);
        }
    } catch (error) {
        console.error('검색 오류:', error);
    }
});

// 새 파일 추가
newFileBtn.addEventListener('click', () => {
    navHome.classList.add('active');
    navDashboard.classList.remove('active');
    showSection('mode');
});

// ============ 체크박스 기능 ============

// 전체 선택
selectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.file-checkbox');
    checkboxes.forEach(cb => cb.checked = true);
});

// 전체 해제
deselectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.file-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
});

// 선택된 파일 다운로드
downloadSelectedBtn.addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('.file-checkbox:checked');
    
    if (checkboxes.length === 0) {
        alert('다운로드할 파일을 선택해주세요.');
        return;
    }
    
    if (!confirm(`선택한 ${checkboxes.length}개 파일의 원본 텍스트를 다운로드하시겠습니까?`)) {
        return;
    }
    
    for (const checkbox of checkboxes) {
        const fileId = checkbox.dataset.fileId;
        const filename = checkbox.dataset.filename;
        
        try {
            const response = await fetch(`/api/files/${fileId}`);
            const data = await response.json();
            
            if (data.success) {
                const text = data.file.original_text;
                const txtFilename = filename.replace(/\.[^/.]+$/, '') + '.txt';
                downloadText(text, txtFilename);
                
                // 다운로드 간격 (브라우저 제한 방지)
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } catch (error) {
            console.error(`파일 다운로드 오류 (${filename}):`, error);
        }
    }
    
    alert(`${checkboxes.length}개 파일 다운로드가 완료되었습니다!`);
});

// 선택된 파일 삭제
deleteSelectedBtn.addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('.file-checkbox:checked');
    
    if (checkboxes.length === 0) {
        alert('삭제할 파일을 선택해주세요.');
        return;
    }
    
    if (!confirm(`선택한 ${checkboxes.length}개 파일을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
        return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const checkbox of checkboxes) {
        const fileId = checkbox.dataset.fileId;
        
        try {
            const response = await fetch(`/api/files/${fileId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            
            if (data.success) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            console.error('파일 삭제 오류:', error);
            failCount++;
        }
    }
    
    alert(`삭제 완료: ${successCount}개 성공, ${failCount}개 실패`);
    
    // 대시보드 새로고침
    loadDashboard();
});

// ============ 모달 기능 ============

async function openFileModal(fileId) {
    currentFileId = fileId;
    currentTab = 'original';
    
    fileModal.classList.remove('hidden');
    
    // 모든 탭 내용 초기화
    document.querySelectorAll('.modal-body .tab-content').forEach(content => {
        if (content.dataset.content === 'original') {
            content.innerHTML = '<div class="loading">로딩 중...</div>';
        } else {
            content.innerHTML = '<div class="summary-placeholder">요약 생성 버튼을 클릭하세요</div>';
        }
    });
    
    // 첫 번째 탭 활성화
    document.querySelectorAll('.modal-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.modal-body .tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.modal-tabs .tab-btn[data-tab="original"]').classList.add('active');
    document.querySelector('.modal-body [data-content="original"]').classList.add('active');
    
    try {
        const response = await fetch(`/api/files/${fileId}`);
        const data = await response.json();
        
        if (data.success) {
            const file = data.file;
            modalFilename.textContent = file.filename;
            
            // 원본 텍스트 표시
            const originalContent = document.querySelector('.modal-body [data-content="original"]');
            if (originalContent) {
                originalContent.innerHTML = `<pre>${file.original_text || '(내용 없음)'}</pre>`;
            }
            
            // 기존 요약이 있으면 표시
            Object.keys(file.summaries || {}).forEach(type => {
                const content = document.querySelector(`.modal-body [data-content="${type}"]`);
                if (content) {
                    content.innerHTML = `<pre>${file.summaries[type]}</pre>`;
                }
            });
        }
    } catch (error) {
        console.error('파일 로드 오류:', error);
        const originalContent = document.querySelector('.modal-body [data-content="original"]');
        if (originalContent) {
            originalContent.innerHTML = '<div class="loading">파일을 불러올 수 없습니다.</div>';
        }
    }
}

// 모달 닫기
modalClose.addEventListener('click', () => {
    fileModal.classList.add('hidden');
});

fileModal.addEventListener('click', (e) => {
    if (e.target === fileModal) {
        fileModal.classList.add('hidden');
    }
});

// 탭 전환
document.querySelectorAll('.modal-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        
        // 모든 탭 비활성화
        document.querySelectorAll('.modal-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.modal-body .tab-content').forEach(c => c.classList.remove('active'));
        
        // 선택한 탭 활성화
        btn.classList.add('active');
        document.querySelector(`.modal-body [data-content="${currentTab}"]`).classList.add('active');
    });
});

// 현재 탭 다운로드
modalDownloadBtn.addEventListener('click', async () => {
    if (!currentFileId) return;
    
    try {
        const response = await fetch(`/api/files/${currentFileId}`);
        const data = await response.json();
        
        if (data.success) {
            const file = data.file;
            let text = '';
            let filename = '';
            
            if (currentTab === 'original') {
                text = file.original_text;
                filename = file.filename.replace(/\.[^/.]+$/, '') + '.txt';
            } else {
                text = file.summaries[currentTab] || '';
                filename = file.filename.replace(/\.[^/.]+$/, '') + `_${currentTab}.txt`;
            }
            
            downloadText(text, filename);
        }
    } catch (error) {
        console.error('다운로드 오류:', error);
        alert('다운로드 중 오류가 발생했습니다.');
    }
});

function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 요약 생성
modalSummarizeBtn.addEventListener('click', async () => {
    if (!currentFileId || currentTab === 'original') {
        alert('요약할 탭을 선택해주세요.');
        return;
    }
    
    const summaryTypes = {
        'general': '일반',
        'meeting': '회의록',
        'lecture': '강의',
        'youtube': '영상',
        'conversation': '대화'
    };
    
    const typeName = summaryTypes[currentTab] || currentTab;
    modalSummarizeBtn.textContent = `${typeName} 요약 생성 중...`;
    modalSummarizeBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/files/${currentFileId}/summarize?summary_type=${currentTab}`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            const content = document.querySelector(`.modal-body [data-content="${currentTab}"]`);
            content.innerHTML = `<pre>${data.summary}</pre>`;
            
            if (data.cached) {
                alert('캐시된 요약을 불러왔습니다.');
            } else {
                alert(`${typeName} 요약이 생성되었습니다!`);
            }
        } else {
            alert('요약 생성 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('요약 생성 오류:', error);
        alert('요약 생성 중 오류가 발생했습니다.');
    } finally {
        modalSummarizeBtn.textContent = '✨ 요약 생성';
        modalSummarizeBtn.disabled = false;
    }
});

// 파일 삭제
async function deleteFile(fileId) {
    if (!confirm('정말 이 파일을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/files/${fileId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            alert('파일이 삭제되었습니다.');
            
            // 모달이 열려있으면 닫기
            if (currentFileId === fileId) {
                fileModal.classList.add('hidden');
            }
            
            // 대시보드 새로고침
            loadDashboard();
        } else {
            alert('파일 삭제 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('파일 삭제 중 오류가 발생했습니다.');
    }
}

// 요약 삭제
modalDeleteSummaryBtn.addEventListener('click', async () => {
    if (!currentFileId || currentTab === 'original') {
        alert('요약을 선택해주세요.');
        return;
    }
    
    if (!confirm('현재 탭의 요약을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/files/${currentFileId}/summary/${currentTab}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            // 요약 내용 초기화
            const content = document.querySelector(`.modal-body [data-content="${currentTab}"]`);
            if (content) {
                content.innerHTML = '<div class="summary-placeholder">요약 생성 버튼을 클릭하세요</div>';
            }
            alert('요약이 삭제되었습니다.');
        } else {
            alert('요약 삭제 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('요약 삭제 오류:', error);
        alert('요약 삭제 중 오류가 발생했습니다.');
    }
});


// ============ 설정 기능 ============

async function checkApiKeyStatus() {
    try {
        const response = await fetch('/api/check-api-key');
        const data = await response.json();
        
        if (data.has_key) {
            apiKeyStatus.textContent = `✅ API 키 설정됨 (${data.key_preview})`;
            apiKeyStatus.className = 'api-key-status connected';
        } else {
            apiKeyStatus.textContent = '❌ API 키가 설정되지 않음';
            apiKeyStatus.className = 'api-key-status disconnected';
        }
    } catch (error) {
        console.error('API 키 상태 확인 오류:', error);
    }
}

saveApiKeyBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        alert('API 키를 입력해주세요.');
        return;
    }
    
    saveApiKeyBtn.textContent = '저장 중...';
    saveApiKeyBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('api_key', apiKey);
        
        const response = await fetch('/api/set-api-key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ api_key: apiKey })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ ' + data.message);
            apiKeyInput.value = '';
            
            // 로컬 스토리지에 저장 (다음 접속 시 자동 설정)
            localStorage.setItem('gemini_api_key', apiKey);
            
            checkApiKeyStatus();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('API 키 저장 오류:', error);
        alert('API 키 저장 중 오류가 발생했습니다.');
    } finally {
        saveApiKeyBtn.textContent = '저장';
        saveApiKeyBtn.disabled = false;
    }
});

// 페이지 로드 시 로컬 스토리지에서 API 키 복원
window.addEventListener('DOMContentLoaded', async () => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    
    if (savedApiKey) {
        try {
            const response = await fetch('/api/set-api-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ api_key: savedApiKey })
            });
            
            const data = await response.json();
            if (data.success) {
                console.log('✓ 저장된 API 키를 자동으로 설정했습니다.');
            }
        } catch (error) {
            console.error('자동 API 키 설정 오류:', error);
        }
    }
});
