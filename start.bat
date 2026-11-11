@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Please install Node.js from https://nodejs.org first. & pause & exit /b)
if not exist node_modules call npm install
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3030"
node server.js
pause
