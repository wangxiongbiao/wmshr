@echo off
chcp 65001 >nul
title WMSHR 版本4 开发环境启动
setlocal
cd /d "%~dp0"
echo == WMSHR 版本4 本地开发环境启动 ==
echo 项目目录: %cd%
echo.
node scripts/start-v4.mjs
set "EXITCODE=%errorlevel%"
echo.
pause
endlocal & exit /b %EXITCODE%
