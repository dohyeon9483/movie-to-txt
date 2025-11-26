Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' 현재 스크립트의 디렉토리 경로
strPath = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Python 스크립트 실행 (콘솔 창 표시)
objShell.Run "cmd /k cd /d """ & strPath & """ && python start_server.py", 1, False


