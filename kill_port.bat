@echo off
setlocal enabledelayedexpansion

echo Checking for processes using port 10001...

REM Find processes using port 10001
for /f "tokens=5" %%i in ('netstat -ano ^| findstr :10001') do (
    set "pid=%%i"
    if not "!pid!"=="0" (
        echo Found process !pid! using port 10001
        echo Killing process !pid!...
        taskkill /f /pid !pid! >nul 2>&1
        if !errorlevel! equ 0 (
            echo Successfully killed process !pid!
        ) else (
            echo Failed to kill process !pid!
        )
    )
)

echo Port check completed. 