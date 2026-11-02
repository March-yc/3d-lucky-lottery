@echo off
chcp 65001 >nul
echo ========================================================
echo   🏆 3D 物理碰撞幸運搖獎機系統啟動中...
echo ========================================================
echo.

:: 1. 檢測 Node.js 環境
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 尚未安裝 Node.js 環境！
    echo 請先至官網下載並安裝 Node.js (建議 LTS 版本，v18 或 v20 以上):
    echo 下載網址: https://nodejs.org/
    echo 安裝完成後，請重新雙擊此 start.bat 檔案即可。
    echo.
    pause
    exit /b
)

:: 2. 檢測依賴資料夾 node_modules，若無則自動安裝
if not exist "node_modules\" (
    echo [提示] 首次在此電腦運行，正在自動安裝必要依賴套件，請稍候...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [錯誤] 依賴套件安裝失敗，請檢查網路連線後重試。
        pause
        exit /b
    )
    echo [成功] 依賴套件安裝完成！
    echo.
)

:: 3. 自動開啟瀏覽器並啟動本地開發伺服器
echo 正在開啟瀏覽器前往系統頁面...
start http://localhost:5173/

echo.
echo ========================================================
echo   服務已在 http://localhost:5173/ 啟動！
echo   請勿關閉此黑底視窗。抽獎結束後關閉此視窗即可退出。
echo ========================================================
echo.
npm run dev
pause
