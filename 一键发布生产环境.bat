@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo == WMSHR 一键发布生产环境 ==
echo 项目目录: %cd%
echo.
npm run deploy:prod %*
echo.
echo 发布完成，按任意键关闭窗口...
pause >nul
