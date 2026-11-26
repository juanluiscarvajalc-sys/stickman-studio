@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Stickman Studio
where node >nul 2>nul || (echo Falta Node.js. Instalalo desde https://nodejs.org & pause & exit /b 1)
where python >nul 2>nul || (echo Falta Python 3. & pause & exit /b 1)
where ffmpeg >nul 2>nul || (echo Falta ffmpeg en el PATH. & pause & exit /b 1)
if not exist node_modules (echo Instalando dependencias, espera... & call npm install || (pause & exit /b 1))
python -c "import edge_tts, numpy, soundfile" 2>nul || python -m pip install edge-tts numpy soundfile
if not exist .env (copy .env.example .env >nul & echo Se creo .env: abrelo y pega tu clave de DeepSeek.)
start "" http://127.0.0.1:4500
node server.mjs
pause
