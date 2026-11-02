@echo off
chcp 65001 >nul
echo ========================================================
echo   🏆 3D 物理碰撞幸運搖獎機 - dist 發佈包快速啟動
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [提示] 尚未檢測到 Node.js，嘗試以微型啟動器 Lotto3D.exe 開啟...
    if exist "Lotto3D.exe" (
        start Lotto3D.exe
        exit /b
    )
    echo [錯誤] 未找到 Node.js 也未找到 Lotto3D.exe。
    echo 請安裝 Node.js (https://nodejs.org/) 或使用發佈目錄中的 .exe 程式。
    pause
    exit /b
)

echo 正在啟動服務並開啟瀏覽器...
node server.cjs
pause
