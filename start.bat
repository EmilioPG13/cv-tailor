@echo off
echo Starting CV Tailor...
start "Backend" cmd /k "cd /d "%~dp0server" && npm run dev"
start "Frontend" cmd /k "cd /d "%~dp0client" && npm run dev"
