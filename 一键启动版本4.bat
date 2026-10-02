@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo == WMSHR 版本4 本地开发环境启动 ==
echo 项目目录: %cd%
echo.
node scripts/start-v4.mjs
echo.
pause
