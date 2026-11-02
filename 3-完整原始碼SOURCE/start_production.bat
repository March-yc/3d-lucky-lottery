@echo off
chcp 65001 >nul
echo ========================================================
echo   🏆 3D 物理碰撞幸運搖獎機 - 正式活動發佈模式
echo ========================================================
echo.

:: 1. 檢測 Node.js 環境
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 尚未安裝 Node.js 環境！
    echo 請先至官網下載並安裝 Node.js: https://nodejs.org/
    pause
    exit /b
)

:: 2. 檢測依賴
if not exist "node_modules\" (
    echo [提示] 首次運行，正在安裝依賴...
    call npm install
)

:: 3. 檢測是否已編譯生產包
if not exist "dist\" (
    echo [提示] 正在進行生產環境極致效能編譯...
    call npm run build
)

echo 正在開啟瀏覽器並啟動高效預覽服務 (http://localhost:4173/) ...
start http://localhost:4173/
npm run preview -- --host --port 4173
pause
