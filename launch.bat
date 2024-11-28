@echo off
cls
echo Starting Rocket AIO...
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Kill any existing processes on ports 4000 and 5173
for /f "tokens=5" %%a in ('netstat -aon ^| find ":4000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)

:: Start the backend server with visible console
start "Rocket AIO Backend" cmd /k "npm run gui"

:: Wait for backend to start
timeout /t 2 /nobreak >nul

:: Start the frontend with Electron
cd frontend
start "Rocket AIO Frontend" cmd /k "npm run electron:dev"
cd ..

:: Show a small system tray notification
powershell -Command "[void] [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); $notify = New-Object System.Windows.Forms.NotifyIcon; $notify.Icon = [System.Drawing.SystemIcons]::Information; $notify.Visible = $true; $notify.ShowBalloonTip(0, 'Rocket AIO', 'Application is running in the background', [System.Windows.Forms.ToolTipIcon]::Info)"

:: Create a hidden window to maintain the processes
if not "%1"=="hide" (
    start /min cmd /c "%~f0" hide
    exit
)

:: Keep the processes running in the background
exit