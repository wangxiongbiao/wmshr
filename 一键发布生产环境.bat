@echo off
chcp 65001 >nul
title WMSHR 一键发布生产环境
setlocal
cd /d "%~dp0"
echo == WMSHR 一键发布生产环境 ==
echo 项目目录: %cd%
echo.
call npm run deploy:prod %*
set "EXITCODE=%errorlevel%"
echo.
echo 发布完成，按任意键关闭窗口...
pause >nul
endlocal & exit /b %EXITCODE%
