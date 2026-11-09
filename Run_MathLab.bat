@echo off
chcp 65001 >nul
title MathLab Launcher

echo ========================================================
echo   MathLab Studio - Symbolic Calculus & Dynamics Lab
echo ========================================================

netstat -ano | findstr :8080 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [INFO] MathLab Server is already running on port 8080.
) else (
    echo [INFO] Starting MathLab backend server (server.py)...
    start /B python "%~dp0server.py" >nul 2>&1
    timeout /t 1 /nobreak >nul
)

echo [INFO] Launching browser: http://localhost:8080/
start "" "http://localhost:8080/"

echo [SUCCESS] MathLab Studio initialized!
timeout /t 2 /nobreak >nul
