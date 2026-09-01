@echo off
title CommHub Docker Demo Launcher
echo ========================================================
echo        Building and Launching CommHub via Docker        
echo ========================================================
echo.

cd /d "%~dp0"

echo Starting Docker containers (MySQL + FastAPI + React/Nginx)...
docker-compose up --build -d

echo.
echo Waiting for services to initialize...
timeout /t 5 >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ========================================================
echo   CommHub is live in Docker!                            
echo   - Frontend (Nginx): http://localhost:5173             
echo   - Backend API: http://localhost:8000/docs             
echo.                                                        
echo   To stop containers later, run: docker-compose down    
echo ========================================================
pause

